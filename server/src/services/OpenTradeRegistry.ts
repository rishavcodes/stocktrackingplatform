import { connection as redis } from "../config/redisConnection";
import { ScoreCardModel } from "../models/ScoreCardModel";

/**
 * OPEN TRADE REGISTRY
 *
 * Redis-backed registry of all open trades. Eliminates repeated MongoDB
 * queries from MarketPriceFetcher and GlobalTradeTracker.
 *
 * Redis structures:
 *   SET  "otr:tokens"          → "exchange:token" pairs (for WebSocket subscriptions)
 *   HASH "otr:trade:<tradeId>" → full trade data JSON (for GlobalTradeTracker)
 *   SET  "otr:ids"             → all open trade IDs (for listing)
 *
 * DB is hit only on:
 *   - Trade creation (save + add to Redis)
 *   - Trade closure (update DB + remove from Redis)
 *   - Trigger state change (rare, once per trade)
 *   - Server startup (bootstrap from DB)
 */

const TOKENS_KEY = "otr:tokens";
const IDS_KEY = "otr:ids";
const TRADE_PREFIX = "otr:trade:";
// Per-cohort indexes — let dashboard getters fetch only the trades they need
// instead of pulling the whole platform's open-trades set and filtering in JS.
const BY_AUTHOR_PREFIX = "otr:byAuthor:";
const BY_PLAN_PREFIX = "otr:byPlan:";
const BY_MARKETPLACE_PREFIX = "otr:byMarketplace:";
// Parallel ZSET indexes scored by createdAt-ms. A ZREVRANGE on these returns
// page IDs in newest-first order without us needing to fetch + JSON.parse +
// sort every trade in the cohort. The SETs above are kept around for
// union/membership ops (sunion across multiple authors), which ZSETs don't
// expose as cleanly.
const BY_AUTHOR_ZPREFIX = "otr:byAuthor:z:";
const BY_PLAN_ZPREFIX = "otr:byPlan:z:";
const BY_MARKETPLACE_ZPREFIX = "otr:byMarketplace:z:";
// Live LTP/PnL hash, separated from the bulky CachedTrade JSON so price
// ticks (1/sec per trade) don't rewrite a 1-3 KB document every time and
// can't race-overwrite concurrent edits to non-live fields.
const LIVE_PREFIX = "otr:live:";

function tradeKey(tradeId: string): string {
  return `${TRADE_PREFIX}${tradeId}`;
}
function byAuthorKey(authorId: string): string {
  return `${BY_AUTHOR_PREFIX}${authorId}`;
}
function byPlanKey(planId: string): string {
  return `${BY_PLAN_PREFIX}${planId}`;
}
function byMarketplaceKey(mpId: string): string {
  return `${BY_MARKETPLACE_PREFIX}${mpId}`;
}
function byAuthorZKey(authorId: string): string {
  return `${BY_AUTHOR_ZPREFIX}${authorId}`;
}
function byPlanZKey(planId: string): string {
  return `${BY_PLAN_ZPREFIX}${planId}`;
}
function byMarketplaceZKey(mpId: string): string {
  return `${BY_MARKETPLACE_ZPREFIX}${mpId}`;
}
function liveKey(tradeId: string): string {
  return `${LIVE_PREFIX}${tradeId}`;
}

/**
 * SCAN-based replacement for `redis.keys(pattern)`. KEYS is O(N) over the
 * keyspace and blocks the server; SCAN is cooperative. Only used at boot
 * for the one-time stale-key cleanup.
 */
async function scanKeys(pattern: string, batchSize = 500): Promise<string[]> {
  const out: string[] = [];
  let cursor = "0";
  do {
    const [next, batch] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      batchSize,
    );
    cursor = next;
    if (batch.length) out.push(...batch);
  } while (cursor !== "0");
  return out;
}

