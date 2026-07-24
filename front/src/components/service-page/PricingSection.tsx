"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { addToCart, clearCart } from "@/store/slices/cartSlice";
import { useDispatch } from "react-redux";
import { usePathname, useRouter } from "next/navigation";
import {
  FiShoppingCart,
  FiClock,
  FiRefreshCw,
} from "react-icons/fi";
import { updateLead } from "@/lib/updateLead";
import { formatCallQuotaLabel } from "@/lib/formatCallQuota";
import PurchaseKycModal from "@/components/Modal/PurchaseKycModal";

type PendingCart = {
  serviceId: string;
  planIndex: number;
  mode: "learning" | "kyc";
};

type CartItem = {
  title: string;
  author: string;
  authorId: string;
  authorName: string;
  tncFileURL: string;

  basePrice: number;
  gstAmount: number;
  totalPrice: number;
  isGST: boolean;

  validity: number;
  subscribedToId: string;
  serviceId: string;
};

interface PricingPlan {
  validity: number;
  price: number;
  purchaseType?: "ONE_TIME" | "RENEWABLE";
}

interface OrderDetails {
  _id: string;
  serviceName: string;
  startDate: string;
  endDate: string;
  validity: string;
  isExpired: boolean;
  daysRemaining: number;
  isRenewed: boolean;
  paymentStatus: string;
}

interface PricingSectionProps {
  data: {
    _id: string;
    title: string;
    pricingPlans?: PricingPlan[];
    price?: number;
    validity?: number;
    subscribedBy: string[];
    tncFileURL: string;
    bannerURL: string;
    authorData: {
      id: string;
      name: string;
    };
    purchaseType?: "ONE_TIME" | "RENEWABLE";
    callsQuota?: number | null;
    callsPeriod?: string | null;
  };
  spData: {
    gst?: string | null;
  } | null;
  isLoggedIn: boolean;
  setIsTncModalOpen: (open: boolean) => void;
  marketplaceSlug?: string;
}

