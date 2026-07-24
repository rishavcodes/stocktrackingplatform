// Shared portfolio-pricing normalization (frontend mirror of
// server/src/lib/portfolioPricing.ts).
//
// Portfolios moved from a single { fees, feeValidity:"N months/years" } model to
// pricingPlans:[{ validity:<days>, price }] (matching Packages/Services). Legacy
// docs (and the back-compat `fees`/`feeValidity` mirrors) are normalized through
// here so every read site sees one consistent shape and never has to branch on
// which fields exist.

export type PricingPlan = { validity: number; price: number };

export type NormalizedPricing = {
  plans: PricingPlan[];
  minPrice: number;
  cheapestPlan: PricingPlan | null;
};

const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

/** "12 months" -> 360, "2 years" -> 730. Accepts a bare number string too. */
export function feeValidityToDays(feeValidity?: string | number | null): number {
  if (feeValidity === undefined || feeValidity === null) return 0;
  const raw = String(feeValidity).trim();
  const m = raw.match(/^(\d+)\s*(months?|years?)$/i);
  if (!m) {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  }
  const value = parseInt(m[1], 10) || 0;
  return /^year/i.test(m[2]) ? value * DAYS_PER_YEAR : value * DAYS_PER_MONTH;
}

/** Inverse, used only to keep the legacy `feeValidity` mirror human-readable. */
export function daysToFeeValidityLabel(days: number): string {
  const d = Math.max(0, Math.round(Number(days) || 0));
  if (d > 0 && d % DAYS_PER_YEAR === 0) {
    const years = d / DAYS_PER_YEAR;
    return `${years} ${years === 1 ? "year" : "years"}`;
  }
  if (d > 0 && d % DAYS_PER_MONTH === 0) {
    const months = d / DAYS_PER_MONTH;
    return `${months} ${months === 1 ? "month" : "months"}`;
  }
  return `${d} days`;
}

/**
 * Returns the portfolio's pricing as a clean plans array regardless of whether
 * the doc has the new `pricingPlans` or only the legacy `fees`/`feeValidity`.
 * Never throws and always returns at least one plan.
 */
export function normalizePortfolioPricing(p: any): NormalizedPricing {
  let raw = p?.pricingPlans;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }

  let plans: PricingPlan[] = [];
  if (Array.isArray(raw) && raw.length > 0) {
    plans = raw
      .map((x: any) => ({
        validity: Number(x?.validity) || 0,
        price: Number(x?.price) || 0,
      }))
      .filter((x) => Number.isFinite(x.validity) && Number.isFinite(x.price));
  }

  if (plans.length === 0) {
    plans = [
      { validity: feeValidityToDays(p?.feeValidity), price: Number(p?.fees) || 0 },
    ];
  }

  const cheapestPlan = plans.reduce<PricingPlan | null>(
    (min, pl) => (min === null || pl.price < min.price ? pl : min),
    null
  );
  const minPrice = cheapestPlan ? cheapestPlan.price : 0;

  return { plans, minPrice, cheapestPlan };
}
