// Mirror of server/src/lib/subProfileDefaults.ts — keep in sync.
// Drives: the master's checkbox grid, the SP sidebar filter, the route guards
// in middleware.ts, and any in-page permission checks via can().

// Each module declares the SP-dashboard URL prefixes it owns. These match
// the actual routes used by the SP sidebar (see ProviderSideBar in
// /dashboard/serviceprovider/layout.tsx). `services` is the broadest bucket —
// it covers plans, subscribers, packages, and coupons since they're all
// part of the "selling your plans" surface.
export const PERMISSION_MODULES = [
  {
    key: "profile",
    label: "Profile",
    routes: ["/dashboard/serviceprovider/myprofile"],
  },
  {
    key: "wallet",
    label: "Wallet",
    routes: ["/dashboard/serviceprovider/wallet"],
  },
  {
    key: "recommendation",
    label: "Recommendations",
    routes: [
      "/dashboard/serviceprovider/recommendations",
      "/dashboard/serviceprovider/scorecard",
    ],
  },
  {
    key: "services",
    label: "Plans / Services",
    routes: [
      "/dashboard/serviceprovider/services",
      "/dashboard/serviceprovider/subscribers",
      "/dashboard/serviceprovider/packages",
      "/dashboard/serviceprovider/content/createcoupon",
    ],
  },
  {
    key: "portfolios",
    label: "Model Portfolios",
    routes: ["/dashboard/serviceprovider/portfolio"],
  },
  {
    key: "articles",
    label: "Research Reports / Articles",
    routes: ["/dashboard/serviceprovider/content/researchreports"],
  },
  {
    key: "events",
    label: "Events",
    routes: ["/dashboard/serviceprovider/content/events"],
  },
  {
    key: "leads",
    label: "Leads",
    routes: ["/dashboard/serviceprovider/leads"],
  },
  {
    key: "marketplace",
    label: "Marketplace",
    routes: ["/dashboard/serviceprovider/marketplace"],
  },
  {
    key: "billing",
    label: "Billing & Invoices",
    routes: ["/dashboard/serviceprovider/billing"],
  },
] as const;

export type PermissionKey = (typeof PERMISSION_MODULES)[number]["key"];

export type Permissions = Record<PermissionKey, boolean>;

export const SEAT_LIMITS = { admin: 2, user: 10 } as const;

// Returns whether the current session may see/use a given module key.
// - Master / Individual / non-sub: always true (subProfileRole is absent).
// - admin-role sub: read their per-key permission map (master picks which
//   modules the admin sees, same gate as user-role).
// - user-role sub: read their per-key permission, fall back to false.
// - legacy sub (no role on the JWT): true (back-compat).
//
// Note: don't confuse this with `session.user.role` (always "provider" for any
// SP-side login). The gate is `subProfileRole`, set only on sub-profile accounts.
export function can(
  session: any | undefined | null,
  key: PermissionKey,
): boolean {
  if (!session?.user) return true; // no session yet; let other gates decide
  const subProfileRole = session.user.subProfileRole as
    | "admin"
    | "user"
    | undefined;
  // Only sub-profile accounts have subProfileRole — undefined means master /
  // Individual / legacy session that predates this field.
  if (!subProfileRole) return true;
  const perms = session.user.subPermissions as Permissions | undefined;
  if (!perms) return false; // sub-profile with no perms loaded → deny
  return Boolean(perms[key]);
}

// True when the session belongs to a view-only "admin" sub-profile. Admin subs
// are trusted overseers: they can SEE every module the master ticked for them
// (and their data scope spans the whole firm), but they can't create, edit, or
// delete anything. The backend hard-enforces this (server middleware
// subProfileReadOnly.ts); the frontend uses this helper to hide action buttons
// so an admin isn't shown controls that would just 403.
//
// User subs return false here — they keep full write access within their
// permitted modules. Master / Individual / legacy sessions also return false.
export function isReadOnlySubProfile(
  session: any | undefined | null,
): boolean {
  return session?.user?.subProfileRole === "admin";
}

// Maps a pathname to the module key that owns it. Used by middleware route
// guards to decide whether to allow / redirect a request.
export function modulePermissionForPath(
  pathname: string,
): PermissionKey | null {
  for (const m of PERMISSION_MODULES) {
    if (m.routes.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
      return m.key;
    }
  }
  return null;
}