export default function PricingSection({
  data,
  spData,
  isLoggedIn,
  setIsTncModalOpen,
  marketplaceSlug,
}: PricingSectionProps) {
  const { toast } = useToast();
  const session = useSession();
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();

  const [isBuying, setIsBuying] = useState(false);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [isChecked, setIsChecked] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [pendingRenewal, setPendingRenewal] = useState(false);

  const userId = session?.data?.user?.id;

  /* ---------- PRICING ---------- */

  const hasPricingPlans = data.pricingPlans && data.pricingPlans.length > 0;

  const selectedPlan = hasPricingPlans
    ? data.pricingPlans![selectedPlanIndex]
    : null;

  /* ---------- PURCHASE RULE (per selected pricing tier) ---------- */

  const selectedPlanPurchaseType: "ONE_TIME" | "RENEWABLE" =
    (selectedPlan?.purchaseType as "ONE_TIME" | "RENEWABLE") ??
    data.purchaseType ??
    "RENEWABLE";

  const isRenewableTier = selectedPlanPurchaseType === "RENEWABLE";

  const hasOrderForThisTier = Boolean(orderDetails);

  /** One-time tier already purchased (verified order for this validity) */
  const isOneTimeBlocked = !isRenewableTier && hasOrderForThisTier;

  /** Show renewal UI only for renewable tiers when user has an order for this tier */
  const showRenewalUI =
    Boolean(isLoggedIn) && isRenewableTier && hasOrderForThisTier;

  /* ---------- FETCH ORDER DETAILS FOR SELECTED TIER ---------- */

  useEffect(() => {
    if (!userId || !session?.data?.backendToken || !selectedPlan) {
      setOrderDetails(null);
      return;
    }

    const controller = new AbortController();
    setIsLoadingOrder(true);
    setOrderDetails(null);
    setIsChecked(false); // Bug #6: reset T&C checkbox when plan changes

    (async () => {
      try {
        const qs = new URLSearchParams({
          userId,
          validityDays: String(selectedPlan.validity),
        });
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/user-order/${data._id}?${qs.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${session.data.backendToken}`,
            },
            signal: controller.signal,
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setOrderDetails(result.order);
          }
        }
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          console.error("Error fetching order details:", error);
        }
      } finally {
        setIsLoadingOrder(false);
      }
    })();

    return () => controller.abort();
  }, [
    userId,
    data._id,
    selectedPlanIndex,
    selectedPlan?.validity,
    session?.data?.backendToken,
  ]);

  const isGSTApplicable = Boolean(spData?.gst);

  const buildCartItem = (plan: PricingPlan, isRenewal = false) => {
    const basePrice = plan.price;
    const gstAmount = isGSTApplicable
      ? Number((basePrice * 0.18).toFixed(2))
      : 0;

    const planPurchaseType: "ONE_TIME" | "RENEWABLE" =
      (plan.purchaseType as "ONE_TIME" | "RENEWABLE") ??
      data.purchaseType ??
      "RENEWABLE";

    return {
      title: data.title,
      author: data.authorData.name,
      authorId: data.authorData.id,
      authorName: data.authorData.name,
      tncFileURL: data.tncFileURL,
      bannerURL: data.bannerURL,
      basePrice,
      gstAmount,
      totalPrice: basePrice + gstAmount,
      isGST: isGSTApplicable,
      validity: plan.validity,
      subscribedToId: data._id,
      serviceId: data._id,
      type: "service",
      planPurchaseType,
      allowRecurringPayment: !!(data as any).allowRecurringPayment,
      isRenewal,
      previousOrderId: isRenewal && orderDetails ? orderDetails._id : null,
      ...(marketplaceSlug ? { marketplaceSlug } : {}),
    };
  };

  /* ---------- LOGIN REDIRECT ---------- */

  const callbackUrl =
    pathname === "/" ? "/dashboard/user" : pathname;

  const redirectToLogin = () => {
    if (!selectedPlan) return;

    router.push(
      `/auth/user/signin?mode=kyc&callbackUrl=${encodeURIComponent(
        callbackUrl
      )}`
    );
  };

  /* ---------- ADD TO CART ---------- */

  const needsKyc = () => {
    const user = session?.data?.user;
    if (!user) return false;
    return !user.RegName || !user.email || !(user as any).pannumber;
  };

  const proceedToCart = async (isRenewal = false) => {
    if (!selectedPlan || isBuying) return;

    setIsBuying(true);

    try {
      dispatch(clearCart());
      dispatch(addToCart(buildCartItem(selectedPlan, isRenewal)));
      await updateLead(
        "added_to_cart",
        data._id,
        session?.data?.backendToken!,
        "service"
      );
      router.push("/checkout");
    } finally {
      setIsBuying(false);
    }
  };

  const handleAddToCart = async (isRenewal = false) => {
    if (isOneTimeBlocked) {
      toast({
        title: "Purchase Not Allowed",
        description:
          "You have already purchased this validity option. It is set to one-time only.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPlan) {
      toast({
        title: "No Plan Selected",
        description: "Please select a pricing plan.",
        variant: "destructive",
      });
      return;
    }

    if (data.tncFileURL && !isChecked) {
      toast({
        title: "Consent Required",
        description: "Please accept the terms and conditions.",
        variant: "destructive",
      });
      return;
    }

    if (needsKyc()) {
      setPendingRenewal(isRenewal);
      setShowKycModal(true);
      return;
    }

    await proceedToCart(isRenewal);
  };

  /* ---------- FORMAT DATE ---------- */

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  /* ---------- UI ---------- */

  const callQuotaText = formatCallQuotaLabel(
    data.callsQuota,
    data.callsPeriod
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg border p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold">Select a Plan</h3>
        {callQuotaText && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Call commitment:{" "}
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {callQuotaText}
            </span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {hasPricingPlans &&
          data.pricingPlans!.map((plan, index) => (
            <div
              key={index}
              onClick={() => setSelectedPlanIndex(index)}
              className={`border rounded-xl p-4 cursor-pointer ${selectedPlanIndex === index
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200"
                }`}
            >
              <p className="text-lg font-bold">
                ₹{plan.price}
                {isGSTApplicable && (
                  <span className="text-xs font-semibold"> +18% GST</span>
                )}
              </p>
              <p className="text-sm text-gray-600 flex items-center">
                <FiClock className="mr-1" />
                {plan.validity} Days
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {(plan.purchaseType ?? data.purchaseType) === "ONE_TIME"
                  ? "One-time"
                  : "Renewable"}
              </p>
            </div>
          ))}
      </div>

      {isOneTimeBlocked ? (
        <div className="w-full bg-red-50 border border-red-300 text-red-700 py-4 rounded-xl font-semibold text-center px-2">
          You have already purchased this validity option (one-time only).
        </div>
      ) : !isLoggedIn ? (
        <button
          onClick={redirectToLogin}
          className="w-full bg-green-500 text-white py-4 rounded-xl font-bold"
        >
          <FiShoppingCart className="inline mr-2" />
          Login to Purchase
        </button>
      ) : showRenewalUI ? (
        /* ---------- SUBSCRIBED USER - SHOW RENEWAL UI ---------- */
        <div className="space-y-4">
          {/* Subscription Status Card */}
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-700 font-medium">Active Subscription</span>
              {orderDetails && (
                <span className={`text-sm px-2 py-1 rounded ${
                  orderDetails.isExpired
                    ? "bg-red-100 text-red-700"
                    : orderDetails.daysRemaining <= 7
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                }`}>
                  {orderDetails.isExpired
                    ? "Expired"
                    : `${orderDetails.daysRemaining} days left`}
                </span>
              )}
            </div>

            {isLoadingOrder ? (
              <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4"></div>
            ) : orderDetails ? (
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <span className="font-medium">Expires:</span>{" "}
                  {formatDate(orderDetails.endDate)}
                </p>
                {orderDetails.isExpired && (
                  <p className="text-red-600">
                    Your subscription has expired. Renew now to continue access.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">You are subscribed to this service</p>
            )}
          </div>

          {/* Renew Button */}
          <button
            onClick={() => handleAddToCart(true)}
            disabled={isBuying}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-xl font-bold disabled:opacity-70 flex items-center justify-center gap-2"
          >
            <FiRefreshCw className={isBuying ? "animate-spin" : ""} />
            {isBuying ? "Processing..." : "Renew Now"}
          </button>

          {/* T&C Checkbox for Renewal */}
          {data.tncFileURL && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => setIsChecked(!isChecked)}
              />
              <span className="text-sm">
                I agree to the{" "}
                <span
                  onClick={() => setIsTncModalOpen(true)}
                  className="text-green-600 underline cursor-pointer"
                >
                  Terms & Conditions
                </span>
              </span>
            </div>
          )}
        </div>
      ) : (
        <>
          <button
            onClick={() => handleAddToCart(false)}
            disabled={isBuying}
            className="w-full bg-green-500 text-white py-4 rounded-xl font-bold disabled:opacity-70"
          >
            {isBuying ? "Processing..." : "Purchase Now"}
          </button>

          {data.tncFileURL && (
            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => setIsChecked(!isChecked)}
              />
              <span className="text-sm">
                I agree to the{" "}
                <span
                  onClick={() => setIsTncModalOpen(true)}
                  className="text-green-600 underline cursor-pointer"
                >
                  Terms & Conditions
                </span>
              </span>
            </div>
          )}
        </>
      )}
      <PurchaseKycModal
        open={showKycModal}
        onClose={() => setShowKycModal(false)}
        onComplete={() => {
          setShowKycModal(false);
          proceedToCart(pendingRenewal);
        }}
      />
    </div>
  );
}
