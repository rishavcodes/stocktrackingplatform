import { ServiceProviderRegModel } from "../models/AuthModels";

/**
 * In-memory cache for profile-family lookups. Each dashboard socket
 * connect calls `getProfileFamilyIds(id)` and the result is stable for the
 * life of a profile's parent/child relationships (changes only when a
 * sub-profile is added/removed — a rare admin action). A 60s TTL keeps
 * the cache fresh without making the resolver effectively static.
 */
const FAMILY_CACHE_TTL_MS = 60_000;
const familyCache = new Map<string, { ids: string[]; expiresAt: number }>();
const inflight = new Map<string, Promise<string[]>>();

/**
 * Drop a cached family entry. Call from admin actions that add/remove a
 * sub-profile under `masterId`, or when the affected sub-profile's parent
 * changes — otherwise the dashboard could keep showing/hiding the wrong
 * sibling trades for up to TTL.
 */
export function invalidateProfileFamily(profileId: string): void {
  familyCache.delete(profileId);
}

async function resolveProfileFamily(profileId: string): Promise<string[]> {
  const provider = await ServiceProviderRegModel.findById(profileId).select(
    "_id type addedby"
  );
  if (!provider) return [profileId];

  // Admin sub-profile: hop to the master, then return master + all its subs.
  const addedby: any = (provider as any).addedby;
  if (addedby?.isSubProfile && addedby?.subProfileRole === "admin") {
    const masterId = String(addedby.id || "");
    if (masterId) {
      const siblings = await ServiceProviderRegModel.find({
        "addedby.id": masterId,
      }).select("_id");
      return [
        masterId,
        ...siblings.map((sp: any) => sp._id.toString()),
      ];
    }
  }

  if (provider.type === "Non Individual") {
    const subProfiles = await ServiceProviderRegModel.find({
      "addedby.id": profileId,
    }).select("_id");
    return [
      profileId,
      ...subProfiles.map((sp: any) => sp._id.toString()),
    ];
  }

  return [profileId];
}

/**
 * Given a provider profile ID, returns all IDs in its "family":
 * - Non-Individual master: self + all sub-profiles
 * - Admin sub-profile: resolves to the master's family — admins see what the
 *   parent sees (master + all sibling sub-profiles), not just their own work.
 * - User sub-profile: just self
 * - Individual: just self
 *
 * Cached for FAMILY_CACHE_TTL_MS with single-flight dedup so a burst of
 * dashboard reconnects doesn't fan out into duplicate Mongo lookups.
 */
export async function getProfileFamilyIds(
  profileId: string
): Promise<string[]> {
  const now = Date.now();
  const cached = familyCache.get(profileId);
  if (cached && cached.expiresAt > now) return cached.ids;

  const existing = inflight.get(profileId);
  if (existing) return existing;

  const pending = (async () => {
    try {
      const ids = await resolveProfileFamily(profileId);
      familyCache.set(profileId, { ids, expiresAt: Date.now() + FAMILY_CACHE_TTL_MS });
      return ids;
    } finally {
      inflight.delete(profileId);
    }
  })();
  inflight.set(profileId, pending);
  return pending;
}

/**
 * Resolve the FIRM's family ids — master + every sub-profile — for ANY member.
 *
 * This differs from getProfileFamilyIds in one case: a **user** sub-profile.
 * getProfileFamilyIds scopes a user sub to just itself (so they only see their
 * OWN recommendations). But things that belong to the whole firm — plans,
 * coupons, packages — must be visible to every member so a user sub can create
 * a recommendation/quick-message and share it with the firm's plans. Here, any
 * sub-profile (admin OR user) hops up to the master and returns master + all
 * siblings; the master returns self + subs; an individual returns just itself.
 *
 * Use this for firm-owned resource lookups (plan/coupon/package pickers); use
 * getProfileFamilyIds for per-RA work like recommendations.
 */
export async function getFirmFamilyIds(profileId: string): Promise<string[]> {
  const provider = await ServiceProviderRegModel.findById(profileId).select(
    "_id type addedby"
  );
  if (!provider) return [profileId];

  const addedby: any = (provider as any).addedby;
  // Any sub-profile (admin or user) → the master's whole family.
  if (addedby?.isSubProfile && addedby?.id) {
    const masterId = String(addedby.id);
    const siblings = await ServiceProviderRegModel.find({
      "addedby.id": masterId,
    }).select("_id");
    return [masterId, ...siblings.map((sp: any) => sp._id.toString())];
  }

  // Master (Non Individual) → self + all sub-profiles.
  if (provider.type === "Non Individual") {
    const subProfiles = await ServiceProviderRegModel.find({
      "addedby.id": profileId,
    }).select("_id");
    return [profileId, ...subProfiles.map((sp: any) => sp._id.toString())];
  }

  return [profileId];
}
