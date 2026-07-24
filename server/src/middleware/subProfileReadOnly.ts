import type { Request, Response } from "express";

/**
 * Admin sub-profiles are "view-only overseers": the master trusts them to watch
 * the whole firm's activity (their data scope already resolves to master + all
 * siblings — see utils/profileHelpers.ts), but they must NOT be able to create,
 * edit, delete, or send anything. User sub-profiles keep full write access,
 * scoped by their module checkboxes.
 *
 * This is the single backend chokepoint that enforces it. It is invoked from
 * verifyUserRATokenMiddleware (AdminSecurity.ts) right after `req.user` is
 * resolved, so EVERY authenticated SP/data route runs through it.
 *
 * Fail-closed: any mutating verb (POST/PUT/PATCH/DELETE) is blocked for an
 * admin sub-profile unless its path is explicitly allowlisted below. That means
 * a newly-added write endpoint is blocked for admins by default — no per-route
 * wiring required.
 */

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Benign / read-only requests an admin sub still needs while *viewing* the
// dashboard, plus the few self-service actions (notification read-receipts,
// push registration, logout) that aren't "creating content". Matched as a
// substring of the request path so the route's mount prefix doesn't matter.
// Keep this list tight and EXPLICIT — never token-based — so no real write
// (e.g. "/createandverifyorder") can slip through on a coincidental match.
const READ_ONLY_ALLOWLIST = [
  "/getcmp", // live CMP for the recommendations / scorecard tables (POST-as-read)
  "/get-session", // broker session lookups used by marketplace views
  "/readnotifications/", // mark bell notifications as read
  "/deletenotifications", // clear own notification bell
  "/logout", // must always be able to sign out
  "/push/subscribe", // PWA push registration (so they still receive alerts)
];

export function isAdminSubProfile(user: any): boolean {
  return Boolean(
    user &&
      user.role === "provider" &&
      user.addedby?.isSubProfile === true &&
      user.addedby?.subProfileRole === "admin",
  );
}

/**
 * Returns true (and writes a 403 response) when the request must be blocked
 * because the actor is a view-only admin sub-profile attempting a write.
 * The caller MUST `return` immediately when this returns true.
 */
export function blockIfReadOnlySubProfile(
  req: Request,
  res: Response,
): boolean {
  if (!isAdminSubProfile((req as any).user)) return false;
  if (!MUTATING_METHODS.has((req.method || "").toUpperCase())) return false;

  const path = (req.originalUrl || req.url || "").split("?")[0];
  if (READ_ONLY_ALLOWLIST.some((allowed) => path.includes(allowed))) {
    return false;
  }

  res.status(403).json({
    success: false,
    readOnly: true,
    message:
      "This is a view-only (admin) sub profile. Ask your firm's main account to make changes.",
  });
  return true;
}
