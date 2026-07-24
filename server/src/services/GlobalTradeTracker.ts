import { ScoreCardModel } from "../models/ScoreCardModel";
import { getCachedPriceBulk } from "./PriceCache";
import {
  getAllOpenTrades,
  removeOpenTrade,
  setLiveLtp,
  updateCachedTrade,
} from "./OpenTradeRegistry";
import { ScoreCardTypes } from "../types";
import { sendTelegramMessage } from "../config/telegram";
import { getTelegramChannelIds } from "../helpers/getTelegramChannelId";
import buildExitTelegramMessage from "../helpers/buildExitTelegramMessage";
import { getMcxPnlMultiplier } from "../helpers/mcxLotMultipliers";
import { publishScorecardChange } from "./ScorecardPubSub";
import { isWithinTradingHours } from "../helpers/marketHours";
import { ServiceModel } from "../models/PostModels";
import { sendNotification } from "../helpers/sendNotification";

/**
 * GLOBAL TRADE TRACKER SERVICE
 *
 * This service handles centralized tracking of ALL open trades globally.
 * It READS prices from Redis cache (written by MarketPriceFetcher).
 * It NEVER calls Angel SmartAPI directly.
 *
 * Flow:
 *   Redis Cache (read) → Process SL/TP/triggers → DB update
 *
 * Benefits:
 * - Fully decoupled from API rate limits
 * - Scalable: Handles 100 or 10,000+ trades efficiently
 * - No duplicate processing
 * - Parallel chunk processing for speed
 *
 * Configuration:
 * - CHUNK_SIZE: Number of trades to process in parallel (default: 20)
 * - TRACKING_INTERVAL: How often to run tracking in ms (default: 1000)
 */

const CHUNK_SIZE = 20;
const TRACKING_INTERVAL = 1000;
const BULK_PERSIST_INTERVAL = 60_000; // Persist LTP/PnL to MongoDB every 60s for crash recovery
const EXPIRY_SWEEP_INTERVAL = 24 * 60 * 60 * 1000; // Sweep expired not-triggered trades once a day

let isTracking = false;
let trackingInterval: NodeJS.Timeout | null = null;
let bulkPersistInterval: NodeJS.Timeout | null = null;
let expirySweepInterval: NodeJS.Timeout | null = null;

/**
 * Normalize targets array for trades
 */
function normalizeTargets(item: any) {
  if (!item.targets || item.targets.length === 0) {
    item.targets = [{ price: item.target }];
  }
  return item;
}

/**
 * Split array into chunks for parallel processing
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Process a single trade - check triggers, SL, TP, timeout
 */
