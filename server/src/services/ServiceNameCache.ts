import { ServiceModel } from "../models/PostModels";

/**
 * SERVICE NAME CACHE
 *
 * In-memory cache for ServiceModel title lookups.
 * Avoids hitting MongoDB on every socket emit just to resolve plan IDs to names.
 * TTL-based: refreshes from DB every CACHE_TTL_MS.
 */

const CACHE_TTL_MS = 60_000; // 1 minute

let cache: Map<string, string> = new Map();
let lastRefresh = 0;
let refreshPromise: Promise<void> | null = null;

async function refreshCache(): Promise<void> {
  try {
    const services = await ServiceModel.find({}).select("_id title").lean();
    const newCache = new Map<string, string>();
    for (const s of services) {
      newCache.set(s._id.toString(), s.title);
    }
    cache = newCache;
    lastRefresh = Date.now();
  } catch (err) {
    console.error("[ServiceNameCache] Refresh failed:", err);
  }
}

async function ensureFresh(): Promise<void> {
  if (Date.now() - lastRefresh < CACHE_TTL_MS) return;

  if (!refreshPromise) {
    refreshPromise = refreshCache().finally(() => {
      refreshPromise = null;
    });
  }
  await refreshPromise;
}

/**
 * Resolve an array of plan/service IDs to their titles.
 * Uses in-memory cache with 1-minute TTL.
 */
export async function getServiceNamesCached(
  planIds: string[]
): Promise<string[]> {
  if (!planIds || planIds.length === 0) return [];

  await ensureFresh();

  return planIds.map((id) => cache.get(id) || id);
}

/**
 * Attach service names to an array of trades (similar to the old attachServiceNames).
 * Works with both Mongoose documents and plain objects from Redis.
 */
export async function attachServiceNamesCached(
  trades: any[]
): Promise<any[]> {
  await ensureFresh();

  return trades.map((trade) => {
    const tradeObj = trade.toObject ? trade.toObject() : { ...trade };

    if (
      tradeObj.shareWith?.includes("subscribers") &&
      tradeObj.shareWithPlans?.length > 0
    ) {
      const serviceNames = tradeObj.shareWithPlans.map(
        (id: string) => cache.get(id) || id
      );
      return { ...tradeObj, sharedServiceNames: serviceNames };
    }

    return { ...tradeObj, sharedServiceNames: [] };
  });
}

/**
 * Force a cache refresh (e.g., after creating/updating a service).
 */
export function invalidateServiceNameCache(): void {
  lastRefresh = 0;
}