/**
 * Hydrate trade JSON + live LTP/PnL for a list of IDs in one round trip.
 * When `preSorted` is true, the caller has already arranged `ids` in the
 * desired order (e.g. ZREVRANGE result) and we skip the in-JS sort —
 * which used to be O(N log N) over the whole cohort, not just the page.
 */
async function hydrateAndPaginate(
  ids: string[],
  page: number,
  limit: number,
  preSorted = false,
): Promise<{ trades: CachedTrade[]; total: number }> {
  if (ids.length === 0) return { trades: [], total: 0 };
  const keys = ids.map((id) => tradeKey(id));
  const pipeline = redis.pipeline();
  pipeline.mget(...keys);
  for (const id of ids) pipeline.hgetall(liveKey(id));
  const results = await pipeline.exec();
  if (!results) return { trades: [], total: 0 };

  const raw = (results[0]?.[1] as (string | null)[]) ?? [];
  const lives = results
    .slice(1)
    .map((r) => (r?.[1] as Record<string, string>) ?? {});

  const trades: CachedTrade[] = [];
  for (let i = 0; i < raw.length; i++) {
    const data = raw[i];
    if (!data) continue;
    try {
      const parsed = JSON.parse(data) as CachedTrade;
      const live = lives[i];
      if (live && Object.keys(live).length > 0) {
        if (live.ltp != null) parsed.ltp = Number(live.ltp);
        if (live.pnl != null) (parsed as any).pnl = live.pnl;
        if (live.pnlpercentage != null)
          (parsed as any).pnlpercentage = live.pnlpercentage;
      }
      trades.push(parsed);
    } catch {
      continue;
    }
  }

  if (!preSorted) {
    trades.sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return db - da;
    });
  }

  return {
    trades: preSorted
      ? trades
      : trades.slice(page * limit, page * limit + limit),
    total: trades.length,
  };
}

/**
 * Single-cohort fast path using the ZSET index. ZREVRANGE pulls only the
 * page's IDs (sorted newest-first), then we hydrate just those — the rest
 * of the cohort never touches Redis or the parser. Falls back to the
 * legacy SET-based path when the zset isn't seeded (transition period).
 */
async function hydrateZsetPage(
  zsetKey: string,
  fallbackSetKey: string,
  page: number,
  limit: number,
): Promise<{ trades: CachedTrade[]; total: number }> {
  const start = page * limit;
  const stop = start + limit - 1;
  const pipeline = redis.pipeline();
  pipeline.zrevrange(zsetKey, start, stop);
  pipeline.zcard(zsetKey);
  const results = await pipeline.exec();
  if (!results) return { trades: [], total: 0 };

  const pageIds = (results[0]?.[1] as string[]) ?? [];
  let total = (results[1]?.[1] as number) ?? 0;

  // Pre-zset trades won't be in the new index. If the zset is empty but
  // the legacy SET still has members, fall back so historical data keeps
  // working until the next bootstrap reseeds both.
  if (pageIds.length === 0 && total === 0) {
    const fallbackIds = await redis.smembers(fallbackSetKey);
    if (fallbackIds.length === 0) return { trades: [], total: 0 };
    return hydrateAndPaginate(fallbackIds, page, limit);
  }

  const { trades } = await hydrateAndPaginate(pageIds, 0, pageIds.length, true);
  return { trades, total };
}

/**
 * Write live LTP/PnL for one trade. Replaces `updateCachedTrade(..., { ltp,
 * pnl, pnlpercentage })` calls in GlobalTradeTracker so price ticks don't
 * rewrite the entire CachedTrade JSON (and can't race with concurrent
 * `updateCachedTrade` calls that touch other fields).
 */
export async function setLiveLtp(
  tradeId: string,
  ltp: number,
  pnl?: number | string,
  pnlpercentage?: number | string,
): Promise<void> {
  try {
    const payload: Record<string, string> = { ltp: String(ltp) };
    if (pnl !== undefined) payload.pnl = String(pnl);
    if (pnlpercentage !== undefined)
      payload.pnlpercentage = String(pnlpercentage);
    await redis.hset(liveKey(tradeId), payload);
  } catch (err) {
    console.error("[OpenTradeRegistry] setLiveLtp failed:", err);
  }
}