async function processSingleTrade(
  tradeId: string,
  cachedTrade: any,
  currLtp: number,
  now: Date
): Promise<void> {
  // Use the cached trade data from Redis
  const item = normalizeTargets({ ...cachedTrade });

  // LTP-only tick: write to the live hash, not the bulky CachedTrade
  // JSON. Avoids rewriting 1-3 KB per trade per second, and avoids
  // racing concurrent updateCachedTrade calls on other fields.
  await setLiveLtp(tradeId, currLtp);

  /* ---------------- DELETE NOT-TRIGGERED EXPIRED TRADES ---------------- */
  // If validity has passed and trade never triggered (no entry was taken),
  // delete it entirely — no PnL to report, no trade history worth keeping.
  {
    const vDate = new Date(item.validity);
    const isExpired = !isNaN(vDate.getTime()) && now > vDate;
    if (isExpired && item.istriggered !== "triggered") {
      // Filter on istriggered as a race-safety guard: if it just got triggered
      // elsewhere, the delete won't match and we'll fall through on the next tick.
      const deleted = await ScoreCardModel.deleteOne({
        _id: item._id,
        istriggered: "not triggered",
      });

      if (deleted.deletedCount > 0) {
        await removeOpenTrade(item._id.toString(), item.exchange, item.token);
        await publishScorecardChange({
          type: "deleted",
          tradeId: item._id.toString(),
          authorId: item.authorData?.id || "",
          planIds: item.shareWithPlans,
          marketplaceIds: (item as any).shareWithMarketplaces || [],
        });
      }
      return;
    }
  }

  /* ---------------- MARKET-HOURS GATE ---------------- */
  // No tracking, close decisions, or Telegram messages outside the IST trading
  // window for this exchange. End-of-session sweep handles any straggling
  // expired-triggered trades that the gate would otherwise leave open.
  if (!isWithinTradingHours(item.exchange)) {
    return;
  }

  /* ---------------- TRIGGER LOGIC ---------------- */
  let shouldTrigger = false;

  if (item.rate) {
    shouldTrigger =
      item.triggerType === "below"
        ? currLtp <= Number(item.rate)
        : currLtp >= Number(item.rate);
  } else {
    shouldTrigger =
      currLtp >= Number(item.lowerRange) && currLtp <= Number(item.upperRange);
  }

  if (shouldTrigger && item.istriggered === "not triggered") {
    // Trigger state change — write to DB (rare, once per trade)
    await ScoreCardModel.findByIdAndUpdate(item._id, {
      $set: {
        istriggered: "triggered",
        entryPrice: item.rate ?? currLtp,
        triggeredAt: now,
      },
    });
    // Update Redis cache
    await updateCachedTrade(tradeId, {
      istriggered: "triggered",
      entryPrice: item.rate ?? currLtp,
    });
    item.istriggered = "triggered";
    item.entryPrice = item.rate ?? currLtp;

    await publishScorecardChange({
      type: "triggered",
      tradeId: item._id.toString(),
      authorId: item.authorData?.id || "",
      planIds: item.shareWithPlans,
      marketplaceIds: item.shareWithMarketplaces || [],
    });
  }

  // Skip SL/TP/Timeout if not triggered
  if (item.istriggered !== "triggered") return;

  /* ---------------- PnL BASE ---------------- */
  const entry = Number(item.entryPrice);
  const sl = Number(item.stoploss);
  const lotSize = item.lotsize ?? 1;
  const mcxMultiplier = getMcxPnlMultiplier(item.exchange, item.scriptname);
  const effectiveQty = lotSize * mcxMultiplier;

  let pnl = 0;
  let isSL = false;

  if (item.entryType === "buy") {
    pnl = (currLtp - entry) * effectiveQty;
    isSL = sl > 0 && currLtp <= sl;
  } else {
    pnl = (entry - currLtp) * effectiveQty;
    isSL = sl > 0 && currLtp >= sl;
  }

  const investment = entry * effectiveQty;
  const pnlPercentage =
    investment > 0 ? ((pnl / investment) * 100).toFixed(2) : "0.00";

  // Check if any target was already hit (prevents SL after target)
  const anyTargetHit = item.targets?.some((t: any) => t.isHit === true);

  /* ---------------- TIMEOUT ---------------- */
  const validityDate = new Date(item.validity);
  if (!isNaN(validityDate.getTime()) && now > validityDate) {
    if (anyTargetHit) {
      // Validity expired AFTER a target hit → silent TP close at last hit target
      let lastHitIdx = -1;
      for (let i = item.targets.length - 1; i >= 0; i--) {
        if (item.targets[i].isHit) {
          lastHitIdx = i;
          break;
        }
      }
      const lastHit = item.targets[lastHitIdx];

      const tpPnl =
        item.entryType === "buy"
          ? (lastHit.price - entry) * effectiveQty
          : (entry - lastHit.price) * effectiveQty;

      const tpPct =
        investment > 0 ? ((tpPnl / investment) * 100).toFixed(2) : "0.00";

      await closeTrade(item, "tp", lastHit.price, tpPnl, tpPct, lotSize, now);
      return;
    }

    const closed = await closeTrade(
      item,
      "timeout",
      currLtp,
      pnl,
      pnlPercentage,
      lotSize,
      now
    );

    if (closed) {
      await sendToTelegram(
        item,
        buildExitTelegramMessage({
          scriptname: item.scriptname,
          exitPrice: currLtp,
          pnl,
          pnlPercentage,
          reason: "timeout",
        })
      );
    }
    return;
  }

  /* ---------------- MULTI TARGET LOGIC (Check BEFORE SL) ---------------- */
  let targetHitIndex = -1;

  for (let i = 0; i < item.targets.length; i++) {
    const t = item.targets[i];
    if (t.isHit) continue;

    if (
      (item.entryType === "buy" && currLtp >= t.price) ||
      (item.entryType === "sell" && currLtp <= t.price)
    ) {
      targetHitIndex = i;
      break;
    }
  }

  if (targetHitIndex !== -1) {
    const hitTarget = item.targets[targetHitIndex];

    // Mark target hit in MongoDB
    await ScoreCardModel.findByIdAndUpdate(item._id, {
      $set: {
        [`targets.${targetHitIndex}.isHit`]: true,
        [`targets.${targetHitIndex}.hitAt`]: now,
      },
    });

    // Sync target hit to Redis so next cycle progresses to the next target
    const updatedTargets = item.targets.map((t: any, i: number) =>
      i === targetHitIndex
        ? { ...t, isHit: true, hitAt: now.toISOString() }
        : t
    );
    await updateCachedTrade(item._id.toString(), { targets: updatedTargets });

    const hitPnl =
      item.entryType === "buy"
        ? (hitTarget.price - entry) * effectiveQty
        : (entry - hitTarget.price) * effectiveQty;

    const hitPct =
      investment > 0 ? ((hitPnl / investment) * 100).toFixed(2) : "0.00";

    // Last target => CLOSE TRADE
    if (targetHitIndex === item.targets.length - 1) {
      const closed = await closeTrade(
        item,
        "tp",
        hitTarget.price,
        hitPnl,
        hitPct,
        lotSize,
        now
      );

      if (closed) {
        await sendToTelegram(
          item,
          buildExitTelegramMessage({
            scriptname: item.scriptname,
            exitPrice: hitTarget.price,
            pnl: hitPnl,
            pnlPercentage: hitPct,
            reason: item.targets.length === 1 ? "tp" : `target ${targetHitIndex + 1}`,
            targetIndex: targetHitIndex + 1,
            totalTargets: item.targets.length,
          })
        );
      }
    } else {
      // Intermediate target hit -- notify subscribers that target N was reached
      await sendToTelegram(
        item,
        buildExitTelegramMessage({
          scriptname: item.scriptname,
          exitPrice: hitTarget.price,
          pnl: hitPnl,
          pnlPercentage: hitPct,
          reason: `target ${targetHitIndex + 1}`,
          targetIndex: targetHitIndex + 1,
          totalTargets: item.targets.length,
        })
      );
    }
    return;
  }

  /* ---------------- STOP LOSS ---------------- */
  if (isSL && !anyTargetHit) {
    const slPnl =
      item.entryType === "buy"
        ? (sl - entry) * effectiveQty
        : (entry - sl) * effectiveQty;

    const slPct =
      investment > 0 ? ((slPnl / investment) * 100).toFixed(2) : "0.00";

    const closed = await closeTrade(item, "sl", sl, slPnl, slPct, lotSize, now);

    if (closed) {
      await sendToTelegram(
        item,
        buildExitTelegramMessage({
          scriptname: item.scriptname,
          exitPrice: sl,
          pnl: slPnl,
          pnlPercentage: slPct,
          reason: "sl",
        })
      );
    }
    return;
  }

  /* ---------------- SL AFTER TARGET HIT (silent close at last target) ---------------- */
  if (isSL && anyTargetHit) {
    let lastHitIdx = -1;
    for (let i = item.targets.length - 1; i >= 0; i--) {
      if (item.targets[i].isHit) {
        lastHitIdx = i;
        break;
      }
    }
    const lastHit = item.targets[lastHitIdx];

    const tpPnl =
      item.entryType === "buy"
        ? (lastHit.price - entry) * effectiveQty
        : (entry - lastHit.price) * effectiveQty;

    const tpPct =
      investment > 0 ? ((tpPnl / investment) * 100).toFixed(2) : "0.00";

    await closeTrade(item, "tp", lastHit.price, tpPnl, tpPct, lotSize, now);
    return;
  }

  /* ---------------- LIVE UPDATE (Redis only, no DB write) ----------------
     LTP + PnL + PnL% all go to the live hash. Same rationale as the
     LTP-only tick above — keeps the per-second write cost flat regardless
     of CachedTrade size, and free of races with other writers. */
  await setLiveLtp(tradeId, currLtp, pnl.toFixed(2), pnlPercentage);
}

