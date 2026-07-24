import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useToast } from "../ui/use-toast";
import { Toaster } from "../ui/toaster";
import { usePathname, useRouter } from "next/navigation";
import { PublicCourse } from "@/app/view/courses/[courseId]/page";
import Script from "next/script";
import CourseDetailsModal from "@/components/Modal/CourseDetailsModal";
import {
    Loader2,
    CreditCard,
    Check,
    Star,
    Users,
    Clock,
    BookOpen,
    Globe,
    Award,
    PlayCircle,
    Download,
    Smartphone,
    Trophy,
    ChevronDown,
    ChevronUp,
    BarChart,
    Infinity,
    BarChart2,
    CameraIcon,
    ClockIcon,
    Shield,
    MicIcon,
    FileCheckIcon,
    MessageCircleIcon,
    BadgeIcon,
    MedalIcon,
    MoveRightIcon,
    ChevronRight
} from "lucide-react";

export default function CoursePricingSection({
    course,
    purchasing,
    handlePurchase, // we will not use this prop now, local handler will be used
    totalLectures,
    totalMinutes,
    isEnrolled,
    spData,
    marketplaceSlug,
}: {
    course: PublicCourse;
    purchasing: boolean;
    handlePurchase: () => void;
    totalLectures: number;
    totalMinutes: number;
    isEnrolled: boolean;
    spData: any;
    marketplaceSlug?: string;
}) {
    const { data: session } = useSession();
    const [isLoadingPayment, setIsLoadingPayment] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();

    // const handleLoginSuccess = () => {
    //     setIsAuthModalOpen(false);
    //     // small delay so modal closes smoothly before action
    //     setTimeout(() => {
    //         try {
    //             handlePurchase();
    //         } catch (err) {
    //             console.error("Error starting purchase after login:", err);
    //             toast({
    //                 title: "Error",
    //                 description: "Unable to continue purchase after login. Please try again.",
    //                 variant: "destructive",
    //             });
    //         }
    //     }, 200);
    // };

    const enrollAfterPayment = async (paymentData: Record<string, any>, overrides?: { name: string; email: string }) => {
        const subtotal = Number(course.price).toFixed(2);
        const gst = Number(subtotal) * 0.18;
        const total = Number(subtotal) + Number(gst);

        const orderData: Record<string, any> = {
            courseId: course._id,
            orderById: session?.user?.id,
            orderByName: overrides?.name || session?.user?.RegName || session?.user?.name,
            orderByEmail: overrides?.email || session?.user?.email,
            soldById: course.instructor?._id,
            soldByName: course.instructor?.name,
            subtotal,
            gst,
            total,
            validity: 0,
            isGST: false,
            ...paymentData,
        };

        if (marketplaceSlug) {
            orderData.marketplaceSlug = marketplaceSlug;
        }

        const enrollEndpoint = marketplaceSlug
            ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/createandenrollmarketplace`
            : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/createandenroll`;

        const enrollRes = await fetch(enrollEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData),
        });

        const enrollJson = await enrollRes.json();

        if (!enrollRes.ok || !enrollJson.success) {
            toast({
                title: "Order creation failed",
                description: enrollJson?.message || "Payment succeeded but we couldn't enroll you. Contact support.",
                variant: "destructive",
            });
            return;
        }

        toast({
            title: "Payment successful",
            description: "You're enrolled! Redirecting to your course...",
            variant: "default",
        });
        router.push(`/view/learn/${course._id}`);
    };

    const needsDetails = () => {
        if (!session?.user) return false;
        const user = session.user as any;
        const name = user.RegName || user.name || "";
        const email = user.email || "";
        const hasName = typeof name === "string" && name.trim().length > 0;
        const hasEmail = typeof email === "string" && email.trim().length > 0;
        return !hasName || !hasEmail;
    };

    const handlePayment = async (overrides?: { name: string; email: string }) => {
        if (!session?.user) {
            toast({
                title: "Sign in required",
                description: "Please sign in to purchase the course.",
                variant: "destructive",
            });
            return;
        }

        if (!overrides && needsDetails()) {
            setShowDetailsModal(true);
            return;
        }

        try {
            setIsLoadingPayment(true);

            const payload = {
                amount: Math.round(course.price),
                spId: course.instructor?._id || null,
                courseId: course._id,
                buyerId: session?.user?.id,
                buyerPhone: (session?.user as any)?.number,
                buyerEmail: overrides?.email || session?.user?.email,
                buyerName: overrides?.name || session?.user?.RegName || session?.user?.name,
            };

            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/checkoutrzp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || "Failed to create checkout order");
            }

            const data = await res.json();
            const gateway = data.gateway || "razorpay";

            /* ---------- CASHFREE ---------- */
            if (gateway === "cashfree") {
                const _window = window as any;
                if (!_window.Cashfree) {
                    toast({ title: "Payment Error", description: "Cashfree SDK not loaded. Please refresh.", variant: "destructive" });
                    return;
                }
                const cf = _window.Cashfree({ mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === "production" ? "production" : "sandbox" });
                const result = await cf.checkout({
                    paymentSessionId: data.paymentSessionId,
                    redirectTarget: "_modal",
                });
                if (result.error) {
                    toast({ title: "Payment failed", description: result.error.message || "Payment could not be completed.", variant: "destructive" });
                    return;
                }
                if (result.paymentDetails) {
                    await enrollAfterPayment({
                        cashfreePaymentId: result.paymentDetails.paymentMessage,
                        cashfreeOrderId: data.cfOrderId || data.orderId,
                    }, overrides);
                }
                return;
            }

            /* ---------- RAZORPAY ---------- */
            const { checkout, razorpayKeyId } = data;

            if (!checkout || !razorpayKeyId) {
                throw new Error("Invalid response from payment API");
            }

            const options: any = {
                key: razorpayKeyId,
                amount: checkout.amount,
                currency: checkout.currency || "INR",
                name: course.title,
                description: `Payment for course ${course.title}`,
                image: course.instructor?.profileUrl || "",
                order_id: checkout.id,
                handler: async function (response: any) {
                    try {
                        await enrollAfterPayment({
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpayOrderId: response.razorpay_order_id,
                            razorpaySignature: response.razorpay_signature,
                        }, overrides);
                    } catch (err) {
                        console.error("Error in payment handler (enroll):", err);
                        toast({
                            title: "Order creation failed",
                            description: "Payment was captured but we couldn't finalize enrollment. Contact support.",
                            variant: "destructive",
                        });
                    }
                },
                prefill: {
                    name: overrides?.name || session?.user?.RegName || session?.user?.name,
                    email: overrides?.email || session?.user?.email,
                },
                notes: {
                    courseId: course._id,
                    instructorId: course.instructor?._id || "",
                },
                theme: { color: "#01E3A1" },
            };

            const _window = window as any;
            if (!_window.Razorpay) {
                toast({ title: "Payment Error", description: "Razorpay script not loaded. Try again later.", variant: "destructive" });
                setIsLoadingPayment(false);
                return;
            }

            const rzp = new _window.Razorpay(options);
            rzp.open();

            rzp.on && rzp.on("payment.failed", function () {
                toast({ title: "Payment failed", description: "Payment could not be completed.", variant: "destructive" });
            });
        } catch (err: any) {
            console.error("Payment error:", err);
            toast({
                title: "Payment Error",
                description: err.message || "Failed to start payment.",
                variant: "destructive",
            });
        } finally {
            setIsLoadingPayment(false);
        }
    };

    const LANGUAGE_LABELS: Record<string, string> = {
        en: "English",
        hi: "Hindi",
    };

    const callbackUrl =
        pathname === "/" ? "/dashboard/user" : pathname;

    const redirectToLogin = () => {
        router.push(
            `/auth/user/signin?mode=learning&callbackUrl=${encodeURIComponent(
                callbackUrl
            )}`
        );
    };

    return (
        <>
            <Script
                src="https://checkout.razorpay.com/v1/checkout.js"
                strategy="lazyOnload"
            />
            <Script
                src="https://sdk.cashfree.com/js/v3/cashfree.js"
                strategy="lazyOnload"
            />

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="p-6 md:p-8">

                    {/* Highlights */}
                    <div className="space-y-3 text-lg text-gray-700 dark:text-gray-300 mb-6">
                        <div className="flex items-center gap-4">
                            <CameraIcon className="text-green-500" />
                            {totalLectures} Lectures
                        </div>
                        <div className="flex items-center gap-4">
                            <BarChart2 className="text-green-500" />
                            {course.level && course?.level?.charAt(0).toUpperCase() + course?.level?.slice(1)}
                        </div>
                        <div className="flex items-center gap-4">
                            <MicIcon className="text-green-500" />
                            {course.language
                                ? LANGUAGE_LABELS[course.language] ?? course.language.toUpperCase()
                                : ""}
                        </div>
                        <div className="flex items-center gap-4">
                            <ClockIcon className="text-green-500" />
                            {Math.ceil(totalMinutes / 60)}+ Hours of content
                        </div>
                        <div className="flex items-center gap-4">
                            <MedalIcon className="text-green-500" />
                            Certificate of Completion
                        </div>
                        <div className="flex items-center gap-4">
                            <FileCheckIcon className="text-green-500" />
                            One-time purchase
                        </div>
                    </div>

                    {/* Price Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-3">
                            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white">
                                ₹{course.price} {spData?.gst ? (
                                    "+18% GST"
                                ) : ""}
                            </h2>
                        </div>
                    </div>


                    {/* CTA */}
                    {isEnrolled ? (
                        <button
                            onClick={() => router.push(`/view/learn/${course._id}`)}
                            className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-3 rounded-xl text-2xl"
                        >
                            <span className="flex justify-center items-center gap-x-4">
                                Go to Course <ChevronRight className="text-white" />
                            </span>
                        </button>
                    ) : !session?.user ? (
                        <>
                            <button
                                onClick={redirectToLogin}
                                className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-3 rounded-xl text-2xl"
                            >
                                <span className="flex justify-center items-center gap-x-4">
                                    Sign in to purchase <ChevronRight className="text-white" />
                                </span>
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => handlePayment()}
                            disabled={isLoadingPayment || purchasing}
                            className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-3 rounded-xl text-2xl"
                        >
                            {isLoadingPayment ? "Processing..." : "Buy Now"}
                        </button>
                    )}

                    {/* Trust text */}
                    <p className="text-xs text-center text-gray-500 mt-3">
                        Secure payment • Trusted by learners
                    </p>

                </div>
            </div>
            <CourseDetailsModal
                open={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                onComplete={(details) => {
                    setShowDetailsModal(false);
                    handlePayment(details);
                }}
            />
        </>
    );
}
