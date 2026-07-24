import type { ClientSession } from "mongoose";
import { CouponModel } from "../models/PostModels";
import {
  isCouponExpired,
  isCouponNotYetActive,
} from "../utils/couponDateRange";

/**
 * Single source of truth for coupon validation. Used by:
 *   - POST /api/services/applycoupon (customer-side checkout preview)
 *   - POST /api/payment/leads/:leadId/convert (SP-side lead conversion)
 *
 * Validation rules (kept identical to the original applyCoupon handler so
 * that a coupon a customer could redeem at checkout is the same coupon an SP
 * can apply when converting their lead): existence, plan/validity targeting,
 * IST-aware date window, global usage limit, positive discount value.
 */

export interface ValidateCouponInput {
  couponCode: string;
  serviceId: string;
  price: number;
  validity?: number;
}

export type ValidateCouponResult =
  | {
      ok: true;
      discountedPrice: number;
      discountAmount: number;
      coupon: {
        id: string;
        code: string;
        type: string;
        value: number;
        startDate: Date;
        expiryDate: Date;
      };
    }
  | {
      ok: false;
      status: number;
      message: string;
    };

export async function validateCoupon(
  input: ValidateCouponInput,
): Promise<ValidateCouponResult> {
  const { couponCode, serviceId, price, validity } = input;

  if (!serviceId || !couponCode || price === undefined || price === null) {
    return {
      ok: false,
      status: 400,
      message: "Missing required fields: serviceId, couponCode, or price",
    };
  }

  const coupon = await CouponModel.findOne({ code: couponCode });
  if (!coupon) {
    return { ok: false, status: 404, message: "Coupon not found" };
  }

  /* SERVICE + VALIDITY TARGETING — newer coupons store (serviceId, validity)
     pairs; older coupons only have serviceIds and apply to any duration. */
  const serviceValidities = (coupon as any).serviceValidities as
    | { serviceId: any; validity: number }[]
    | undefined;

  if (serviceValidities && serviceValidities.length > 0) {
    if (typeof validity !== "number") {
      return {
        ok: false,
        status: 400,
        message: "Validity is required to apply this coupon",
      };
    }
    const matches = serviceValidities.some(
      (row) =>
        row.serviceId?.toString() === serviceId.toString() &&
        Number(row.validity) === Number(validity),
    );
    if (!matches) {
      return {
        ok: false,
        status: 400,
        message: "Coupon not valid for this plan/duration",
      };
    }
  } else if (
    coupon.serviceIds?.length &&
    !coupon.serviceIds.some(
      (id: any) => id.toString() === serviceId.toString(),
    )
  ) {
    return {
      ok: false,
      status: 400,
      message: "Coupon not valid for this service",
    };
  }

  if (isCouponNotYetActive(coupon.startDate)) {
    return { ok: false, status: 400, message: "Coupon not yet active" };
  }
  if (isCouponExpired(coupon.expiryDate)) {
    return { ok: false, status: 400, message: "Coupon has expired" };
  }

  if (coupon.usedCount >= coupon.usageLimit) {
    return {
      ok: false,
      status: 400,
      message: "Coupon usage limit exceeded",
    };
  }

  if (coupon.discount <= 0) {
    return { ok: false, status: 400, message: "Invalid discount value" };
  }

  const discountedPrice = Math.max(
    coupon.discountType === "percentage"
      ? price - (price * coupon.discount) / 100
      : price - coupon.discount,
    0,
  );

  return {
    ok: true,
    discountedPrice,
    discountAmount: price - discountedPrice,
    coupon: {
      id: String(coupon._id),
      code: coupon.code,
      type: coupon.discountType,
      value: coupon.discount,
      startDate: coupon.startDate,
      expiryDate: coupon.expiryDate,
    },
  };
}

/**
 * Atomic, transactional increment of `usedCount`. Used by every successful
 * coupon redemption (customer checkout, marketplace checkout, SP-side lead
 * conversion) so the global `usageLimit` ceiling is actually enforced.
 *
 * The `$expr` predicate makes the increment safe under concurrency: two
 * simultaneous redemptions at `usedCount = usageLimit - 1` cannot both bump
 * past the cap — the second one will fail to match and return null.
 *
 * Pass the same Mongoose `session` that the surrounding order save uses, so
 * if the order pipeline aborts the increment is rolled back with it.
 */
export async function redeemCoupon(
  couponId: string,
  session?: ClientSession,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const updated = await CouponModel.findOneAndUpdate(
    { _id: couponId, $expr: { $lt: ["$usedCount", "$usageLimit"] } },
    { $inc: { usedCount: 1 } },
    { session, new: true },
  );

  if (!updated) {
    return { ok: false, message: "Coupon usage limit reached" };
  }
  return { ok: true };
}