/**
 * Fields we store per trade in Redis.
 * Includes both tracking-essential fields AND frontend-display fields
 * so the live socket handler can serve data directly from Redis
 * without hitting MongoDB on every tick.
 */
export interface CachedTrade {
  _id: string;
  exchange: string;
  token: string;
  scriptname: string;
  entryType: "buy" | "sell";
  entryPrice: number;
  rate?: number;
  stoploss: number;
  targets: Array<{ price: number; isHit?: boolean; hitAt?: Date }>;
  target?: number;
  validity: string; // ISO string
  istriggered: "triggered" | "not triggered";
  triggerType: "above" | "below" | "immediate";
  ltp?: number;
  lotsize?: number | null;
  upperRange?: number;
  lowerRange?: number;
  shareWithPlans: string[];
  shareWith: string[];
  holdingPeriod?: "intraday" | "forward";
  shareWithMarketplaces: string[];
  // Trimmed to id+name only — email/image/type were never read by any
  // dashboard cell. For an SP viewing their own trades the author is
  // themselves, so even id+name is mostly redundant; we keep them so
  // multi-author dashboards (Non-Individual SPs) can still label rows.
  authorData?: {
    id: string;
    name: string;
  };

  // Frontend-display fields (served from Redis instead of MongoDB).
  // Heavy modal-only fields (rational, notes, link, recommendationPDF,
  // rationalPDF, rationalText) live on the Mongo doc, not here. The
  // detail modal fetches them on demand via GET /api/scorecard/:id/details.
  status?: "open" | "closed";
  pnl?: number | string;
  pnlpercentage?: number | string;
  createdAt?: string;
  updatedAt?: string;
  riskRewardRatio?: string;
  exitRate?: number;
  exitDate?: string;
  result?: string;
}

/**
 * Add a newly created trade to the registry.
 * Called after ScoreCardModel.save() in createScoreCard.
 */
export async function addOpenTrade(trade: any): Promise<void> {
  try {
    const tradeId = trade._id.toString();
    const cached = extractCachedTrade(trade);

    const pipeline = redis.pipeline();
    pipeline.sadd(TOKENS_KEY, `${cached.exchange}:${cached.token}`);
    pipeline.sadd(IDS_KEY, tradeId);
    pipeline.set(tradeKey(tradeId), JSON.stringify(cached));
    // Maintain per-cohort SET + ZSET. The SET supports sunion across multiple
    // cohorts; the ZSET (scored by createdAt-ms) supports paged reads in
    // newest-first order without a JS-side sort.
    const createdAtMs = cached.createdAt
      ? new Date(cached.createdAt).getTime()
      : Date.now();
    const authorId = cached.authorData?.id;
    if (authorId) {
      pipeline.sadd(byAuthorKey(authorId), tradeId);
      pipeline.zadd(byAuthorZKey(authorId), createdAtMs, tradeId);
    }
    for (const planId of cached.shareWithPlans ?? []) {
      if (planId) {
        pipeline.sadd(byPlanKey(planId), tradeId);
        pipeline.zadd(byPlanZKey(planId), createdAtMs, tradeId);
      }
    }
    for (const mpId of cached.shareWithMarketplaces ?? []) {
      if (mpId) {
        pipeline.sadd(byMarketplaceKey(mpId), tradeId);
        pipeline.zadd(byMarketplaceZKey(mpId), createdAtMs, tradeId);
      }
    }
    await pipeline.exec();

    console.log(
      `[OpenTradeRegistry] Added trade ${tradeId} (${cached.exchange}:${cached.token})`
    );
  } catch (err) {
    console.error("[OpenTradeRegistry] Failed to add trade:", err);
  }
}

/**
 * Remove a trade from the registry.
 * Called on close (auto/manual) and delete.
 */
