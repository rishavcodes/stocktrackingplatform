import { connection as redis } from "../config/redisConnection";

const KEY_PREFIX = "ltp";
const TTL_SECONDS = 10;
const REQUEST_TIMEOUT_MS = 15000; // 15s timeout for pending requests

function makeKey(exchange: string, token: string): string {
  return `${KEY_PREFIX}:${exchange}:${token}`;
}

/**
 * Set a single price in Redis with TTL
 */
export async function setCachedPrice(
  exchange: string,
  token: string,
  ltp: number
): Promise<void> {
  const key = makeKey(exchange, token);
  const value = JSON.stringify({ ltp, updatedAt: Date.now() });
  await redis.set(key, value, "EX", TTL_SECONDS);
}

/**
 * Bulk-set prices using Redis pipeline (minimal round trips)
 */
export async function setCachedPriceBulk(
  prices: Array<{ exchange: string; token: string; ltp: number }>
): Promise<void> {
  if (prices.length === 0) return;

  const pipeline = redis.pipeline();
  const now = Date.now();

  for (const { exchange, token, ltp } of prices) {
    const key = makeKey(exchange, token);
    const value = JSON.stringify({ ltp, updatedAt: now });
    pipeline.set(key, value, "EX", TTL_SECONDS);
  }

  await pipeline.exec();
}

/**
 * Get a single cached price. Returns null if not cached or expired.
 */
export async function getCachedPrice(
  exchange: string,
  token: string
): Promise<number | null> {
  const key = makeKey(exchange, token);
  const raw = await redis.get(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed.ltp ?? null;
  } catch {
    return null;
  }
}

/**
 * Bulk-get prices using Redis pipeline.
 * Returns Map<token, ltp> (keyed by token string, not exchange:token).
 */
export async function getCachedPriceBulk(
  tokens: Array<{ exchange: string; token: string }>
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (tokens.length === 0) return result;

  const pipeline = redis.pipeline();
  for (const { exchange, token } of tokens) {
    pipeline.get(makeKey(exchange, token));
  }

  const responses = await pipeline.exec();
  if (!responses) return result;

  for (let i = 0; i < tokens.length; i++) {
    const [err, raw] = responses[i] as [Error | null, string | null];
    if (err || !raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (parsed.ltp !== undefined) {
        result.set(tokens[i].token, parsed.ltp);
      }
    } catch {
      // skip malformed entries
    }
  }

  return result;
}

/* ============================================================
   PENDING TOKEN REQUEST SYSTEM

   When GetCmp needs a token not in the cache (no open trade),
   it registers interest here. MarketPriceFetcher picks it up
   in its next cycle, fetches it, and resolves the promise.
   ZERO extra API calls — the token piggybacks onto the next batch.
============================================================ */

interface PendingCallback {
  resolve: (ltp: number) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

interface PendingRequest {
  exchange: string;
  callbacks: PendingCallback[];
}

// Map<token, PendingRequest>
const pendingRequests = new Map<string, PendingRequest>();

/**
 * Request a price for a token not currently tracked.
 * Returns a Promise that resolves when MarketPriceFetcher
 * fetches this token in its next cycle.
 * Times out after REQUEST_TIMEOUT_MS.
 */
export function requestPrice(token: string, exchange: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      // Timeout — remove this callback
      const pending = pendingRequests.get(token);
      if (pending) {
        pending.callbacks = pending.callbacks.filter((cb) => cb.resolve !== resolve);
        if (pending.callbacks.length === 0) {
          pendingRequests.delete(token);
        }
      }
      reject(new Error(`Price request timeout for ${exchange}:${token}`));
    }, REQUEST_TIMEOUT_MS);

    const existing = pendingRequests.get(token);
    if (existing) {
      existing.callbacks.push({ resolve, reject, timer });
    } else {
      pendingRequests.set(token, {
        exchange,
        callbacks: [{ resolve, reject, timer }],
      });
    }
  });
}

/**
 * Called by MarketPriceFetcher to get tokens that external
 * callers (GetCmp) want fetched. Returns Map<token, exchange>.
 */
export function getPendingTokens(): Map<string, string> {
  const result = new Map<string, string>();
  for (const [token, req] of pendingRequests) {
    result.set(token, req.exchange);
  }
  return result;
}

/**
 * Called by MarketPriceFetcher after writing prices to Redis.
 * Resolves any pending promises for tokens that were fetched.
 */
export function resolvePendingRequests(
  fetchedPrices: Array<{ symbolToken: string; ltp: string | number }>
): void {
  for (const price of fetchedPrices) {
    const pending = pendingRequests.get(price.symbolToken);
    if (!pending) continue;

    const ltp = Number(price.ltp);
    for (const cb of pending.callbacks) {
      clearTimeout(cb.timer);
      cb.resolve(ltp);
    }
    pendingRequests.delete(price.symbolToken);
  }
}
