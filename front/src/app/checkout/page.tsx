"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/rootReducer";
import Step1 from "@/components/Cart/StepOne";
import Step2 from "@/components/Cart/StepTwo";
import { setStepData } from "@/store/slices/cartStepSlice";
import { addToCart, clearCart } from "@/store/slices/cartSlice";
import { useSession } from "next-auth/react";
import { updateLead } from "@/lib/updateLead";
import { useToast } from "@/components/ui/use-toast";

function aadhaarMismatchToast(
    aadhaarMatchStatus: string | undefined | null
): { title: string; description: string } {
    if (aadhaarMatchStatus === "mismatched") {
        return {
            title: "Aadhaar verification failed",
            description:
                "The Aadhaar on the signed document doesn't match the one linked to your PAN. Please check your PAN details and try the e-sign again.",
        };
    }
    return {
        title: "Aadhaar verification incomplete",
        description:
            "We couldn't verify your Aadhaar from the e-sign report. Please retry the e-sign.",
    };
}

export default function CheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();
    const session = useSession();
    const { toast } = useToast();
    const checkoutTrackedRef = useRef(false);


    const cartItem = useSelector((s: RootState) => s.cart.items[0]);
    const leadType = cartItem?.type || "service";

    const step2Data = useSelector(
        (s: RootState) => s.cartSteps.step2Data
    );

    // console.log("cart item", cartItem)

    const [step, setStep] = useState(() => step2Data?.isEsignCompleted ? 2 : 1);

    const hasCheckedCartRef = useRef(false);
    const hasCheckedEsignRef = useRef(false);

    /* 🔐 Guard */
    useEffect(() => {
        if (hasCheckedCartRef.current) return;

        const esignParam = searchParams.get("esign");
        const isEsignReturn =
            esignParam === "success" ||
            esignParam === "blocked" ||
            !!searchParams.get("client_id");
        if (isEsignReturn) return; // recovery effect below will handle it

        hasCheckedCartRef.current = true;

        if (!cartItem) {
            router.replace("/");
        }
    }, [cartItem, router, searchParams]);

    /* 🚫 SP wallet ran dry between checkout init and e-sign callback */
    const blockedToastShownRef = useRef(false);
    useEffect(() => {
        if (blockedToastShownRef.current) return;
        if (searchParams.get("esign") !== "blocked") return;

        blockedToastShownRef.current = true;
        toast({
            title: "Service temporarily unavailable",
            description:
                "This service is temporarily unavailable for new purchases. Please try again later or contact the service provider.",
            variant: "destructive",
        });
        router.replace("/checkout");
    }, [searchParams, toast, router]);

    /* 🛟 Recovery: rebuild cart from server when local state is missing */
    const recoveryRanRef = useRef(false);
    useEffect(() => {
        if (recoveryRanRef.current) return;
        const clientId = searchParams.get("client_id");
        if (!clientId || cartItem) return;
        recoveryRanRef.current = true;

        (async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/esign/session?clientId=${clientId}`
                );
                if (!res.ok) {
                    router.replace("/");
                    return;
                }
                const { data } = await res.json();
                if (!data?.cartItem) {
                    router.replace("/");
                    return;
                }
                dispatch(clearCart());
                dispatch(addToCart(data.cartItem));
                if (data.status === "COMPLETED" && data.signedDocURL) {
                    if (data.aadhaarMatchStatus === "matched") {
                        dispatch(
                            setStepData({
                                step: "step2Data",
                                data: {
                                    signedDocURL: data.signedDocURL,
                                    isEsignCompleted: true,
                                },
                            })
                        );
                    } else {
                        const t = aadhaarMismatchToast(data.aadhaarMatchStatus);
                        toast({ ...t, variant: "destructive" });
                    }
                }
            } catch {
                router.replace("/");
            }
        })();
    }, [searchParams, cartItem, dispatch, router]);

    /* 🔍 DECIDE E-SIGN — required (Step 1) vs reuse a prior signature (skip to
       payment). SEBI: sign an RA's T&C once; later purchases of the SAME RA skip
       Step 1. The backend /prepare resolves "already signed this RA?" and, on a
       skip, materialises the reused signature + runs the per-purchase SP charge.
       Renewals run through /prepare too: the user already signed this plan on the
       original purchase, so /prepare's idempotency check returns the existing
       signed document and skips Step 1 (no re-sign, no double charge). */
    useEffect(() => {
        if (
            !cartItem ||
            !session.data?.user?.id ||
            hasCheckedEsignRef.current
        )
            return;

        hasCheckedEsignRef.current = true;

        (async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/esign/prepare`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            userId: session.data.user.id,
                            serviceId: cartItem.serviceId,
                            type: cartItem.type,
                            cartItem,
                        }),
                    }
                );

                if (!res.ok) return;

                const data = await res.json();

                // SP wallet/plan can't cover the onboarding charge — block before payment.
                if (data?.blocked) {
                    toast({
                        title: "Service temporarily unavailable",
                        description:
                            "This service is temporarily unavailable for new purchases. Please try again later or contact the service provider.",
                        variant: "destructive",
                    });
                    return;
                }

                if (data?.required === false && data?.signedDocURL) {
                    // Already signed this RA's T&C → skip Step 1, jump to payment.
                    if (session.data?.backendToken) {
                        updateLead("esign_completed", cartItem.serviceId, session.data.backendToken, leadType);
                    }
                    dispatch(
                        setStepData({
                            step: "step2Data",
                            data: {
                                signedDocURL: data.signedDocURL,
                                isEsignCompleted: true,
                            },
                        })
                    );
                    return;
                }

                // required === true: a fresh sign is needed. Surface a mismatch
                // hint if an earlier attempt for this item failed Aadhaar match.
                if (
                    data?.aadhaarMatchStatus === "mismatched" ||
                    data?.aadhaarMatchStatus === "report_unavailable"
                ) {
                    const t = aadhaarMismatchToast(data.aadhaarMatchStatus);
                    toast({ ...t, variant: "destructive" });
                }
            } catch (err) {
                console.error("Failed to prepare eSign", err);
            }
        })();
    }, [cartItem, session.data?.user?.id, dispatch]);

    /* 🔁 Resume after eSign redirect */
    useEffect(() => {
        const esignStatus = searchParams.get("esign");
        if (esignStatus !== "success") return;

        const pendingRaw = sessionStorage.getItem("pending_esign");
        if (!pendingRaw) return;

        let pending: any;
        try {
            pending = JSON.parse(pendingRaw);
        } catch {
            sessionStorage.removeItem("pending_esign");
            return;
        }

        if (pending.serviceId !== cartItem?.serviceId) {
            sessionStorage.removeItem("pending_esign");
            return;
        }

        (async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/esign/session?serviceId=${pending.serviceId}&userId=${session?.data?.user.id}`
                );

                // console.log("e sign res throgh e sign", res)

                if (!res.ok) throw new Error();

                const data = await res.json();
                // console.log("data after e sign: ", data.data)

                if (data?.data?.signedDocURL && data?.data?.status === "COMPLETED") {
                    if (data.data.aadhaarMatchStatus === "matched") {
                        dispatch(
                            setStepData({
                                step: "step2Data",
                                data: {
                                    signedDocURL: data.data.signedDocURL,
                                    isEsignCompleted: true,
                                },
                            })
                        );
                    } else {
                        const t = aadhaarMismatchToast(data.data.aadhaarMatchStatus);
                        toast({ ...t, variant: "destructive" });
                    }
                }
            } catch (err) {
                console.error("Failed to resume eSign", err);
            }
        })();

        sessionStorage.removeItem("pending_esign");
        router.replace("/checkout");
    }, [searchParams, cartItem, dispatch, router, session]);

    /* 🔁 Decide step */
    useEffect(() => {
        if (step2Data?.isEsignCompleted) {
            setStep(2);
        } else {
            setStep(1);
        }
    }, [step2Data?.isEsignCompleted]);

    useEffect(() => {
        if (checkoutTrackedRef.current || !cartItem || !session.data?.user?.id) return;

        checkoutTrackedRef.current = true;

        if (session.data?.backendToken) {
            updateLead("checkout_started", cartItem.serviceId, session.data.backendToken, leadType);
        }
    }, [cartItem, session.data?.user?.id]);

    if (!cartItem) return null;

    return (
        <div className="bg-slate-50 dark:bg-slate-950 pt-16 md:pt-20 pb-4 sm:pb-6">
            <div className="max-w-7xl mx-auto px-3 sm:px-4">
               

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-5">
                    {step === 1 && (
                        <Step1
                            tncFileURL={cartItem.tncFileURL}
                            serviceId={cartItem.serviceId}
                            setStep={setStep}
                        />
                    )}

                    {step === 2 && (
                        <Step2
                            onPaymentInitiated={() => { }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
