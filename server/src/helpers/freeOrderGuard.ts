import { ServiceModel } from "../models/PostModels";
import { Portfolio } from "../lib/schema";
import { PackageModel } from "../models/PackageModel";
import { validateCoupon } from "./validateCoupon";

export type FreeOrderInput = {
  subscribedToId: string;
  type?: string;
  validity?: number | string;
  coupon?: { id?: string; code?: string } | null;
};

export type FreeOrderResult =
  | { ok: true; couponId?: string }
  | { ok: false; status: number; message: string };

/**
 * Resolve an item's REAL base price for a validity tier from its `pricingPlans`
 * (service / portfolio / package all expose `[{ validity, price }]`). Falls back
 * to the cheapest plan when the validity can't be matched (e.g. legacy portfolio
 * validity strings), then to the legacy `price`/`fees` mirrors. Returns null
 * when nothing can be resolved.
 */
async function resolveItemPrice(
  subscribedToId: string,
  type: string | undefined,
  validity: number | undefined,
): Promise<number | null> {
  const pickFromPlans = (plans: any[] | undefined): number | null => {
    if (!Array.isArray(plans) || plans.length === 0) return null;
    if (validity !== undefined && !Number.isNaN(validity)) {
      const match = plans.find(
        (p) => Number(p?.validity) === Number(validity),
      );
      if (match && typeof match.price === "number") return match.price;
    }
    const prices = plans
      .map((p) => Number(p?.price))
      .filter((n) => !Number.isNaN(n));
    return prices.length ? Math.min(...prices) : null;
  };

  try {
    if (type === "portfolio") {
      const p = (await Portfolio.findById(subscribedToId)
        .select("pricingPlans fees")
        .lean()) as any;
      if (!p) return null;
      return (
        pickFromPlans(p.pricingPlans) ??
        (typeof p.fees === "number" ? p.fees : null)
      );
    }
    if (type === "package") {
      const pkg = (await PackageModel.findById(subscribedToId)
        .select("pricingPlans")
        .lean()) as any;
      if (!pkg) return null;
      return pickFromPlans(pkg.pricingPlans);
    }
    const s = (await ServiceModel.findById(subscribedToId)
      .select("pricingPlans price")
      .lean()) as any;
    if (!s) return null;
    return (
      pickFromPlans(s.pricingPlans) ??
      (typeof s.price === "number" ? s.price : null)
    );
  } catch (err) {
    console.error("resolveItemPrice failed", {
      subscribedToId,
      type,
      validity,
      err,
    });
    return null;
  }
}

/**
 * Authoritative server-side guard for a ₹0 ("free") checkout.
 *
 * Confirms the order is GENUINELY free — either a real ₹0-priced item, or a
 * coupon that reduces the item's REAL (DB-resolved) price to ₹0. This is the
 * only thing standing between a tampered `total: 0` and a forged free
 * subscription, since the free path has no payment-gateway signature to trust.
 */
export async function assertFreeOrderEligible(
  input: FreeOrderInput,
): Promise<FreeOrderResult> {
  const { subscribedToId, type, coupon } = input;
  const validity =
    input.validity === undefined || input.validity === null
      ? undefined
      : Number(input.validity);

  if (!subscribedToId) {
    return { ok: false, status: 400, message: "Missing item for free checkout" };
  }

  const realPrice = await resolveItemPrice(subscribedToId, type, validity);

  // Genuinely free item — no coupon needed.
  if (realPrice === 0) {
    return {
      ok: true,
      couponId: coupon?.id ? String(coupon.id) : undefined,
    };
  }

  // Otherwise a coupon is mandatory and must zero out the REAL price.
  if (!coupon?.code) {
    return {
      ok: false,
      status: 403,
      message: "A coupon covering the full amount is required for free checkout",
    };
  }

  const result = await validateCoupon({
    couponCode: coupon.code,
    serviceId: String(subscribedToId),
    price: realPrice ?? 0,
    validity,
  });

  if (!result.ok) {
    return { ok: false, status: 403, message: result.message };
  }

  const isFullPercentage =
    result.coupon.type === "percentage" && Number(result.coupon.value) >= 100;

  if (realPrice === null) {
    // Couldn't resolve the real price — only a 100% coupon is safe to trust,
    // since it zeroes ANY price. A fixed coupon can't be trusted without it.
    if (isFullPercentage) return { ok: true, couponId: result.coupon.id };
    return {
      ok: false,
      status: 403,
      message: "Unable to verify free eligibility for this item",
    };
  }

  // Real price known: the validated coupon must reduce it to exactly ₹0.
  if (result.discountedPrice === 0) {
    return { ok: true, couponId: result.coupon.id };
  }

  return {
    ok: false,
    status: 403,
    message: "Coupon does not fully cover the amount",
  };
}
