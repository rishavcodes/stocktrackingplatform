"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { addToCart, clearCart } from "@/store/slices/cartSlice";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/rootReducer";
import { usePathname, useRouter } from "next/navigation";
import {
    FiShoppingCart,
    FiClock,
    FiCheck,
} from "react-icons/fi";
import PurchaseKycModal from "@/components/Modal/PurchaseKycModal";
import { normalizePortfolioPricing } from "@/lib/portfolioPricing";

interface PricingSectionProps {
    data: {
        _id: string;
        portfolioName: string;
        fees?: number;
        feeValidity?: string;
        pricingPlans?: { validity: number; price: number }[];
        minInvestmentAmount: number;
        subscribedBy?: string[];
        tncFileURL: string;
        authorData: {
            id: string;
            name: string;
        };
        riskLevel: number;
    };
    spData: {
        gst?: boolean;
    } | null;
    isLoggedIn: boolean;
    setIsTncModalOpen: (open: boolean) => void;
    marketplaceSlug?: string;
}

export default function PortfolioPricingSection({
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

    // console.log("data", data)
    const cartItems = useSelector((state: RootState) => state.cart.items);

    const [isBuying, setIsBuying] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [showKycModal, setShowKycModal] = useState(false);

    /* ---------------- PRICING PLANS ---------------- */
    // Normalize to a plans array regardless of whether the portfolio has the new
    // pricingPlans or only the legacy single fees/feeValidity.
    const { plans } = normalizePortfolioPricing(data);
    // Default-select the cheapest plan.
    const cheapestIdx = plans.reduce(
        (minI, p, i, arr) => (p.price < arr[minI].price ? i : minI),
        0,
    );
    const [selectedPlanIdx, setSelectedPlanIdx] = useState(cheapestIdx);
    const selectedPlan = plans[selectedPlanIdx] ?? plans[0];

    /* ---------------- HELPERS ---------------- */
    // console.log("spdata", cartItems)

    const isGSTApplicable = Boolean(spData?.gst);

    const buildCartItem = () => {
        const basePrice = selectedPlan?.price ?? 0;
        const gstAmount = isGSTApplicable
            ? Number((basePrice * 0.18).toFixed(2))
            : 0;
        const totalPrice = Number((basePrice + gstAmount).toFixed(2));

        return {
            title: data.portfolioName,
            author: data.authorData.name,
            authorId: data.authorData.id,
            authorName: data.authorData.name,
            tncFileURL: data.tncFileURL,

            basePrice,
            gstAmount,
            totalPrice,
            isGST: isGSTApplicable,

            serviceId: data._id,

            // validity is a number of days for the selected plan
            validity: selectedPlan?.validity ?? 0,
            subscribedToId: data._id,
            portfolioId: data._id,
            type: "portfolio",

            minInvestmentAmount: data.minInvestmentAmount,
            riskLevel: data.riskLevel,
            marketplaceSlug,
        };
    };

    /* ---------------- AUTH FLOW ---------------- */

    const callbackUrl =
        pathname === "/" ? "/dashboard/user" : pathname;

    const redirectToLogin = async () => {
        setIsLoginLoading(true);

        router.push(
            `/auth/user/signin?mode=kyc&callbackUrl=${encodeURIComponent(
                callbackUrl
            )}`
        );
    };

    /* ---------------- CART ACTION ---------------- */

    const needsKyc = () => {
        const user = session?.data?.user;
        if (!user) return false;
        return !user.RegName || !user.email || !(user as any).pannumber;
    };

    const proceedToCart = async () => {
        setIsBuying(true);

        try {
            const cartSnapshot = buildCartItem();
            dispatch(clearCart());
            dispatch(addToCart(cartSnapshot));

            await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/leads/update`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${session?.data?.backendToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        serviceId: data._id,
                        status: "added_to_cart",
                        type: "portfolio",
                    }),
                }
            );
            router.push("/checkout");
        } finally {
            setIsBuying(false);
        }
    };

    const handleAddToCart = async () => {
        if (!isChecked) {
            toast({
                title: "Consent Required",
                description: "Please accept Terms & Conditions",
                variant: "destructive",
            });
            return;
        }

        if (needsKyc()) {
            setShowKycModal(true);
            return;
        }

        await proceedToCart();
    };

    /* ---------------- UI ---------------- */

    return (
        <div className="bg-white rounded-2xl shadow-lg border p-6 dark:bg-gray-900 dark:border-gray-800">

            {/* Pricing */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FiClock /> Pricing
                </h3>

                <div className="space-y-3">
                    {plans.map((plan, idx) => {
                        const isSelected = idx === selectedPlanIdx;
                        return (
                            <button
                                type="button"
                                key={idx}
                                onClick={() => setSelectedPlanIdx(idx)}
                                className={`w-full text-left border-2 rounded-xl p-5 transition-colors ${
                                    isSelected
                                        ? "border-green-400 bg-green-50 dark:bg-green-900/20"
                                        : "border-gray-200 dark:border-gray-700 hover:border-green-300"
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {plan.price === 0 ? "Free" : `₹${plan.price}`}
                                            {plan.price > 0 && isGSTApplicable && (
                                                <span className="text-sm font-semibold ml-1">
                                                    +18% GST
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            Validity: {plan.validity} days
                                        </p>
                                    </div>

                                    <div
                                        className={`p-2 rounded-full ${
                                            isSelected
                                                ? "bg-green-500 text-white"
                                                : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                                        }`}
                                    >
                                        <FiCheck />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ACTION */}
            {!isLoggedIn ? (
                <button
                    onClick={redirectToLogin}
                    disabled={isLoginLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-70"
                >
                    {isLoginLoading ? (
                        <>
                            <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                            Redirecting...
                        </>
                    ) : (
                        <>
                            <FiShoppingCart />
                            Login to Subscribe
                        </>
                    )}
                </button>
            ) : (
                <>
                    {!data.subscribedBy?.includes(
                        session?.data?.user?.id!
                    ) ? (
                        <>
                            <button
                                onClick={handleAddToCart}
                                disabled={isBuying}
                                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-bold disabled:opacity-70"
                            >
                                {isBuying ? "Processing..." : "Subscribe Now"}
                            </button>

                            {/* T&C */}
                            <div className="mt-5 flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    className="mt-1"
                                    checked={isChecked}
                                    onChange={() => setIsChecked(!isChecked)}
                                />
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    I agree to{" "}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsTncModalOpen(true);
                                        }}
                                        className="text-blue-600 font-semibold underline cursor-pointer bg-transparent border-none p-0 font-inherit text-inherit inline"
                                    >
                                        Terms & Conditions
                                    </button>
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-4 rounded-xl text-center">
                            You are already subscribed to this portfolio
                        </div>
                    )}
                </>
            )}
            <PurchaseKycModal
                open={showKycModal}
                onClose={() => setShowKycModal(false)}
                onComplete={() => {
                    setShowKycModal(false);
                    proceedToCart();
                }}
            />
        </div>
    );
}
