// helpers/presence.ts
//
// Single source of truth for the "currently logged in / online" definition,
// shared by the auth middleware (heartbeat write throttle) and every read site
// (broker + service-provider subscriber presence) so the green dot means the
// same thing everywhere.

// A user is considered "online" if their lastSeenAt is within this window.
export const ONLINE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// The auth middleware only writes lastSeenAt at most once per this interval per
// user, so the hottest path in the app doesn't issue a DB write per request.
export const HEARTBEAT_THROTTLE_MS = 60 * 1000; // 60 seconds

export function isOnline(
  lastSeenAt?: Date | string | null,
  now: number = Date.now()
): boolean {
  if (!lastSeenAt) return false;
  const ts = lastSeenAt instanceof Date ? lastSeenAt.getTime() : new Date(lastSeenAt).getTime();
  if (Number.isNaN(ts)) return false;
  return now - ts < ONLINE_WINDOW_MS;
}