/**
 * Close a trade safely with atomic update
 */
async function closeTrade(
  item: ScoreCardTypes,
  result: "sl" | "tp" | "timeout",
  exitRate: number,
  pnl: number,
  pnlPercentage: string,
  lotSize: number,
  now: Date
): Promise<boolean> {
  const updated = await ScoreCardModel.findOneAndUpdate(
    {
      _id: item._id,
      status: "open",
      ...(result === "timeout" && { validity: { $lte: now } }),
    },
    {
      $set: {
        status: "closed",
        result,
        exitRate,
        exitDate: now,
        ltp: exitRate, // Persist final LTP to DB on close
        pnl: pnl.toFixed(2),
        pnlpercentage: pnlPercentage,
        closedAt: now,
        closeReason: `${result.toUpperCase()} hit (Lot Size: ${lotSize})`,
      },
    },
    { new: true }
  );

  // Remove from Redis registry and notify listeners
  if (updated) {
    await removeOpenTrade(
      item._id.toString(),
      item.exchange,
      item.token
    );

    await publishScorecardChange({
      type: "closed",
      tradeId: item._id.toString(),
      authorId: item.authorData?.id || "",
      planIds: item.shareWithPlans,
      marketplaceIds: (item as any).shareWithMarketplaces || [],
    });
  }

  return !!updated;
}

