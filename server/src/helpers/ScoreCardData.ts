import { smart_api, refreshSmartAPISession } from "../config/smart-api";
import { dataQueryType } from "../types";

/**
 * Rate-limited queue for Angel One SmartAPI marketData calls.
 * Angel One allows only 1 request per second, max 50 symbols per request.
 * This queue serializes all marketData calls so they never collide.
 */
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 1500; // 1.5s between requests to stay within Angel rate limits
const MAX_TOKENS_PER_REQUEST = 50;

const requestQueue: Array<{
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}> = [];
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const item = requestQueue.shift()!;

    // Wait until enough time has passed since the last request
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_INTERVAL_MS) {
      await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
    }

    try {
      lastRequestTime = Date.now();
      const result = await item.execute();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    }
  }

  isProcessingQueue = false;
}

function enqueueMarketDataCall(payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    requestQueue.push({
      execute: () => smart_api.marketData(payload),
      resolve,
      reject,
    });
    processQueue();
  });
}

/**
 * Split exchangeTokens into chunks of MAX_TOKENS_PER_REQUEST (50).
 * Flattens all exchange→token[] pairs, chunks by 50, then re-groups by exchange.
 */
function chunkExchangeTokens(
  exchangeTokens: Record<string, string[]>
): Record<string, string[]>[] {
  const allTokens: Array<{ exchange: string; token: string }> = [];
  for (const [exchange, tokens] of Object.entries(exchangeTokens)) {
    for (const token of tokens) {
      allTokens.push({ exchange, token });
    }
  }

  const chunks: Record<string, string[]>[] = [];
  for (let i = 0; i < allTokens.length; i += MAX_TOKENS_PER_REQUEST) {
    const slice = allTokens.slice(i, i + MAX_TOKENS_PER_REQUEST);
    const chunkMap: Record<string, string[]> = {};
    for (const { exchange, token } of slice) {
      if (!chunkMap[exchange]) chunkMap[exchange] = [];
      chunkMap[exchange].push(token);
    }
    chunks.push(chunkMap);
  }

  return chunks;
}

/**
 * Parse market data response and extract LTP
 * Handles both success and error cases from Angel One API
 */
const parseMarketDataResponse = (
  data: any,
  token: string[],
  exchange: string
): { ltp: number; error?: string } => {
  // Check for API-level errors
  if (!data?.status && data?.message) {
    return { ltp: 0, error: `API Error: ${data.message} (${data.errorcode || data.errorCode || "unknown"})` };
  }

  const fetched = data?.data?.fetched || [];
  const unfetched = data?.data?.unfetched || [];

  // Log unfetched tokens (these contain actual error details)
  if (unfetched.length > 0) {
    console.warn("⚠️ Unfetched tokens:", JSON.stringify(unfetched, null, 2));
  }

  // If nothing was fetched, check unfetched for error details
  if (fetched.length === 0) {
    const unfetchedError = unfetched[0];
    if (unfetchedError) {
      return {
        ltp: 0,
        error: `Token ${token} on ${exchange}: ${unfetchedError.message || "Unknown error"} (${unfetchedError.errorCode || ""})`
      };
    }
    return { ltp: 0, error: `No data returned for token ${token} on ${exchange}` };
  }

  return { ltp: fetched[0]?.ltp ?? 0 };
};

export const fetchCMP = async (token: string[], exchange: string) => {
  if (!smart_api) throw new Error("SmartAPI session not initialized");

  const exchangesMap: Record<string, Record<string, string[]>> = {
    NSE: { NSE: token },
    BSE: { BSE: token },
    BFO: { BFO: token },
    MCX: { MCX: token },
    NFO: { NFO: token },
    CDS: { CDS: token },
  };

  if (!exchangesMap[exchange]) {
    throw new Error(`Invalid exchange: ${exchange}`);
  }

  console.log(`[fetchCMP] Fetching for token: ${token}, exchange: ${exchange}`);

  try {
    const requestPayload = {
      mode: "LTP",
      exchangeTokens: exchangesMap[exchange],
    };

    const data = await enqueueMarketDataCall(requestPayload);

    console.log(`[fetchCMP] Raw API response:`, JSON.stringify(data, null, 2));

    // Check if response indicates session error (AG8001 = Invalid Token)
    if (
      (data as any)?.errorcode === "AG8001" ||
      (data as any)?.errorCode === "AG8001" ||
      (data as any)?.message?.toLowerCase().includes("invalid token")
    ) {
      throw new Error("AG8001: Session expired");
    }

    // HTTP error (e.g. 403) — not a session error
    if (typeof (data as any)?.status === "number" && (data as any)?.status >= 400) {
      console.warn(`[fetchCMP] API HTTP error ${(data as any)?.status}: ${(data as any)?.message || "Unknown"}`);
      return 0;
    }

    const result = parseMarketDataResponse(data, token, exchange);

    if (result.error) {
      console.warn(`[fetchCMP] Warning: ${result.error}`);
    }

    return result.ltp;
  } catch (error: any) {
    // Only treat AG8001 errors as session errors (not generic "token" or "invalid" strings)
    const isSessionError =
      error?.response?.data?.errorCode === "AG8001" ||
      error?.response?.data?.errorcode === "AG8001" ||
      error?.message?.includes("AG8001");

    if (isSessionError) {
      console.log("[fetchCMP] AG8001 session error, refreshing...");

      try {
        await refreshSmartAPISession();

        const retryData = await enqueueMarketDataCall({
          mode: "LTP",
          exchangeTokens: exchangesMap[exchange],
        });

        console.log(`[fetchCMP] Retry response:`, JSON.stringify(retryData, null, 2));

        const retryResult = parseMarketDataResponse(retryData, token, exchange);
        if (retryResult.error) {
          console.warn(`[fetchCMP] Retry warning: ${retryResult.error}`);
        }
        return retryResult.ltp;
      } catch (refreshError) {
        console.error("[fetchCMP] Session refresh failed:", refreshError);
        return 0;
      }
    }

    console.error("[fetchCMP] Error:", error?.message || error);
    return 0;
  }
};

