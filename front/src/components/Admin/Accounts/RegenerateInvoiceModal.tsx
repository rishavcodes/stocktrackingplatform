"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { RotateCcw, Loader2, X } from "lucide-react";
import type { ServiceSale } from "./ServicesSoldTab";

type Coupon = {
  id?: string;
  code?: string;
  type?: string;
  value?: number;
};

type Props = {
  sale: ServiceSale | null;
  onClose: () => void;
  onSuccess: (newLink: string) => void;
  token: string;
};

function asNumber(v: unknown): string {
  if (v === undefined || v === null || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : "";
}

export default function RegenerateInvoiceModal({
  sale,
  onClose,
  onSuccess,
  token,
}: Props) {
  const { toast } = useToast();
  const isOpen = !!sale;

  const initialCoupon = useMemo<Coupon>(() => {
    const c = (sale as any)?.coupon;
    if (!c || typeof c !== "object") return {};
    return {
      id: c.id ?? undefined,
      code: c.code ?? undefined,
      type: c.type ?? undefined,
      value: typeof c.value === "number" ? c.value : undefined,
    };
  }, [sale]);

  const [subtotal, setSubtotal] = useState("");
  const [gst, setGst] = useState("");
  const [total, setTotal] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [autoTotal, setAutoTotal] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Coupon Apply UX mirrors StepTwo / convert-lead dialog: paste code → Apply
  // hits /api/services/applycoupon → backend validates against the pre-discount
  // baseline and returns the validated coupon snapshot + discountedPrice. We
  // then auto-fill the financial fields. Admin can still hand-tweak after.
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    type: string;
    value: number;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    if (!sale) return;
    // The Subtotal field represents the PRE-discount price (what the invoice
    // shows). Stored sale.subtotal is the post-discount / GST base, so add the
    // discount back to recover the pre-discount value. buildEdits() converts it
    // back to the stored convention before sending to the backend.
    setSubtotal(
      asNumber(Number(sale.subtotal ?? 0) + Number(sale.discountAmount ?? 0)),
    );
    setGst(asNumber(sale.gst));
    setTotal(asNumber(sale.total));
    setDiscountAmount(asNumber(sale.discountAmount));
    setCouponInput(initialCoupon.code ?? "");
    if (initialCoupon.code) {
      setAppliedCoupon({
        id: initialCoupon.id ?? "",
        code: initialCoupon.code,
        type: initialCoupon.type ?? "",
        value:
          typeof initialCoupon.value === "number" ? initialCoupon.value : 0,
      });
    } else {
      setAppliedCoupon(null);
    }
    setCouponError(null);
    setAutoTotal(true);
  }, [sale, initialCoupon]);

  useEffect(() => {
    if (!autoTotal) return;
    // Subtotal is the pre-discount price, so Total = subtotal − discount + gst.
    const s = Number(subtotal);
    const g = Number(gst);
    const d = Number(discountAmount || 0);
    if (Number.isFinite(s) && Number.isFinite(g) && Number.isFinite(d)) {
      setTotal(String(s - d + g));
    }
  }, [autoTotal, subtotal, gst, discountAmount]);

  if (!sale) return null;

  async function applyCouponInModal() {
    if (!sale) return;
    const code = couponInput.trim();
    if (!code) {
      setCouponError("Enter a coupon code first.");
      return;
    }
    if (!sale.subscribedToId) {
      setCouponError("Missing service id on this order — can't validate.");
      return;
    }
    // The Subtotal field already holds the pre-discount price, so validate the
    // coupon directly against it.
    const originalSubtotal = Number(subtotal || 0);
    if (!Number.isFinite(originalSubtotal) || originalSubtotal <= 0) {
      setCouponError("Subtotal must be a positive number.");
      return;
    }
    const validityNum = Number.parseInt(String(sale.validity ?? ""), 10);

    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/applycoupon`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceId: sale.subscribedToId,
            couponCode: code,
            price: originalSubtotal,
            validity: Number.isFinite(validityNum) ? validityNum : undefined,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setCouponError(data?.message || "Coupon could not be applied.");
        setAppliedCoupon(null);
        return;
      }
      const c = data.coupon ?? {};
      setAppliedCoupon({
        id: String(c.id ?? ""),
        code: String(c.code ?? code),
        type: String(c.type ?? ""),
        value: typeof c.value === "number" ? c.value : Number(c.value ?? 0),
      });
      // Auto-fill the financial fields. Subtotal stays at the pre-discount
      // price; only the discount and GST change. GST is scaled by the same
      // ratio as the post-discount/pre-discount change so the implied rate
      // (18% / 0% / whatever the order was on) is preserved. The autoTotal
      // useEffect then re-derives Total = subtotal − discount + gst.
      const discountedPrice = Number(data.discountedPrice);
      const newDiscount = Number(
        (originalSubtotal - discountedPrice).toFixed(2),
      );
      const currentGst = Number(gst || 0);
      const ratio =
        originalSubtotal > 0 ? discountedPrice / originalSubtotal : 0;
      const newGst = Number((currentGst * ratio).toFixed(2));
      setDiscountAmount(String(newDiscount));
      setGst(String(newGst));
    } catch {
      setCouponError("Network error. Please try again.");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCouponInModal() {
    // Subtotal is already the pre-discount price, so it doesn't change. Just
    // clear the discount and scale GST back up by the inverse of the ratio
    // used in apply (subtotal / discountedPrice) so the original implied rate
    // is preserved. The autoTotal useEffect then re-derives Total.
    const preDiscountSubtotal = Number(subtotal || 0);
    const discountedPrice = preDiscountSubtotal - Number(discountAmount || 0);
    const currentGst = Number(gst || 0);
    const ratio =
      discountedPrice > 0 ? preDiscountSubtotal / discountedPrice : 1;
    const originalGst = Number((currentGst * ratio).toFixed(2));
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
    if (Number.isFinite(originalGst)) {
      setGst(String(originalGst));
    }
    setDiscountAmount("");
  }

  const buildEdits = () => {
    const edits: Record<string, any> = {};
    const num = (raw: string): number | undefined => {
      if (raw === "" || raw === undefined) return undefined;
      const v = Number(raw);
      return Number.isFinite(v) ? v : undefined;
    };

    // The Subtotal field holds the pre-discount price; the backend stores the
    // post-discount (GST base) amount. Convert back before comparing/emitting
    // so the stored convention and the invoice PDF stay correct.
    const displayedSubtotal = num(subtotal);
    const discountNum = num(discountAmount) ?? 0;
    const postDiscountSubtotal =
      displayedSubtotal === undefined
        ? undefined
        : Number((displayedSubtotal - discountNum).toFixed(2));

    const initial = {
      subtotal: Number(sale.subtotal ?? 0),
      gst: asNumber(sale.gst),
      total: asNumber(sale.total),
      discountAmount: asNumber(sale.discountAmount),
    };

    if (
      postDiscountSubtotal !== undefined &&
      postDiscountSubtotal !== initial.subtotal
    )
      edits.subtotal = postDiscountSubtotal;
    if (gst !== initial.gst) edits.gst = num(gst);
    if (total !== initial.total) edits.total = num(total);
    // When the discount changes (incl. clearing a coupon) emit 0 rather than
    // undefined so the backend actually resets it.
    if (discountAmount !== initial.discountAmount)
      edits.discountAmount = num(discountAmount) ?? 0;

    // Coupon edits come from Apply / Remove. We track whether the applied
    // coupon differs from what was originally on the order so we don't
    // re-send the same value on every Save.
    const currentCode = appliedCoupon?.code ?? "";
    const initialCode = initialCoupon.code ?? "";
    if (currentCode !== initialCode) {
      if (!appliedCoupon) {
        edits.coupon = null; // admin cleared it
      } else {
        edits.coupon = {
          ...(appliedCoupon.id ? { id: appliedCoupon.id } : {}),
          code: appliedCoupon.code,
          type: appliedCoupon.type,
          value: appliedCoupon.value,
        };
      }
    }

    return Object.keys(edits).length > 0 ? edits : undefined;
  };

  const submit = async (withEdits: boolean) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const body: Record<string, any> = { orderId: sale._id };
      if (withEdits) {
        const edits = buildEdits();
        if (edits) body.edits = edits;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/order/regenerate-invoice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to regenerate invoice");
      }

      toast({
        title: "Invoice regenerated",
        description: `Invoice number: ${json.invoiceNumber}`,
      });
      onSuccess(json.invoiceLink);
      onClose();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to regenerate invoice",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-violet-600" />
            Regenerate invoice
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs text-gray-600">
            <div>
              <span className="text-gray-400">Order</span>{" "}
              <span className="font-medium text-gray-800">
                {sale.serviceName ?? "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Buyer</span>{" "}
              <span className="font-medium text-gray-800">
                {sale.orderdBy?.name ?? sale.purchasedBy ?? "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Provider</span>{" "}
              <span className="font-medium text-gray-800">
                {sale.soldBy?.name ?? sale.soldByName ?? "—"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Subtotal
              </label>
              <input
                type="number"
                step="0.01"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                GST
              </label>
              <input
                type="number"
                step="0.01"
                value={gst}
                onChange={(e) => setGst(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-700">
                  Total
                </label>
                <label className="text-[11px] text-gray-500 inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoTotal}
                    onChange={(e) => setAutoTotal(e.target.checked)}
                  />
                  Auto-calculate
                </label>
              </div>
              <input
                type="number"
                step="0.01"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                disabled={autoTotal}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Discount amount
              </label>
              <input
                type="number"
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-700 mb-2">Coupon</div>
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-50 px-3 py-2">
                <div className="text-xs">
                  <div className="font-medium text-green-800">
                    {appliedCoupon.code} applied
                  </div>
                  <div className="text-green-700">
                    Subtotal: ₹{subtotal || "0"}
                    {" · "}Discount: ₹{discountAmount || "0"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeCouponInModal}
                  disabled={submitting || couponLoading}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value);
                    if (couponError) setCouponError(null);
                  }}
                  placeholder="Enter coupon code"
                  disabled={submitting || couponLoading}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
                <button
                  type="button"
                  onClick={applyCouponInModal}
                  disabled={submitting || couponLoading || !couponInput.trim()}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {couponLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </button>
              </div>
            )}
            {couponError && (
              <p className="text-[11px] text-red-600 mt-1">{couponError}</p>
            )}
            <p className="text-[11px] text-gray-400 mt-1">
              Paste a code and tap Apply. The coupon is validated against the
              pre-discount price and the subtotal / discount fields above
              update automatically.
            </p>
          </div>

          <p className="text-[11px] text-gray-500">
            This replaces the current invoice PDF in place. The invoice number
            stays the same. The buyer is not re-emailed.
          </p>
        </div>

        <div className="flex items-center gap-2 mt-5">
          <button
            type="button"
            disabled={submitting}
            onClick={() => submit(false)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Regenerate (no edits)
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => submit(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Save changes & Regenerate
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