/**
 * Send Telegram notification
 */
async function sendToTelegram(
  item: ScoreCardTypes,
  message: string
): Promise<void> {
  try {
    if (!item.shareWithPlans?.length) return;

    const channelIds = await getTelegramChannelIds(item.shareWithPlans);
    if (channelIds.length) {
      await Promise.all(
        channelIds.map((id) =>
          sendTelegramMessage(id, message).catch(() => null),
        ),
      );
    }

    // Mirror the exact Telegram message to the in-app bell + PWA push so
    // subscribers see the same content no matter which channel reaches them
    // first. Plans without a Telegram channel still get the notification.
    await fanOutInAppNotification(item, message);
  } catch {
    // Never block trade flow
  }
}

// Sends the same `message` that went to Telegram as an in-app + PWA push
// notification to every subscriber of the trade's plans. Best-effort —
// notification failures must not block the trade engine.
async function fanOutInAppNotification(
  item: ScoreCardTypes,
  message: string,
): Promise<void> {
  try {
    const planIds = (item.shareWithPlans || []) as any[];
    if (planIds.length === 0) return;

    const plans = await ServiceModel.find({ _id: { $in: planIds } }).select(
      "subscribedBy",
    );
    const subscribers = new Set<string>();
    for (const plan of plans) {
      (plan.subscribedBy || []).forEach((s: any) => subscribers.add(String(s)));
    }

    // The RA who owns this recommendation gets the SAME price-triggered exit
    // alert as subscribers, but the two audiences need different CTAs: the
    // subscriber link opens the user recommendations page (which 403s for an
    // RA account), while the RA's own alert must open their provider
    // dashboard. sendNotification bakes a single postLink per doc, so we fan
    // out to the two audiences separately and keep the author out of the
    // subscriber set.
    const author = (item as any).authorData || {};
    const authorId = author?.id ? String(author.id) : "";
    const sentBy = {
      id: authorId || "system",
      name: author.name || "Service Provider",
    };

    if (authorId) subscribers.delete(authorId);

    if (subscribers.size > 0) {
      await sendNotification({
        recipientIds: Array.from(subscribers),
        recipientRole: "both",
        message,
        type: "recommendation-closed",
        category: "sp",
        sentBy,
        postLink: "/dashboard/user/recommendations",
        ctaLabel: "View Outcome",
      });
    }

    if (authorId) {
      await sendNotification({
        recipientIds: [authorId],
        recipientRole: "provider",
        message,
        type: "recommendation-closed",
        category: "sp",
        sentBy,
        postLink: "/dashboard/serviceprovider/recommendations/myrecommendations",
        ctaLabel: "View Outcome",
      });
    }
  } catch (err) {
    console.error("[GlobalTradeTracker] exit notification fan-out failed:", err);
  }
}

