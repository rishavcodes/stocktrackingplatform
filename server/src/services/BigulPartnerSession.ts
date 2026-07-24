import { connection as redis } from "../config/redisConnection";

const KEY_PREFIX = "bigul:partner";
const TTL_SECONDS = 25 * 60 * 60; // 25 hours – refresh daily before expiry

export interface BigulPartnerSessionData {
  sessionId: string;
  accessToken: string;
  /** Same as sessionId – sent as x-vendor-auth header in order APIs */
  vendorAuth: string;
}

const keys = {
  sessionId: `${KEY_PREFIX}:session_id`,
  accessToken: `${KEY_PREFIX}:access_token`,
  vendorAuth: `${KEY_PREFIX}:vendor_auth`,
};

/**
 * Store partner session after login. Used by order APIs and by cron refresh.
 */
export async function setPartnerSession(data: BigulPartnerSessionData): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.set(keys.sessionId, data.sessionId, "EX", TTL_SECONDS);
  pipeline.set(keys.accessToken, data.accessToken, "EX", TTL_SECONDS);
  pipeline.set(keys.vendorAuth, data.vendorAuth, "EX", TTL_SECONDS);
  await pipeline.exec();
}

/**
 * Get current partner session from Redis. Returns null if not set or expired.
 */
export async function getPartnerSession(): Promise<BigulPartnerSessionData | null> {
  const [sessionId, accessToken, vendorAuth] = await Promise.all([
    redis.get(keys.sessionId),
    redis.get(keys.accessToken),
    redis.get(keys.vendorAuth),
  ]);

  if (!sessionId || !accessToken || !vendorAuth) {
    return null;
  }

  return { sessionId, accessToken, vendorAuth };
}

/**
 * Get stored x-vendor-auth value (sessionId) for order APIs. Returns null if no session stored.
 */
export async function getStoredVendorAuth(): Promise<string | null> {
  return redis.get(keys.vendorAuth);
}

/**
 * Clear partner session (e.g. after logout).
 */
export async function clearPartnerSession(): Promise<void> {
  await redis.del(keys.sessionId, keys.accessToken, keys.vendorAuth);
}
