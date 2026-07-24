"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useDispatch } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
import { addToCart, clearCart } from "@/store/slices/cartSlice";
import { FiShoppingCart, FiRefreshCw } from "react-icons/fi";
import { useToast } from "@/components/ui/use-toast";
import PurchaseKycModal from "@/components/Modal/PurchaseKycModal";

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
    data: any;
    spData: {
        gst?: string | null;
    } | null;
    isLoggedIn: boolean;
    marketplaceSlug?: string;
}

export default function PackagePricingSection({
    data,
    spData,
    isLoggedIn,
    marketplaceSlug,
}: PricingSectionProps) {
    const session = useSession();
    const dispatch = useDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();

    const [isBuying, setIsBuying] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const [showKycModal, setShowKycModal] = useState(false);
    const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
    const [isLoadingOrder, setIsLoadingOrder] = useState(false);
    const [pendingRenewal, setPendingRenewal] = useState(false);

    const tiers: { validity: number; price: number }[] = Array.isArray(data?.pricingPlans)
        ? data.pricingPlans
        : [];

    const [selectedTierIdx, setSelectedTierIdx] = useState(0);
    const selectedTier = tiers[selectedTierIdx] || { validity: 0, price: 0 };

    const userId = session?.data?.user?.id;
    const hasOrderForThisTier = Boolean(orderDetails);

    const isGSTApplicable = Boolean(spData?.gst);

    const basePrice = selectedTier.price;
    const gstAmount = isGSTApplicable
        ? Number((basePrice * 0.18).toFixed(2))
        : 0;
    const totalPrice = Number((basePrice + gstAmount).toFixed(2));

    const buildCartItem = (isRenewal = false) => ({
        title: data.title,
        author: data.authorData.name,
        authorId: data.authorData.id,
        authorName: data.authorData.name,
        tncFileURL: data.tncFileURL,
        bannerURL: data.bannerURL,

        basePrice,
        gstAmount,
        totalPrice,
        isGST: isGSTApplicable,

        validity: selectedTier.validity,
        subscribedToId: data._id,
        serviceId: data._id,
        type: "package",
        isRenewal,
        previousOrderId: isRenewal && orderDetails ? orderDetails._id : null,
        marketplaceSlug,
    });

    /* -------- FETCH ORDER DETAILS FOR SELECTED TIER -------- */

    useEffect(() => {
        if (!userId || !session?.data?.backendToken || !selectedTier.validity) {
            setOrderDetails(null);
            return;
        }

        const controller = new AbortController();
        setIsLoadingOrder(true);
        setOrderDetails(null);
        setIsChecked(false);

        (async () => {
            try {
                const qs = new URLSearchParams({
                    userId,
                    validityDays: String(selectedTier.validity),
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
                    if (result.success) setOrderDetails(result.order);
                }
            } catch (error: any) {
                if (error?.name !== "AbortError") {
                    console.error("Error fetching package order:", error);
                }
            } finally {
                setIsLoadingOrder(false);
            }
        })();

        return () => controller.abort();
    }, [userId, data._id, selectedTierIdx, selectedTier.validity, session?.data?.backendToken]);

    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    /* -------- LOGIN REDIRECT -------- */

    const callbackUrl =
        pathname === "/" ? "/dashboard/user" : pathname;

    const redirectToLogin = () => {
        router.push(
            `/auth/user/signin?mode=kyc&callbackUrl=${encodeURIComponent(
                callbackUrl
            )}`
        );
    };

    /* -------- ADD TO CART -------- */

    const needsKyc = () => {
        const user = session?.data?.user;
        if (!user) return false;
        return !user.RegName || !user.email || !(user as any).pannumber;
    };

    const proceedToCart = (isRenewal = false) => {
        setIsBuying(true);
        dispatch(clearCart());
        dispatch(addToCart(buildCartItem(isRenewal)));
        router.push("/checkout");
        setIsBuying(false);
    };

    const handleAddToCart = (isRenewal = false) => {
        if (data.tncFileURL && !isChecked) {
            toast({
                title: "Consent required",
                description: "Please accept T&C",
                variant: "destructive",
            });
            return;
        }

        if (needsKyc()) {
            setPendingRenewal(isRenewal);
            setShowKycModal(true);
            return;
        }

        proceedToCart(isRenewal);
    };

    /* -------- UI -------- */

    return (
        <div className="bg-white rounded-xl shadow border p-6 w-full h-full flex flex-col">

            <h3 className="text-xl font-semibold mb-4">
                Package Price
            </h3>

            {tiers.length > 0 ? (
                <div className="space-y-2 mb-4">
                    {tiers.map((tier, idx) => {
                        const selected = idx === selectedTierIdx;
                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedTierIdx(idx)}
                                className={`w-full flex justify-between items-center px-4 py-3 rounded-lg border-2 transition ${
                                    selected
                                        ? "border-green-600 bg-green-50"
                                        : "border-gray-200 hover:border-gray-300"
                                }`}
                            >
                                <span className="text-sm font-medium text-gray-700">
                                    {tier.validity} days
                                </span>
                                <span className="text-lg font-bold text-gray-900">
                                    ₹{tier.price}
                                </span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <p className="text-sm text-red-500 mb-4">No pricing tiers available</p>
            )}

            <div className="mt-auto">
            <p className="text-3xl font-bold mb-1">
                ₹{basePrice}
                {gstAmount > 0 && (
                    <span className="text-sm">
                        {" "}+18% GST
                    </span>
                )}
            </p>

            <p className="text-sm text-gray-600 mb-6">
                Valid for {selectedTier.validity} days
            </p>

            {!session.data?.user ? (
                <button
                    onClick={redirectToLogin}
                    className="w-full bg-green-600 text-white py-3 rounded-xl"
                >
                    <FiShoppingCart className="inline mr-2" />
                    Login to Purchase
                </button>
            ) : hasOrderForThisTier ? (
                <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-green-700 font-medium">Active Subscription</span>
                            {orderDetails && (
                                <span
                                    className={`text-sm px-2 py-1 rounded ${
                                        orderDetails.isExpired
                                            ? "bg-red-100 text-red-700"
                                            : orderDetails.daysRemaining <= 7
                                                ? "bg-yellow-100 text-yellow-700"
                                                : "bg-green-100 text-green-700"
                                    }`}
                                >
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
                            <p className="text-sm text-gray-600">
                                You have already purchased this package tier
                            </p>
                        )}
                    </div>

                    <button
                        onClick={() => handleAddToCart(true)}
                        disabled={isBuying}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        <FiRefreshCw className={isBuying ? "animate-spin" : ""} />
                        {isBuying ? "Processing..." : "Renew Now"}
                    </button>

                    {data.tncFileURL && (
                        <div className="flex gap-2">
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => setIsChecked(!isChecked)}
                            />
                            <span className="text-sm">
                                I agree to{" "}
                                <span className="underline text-green-600 cursor-pointer">
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
                        disabled={isBuying || isLoadingOrder}
                        className="w-full bg-green-600 text-white py-3 rounded-xl disabled:opacity-70"
                    >
                        {isLoadingOrder ? "Checking..." : "Purchase Package"}
                    </button>

                    {data.tncFileURL && (
                        <div className="mt-3 flex gap-2">
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => setIsChecked(!isChecked)}
                            />
                            <span>
                                I agree to{" "}
                                <span className="underline text-green-600 cursor-pointer">
                                    Terms & Conditions
                                </span>
                            </span>
                        </div>
                    )}
                </>
            )}
            </div>
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