/**
 * Process a chunk of trades in parallel
 */
async function processTradeChunk(
  trades: any[],
  priceMap: Map<string, number>,
  now: Date
): Promise<void> {
  await Promise.all(
    trades.map(async (trade) => {
      const ltp = priceMap.get(trade.token);
      if (ltp === undefined || isNaN(ltp)) return;

      try {
        await processSingleTrade(trade._id.toString(), trade, ltp, now);
      } catch (err) {
        console.error(`Error processing trade ${trade._id}:`, err);
      }
    })
  );
}

/**
 * Main tracking function - runs every TRACKING_INTERVAL ms
 * Reads prices from Redis cache (populated by MarketPriceFetcher)
 */
async function runGlobalTracking(): Promise<void> {
  if (isTracking) {
    // Previous tracking still running, skip this cycle
    return;
  }

  isTracking = true;

  try {
    const now = new Date();

    // 1. Fetch ALL open trades from Redis registry (no DB hit)
    const openTrades = await getAllOpenTrades();

    if (openTrades.length === 0) {
      return;
    }

    // 2. Build unique token list for Redis bulk read
    const tokenSet = new Set<string>();
    const tokenList: Array<{ exchange: string; token: string }> = [];

    openTrades.forEach((trade: any) => {
      const key = `${trade.exchange}-${trade.token}`;
      if (!tokenSet.has(key)) {
        tokenList.push({ exchange: trade.exchange, token: trade.token });
        tokenSet.add(key);
      }
    });

    // 3. Read all prices from Redis cache (written by MarketPriceFetcher)
    const priceMap = await getCachedPriceBulk(tokenList);

    if (priceMap.size === 0) {
      // No cached prices yet — MarketPriceFetcher hasn't run or all TTLs expired
      return;
    }

    // 4. Split trades into chunks and process in parallel
    const tradeChunks = chunkArray(openTrades as any[], CHUNK_SIZE);

    // Process all chunks concurrently
    await Promise.all(
      tradeChunks.map((chunk) => processTradeChunk(chunk, priceMap, now))
    );
  } catch (error) {
    console.error("GlobalTracker error:", error);
  } finally {
    isTracking = false;
  }
}

/**
 * Periodic bulk persistence: writes latest ltp/pnl/pnlpercentage from Redis to MongoDB.
 * Runs every BULK_PERSIST_INTERVAL (60s). Ensures data survives Redis restarts.
 * This replaces the old per-tick MongoDB writes with a single batched operation.
 */
