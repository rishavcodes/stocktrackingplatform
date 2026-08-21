import { ScoreCardModel } from "../models/ScoreCardModel";
import { fetchCMPInGroup } from "../helpers/ScoreCardData";
import {
  setCachedPriceBulk,
  getPendingTokens,
  resolvePendingRequests,
} from "./PriceCache";
import { angelWebSocket, TokenSubscription, LTPTick } from "./AngelWebSocket";
import { getAllOpenTokens } from "./OpenTradeRegistry";
import { GroupedByExchange, dataQueryType } from "../types";

/**
 * MARKET PRICE FETCHER (WebSocket2 Edition)
 *
 * The SINGLE centralized price ingestion service.
 * Now uses Angel One WebSocket2 for real-time streaming instead of REST polling.
 *
 * Flow:
 *   1. Connect to Angel WebSocket2 on start
 *   2. Periodically scan open trade tokens from Redis registry (every 10s)
 *   3. Subscribe new tokens / unsubscribe removed tokens
 *   4. WebSocket pushes LTP ticks → batched to Redis (via AngelWebSocket)
 *   5. Resolve pending GetCmp promises from tick callbacks
 *
 * Fallback:
 *   If WebSocket is disconnected, falls back to REST polling for pending requests.
 *
 * All other services (GlobalTradeTracker, GetCmp, getCMPForTable)
 * read from Redis — they NEVER call Angel API directly.
 */

const SUBSCRIPTION_REFRESH_INTERVAL = 10_000; // Re-scan open trades every 10s
const REST_FALLBACK_INTERVAL = 5_000; // Check for REST fallback every 5s

let subscriptionInterval: NodeJS.Timeout | null = null;
let fallbackInterval: NodeJS.Timeout | null = null;

/**
 * Collect all tokens that need price tracking:
 * - Open trades (from Redis registry — no DB hit)
 * - Pending GetCmp requests
 */
async function collectAllTokens(): Promise<TokenSubscription[]> {
  const tokenSet = new Set<string>();
  const tokens: TokenSubscription[] = [];

  // 1. Open trades — from Redis registry (not DB)
  const openTradeTokens = await getAllOpenTokens();

  openTradeTokens.forEach(({ exchange, token }) => {
    const key = `${exchange}:${token}`;
    if (!tokenSet.has(key)) {
      tokens.push({ exchange, token });
      tokenSet.add(key);
    }
  });

  // 2. Pending GetCmp requests
  const pendingTokens = getPendingTokens();
  for (const [token, exchange] of pendingTokens) {
    const key = `${exchange}:${token}`;
    if (!tokenSet.has(key)) {
      tokens.push({ exchange, token });
      tokenSet.add(key);
    }
  }

  return tokens;
}

/**
 * Refresh subscriptions — compute diff between what's needed and what's active
 */
async function refreshSubscriptions(): Promise<void> {
  try {
    const neededTokens = await collectAllTokens();
    const neededSet = new Set(neededTokens.map((t) => `${t.exchange}:${t.token}`));
    const activeSet = angelWebSocket.getActiveSubscriptions();

    // Tokens to subscribe (needed but not active)
    const toSubscribe = neededTokens.filter(
      (t) => !activeSet.has(`${t.exchange}:${t.token}`)
    );

    // Tokens to unsubscribe (active but no longer needed)
    const toUnsubscribe: TokenSubscription[] = [];
    for (const key of activeSet) {
      if (!neededSet.has(key)) {
        const [exchange, token] = key.split(":");
        toUnsubscribe.push({ exchange, token });
      }
    }

    if (toSubscribe.length > 0) {
      angelWebSocket.subscribe(toSubscribe);
    }

    if (toUnsubscribe.length > 0) {
      angelWebSocket.unsubscribe(toUnsubscribe);
    }
  } catch (error) {
    console.error("[MarketPriceFetcher] Subscription refresh error:", error);
  }
}

/**
 * Handle tick callback from WebSocket — resolve pending GetCmp promises
 */
function handleTickBatch(ticks: LTPTick[]): void {
  const pendingTokens = getPendingTokens();
  if (pendingTokens.size === 0) return;

  // Convert ticks to the format resolvePendingRequests expects
  const fetchedPrices = ticks
    .filter((t) => pendingTokens.has(t.token))
    .map((t) => ({
      symbolToken: t.token,
      ltp: String(t.ltp),
    }));

  if (fetchedPrices.length > 0) {
    resolvePendingRequests(fetchedPrices);
  }
}

/**
 * REST fallback — if WebSocket is down and there are pending requests,
 * fall back to REST API to serve them
 */
async function restFallbackCycle(): Promise<void> {
  // Only run fallback if WebSocket is disconnected
  if (angelWebSocket.isConnected()) return;

  const pendingTokens = getPendingTokens();
  if (pendingTokens.size === 0) return;

  console.log(
    `[MarketPriceFetcher] WebSocket down — REST fallback for ${pendingTokens.size} pending token(s)`
  );

  try {
    const groupedByExchange: GroupedByExchange = {};
    const tokenExchangeMap = new Map<string, string>();

    for (const [token, exchange] of pendingTokens) {
      if (!groupedByExchange[exchange]) {
        groupedByExchange[exchange] = [];
      }
      groupedByExchange[exchange].push(token);
      tokenExchangeMap.set(token, exchange);
    }

    const formattedData: dataQueryType = {
      mode: "LTP",
      exchangeTokens: groupedByExchange,
    };

    const fetchedPrices = await fetchCMPInGroup(formattedData);

    if (fetchedPrices.length > 0) {
      // Write to Redis
      const cacheEntries = fetchedPrices.map(
        (p: { symbolToken: string; ltp: string }) => ({
          exchange: tokenExchangeMap.get(p.symbolToken) || "",
          token: p.symbolToken,
          ltp: Number(p.ltp),
        })
      );

      await setCachedPriceBulk(cacheEntries);
      resolvePendingRequests(fetchedPrices);
    }
  } catch (error) {
    console.error("[MarketPriceFetcher] REST fallback error:", error);
  }
}

/**
 * Start the market price fetcher service
 */
export function startMarketPriceFetcher(): void {
  if (subscriptionInterval) {
    console.log("MarketPriceFetcher: Already running");
    return;
  }

  console.log(
    `MarketPriceFetcher: Starting with WebSocket2 streaming (subscription refresh every ${SUBSCRIPTION_REFRESH_INTERVAL / 1000}s)`
  );

  // 1. Register tick callback for resolving pending requests
  angelWebSocket.onTick(handleTickBatch);

  // 2. Connect WebSocket
  angelWebSocket.connect();

  // 3. Initial subscription scan (after small delay to let WS connect)
  setTimeout(() => refreshSubscriptions(), 3000);

  // 4. Periodic subscription refresh (add/remove tokens as trades open/close)
  subscriptionInterval = setInterval(
    refreshSubscriptions,
    SUBSCRIPTION_REFRESH_INTERVAL
  );

  // 5. REST fallback for pending requests when WS is down
  fallbackInterval = setInterval(restFallbackCycle, REST_FALLBACK_INTERVAL);
}

/**
 * Stop the market price fetcher service
 */
export function stopMarketPriceFetcher(): void {
  if (subscriptionInterval) {
    clearInterval(subscriptionInterval);
    subscriptionInterval = null;
  }

  if (fallbackInterval) {
    clearInterval(fallbackInterval);
    fallbackInterval = null;
  }

  angelWebSocket.disconnect();
  console.log("MarketPriceFetcher: Stopped");
}