export async function removeOpenTrade(
  tradeId: string,
  exchange: string,
  token: string
): Promise<void> {
  try {
    // Read the cached payload first so we know which per-cohort sets to
    // scrub. If the trade is already gone we silently fall through.
    const cachedRaw = await redis.get(tradeKey(tradeId));
    let cachedAuthorId: string | undefined;
    let cachedPlanIds: string[] = [];
    let cachedMarketplaceIds: string[] = [];
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw) as CachedTrade;
        cachedAuthorId = cached.authorData?.id;
        cachedPlanIds = cached.shareWithPlans ?? [];
        cachedMarketplaceIds = cached.shareWithMarketplaces ?? [];
      } catch {
        /* swallow — fall back to leaving the per-cohort sets dirty rather
           than failing the close */
      }
    }

    const pipeline = redis.pipeline();
    pipeline.del(tradeKey(tradeId));
    pipeline.del(liveKey(tradeId));
    pipeline.srem(IDS_KEY, tradeId);
    if (cachedAuthorId) {
      pipeline.srem(byAuthorKey(cachedAuthorId), tradeId);
      pipeline.zrem(byAuthorZKey(cachedAuthorId), tradeId);
    }
    for (const planId of cachedPlanIds) {
      if (planId) {
        pipeline.srem(byPlanKey(planId), tradeId);
        pipeline.zrem(byPlanZKey(planId), tradeId);
      }
    }
    for (const mpId of cachedMarketplaceIds) {
      if (mpId) {
        pipeline.srem(byMarketplaceKey(mpId), tradeId);
        pipeline.zrem(byMarketplaceZKey(mpId), tradeId);
      }
    }
    // Only remove token from TOKENS_KEY if no other open trade uses it
    await pipeline.exec();

    // Check if any other trade still uses this exchange:token
    const otherIds = await redis.smembers(IDS_KEY);
    let tokenStillNeeded = false;

    if (otherIds.length > 0) {
      // Batch check — read all remaining trades to see if any share this token
      const tradeKeys = otherIds.map((id) => tradeKey(id));
      const tradeDataList = await redis.mget(...tradeKeys);

      for (const data of tradeDataList) {
        if (!data) continue;
        try {
          const t = JSON.parse(data);
          if (t.exchange === exchange && t.token === token) {
            tokenStillNeeded = true;
            break;
          }
        } catch {
          continue;
        }
      }
    }

    if (!tokenStillNeeded) {
      await redis.srem(TOKENS_KEY, `${exchange}:${token}`);
    }

    console.log(
      `[OpenTradeRegistry] Removed trade ${tradeId} (${exchange}:${token})`
    );
  } catch (err) {
    console.error("[OpenTradeRegistry] Failed to remove trade:", err);
  }
}

/**
 * Get all open trade tokens (exchange:token pairs).
 * Used by MarketPriceFetcher for WebSocket subscriptions.
 */
export async function getAllOpenTokens(): Promise<
  Array<{ exchange: string; token: string }>
> {
  try {
    const members = await redis.smembers(TOKENS_KEY);
    return members.map((m) => {
      const [exchange, token] = m.split(":");
      return { exchange, token };
    });
  } catch (err) {
    console.error("[OpenTradeRegistry] Failed to get tokens:", err);
    return [];
  }
}

/**
 * Get all open trades with full data.
 * Used by GlobalTradeTracker instead of ScoreCardModel.find({ status: "open" }).
 */
export async function getAllOpenTrades(): Promise<CachedTrade[]> {
  try {
    const tradeIds = await redis.smembers(IDS_KEY);
    if (tradeIds.length === 0) return [];

    const tradeKeys = tradeIds.map((id) => tradeKey(id));
    const tradeDataList = await redis.mget(...tradeKeys);

    const trades: CachedTrade[] = [];
    for (const data of tradeDataList) {
      if (!data) continue;
      try {
        trades.push(JSON.parse(data));
      } catch {
        continue;
      }
    }

    return trades;
  } catch (err) {
    console.error("[OpenTradeRegistry] Failed to get trades:", err);
    return [];
  }
}