async function bulkPersistToMongo(): Promise<void> {
  try {
    const openTrades = await getAllOpenTrades();
    if (openTrades.length === 0) return;

    const ops = openTrades
      .filter((t: any) => t.ltp !== undefined && t.istriggered === "triggered")
      .map((t: any) => ({
        updateOne: {
          filter: { _id: t._id },
          update: {
            $set: {
              ltp: t.ltp,
              pnl: t.pnl,
              pnlpercentage: t.pnlpercentage,
            },
          },
        },
      }));

    if (ops.length > 0) {
      await ScoreCardModel.bulkWrite(ops, { ordered: false });
      console.log(`[GlobalTracker] Bulk-persisted ${ops.length} trades to MongoDB`);
    }
  } catch (err) {
    console.error("[GlobalTracker] Bulk persist error:", err);
  }
}

/**
 * Periodic sweeper: deletes expired not-triggered trades that the live-tick
 * path may have missed (off-market hours, tokens without active price feeds,
 * stale trades from before a restart).
 *
 * Runs every EXPIRY_SWEEP_INTERVAL independently of market data.
 * Only deletes trades where status="open" AND istriggered="not triggered"
 * AND validity has passed. Triggered trades are NEVER deleted here — they
 * go through the normal closeTrade timeout flow.
 */
async function sweepExpiredNotTriggeredTrades(): Promise<void> {
  try {
    const now = new Date();

    // Fetch candidates first so we can clean up Redis and publish events per trade
    const candidates = await ScoreCardModel.find({
      status: "open",
      istriggered: "not triggered",
      validity: { $lte: now },
    })
      .select("_id exchange token authorData shareWithPlans shareWithMarketplaces")
      .lean();

    if (candidates.length === 0) return;

    const ids = candidates.map((t: any) => t._id);
    const result = await ScoreCardModel.deleteMany({
      _id: { $in: ids },
      istriggered: "not triggered",
      status: "open",
    });

    // Clean up Redis registry and notify subscribers for each deleted trade
    for (const t of candidates as any[]) {
      try {
        await removeOpenTrade(t._id.toString(), t.exchange, t.token);
        await publishScorecardChange({
          type: "deleted",
          tradeId: t._id.toString(),
          authorId: t.authorData?.id || "",
          planIds: t.shareWithPlans,
          marketplaceIds: t.shareWithMarketplaces || [],
        });
      } catch (err) {
        console.error(
          `[GlobalTracker] Sweeper cleanup error for trade ${t._id}:`,
          err
        );
      }
    }

    console.log(
      `[GlobalTracker] Sweeper deleted ${result.deletedCount} expired not-triggered trades`
    );
  } catch (err) {
    console.error("[GlobalTracker] Sweep expired not-triggered trades error:", err);
  }
}

/**
 * End-of-session sweep: guarantees a Telegram message is sent for every
 * triggered trade whose validity has passed, even if the live tracker and
 * the 30s REST cron both missed it (e.g. broker REST silence at the close
 * minute, transient Mongo error, etc.).
 *
 * Scheduled by endOfSessionSweep.ts at 15:16 IST (equity) and 23:16 IST (MCX),
 * one minute after validity time. Mirrors the existing in-tracker timeout
 * logic, including the "validity-after-target → silent TP close" rule so it
 * does not contradict the per-tick path.
 */
