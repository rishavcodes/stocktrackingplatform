// Single source of truth for sub-profile permissions and seat limits.
// Mirrored on the frontend at front/src/lib/subProfilePermissions.ts — keep in
// sync when changing the module list or the limits.

export const PERMISSION_KEYS = [
  "profile",
  "wallet",
  "recommendation",
  "services",
  "portfolios",
  "articles",
  "events",
  "leads",
  "marketplace",
  "billing",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type Permissions = Record<PermissionKey, boolean>;

// Deny-by-default. Used when a "user" sub profile is created without explicit
// ticks (shouldn't happen via the UI, but defends against misuse of the API).
export const DEFAULT_PERMISSIONS: Permissions = PERMISSION_KEYS.reduce(
  (acc, k) => ({ ...acc, [k]: false }),
  {} as Permissions,
);

// Allow-by-default. Used when looking up permissions for legacy sub profile
// records created BEFORE this feature shipped (their `permissions` block is
// undefined). Preserves their current behaviour so no data migration needed.
export const LEGACY_PERMISSIONS: Permissions = PERMISSION_KEYS.reduce(
  (acc, k) => ({ ...acc, [k]: true }),
  {} as Permissions,
);

// Hardcoded seat caps. Future "edit seat limit" admin tool can override these
// per-SP by adding a `seatLimits` field on the master record.
export const SEAT_LIMITS = {
  admin: 2,
  user: 10,
} as const;

export type SubProfileRole = "admin" | "user";

// Returns the effective permissions for an SP record.
// - Master / Individual / non-sub: full access (true for everything).
// - admin-role sub: their own `permissions` block — the master picks which
//   modules the admin sees (Profile / Wallet are opt-in, not automatic).
// - user-role sub: their own `permissions` block, falling back to deny-by-default
//   if somehow missing.
// - legacy sub profile (no subProfileRole set): grandfathered to full access.
export function resolvePermissions(sp: any): Permissions {
  if (!sp?.addedby?.isSubProfile) return LEGACY_PERMISSIONS; // master / individual
  const role = sp.addedby?.subProfileRole as SubProfileRole | undefined;
  if (!role) return LEGACY_PERMISSIONS;                       // legacy sub
  return { ...DEFAULT_PERMISSIONS, ...(sp.addedby?.permissions || {}) };
}