/**
 * Get open trades filtered by author ID with pagination.
 * Used by the dashboard socket handler to serve from Redis.
 */
export async function getOpenTradesByAuthor(
  authorId: string,
  page: number = 0,
  limit: number = 10
): Promise<{ trades: CachedTrade[]; total: number }> {
  try {
    // ZSET fast path: pull only the page's IDs in sorted order, hydrate
    // just those. Avoids the O(N) MGET + O(N log N) sort over the whole
    // cohort that the SET path required.
    return await hydrateZsetPage(
      byAuthorZKey(authorId),
      byAuthorKey(authorId),
      page,
      limit,
    );
  } catch (err) {
    console.error("[OpenTradeRegistry] Failed to get trades by author:", err);
    return { trades: [], total: 0 };
  }
}

/**
 * Get open trades filtered by multiple author IDs with pagination.
 * Used by the dashboard socket handler for Non-Individual profiles
 * to include trades from all sub-profiles.
 */
export async function getOpenTradesByAuthors(
  authorIds: string[],
  page: number = 0,
  limit: number = 10
): Promise<{ trades: CachedTrade[]; total: number }> {
  try {
    if (authorIds.length === 0) return { trades: [], total: 0 };
    if (authorIds.length === 1) {
      return await getOpenTradesByAuthor(authorIds[0], page, limit);
    }
    // Union the per-author ZSETs into a short-lived combined ZSET, then
    // page that directly. AGGREGATE MAX keeps the per-trade createdAt score
    // (every trade has exactly one author, so MAX is a no-op semantically —
    // it just satisfies the API). Without ZUNIONSTORE we'd have to SUNION
    // into an unsorted SET and re-sort in JS over the whole cohort.
    const zsetKeys = authorIds.map((id) => byAuthorZKey(id));
    const tmp = `otr:tmp:byAuthors:${process.pid}:${Date.now()}`;
    const start = page * limit;
    const stop = start + limit - 1;
    const pipeline = redis.pipeline();
    pipeline.zunionstore(tmp, zsetKeys.length, ...zsetKeys, "AGGREGATE", "MAX");
    pipeline.zrevrange(tmp, start, stop);
    pipeline.zcard(tmp);
    pipeline.del(tmp);
    const results = await pipeline.exec();
    if (!results) return { trades: [], total: 0 };
    const pageIds = (results[1]?.[1] as string[]) ?? [];
    const total = (results[2]?.[1] as number) ?? 0;
    if (pageIds.length === 0 && total === 0) {
      // ZSET not yet seeded for any of these authors (pre-PR-3 trades).
      // Fall back to the legacy SET path so historical data still loads.
      const ids = await redis.sunion(...authorIds.map((id) => byAuthorKey(id)));
      return await hydrateAndPaginate(ids, page, limit);
    }
    const { trades } = await hydrateAndPaginate(pageIds, 0, pageIds.length, true);
    return { trades, total };
  } catch (err) {
    console.error("[OpenTradeRegistry] Failed to get trades by authors:", err);
    return { trades: [], total: 0 };
  }
}

/**
 * Get open trades filtered by subscribed plan IDs with pagination.
 * Used by the subscribed socket handler to serve from Redis.
 */