export async function sweepExpiredTriggeredTrades(opts: {
  scope: "equity" | "mcx";
}): Promise<void> {
  try {
    const now = new Date();
    const exchangeFilter =
      opts.scope === "mcx" ? { $eq: "MCX" } : { $ne: "MCX" };

    const expired = await ScoreCardModel.find({
      status: "open",
      istriggered: "triggered",
      validity: { $lte: now },
      exchange: exchangeFilter,
    }).lean();

    if (expired.length === 0) return;

    let processed = 0;

    for (const raw of expired as any[]) {
      try {
        const item = normalizeTargets({ ...raw });
        const entry = Number(item.entryPrice);
        const lotSize = item.lotsize || 1;
        const mcxMultiplier = getMcxPnlMultiplier(
          item.exchange,
          item.scriptname
        );
        const effectiveQty = lotSize * mcxMultiplier;
        const investment = entry * effectiveQty;
        const anyTargetHit = item.targets?.some(
          (t: any) => t.isHit === true
        );

        if (anyTargetHit) {
          let lastHitIdx = -1;
          for (let i = item.targets.length - 1; i >= 0; i--) {
            if (item.targets[i].isHit) {
              lastHitIdx = i;
              break;
            }
          }
          const lastHit = item.targets[lastHitIdx];

          const tpPnl =
            item.entryType === "buy"
              ? (lastHit.price - entry) * effectiveQty
              : (entry - lastHit.price) * effectiveQty;

          const tpPct =
            investment > 0
              ? ((tpPnl / investment) * 100).toFixed(2)
              : "0.00";

          await closeTrade(
            item,
            "tp",
            lastHit.price,
            tpPnl,
            tpPct,
            lotSize,
            now
          );
          processed++;
          continue;
        }

        const exitPrice = Number(item.ltp) || entry;
        const pnl =
          item.entryType === "buy"
            ? (exitPrice - entry) * effectiveQty
            : (entry - exitPrice) * effectiveQty;
        const pnlPct =
          investment > 0
            ? ((pnl / investment) * 100).toFixed(2)
            : "0.00";

        const closed = await closeTrade(
          item,
          "timeout",
          exitPrice,
          pnl,
          pnlPct,
          lotSize,
          now
        );

        if (closed) {
          await sendToTelegram(
            item,
            buildExitTelegramMessage({
              scriptname: item.scriptname,
              exitPrice,
              pnl,
              pnlPercentage: pnlPct,
              reason: "timeout",
            })
          );
          processed++;
        }
      } catch (err) {
        console.error(
          `[EndOfSessionSweep] Error on trade ${raw._id}:`,
          err
        );
      }
    }

    console.log(
      `[EndOfSessionSweep] ${opts.scope}: processed ${processed}/${expired.length} expired-triggered trade(s)`
    );
  } catch (err) {
    console.error("[EndOfSessionSweep] Top-level error:", err);
  }
}

/**
 * Start the global tracking service
 */
export function startGlobalTradeTracker(): void {
  if (trackingInterval) {
    console.log("GlobalTracker: Already running");
    return;
  }

  console.log(
    `GlobalTracker: Starting with ${TRACKING_INTERVAL}ms interval, chunk size ${CHUNK_SIZE}`
  );

  // Run immediately on start
  runGlobalTracking();

  // Then run at regular intervals
  trackingInterval = setInterval(runGlobalTracking, TRACKING_INTERVAL);

  // Periodic bulk persistence to MongoDB for durability
  bulkPersistInterval = setInterval(bulkPersistToMongo, BULK_PERSIST_INTERVAL);

  // Periodic sweeper for expired not-triggered trades (runs independently of market data)
  sweepExpiredNotTriggeredTrades(); // run once on startup to clean up stale data
  expirySweepInterval = setInterval(
    sweepExpiredNotTriggeredTrades,
    EXPIRY_SWEEP_INTERVAL
  );
}

/**
 * Stop the global tracking service
 */
export function stopGlobalTradeTracker(): void {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
  if (bulkPersistInterval) {
    clearInterval(bulkPersistInterval);
    bulkPersistInterval = null;
  }
  if (expirySweepInterval) {
    clearInterval(expirySweepInterval);
    expirySweepInterval = null;
  }

  // Final persist before shutdown
  bulkPersistToMongo().then(() => {
    console.log("GlobalTracker: Stopped (final persist done)");
  });
}

/**
 * Get tracking status
 */
export function getTrackingStatus(): {
  isRunning: boolean;
  isProcessing: boolean;
} {
  return {
    isRunning: trackingInterval !== null,
    isProcessing: isTracking,
  };
}
