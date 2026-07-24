// Filter chip categories used by both the bell dropdown and the standalone
// notifications page. A category groups several backend `type` values into
// one label so users can scope the list by area-of-concern instead of
// guessing at internal type names.
//
// Add new types to an existing bucket (most common) or to "other" (catch-all
// for anything not explicitly mapped). New categories should appear here in
// the order they should render — both surfaces reuse this same list.

export type FilterCategory = {
  key: string;
  label: string;
  // Set of backend `type` strings that fall under this label. Match is exact —
  // anything not appearing in any list ends up under "other".
  types: string[];
};

export const FILTER_CATEGORIES: FilterCategory[] = [
  {
    key: "recommendations",
    label: "Recommendations",
    types: [
      "recommendation-new",
      "recommendation-closed",
      "recommendation-modified",
      "recommendation-deleted",
    ],
  },
  {
    key: "content",
    label: "Content",
    types: ["content-added"],
  },
  {
    key: "events",
    label: "Events",
    types: ["event"],
  },
  {
    key: "payments",
    label: "Payments",
    types: [
      "service",
      "payment-verified",
      "payment-rejected",
      "payment-verification",
      "course-sale",
    ],
  },
  {
    key: "wallet",
    label: "Wallet",
    types: [
      "wallet",
      "topup",
      "gateway",
      "deduction",
      "Onboarding-Charge",
      "marketplace-broker-commission",
    ],
  },
  {
    key: "leads",
    label: "Leads",
    types: ["lead-new"],
  },
  {
    key: "subscription",
    label: "Subscription",
    types: ["plan-expired", "plan-expiring"],
  },
  {
    key: "messages",
    label: "Messages",
    types: ["quickmessage"],
  },
];

// Build a reverse lookup so we can find the category of a given type in O(1)
// instead of scanning the array per notification on every render.
const TYPE_TO_CATEGORY: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const cat of FILTER_CATEGORIES) {
    for (const t of cat.types) map[t] = cat.key;
  }
  return map;
})();

// Returns the category key for a notification type, or "other" for unknowns.
export function categoryForType(type: string | undefined | null): string {
  if (!type) return "other";
  return TYPE_TO_CATEGORY[type] || "other";
}

// True when the notification passes the current filter. "all" matches everything.
export function notificationMatchesFilter(
  notification: { type?: string },
  filterKey: string,
): boolean {
  if (filterKey === "all") return true;
  return categoryForType(notification.type) === filterKey;
}