export async function getOpenTradesByPlans(
  planIds: string[],
  page: number = 0,
  limit: number = 10
): Promise<{ trades: CachedTrade[]; total: number }> {
  try {
    if (planIds.length === 0) return { trades: [], total: 0 };

    // Pull cohort IDs in sorted order via ZSET (single plan) or
    // ZUNIONSTORE (multi-plan). Avoids the cohort-wide JS sort that the
    // legacy SUNION + hydrateAndPaginate path needed.
    let sortedIds: string[];
    if (planIds.length === 1) {
      sortedIds = await redis.zrevrange(byPlanZKey(planIds[0]), 0, -1);
      if (sortedIds.length === 0) {
        // Legacy fallback for trades created before the ZSET existed.
        sortedIds = await redis.smembers(byPlanKey(planIds[0]));
      }
    } else {
      const zsetKeys = planIds.map((id) => byPlanZKey(id));
      const tmp = `otr:tmp:byPlans:${process.pid}:${Date.now()}`;
      const pipeline = redis.pipeline();
      pipeline.zunionstore(tmp, zsetKeys.length, ...zsetKeys, "AGGREGATE", "MAX");
      pipeline.zrevrange(tmp, 0, -1);
      pipeline.del(tmp);
      const results = await pipeline.exec();
      sortedIds = (results?.[1]?.[1] as string[]) ?? [];
      if (sortedIds.length === 0) {
        sortedIds = await redis.sunion(...planIds.map((id) => byPlanKey(id)));
      }
    }

    if (sortedIds.length === 0) return { trades: [], total: 0 };

    // Caller already constrains to the user's subscribed plans, but the
    // original implementation also gated on `shareWith.includes("subscribers")`
    // — preserve that invariant. Hydrate in sorted order so we can slice
    // the page without re-sorting in JS.
    const { trades: hydrated } = await hydrateAndPaginate(
      sortedIds,
      0,
      sortedIds.length,
      true,
    );
    const filtered = hydrated.filter((t) =>
      t.shareWith?.includes("subscribers"),
    );
    return {
      trades: filtered.slice(page * limit, page * limit + limit),
      total: filtered.length,
    };
  } catch (err) {
    console.error("[OpenTradeRegistry] Failed to get trades by plans:", err);
    return { trades: [], total: 0 };
  }
}

/**
 * Get open trades filtered by marketplace ID and resolved author IDs.
 * Used by the marketplace socket handler to serve from Redis.
 */
export async function getOpenTradesByMarketplace(
  marketplaceId: string,
  authorIds: string[],
  page: number = 0,
  limit: number = 500
): Promise<{ trades: CachedTrade[]; total: number }> {
  try {
    // Pull marketplace IDs in sorted order, then filter by author. Author
    // set is small, marketplace set is already narrow — this scales fine.
    let sortedIds = await redis.zrevrange(byMarketplaceZKey(marketplaceId), 0, -1);
    if (sortedIds.length === 0) {
      sortedIds = await redis.smembers(byMarketplaceKey(marketplaceId));
    }
    if (sortedIds.length === 0) return { trades: [], total: 0 };

    const authorSet = new Set(authorIds);
    const { trades: hydrated } = await hydrateAndPaginate(
      sortedIds,
      0,
      sortedIds.length,
      true,
    );
    const filtered = hydrated.filter(
      (t) => t.authorData?.id != null && authorSet.has(t.authorData.id),
    );
    return {
      trades: filtered.slice(page * limit, page * limit + limit),
      total: filtered.length,
    };
  } catch (err) {
    console.error("[OpenTradeRegistry] Failed to get trades by marketplace:", err);
    return { trades: [], total: 0 };
  }
}

/**
 * Update a specific field on a cached trade.
 * Used for trigger state changes (rare). LTP/PnL ticks should use
 * setLiveLtp() instead — that writes a separate hash so price ticks
 * don't rewrite the entire CachedTrade JSON.
 *
 * If `updates` includes `shareWithPlans` or `shareWithMarketplaces`, the
 * cohort indexes are diff'd and kept in sync — otherwise a trade modified
 * to add/remove a plan would never appear/disappear from the relevant
 * subscribed/marketplace dashboards.
 */
