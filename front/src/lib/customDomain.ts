export type ResolvedSp = {
  _id: string;
  customSubdomainStatus: "pending" | "active" | "disabled";
  approved?: boolean;
  verified?: boolean;
  RegName?: string;
  companyLogo?: string;
};

type CacheEntry = { value: ResolvedSp | null; expiresAt: number };

const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

export const APEX_DOMAIN = "tradeboxlive.com";

// Hostnames under the apex that must never be treated as SP custom
// subdomains — they're infra environments (UAT/staging/dev) or the
// apex alias, not provider-owned brands. Without this, visiting
// `uat.tradeboxlive.com` would be interpreted as an SP called "uat",
// fail SP resolution, and redirect to production.
const RESERVED_SUBDOMAINS = new Set(["www", "uat", "staging", "dev"]);

export function parseSubdomain(host: string): string | null {
  const h = host.toLowerCase().split(":")[0];
  if (h === APEX_DOMAIN || h === `www.${APEX_DOMAIN}`) return null;
  if (!h.endsWith(`.${APEX_DOMAIN}`)) return null;
  const sub = h.slice(0, -`.${APEX_DOMAIN}`.length);
  if (RESERVED_SUBDOMAINS.has(sub)) return null;
  return sub;
}

export async function resolveSpBySubdomain(
  sub: string
): Promise<ResolvedSp | null> {
  const key = sub.toLowerCase();
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && hit.expiresAt > now) return hit.value;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/sp-by-subdomain/${encodeURIComponent(key)}`,
      { method: "GET", cache: "no-store" }
    );
    if (!res.ok) {
      cache.set(key, { value: null, expiresAt: now + TTL_MS });
      return null;
    }
    const json = (await res.json()) as { success: boolean; data?: ResolvedSp };
    const value = json?.success && json.data ? json.data : null;
    cache.set(key, { value, expiresAt: now + TTL_MS });
    return value;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------
   Product view URL builder
   -------------------------------------------------------------- */

export type ProductType =
  | "services"
  | "article"
  | "articlepdf"
  | "events"
  | "portfolio"
  | "packages"
  | "courses";

export type SpLike =
  | (Record<string, any> & {
      customSubdomain?: string | null;
      customSubdomainStatus?: "pending" | "active" | "disabled" | null;
    })
  | null
  | undefined;

const VIEW_PATH: Record<ProductType, (id: string) => string> = {
  services: (id) => `/view/services/${id}`,
  article: (id) => `/view/researchreport/page/${id}`,
  articlepdf: (id) => `/view/researchreport/pdf/${id}`,
  events: (id) => `/view/events/details/${id}`,
  portfolio: (id) => `/view/portfolio/${id}`,
  packages: (id) => `/view/packages/${id}`,
  courses: (id) => `/view/courses/${id}`,
};

function buildQueryString(
  query?: Record<string, string | number | undefined | null>
): string {
  if (!query) return "";
  const entries = Object.entries(query).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!entries.length) return "";
  return (
    "?" +
    entries
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
      )
      .join("&")
  );
}

/**
 * Build a public product view URL.
 * Returns absolute `https://<sub>.tradeboxlive.com/...` when the SP has an
 * active custom subdomain; otherwise returns a relative `/view/...` path
 * that stays on whichever host the user is currently on.
 */
export function buildProductUrl(
  type: ProductType,
  id: string,
  sp?: SpLike,
  query?: Record<string, string | number | undefined | null>
): string {
  const path = VIEW_PATH[type](id);
  const qs = buildQueryString(query);
  if (sp?.customSubdomainStatus === "active" && sp.customSubdomain) {
    return `https://${sp.customSubdomain}.${APEX_DOMAIN}${path}${qs}`;
  }
  return `${path}${qs}`;
}

/**
 * Force an absolute URL on the apex domain. Used by the cross-SP guard
 * when redirecting `acme.tradeboxlive.com/view/<beta-product>` away.
 */
export function buildApexUrl(path: string, search = ""): string {
  return `https://${APEX_DOMAIN}${path}${search}`;
}
