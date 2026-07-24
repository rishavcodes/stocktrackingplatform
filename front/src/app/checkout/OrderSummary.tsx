"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/store/rootReducer";
import { ShieldCheck } from "lucide-react";

export default function OrderSummary() {
    const item = useSelector((s: RootState) => s.cart.items[0]);
    const step2Data = useSelector(
        (s: RootState) => s.cartSteps.step2Data
    );

    if (!item) return null;

    /* ---------------- PRICE LOGIC ---------------- */

    const originalSubtotal = item.basePrice;

    const discountedSubtotal =
        step2Data?.discountedSubtotal ?? null;

    const isCouponApplied =
        step2Data?.isCouponApplied ?? false;

    const subtotal =
        discountedSubtotal ?? originalSubtotal;

    const gst = item.isGST
        ? Number((subtotal * 0.18).toFixed(2))
        : 0;

    const total = subtotal + gst;

    /* ---------------- UI ---------------- */

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow sticky top-6">

            <h2 className="text-lg font-bold mb-4">
                Order Summary
            </h2>

            {/* <div className="mb-4">
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-gray-500">
                    By {item.authorName}
                </p>
            </div> */}

            <div className="space-y-2 text-sm">

                {isCouponApplied && (
                    <>
                        <div className="flex justify-between line-through text-gray-400">
                            <span>Original</span>
                            <span>₹{originalSubtotal}</span>
                        </div>

                        <div className="flex justify-between text-green-600 font-medium">
                            <span>Discount</span>
                            <span>
                                -₹{(originalSubtotal - subtotal).toFixed(2)}
                            </span>
                        </div>
                    </>
                )}

                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                </div>

                {item.isGST && (
                    <div className="flex justify-between">
                        <span>GST (18%)</span>
                        <span>₹{gst.toFixed(2)}</span>
                    </div>
                )}
            </div>

            <hr className="my-4" />

            <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
            </div>

            <div className="mt-4 flex gap-2 text-xs text-gray-500">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                Secure checkout · GST compliant · Invoice after payment
            </div>
        </div>
    );
}
