"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/rootReducer";
import { clearCart } from "@/store/slices/cartSlice";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Script from "next/script";
import { useRouter } from "next/navigation";
import OrderSummary from "@/app/checkout/OrderSummary";
import { FiTag } from "react-icons/fi";
import { setStepData } from "@/store/slices/cartStepSlice";
import { updateLead } from "@/lib/updateLead";
import OrderSuccess from "./OrderSuccess";

interface Step2Props {
  onPaymentInitiated?: () => void;
}

const MAX_PROOF_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_PROOF_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

export default function Step2({ onPaymentInitiated }: Step2Props) {
  const dispatch = useDispatch();
  const { toast } = useToast();
  const session = useSession();
  const router = useRouter();

  const cartItem = useSelector((s: RootState) => s.cart.items[0]);
  const step2Data = useSelector((s: RootState) => s.cartSteps.step2Data);
  const leadType = cartItem?.type || "service";

  /* ---------------- STATE (ALWAYS FIRST) ---------------- */
  const [gatewayEnabled, setGatewayEnabled] = useState<boolean | null>(null);
  const [gatewayType, setGatewayType] = useState<"razorpay" | "cashfree">("razorpay");
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [discountedSubtotal, setDiscountedSubtotal] = useState<number | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [recurringPaymentEnabled, setRecurringPaymentEnabled] = useState(false);
  const [autoRenew, setAutoRenew] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successRedirectUrl, setSuccessRedirectUrl] = useState<string>("/");

  // Show the auto-renewal option only when:
  //   1. SP has recurring payment enabled at account level (recurringPaymentEnabled)
  //   2. The plan itself allows recurring payment (cartItem.allowRecurringPayment)
  //   3. Payment gateway is Razorpay (Cashfree subscriptions handled separately)
  const canOfferAutoRenew =
    recurringPaymentEnabled &&
    gatewayType === "razorpay" &&
    !!(cartItem as any)?.allowRecurringPayment;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Extract values safely before early return
  const isRenewal = Boolean(cartItem?.isRenewal);
  const spId = cartItem?.authorId;
  const originalSubtotal = cartItem?.basePrice || 0;
  const subtotal = discountedSubtotal ?? originalSubtotal;
  const gst = cartItem?.isGST ? Number((subtotal * 0.18).toFixed(2)) : 0;
  const total = subtotal + gst;
  // A full-discount coupon (or a free item) makes the total ₹0, which payment
  // gateways reject. These orders skip the gateway and complete directly.
  const isFreeOrder = total === 0;

  async function applyCoupon() {
    if (isApplyingCoupon) return;
    setIsApplyingCoupon(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/applycoupon`,
        {
          method: "POST",
          body: JSON.stringify({
            serviceId: cartItem?.serviceId,
            couponCode,
            price: originalSubtotal,
            // Number of days for the chosen pricing tier. The backend uses
            // this to match validity-targeted coupons (e.g. coupon only
            // valid for the 90-day plan, not the 30-day plan).
            validity:
              typeof (cartItem as any)?.validity === "number"
                ? (cartItem as any).validity
                : parseInt((cartItem as any)?.validity, 10) || undefined,
          }),
          headers: { "Content-type": "application/json" },
        }
      );

      const data = await response.json(); // ✅ read once

      if (response.status === 200) {

        setDiscountedSubtotal(data.discountedPrice);
        setIsCouponApplied(true);
        setAppliedCoupon(data.coupon); // 👈 store coupon snapshot

        dispatch(
          setStepData({
            step: "step2Data",
            data: {
              isCouponApplied: true,
              discountedSubtotal: data.discountedPrice,
              coupon: data.coupon,
            },
          })
        );

        toast({
          title: "Coupon Applied",
          description: "Discount applied successfully.",
          variant: "success",
        });
      } else {
        toast({
          title: "Invalid Coupon",
          description: data.message || "This coupon is not valid.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to apply coupon",
        variant: "destructive",
      });
    } finally {
      setIsApplyingCoupon(false);
    }
  }

  function removeCoupon() {
    setDiscountedSubtotal(null);
    setIsCouponApplied(false);
    setCouponCode("");
    setAppliedCoupon(null);

    // 🔥 RESET REDUX
    dispatch(
      setStepData({
        step: "step2Data",
        data: {
          isCouponApplied: false,
          discountedSubtotal: null,
          coupon: null,
        },
      })
    );

    toast({
      title: "Coupon Removed",
      description: "Discount removed successfully.",
      variant: "default",
    });
  }



  /* ---------------- CREATE ORDER ---------------- */
  const createOrder = useCallback(
    async ({
      razorpay,
      paymentProof,
      cashfree,
    }: {
      razorpay?: any;
      paymentProof?: File;
      cashfree?: any;
    }) => {
      if (!cartItem || !session.data?.user?.id) {
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(true);

      const payload = {
        subscribedToId: cartItem.subscribedToId,
        orderById: session.data.user.id,
        serviceName: cartItem.title,
        orderByName: session.data.user.RegName || "",
        orderByEmail: session.data.user.email || "",
        soldById: cartItem.authorId,
        soldByName: cartItem.authorName,

        subtotal,
        gst,
        total,
        coupon: isCouponApplied
          ? {
            id: appliedCoupon?.id,
            code: appliedCoupon?.code,
            type: appliedCoupon?.type,
            value: appliedCoupon?.value,
          }
          : null,

        discountAmount: isCouponApplied
          ? originalSubtotal - subtotal
          : 0,
        validity: cartItem.validity,
        signedDocumentUrl: step2Data.signedDocURL,
        isGST: cartItem.isGST,
        isRenewal,

        kycDocuments: step2Data.kycDocuments || null,
        kycCompleted: step2Data.kycCompleted || false,

        razorpayPaymentId: razorpay?.razorpay_payment_id,
        razorpayOrderId: razorpay?.razorpay_order_id,
        razorpaySignature: razorpay?.razorpay_signature,
        razorpaySubscriptionId: razorpay?.razorpay_subscription_id,
        razorpayPlanId: razorpay?.razorpay_plan_id,
        autoRenew: razorpay?.autoRenew || false,

        cashfreePaymentId: cashfree?.cf_payment_id,
        cashfreeOrderId: cashfree?.cf_order_id,
        cashfreeReferenceOrderId: cashfree?.order_id,

        type: cartItem.type,
        paymentMode: total === 0 ? "free" : gatewayEnabled ? "gateway" : "manual",
        ...(cartItem.marketplaceSlug ? { marketplaceSlug: cartItem.marketplaceSlug } : {}),
      };

      try {
        const formData = new FormData();
        formData.append("data", JSON.stringify(payload));
        if (paymentProof) formData.append("paymentProof", paymentProof);

        const apiEndpoint = cartItem.marketplaceSlug
          ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/createandverifyordermarketplace`
          : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/createandverifyorder`;

        const res = await fetch(apiEndpoint, {
          method: "POST",
          body: formData,
        });

        // Read the JSON body regardless of status so we can surface the real
        // backend message instead of the generic "order creation failed" toast.
        let body: any = null;
        try {
          body = await res.json();
        } catch {
          /* response wasn't JSON — body stays null */
        }

        if (!res.ok || body?.success === false) {
          const err = new Error(body?.message || "Order creation failed");
          (err as any).backendCode = body?.code;
          (err as any).backendPaymentId = body?.paymentId;
          throw err;
        }

        toast({
          title: "Order placed successfully",
          description: "Redirecting to your service",
          variant: "success",
        });

        if (session.data?.backendToken) {
          updateLead("payment_success", cartItem.serviceId, session.data.backendToken, leadType);
        }

        // When the plan was purchased from a marketplace, send the customer
        // back to that marketplace. Otherwise fall back to the service/
        // portfolio/package view page.
        const redirectUrl = cartItem.marketplaceSlug
          ? `/marketplace/${cartItem.marketplaceSlug}`
          : `/view/${cartItem.type === "service"
            ? "services"
            : cartItem.type === "portfolio"
              ? "portfolio"
              : "packages"
            }/${cartItem.subscribedToId}`;

        // Show success animation first — clear cart & redirect only after the user dismisses it.
        // (Clearing the cart immediately would make the component return null and hide the modal.)
        setSuccessRedirectUrl(redirectUrl);
        setShowSuccess(true);
      } catch (err: any) {
        const gatewayPaymentId =
          razorpay?.razorpay_payment_id || cashfree?.cf_payment_id || null;
        const backendPaymentId = err?.backendPaymentId ?? null;
        const paymentId = backendPaymentId || gatewayPaymentId;
        const backendCode = err?.backendCode as string | undefined;
        const backendMessage = err?.message as string | undefined;

        // If the backend already produced a paid-but-no-order message, trust
        // it (it includes the payment id). Otherwise: when the gateway gave
        // us a payment id, the customer was charged — keep the support-contact
        // copy. When there's no payment id at all (validation rejected before
        // charge), prefer the backend's specific reason so KYC/aadhaar/
        // validity errors are actionable instead of being masked as generic.
        const description =
          backendCode === "ORDER_CREATE_FAILED"
            ? backendMessage ||
              `Payment was received (ID: ${paymentId}) but order creation failed. Please contact support.`
            : paymentId
              ? `Payment was received (ID: ${paymentId}) but order creation failed. Please contact support.`
              : backendMessage || "Unable to complete order. Please try again.";

        toast({
          title: "Order Failed",
          description,
          variant: "destructive",
          duration: 15000,
        });
        if (session.data?.backendToken) {
          updateLead("payment_failed", cartItem.serviceId, session.data.backendToken, leadType);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      cartItem,
      session.data?.user,
      session.data?.backendToken,
      subtotal,
      gst,
      total,
      step2Data,
      isRenewal,
      isCouponApplied,
      appliedCoupon,
      originalSubtotal,
      gatewayEnabled,
      dispatch,
      router,
      toast,
    ]
  );

  /* ---------------- GATEWAY PAYMENT (Razorpay / Cashfree) ---------------- */
  const handleGatewayPayment = useCallback(async () => {
    if (!step2Data?.signedDocURL || isSubmitting || !cartItem) return;

    onPaymentInitiated?.();
    setIsSubmitting(true);

    try {
      if (session.data?.backendToken) {
        updateLead("payment_initiated", cartItem.serviceId, session.data.backendToken, leadType);
      }

      const checkoutBody: any = {
        amount: Math.round(total * 100),
        spId,
        buyerId: session.data?.user?.id,
        buyerPhone: session.data?.user?.number,
        buyerEmail: session.data?.user?.email,
        buyerName: session.data?.user?.RegName,
      };

      if (autoRenew) {
        checkoutBody.autoRenew = true;
        checkoutBody.serviceName = cartItem.title;
        checkoutBody.validity = String(cartItem.validity);
        checkoutBody.type = cartItem.type;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(checkoutBody),
        }
      );

      const data = await res.json();

      // SP wallet too low / no active subscription — refuse before the gateway opens.
      if (!res.ok) {
        if (data?.code === "SP_INSUFFICIENT_WALLET" || data?.code === "SP_NO_SUBSCRIPTION") {
          toast({
            title: "Service temporarily unavailable",
            description:
              data?.message ||
              "This service can't accept new purchases right now. Please try again later or contact the service provider.",
            variant: "destructive",
            duration: 8000,
          });
          return;
        }
        toast({
          title: "Checkout failed",
          description: data?.message || "Could not start payment. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const gateway = data.gateway || "razorpay";

      /* ---------- CASHFREE ---------- */
      if (gateway === "cashfree") {
        const cashfree = (window as any).Cashfree;
        if (!cashfree) {
          toast({ title: "Error", description: "Cashfree SDK not loaded. Please refresh.", variant: "destructive" });
          return;
        }
        if (!data.paymentSessionId) {
          console.error("[Cashfree] Missing paymentSessionId from backend:", data);
          toast({ title: "Checkout Error", description: "Payment session could not be created. Please try again.", variant: "destructive" });
          return;
        }
        const cfMode = process.env.NEXT_PUBLIC_CASHFREE_ENV === "production" ? "production" : "sandbox";
        console.log("[Cashfree] Opening checkout", { mode: cfMode, paymentSessionId: data.paymentSessionId });

        let cf: any;
        try {
          cf = cashfree({ mode: cfMode });
        } catch (initErr) {
          console.error("[Cashfree] SDK init failed:", initErr);
          toast({ title: "Checkout Error", description: "Could not initialise Cashfree. Please refresh.", variant: "destructive" });
          return;
        }

        const checkoutOptions = {
          paymentSessionId: data.paymentSessionId,
          redirectTarget: "_modal",
        };

        try {
          const result: any = await cf.checkout(checkoutOptions);
          console.log("[Cashfree] checkout result:", result);

          if (result?.error) {
            if (session.data?.backendToken) {
              updateLead("payment_failed", cartItem.serviceId, session.data.backendToken, leadType);
            }
            toast({ title: "Payment Failed", description: result.error.message || JSON.stringify(result.error) || "Cashfree payment failed", variant: "destructive" });
            return;
          }
          if (result?.paymentDetails) {
            await createOrder({
              cashfree: {
                cf_payment_id: result.paymentDetails.paymentMessage,
                cf_order_id: data.cfOrderId,
                order_id: data.orderId,
              },
            });
          }
        } catch (checkoutErr: any) {
          console.error("[Cashfree] checkout threw:", checkoutErr);
          toast({ title: "Checkout Error", description: checkoutErr?.message || "Cashfree checkout could not open.", variant: "destructive" });
        }
        return;
      }

      /* ---------- RAZORPAY ---------- */
      if (!(window as any).Razorpay) {
        toast({ title: "Error", description: "Payment SDK not loaded. Please refresh the page.", variant: "destructive" });
        return;
      }

      if (data.isSubscription) {
        const razorpay = new (window as any).Razorpay({
          key: data.razorpayKeyId,
          subscription_id: data.subscriptionId,
          name: cartItem.title,
          description: `Auto-renewal subscription for ${cartItem.title}`,
          handler: async (response: any) => {
            await createOrder({
              razorpay: {
                ...response,
                razorpay_plan_id: data.razorpayPlanId,
                autoRenew: true,
              },
            });
          },
          modal: {
            ondismiss: () => {
              if (session.data?.backendToken) {
                updateLead("payment_failed", cartItem.serviceId, session.data.backendToken, leadType);
              }
              toast({ title: "Payment Cancelled", description: "You closed the payment window", variant: "destructive" });
            },
          },
          prefill: {
            name: session.data?.user?.RegName,
            email: session.data?.user?.email,
          },
          theme: { color: "#01E3A1" },
        });
        razorpay.open();
      } else {
        const razorpay = new (window as any).Razorpay({
          key: data.razorpayKeyId,
          amount: data.checkout.amount,
          currency: "INR",
          name: cartItem.title,
          order_id: data.checkout.id,
          handler: async (response: any) => {
            await createOrder({ razorpay: response });
          },
          modal: {
            ondismiss: () => {
              if (session.data?.backendToken) {
                updateLead("payment_failed", cartItem.serviceId, session.data.backendToken, leadType);
              }
              toast({ title: "Payment Cancelled", description: "You closed the payment window", variant: "destructive" });
            },
          },
          prefill: {
            name: session.data?.user?.RegName,
            email: session.data?.user?.email,
          },
          theme: { color: "#01E3A1" },
        });
        razorpay.open();
      }
    } catch {
      toast({
        title: "Payment Failed",
        description: "Unable to initiate payment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    step2Data,
    isSubmitting,
    total,
    spId,
    cartItem,
    session.data?.user,
    createOrder,
    toast,
    onPaymentInitiated,
    autoRenew,
    gatewayType,
  ]);

  /* ---------------- FREE ORDER (₹0 — full-discount coupon / free item) ---------------- */
  // A ₹0 total can't go through the gateway (min ₹1) and needs no proof. Skip
  // payment entirely and create the order directly; the backend independently
  // re-verifies the order is genuinely free before activating it.
  const handleFreeOrder = useCallback(async () => {
    if (!step2Data?.signedDocURL || isSubmitting || !cartItem) return;
    onPaymentInitiated?.();
    await createOrder({});
  }, [step2Data, isSubmitting, cartItem, createOrder, onPaymentInitiated]);

  /* ---------------- FETCH PAYMENT CONFIG ---------------- */
  useEffect(() => {
    if (!spId) return;

    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/get/paymentdetails?id=${spId}`
        );
        const data = await res.json();

        const isGateway = data?.data?.type === "gateway";
        setGatewayEnabled(isGateway);
        setGatewayType(data?.data?.gateway || "razorpay");
        setRecurringPaymentEnabled(!!data?.data?.recurringPaymentEnabled);

        if (!isGateway) {
          setPaymentDetails(data.data.paymentDetails);
        }
      } catch {
        toast({
          title: "Payment Error",
          description: "Unable to load payment configuration",
          variant: "destructive",
        });
      } finally {
        setLoadingDetails(false);
      }
    })();
  }, [spId, toast]);

  /* ---------------- MANUAL PAYMENT ---------------- */
  const handleManualSubmit = async () => {
    if (!paymentProof) {
      toast({
        title: "Payment Proof Required",
        description: "Please upload payment receipt",
        variant: "destructive",
      });
      return;
    }

    await createOrder({ paymentProof });
  };

  /* ---------------- SAFE EARLY RETURN (AFTER ALL HOOKS) ---------------- */
  if (!cartItem) return null;

  /* ---------------- UI ---------------- */
  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        strategy="afterInteractive"
      />
      <div className="bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-5">

            {/* LEFT - SERVICE DETAILS */}
            <div className="lg:col-span-8 space-y-3 sm:space-y-4">

              {/* Banner */}
              {/* {cartItem.bannerURL && (
                <div className="relative w-full h-40 sm:h-48 md:h-56 rounded-lg sm:rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <Image
                    src={cartItem.bannerURL}
                    alt="Service Banner"
                    fill
                    className="object-cover"
                  />
                </div>
              )} */}

              {/* Service Info */}
              <div className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-5">
                <h2 className="text-base sm:text-lg font-semibold tracking-tight">
                  {cartItem.title}
                </h2>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm mt-3">
                  <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md sm:rounded-lg">
                    <p className="text-slate-500 text-[11px] sm:text-xs">Validity</p>
                    <p className="font-semibold mt-0.5">{cartItem.validity} days</p>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md sm:rounded-lg">
                    <p className="text-slate-500 text-[11px] sm:text-xs">Plan Price</p>
                    <p className="font-semibold mt-0.5">₹{cartItem.basePrice}</p>
                  </div>
                </div>
              </div>

              {/* Seller & Customer Details */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {/* Seller Details */}
                <div className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                      Sold By
                    </h3>
                  </div>
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <div>
                      <p className="text-[11px] sm:text-xs text-slate-500">Name</p>
                      <p className="font-medium text-slate-900 dark:text-white mt-0.5">
                        {cartItem.authorName || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs text-slate-500">Role</p>
                      <p className="font-medium text-slate-900 dark:text-white mt-0.5">
                        Research Analyst
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                      Billed To
                    </h3>
                  </div>
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <div>
                      <p className="text-[11px] sm:text-xs text-slate-500">Name</p>
                      <p className="font-medium text-slate-900 dark:text-white mt-0.5 truncate">
                        {session.data?.user?.RegName || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs text-slate-500">Email</p>
                      <p className="font-medium text-slate-900 dark:text-white mt-0.5 truncate">
                        {session.data?.user?.email || "—"}
                      </p>
                    </div>
                    {session.data?.user?.number && (
                      <div>
                        <p className="text-[11px] sm:text-xs text-slate-500">Phone</p>
                        <p className="font-medium text-slate-900 dark:text-white mt-0.5">
                          {session.data.user.number}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Agreement */}
              
            </div>

            {/* RIGHT - SUMMARY + COUPON + PAY */}
            <div className="lg:col-span-4 space-y-3 sm:space-y-4">

              {/* Order summary */}
              <OrderSummary />

              {/* Coupon */}
              <div className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <FiTag className="text-purple-600" />
                  <h3 className="font-semibold text-sm sm:text-base">Apply Coupon</h3>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 sm:py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-md sm:rounded-lg bg-white dark:bg-slate-800"
                    placeholder="Enter coupon"
                    value={couponCode}
                    onChange={(e) =>
                      setCouponCode(e.target.value.toUpperCase())
                    }
                  />

                  {isCouponApplied ? (
                    <button
                      onClick={removeCoupon}
                      className="px-3 sm:px-4 py-2 sm:py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md sm:rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={applyCoupon}
                      disabled={isApplyingCoupon || !couponCode.trim()}
                      className="px-3 sm:px-4 py-2 sm:py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md sm:rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {isApplyingCoupon ? "..." : "Apply"}
                    </button>
                  )}
                </div>
              </div>
              
  {step2Data?.isEsignCompleted && (
                <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md sm:rounded-lg text-xs sm:text-sm text-green-700 dark:text-green-400">
                  ✅ Agreement signed successfully. You may proceed.
                </div>
              )}
              {/* PAY */}
              <div className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-5">

                {loadingDetails ? (
                  <div className="text-center py-3 sm:py-4 text-sm text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading payment options...
                  </div>
                ) : isFreeOrder ? (
                  <>
                    <div className="px-3 sm:px-4 py-2.5 sm:py-3 mb-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-md sm:rounded-lg text-xs sm:text-sm text-emerald-700 dark:text-emerald-400">
                      🎉 Your coupon covers the full amount — no payment needed.
                    </div>
                    <Button
                      disabled={isSubmitting || !step2Data?.signedDocURL}
                      onClick={handleFreeOrder}
                      className="w-full h-11 sm:h-12 text-sm sm:text-base"
                    >
                      {isSubmitting ? "Processing..." : "Complete Order"}
                    </Button>
                  </>
                ) : gatewayEnabled === null && !loadingDetails ? (
                  <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md sm:rounded-lg text-xs sm:text-sm text-red-700 dark:text-red-400 text-center">
                    Payment is not configured for this service. Please contact the service provider.
                  </div>
                ) : gatewayEnabled ? (
                  <>
                    {/* Auto-Renewal opt-in — only if SP allows it for this plan */}
                    {canOfferAutoRenew && (
                      <label className="flex items-start gap-2.5 p-3 mb-3 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors select-none">
                        <input
                          type="checkbox"
                          checked={autoRenew}
                          onChange={(e) => setAutoRenew(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                        />
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                            Enable Auto-Renewal via UPI
                          </p>
                          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            Your plan will auto-renew before expiry via UPI Auto-Pay. You can cancel anytime from your account settings.
                          </p>
                        </div>
                      </label>
                    )}

                    <Button
                      disabled={isSubmitting}
                      onClick={handleGatewayPayment}
                      className="w-full h-11 sm:h-12 text-sm sm:text-base"
                    >
                      {isSubmitting
                        ? "Processing..."
                        : autoRenew
                          ? "Pay & Setup Auto-Renewal"
                          : "Pay Securely"}
                    </Button>

                    <p className="text-[11px] sm:text-xs text-slate-500 text-center mt-2 sm:mt-3 flex justify-center items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                      Payments secured by {gatewayType === "cashfree" ? "Cashfree" : "Razorpay"}
                    </p>
                  </>
                ) : (
                  <>
                    {/* Manual Payment Details */}
                    {paymentDetails && (
                      <div className="mb-3 sm:mb-4 border border-slate-200 dark:border-slate-700 rounded-md sm:rounded-lg p-3 sm:p-4 space-y-3">
                        <h4 className="font-semibold text-sm sm:text-base">Payment Details</h4>

                        {/* Bank Details */}
                        <div className="space-y-2 text-sm">
                          {paymentDetails.bankName && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Bank Name</span>
                              <span className="font-medium">{paymentDetails.bankName}</span>
                            </div>
                          )}
                          {paymentDetails.beneficiaryName && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Beneficiary</span>
                              <span className="font-medium">{paymentDetails.beneficiaryName}</span>
                            </div>
                          )}
                          {paymentDetails.accNumber && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Account No.</span>
                              <span className="font-medium">{paymentDetails.accNumber}</span>
                            </div>
                          )}
                          {paymentDetails.ifsc && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">IFSC Code</span>
                              <span className="font-medium">{paymentDetails.ifsc}</span>
                            </div>
                          )}
                          {paymentDetails.upi && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">UPI ID</span>
                              <span className="font-medium">{paymentDetails.upi}</span>
                            </div>
                          )}
                        </div>

                        {/* QR Code */}
                        {paymentDetails.qrCode && (
                          <div className="flex flex-col items-center pt-3 border-t">
                            <p className="text-sm text-gray-500 mb-2">Scan to Pay</p>
                            <div className="relative w-40 h-40 rounded-lg overflow-hidden border">
                              <Image
                                src={paymentDetails.qrCode}
                                alt="Payment QR Code"
                                fill
                                className="object-contain"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Upload Payment Proof */}
                    <div className="mb-3 sm:mb-4 border border-slate-200 dark:border-slate-700 rounded-md sm:rounded-lg p-3 sm:p-4">
                      <p className="text-xs sm:text-sm mb-2 sm:mb-3 text-slate-600 dark:text-slate-400">
                        Upload payment receipt after making payment
                      </p>

                      <div
                        className="border-dashed border-2 border-slate-200 dark:border-slate-700 p-3 sm:p-4 rounded-md sm:rounded-lg cursor-pointer text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                      >
                        <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                          {paymentProof ? "Change Payment Proof" : "Upload Payment Proof"}
                        </span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          hidden
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            if (file) {
                              if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
                                toast({ title: "Invalid File", description: "Please upload an image (JPG, PNG) or PDF.", variant: "destructive" });
                                e.target.value = "";
                                return;
                              }
                              if (file.size > MAX_PROOF_SIZE) {
                                toast({ title: "File Too Large", description: "File must be under 10 MB.", variant: "destructive" });
                                e.target.value = "";
                                return;
                              }
                            }
                            setPaymentProof(file);
                          }}
                        />
                      </div>

                      {paymentProof && (
                        <p className="text-xs mt-2 text-green-600">
                          ✓ {paymentProof.name}
                        </p>
                      )}
                    </div>

                    <Button
                      disabled={
                        !paymentProof || isSubmitting
                      }
                      onClick={handleManualSubmit}
                      className="w-full"
                    >
                      {isSubmitting ? "Processing..." : "Confirm Order"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Success Animation — shown after successful payment */}
      {showSuccess && (
        <OrderSuccess
          onContinue={() => {
            setShowSuccess(false);
            dispatch(clearCart());
            router.replace(successRedirectUrl);
          }}
        />
      )}
    </>
  );
}