export async function updateCachedTrade(
  tradeId: string,
  updates: Partial<CachedTrade>
): Promise<void> {
  try {
    const key = tradeKey(tradeId);
    const existing = await redis.get(key);
    if (!existing) return;

    const trade = JSON.parse(existing) as CachedTrade;
    const oldPlans = trade.shareWithPlans ?? [];
    const oldMarketplaces = trade.shareWithMarketplaces ?? [];
    Object.assign(trade, updates);
    await redis.set(key, JSON.stringify(trade));

    // Diff cohort membership only when the relevant fields actually changed.
    if (updates.shareWithPlans || updates.shareWithMarketplaces) {
      const newPlans = trade.shareWithPlans ?? [];
      const newMarketplaces = trade.shareWithMarketplaces ?? [];
      const createdAtMs = trade.createdAt
        ? new Date(trade.createdAt).getTime()
        : Date.now();
      const pipeline = redis.pipeline();
      // plans diff — SET + ZSET stay in lockstep so the ZSET-backed getters
      // see the same membership the SET path would.
      const oldPlanSet = new Set(oldPlans);
      const newPlanSet = new Set(newPlans);
      for (const p of newPlans) {
        if (!oldPlanSet.has(p)) {
          pipeline.sadd(byPlanKey(p), tradeId);
          pipeline.zadd(byPlanZKey(p), createdAtMs, tradeId);
        }
      }
      for (const p of oldPlans) {
        if (!newPlanSet.has(p)) {
          pipeline.srem(byPlanKey(p), tradeId);
          pipeline.zrem(byPlanZKey(p), tradeId);
        }
      }
      // marketplaces diff
      const oldMpSet = new Set(oldMarketplaces);
      const newMpSet = new Set(newMarketplaces);
      for (const m of newMarketplaces) {
        if (!oldMpSet.has(m)) {
          pipeline.sadd(byMarketplaceKey(m), tradeId);
          pipeline.zadd(byMarketplaceZKey(m), createdAtMs, tradeId);
        }
      }
      for (const m of oldMarketplaces) {
        if (!newMpSet.has(m)) {
          pipeline.srem(byMarketplaceKey(m), tradeId);
          pipeline.zrem(byMarketplaceZKey(m), tradeId);
        }
      }
      await pipeline.exec();
    }
  } catch (err) {
    console.error("[OpenTradeRegistry] Failed to update trade:", err);
  }
}

/**
 * Bootstrap the registry from MongoDB on server startup.
 * This is a one-time operation to populate Redis from the DB.
 */