/**
 * Fetch single batch (≤50 tokens) from Angel API.
 * Handles session expiry with retry.
 */
async function fetchSingleBatch(
  payload: dataQueryType
): Promise<Array<{ symbolToken: string; ltp: string }>> {
  // console.log(payload)
  const data = await enqueueMarketDataCall(payload);

  // console.log(data)

  // Session expired — refresh and retry
  if (
    (data as any)?.errorCode === "AG8001" ||
    (data as any)?.errorcode === "AG8001" ||
    (data as any)?.message?.toLowerCase().includes("session")
  ) {
    console.log("[fetchSingleBatch] Session expired (AG8001), refreshing...");
    await refreshSmartAPISession();
    const retryData = await enqueueMarketDataCall(payload);
    return (retryData as any)?.data?.fetched || [];
  }

  // HTTP error (e.g. 403) — not a session error
  if (typeof (data as any)?.status === "number" && (data as any)?.status >= 400) {
    const msg = (data as any)?.message || "Unknown";
    // Rate limited — throw to abort remaining chunks in the batch
    if (msg.toLowerCase().includes("exceeding access rate") || msg.toLowerCase().includes("rate limit")) {
      throw new Error(`RATE_LIMITED: ${msg}`);
    }
    console.warn(`[fetchSingleBatch] API HTTP error ${(data as any)?.status}: ${msg}`);
    return [];
  }

  const fetched = (data as any)?.data?.fetched || [];

  // Log when API returns no data so we can diagnose issues
  if (fetched.length === 0) {
    console.warn(
      `[fetchSingleBatch] API returned empty. Response:`,
      JSON.stringify({ status: (data as any)?.status, message: (data as any)?.message, errorCode: (data as any)?.errorCode || (data as any)?.errorcode }, null, 2)
    );
  }

  return fetched;
}

/**
 * Fetch CMP for multiple tokens grouped by exchange.
 * Automatically chunks into batches of 50 tokens if needed.
 * Each chunk is sent sequentially through the rate-limited queue.
 */
export const fetchCMPInGroup = async (values: dataQueryType) => {
  if (!smart_api) {
    throw new Error("SmartAPI session not initialized");
  }

  const exchangeTokens = values.exchangeTokens || {};

  // Count total tokens across all exchanges
  const totalTokens = Object.values(exchangeTokens).reduce(
    (sum, tokens) => sum + (tokens?.length || 0),
    0
  );

  // console.log(totalTokens)
  // Fast path: within 50-token limit, single request
  if (totalTokens <= MAX_TOKENS_PER_REQUEST) {
    try {
      return await fetchSingleBatch(values);
    } catch (error: any) {
      if (error?.message?.includes("RATE_LIMITED")) {
        console.warn(`[fetchCMPInGroup] Rate limited — will retry after backoff`);
      } else {
        console.error("Error in fetchCMPInGroup:", error);
      }
      return [];
    }
  }

  // Chunked path: split into batches of 50
  const chunks = chunkExchangeTokens(exchangeTokens as Record<string, string[]>);
  const allFetched: Array<{ symbolToken: string; ltp: string }> = [];

  for (const chunk of chunks) {
    try {
      const chunkPayload: dataQueryType = {
        mode: values.mode,
        exchangeTokens: chunk,
      };
      const fetched = await fetchSingleBatch(chunkPayload);
      allFetched.push(...fetched);
    } catch (error: any) {
      // Rate limited — stop sending more chunks, they'll all fail too
      if (error?.message?.includes("RATE_LIMITED")) {
        console.warn(`[fetchCMPInGroup] Rate limited — aborting remaining chunks`);
        break;
      }
      console.error("Error in fetchCMPInGroup chunk:", error);
    }
  }

  return allFetched;
};