export async function bootstrapRegistry(): Promise<void> {
  try {
    // Clear any stale registry data — including the per-cohort SETs/ZSETs
    // and live-LTP hashes. SCAN over each prefix (non-blocking) instead of
    // KEYS (O(N) over the whole keyspace, blocks Redis).
    const existingIds = await redis.smembers(IDS_KEY);
    const [staleByAuthor, staleByPlan, staleByMarketplace, staleByAuthorZ, staleByPlanZ, staleByMarketplaceZ, staleLive] =
      await Promise.all([
        scanKeys(`${BY_AUTHOR_PREFIX}*`),
        scanKeys(`${BY_PLAN_PREFIX}*`),
        scanKeys(`${BY_MARKETPLACE_PREFIX}*`),
        scanKeys(`${BY_AUTHOR_ZPREFIX}*`),
        scanKeys(`${BY_PLAN_ZPREFIX}*`),
        scanKeys(`${BY_MARKETPLACE_ZPREFIX}*`),
        scanKeys(`${LIVE_PREFIX}*`),
      ]);

    // Author/plan/marketplace SCAN results overlap with their Z-prefix
    // siblings (BY_AUTHOR_PREFIX matches BY_AUTHOR_ZPREFIX). Dedupe so
    // we don't double-DEL. A Set is cheap at boot scale.
    const staleKeys = new Set<string>([
      ...staleByAuthor,
      ...staleByPlan,
      ...staleByMarketplace,
      ...staleByAuthorZ,
      ...staleByPlanZ,
      ...staleByMarketplaceZ,
      ...staleLive,
    ]);

    if (existingIds.length > 0 || staleKeys.size > 0) {
      const cleanup = redis.pipeline();
      cleanup.del(TOKENS_KEY);
      cleanup.del(IDS_KEY);
      existingIds.forEach((id) => cleanup.del(tradeKey(id)));
      existingIds.forEach((id) => cleanup.del(liveKey(id)));
      staleKeys.forEach((k) => cleanup.del(k));
      await cleanup.exec();
    }

    // Load all open trades from DB
    const openTrades = await ScoreCardModel.find({ status: "open" }).lean();

    if (openTrades.length === 0) {
      console.log("[OpenTradeRegistry] Bootstrapped: 0 trades (none open)");
      return;
    }

    const pipeline = redis.pipeline();

    for (const trade of openTrades) {
      const tradeId = trade._id.toString();
      const cached = extractCachedTrade(trade);
      const createdAtMs = cached.createdAt
        ? new Date(cached.createdAt).getTime()
        : Date.now();

      pipeline.sadd(TOKENS_KEY, `${cached.exchange}:${cached.token}`);
      pipeline.sadd(IDS_KEY, tradeId);
      pipeline.set(tradeKey(tradeId), JSON.stringify(cached));

      // Seed per-cohort SET + ZSET in lockstep so the ZSET-backed getters
      // and any legacy SET-based caller agree on membership.
      const authorId = cached.authorData?.id;
      if (authorId) {
        pipeline.sadd(byAuthorKey(authorId), tradeId);
        pipeline.zadd(byAuthorZKey(authorId), createdAtMs, tradeId);
      }
      for (const planId of cached.shareWithPlans ?? []) {
        if (planId) {
          pipeline.sadd(byPlanKey(planId), tradeId);
          pipeline.zadd(byPlanZKey(planId), createdAtMs, tradeId);
        }
      }
      for (const mpId of cached.shareWithMarketplaces ?? []) {
        if (mpId) {
          pipeline.sadd(byMarketplaceKey(mpId), tradeId);
          pipeline.zadd(byMarketplaceZKey(mpId), createdAtMs, tradeId);
        }
      }
    }

    await pipeline.exec();

    console.log(
      `[OpenTradeRegistry] Bootstrapped ${openTrades.length} trades from DB`
    );
  } catch (err) {
    console.error("[OpenTradeRegistry] Bootstrap failed:", err);
  }
}

/**
 * Extract the fields we need to cache from a trade document.
 * Includes display fields so the socket handler can serve from Redis.
 */
function extractCachedTrade(trade: any): CachedTrade {
  return {
    _id: trade._id.toString(),
    exchange: trade.exchange,
    token: trade.token,
    scriptname: trade.scriptname,
    entryType: trade.entryType,
    entryPrice: trade.entryPrice,
    rate: trade.rate,
    stoploss: trade.stoploss,
    targets: trade.targets || (trade.target ? [{ price: trade.target }] : []),
    target: trade.target,
    validity: (() => {
      if (!trade.validity) return new Date().toISOString();
      const d = new Date(trade.validity);
      return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    })(),
    istriggered: trade.istriggered,
    triggerType: trade.triggerType,
    ltp: trade.ltp,
    lotsize: trade.lotsize,
    upperRange: trade.upperRange,
    lowerRange: trade.lowerRange,
    shareWithPlans: (trade.shareWithPlans || []).map((p: any) => p.toString()),
    shareWith: trade.shareWith || [],
    holdingPeriod: trade.holdingPeriod,
    shareWithMarketplaces: (trade.shareWithMarketplaces || []).map((m: any) => m.toString()),
    authorData: trade.authorData
      ? {
          id: trade.authorData.id,
          name: trade.authorData.name,
        }
      : undefined,

    status: trade.status || "open",
    pnl: trade.pnl ?? 0,
    pnlpercentage: trade.pnlpercentage ?? 0,
    createdAt: trade.createdAt
      ? new Date(trade.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: trade.updatedAt
      ? new Date(trade.updatedAt).toISOString()
      : new Date().toISOString(),
    riskRewardRatio: trade.riskRewardRatio,
    exitRate: trade.exitRate,
    exitDate: trade.exitDate,
    result: trade.result,
  };
}
