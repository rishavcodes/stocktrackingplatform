"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { AuthMode, PanData } from "@/lib/types";
import { requestOtp, verifyOtp, signupUser } from "@/lib/api/auth";
import {
    validateMobile,
    validateOtp,
} from "@/lib/validators/auth";
import {
    validateName,
    validateEmail,
} from "@/lib/validators/user";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCurrentSubdomainSp } from "@/hooks/useCurrentSubdomainSp";
import { useProductFromCallback } from "@/hooks/useProductFromCallback";

/* -------------------------------- TYPES -------------------------------- */

type Step = "MOBILE" | "OTP" | "PAN" | "DETAILS";

/* -------------------------------- REGEX -------------------------------- */

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/* ================================ COMPONENT ================================ */

export default function UserSigninContainer() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    const mode: AuthMode =
        searchParams.get("mode") === "kyc" ? "kyc" : "learning";

    const rawCallbackUrl = searchParams.get("callbackUrl");
    // console.log("raw callback url:", rawCallbackUrl)
    const callbackUrl =
        rawCallbackUrl && rawCallbackUrl.startsWith("/") && rawCallbackUrl !== "/"
            ? rawCallbackUrl
            : "/dashboard/user";

    /* ----------------------------- BRANDING ----------------------------- */
    const sp = useCurrentSubdomainSp();
    const product = useProductFromCallback(rawCallbackUrl);
    const isBranded = !!sp;
    // console.log("callback url", callbackUrl)
    /* ----------------------------- STATE ----------------------------- */

    const [step, setStep] = useState<Step>("MOBILE");
    const [loading, setLoading] = useState(false);

    // Mobile + OTP
    const [number, setNumber] = useState("");
    const [otp, setOtp] = useState(["", "", "", ""]);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // PAN
    const [pan, setPan] = useState("");
    const [panData, setPanData] = useState<PanData | null>(null);

    // User details
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Resend OTP timer
    const [resendTimer, setResendTimer] = useState(0);

    /* ----------------------------- AUTO FOCUS OTP ----------------------------- */

    useEffect(() => {
        if (step === "OTP") {
            otpRefs.current[0]?.focus();
        }
    }, [step]);

    // Countdown timer for resend OTP
    useEffect(() => {
        if (resendTimer <= 0) return;
        const interval = setInterval(() => {
            setResendTimer((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [resendTimer]);

    /* ================================ HANDLERS ================================ */

    /* -------- MOBILE -------- */

    const handleRequestOtp = async () => {
        const error = validateMobile(number);
        if (error) {
            toast({ title: error, variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const data = await requestOtp(number, "user");

            if (data.existsAs && data.existsAs !== "user") {
                toast({
                    title: "Number already registered",
                    description: `This number is already registered as a ${data.existsAs === "provider" ? "Service Provider" : "Admin"}. Please sign in from the respective page.`,
                    variant: "destructive",
                });
                return;
            }

            toast({ title: "OTP Sent" });
            setResendTimer(60);
            setStep("OTP");
        } catch (e: any) {
            toast({ title: "OTP Failed", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    /* -------- RESEND OTP -------- */

    const handleResendOtp = async () => {
        setLoading(true);
        try {
            await requestOtp(number, "user");
            toast({ title: "OTP Resent", description: `New OTP sent to ${number}` });
            setOtp(["", "", "", ""]);
            setResendTimer(60);
        } catch (e: any) {
            toast({ title: "Resend Failed", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    /* -------- OTP -------- */

    const handleVerifyOtp = async () => {
        const otpString = otp.join("");
        const error = validateOtp(otpString);
        if (error) {
            setErrors({ otp: error });
            return;
        }

        setLoading(true);
        // NOTE: no `finally { setLoading(false) }` — we want the spinner to
        // stay visible while `router.push(callbackUrl)` is doing its async
        // navigation. Only the paths that keep the user on the OTP screen
        // (errors, role mismatch) explicitly reset loading.
        try {
            const data = await verifyOtp(number, otpString);

            if (data.userExists && data.role === "user") {
                await signIn("credentials", {
                    number,
                    loginAs: "user",
                    redirect: false,
                });
                router.push(callbackUrl);
                return; // keep spinner on through the redirect
            }

            // Number exists but as a different role — block signup
            if (data.userExists && data.role !== "user") {
                toast({
                    title: "Number already registered",
                    description: `This number is already registered as a ${data.role === "provider" ? "Service Provider" : "Admin"}. Please sign in from the respective page.`,
                    variant: "destructive",
                });
                setStep("MOBILE");
                setLoading(false);
                return;
            }

            // New user: auto-register with phone only, then sign in
            try {
                await signupUser({ number, mode });
                await signIn("credentials", {
                    number,
                    loginAs: "user",
                    redirect: false,
                });
                router.push(callbackUrl);
                return; // keep spinner on through the redirect
            } catch (signupError: any) {
                toast({
                    title: "Signup Failed",
                    description: signupError.message || "Could not create account",
                    variant: "destructive",
                });
                setStep("MOBILE");
                setLoading(false);
            }
        } catch (e: any) {
            toast({ title: "OTP Failed", description: e.message, variant: "destructive" });
            setLoading(false);
        }
    };

    /* -------- PAN -------- */

    const handleVerifyPan = async () => {
        if (!PAN_REGEX.test(pan)) {
            toast({
                title: "Invalid PAN",
                description: "Format should be ABCDE1234F",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/verifyPan`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ panNumber: pan }),
                }
            );

            const data: PanData = await res.json();

            if (!res.ok || !data.success || data.data.status !== "valid") {
                throw new Error("PAN verification failed");
            }

            setPanData(data);
            setName(data.data.full_name);
            setStep("DETAILS");
        } catch (e: any) {
            toast({ title: "PAN Failed", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    /* -------- SIGNUP -------- */

    const handleSignup = async () => {
        const nameError = validateName(name);
        const emailError = validateEmail(email);

        if (nameError || emailError) {
            setErrors({
                ...(nameError && { name: nameError }),
                ...(emailError && { email: emailError }),
            });
            return;
        }

        setLoading(true);
        try {
            await signupUser({
                number,
                mode,
                name: name.trim(),
                email: email.trim(),
                ...(panData && {
                    pannumber: panData.data.pan_number,
                    dob: panData.data.dob,
                    gender: panData.data.gender,
                    aadhaarLast4: panData.data.masked_aadhaar?.slice(-4),
                }),
            });

            await signIn("credentials", {
                number,
                loginAs: "user",
                redirect: false,
            });

            router.push(callbackUrl);
        } finally {
            setLoading(false);
        }
    };

    /* ================================ UI ================================ */

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center p-5 sm:p-8 overflow-hidden bg-white">
            {/* Card — plain white background, no animated layers */}
            <div className="relative z-10 w-full max-w-md bg-white p-7 sm:p-8 rounded-2xl shadow-2xl ring-1 ring-black/5">
                {isBranded && (
                    <div className="mb-6 -mx-7 sm:-mx-8 -mt-7 sm:-mt-8 px-7 sm:px-8 pt-7 sm:pt-8 pb-6 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            {sp?.companyLogo ? (
                                <img
                                    src={sp.companyLogo}
                                    alt={sp.RegName ?? "Provider logo"}
                                    className="h-12 w-12 rounded-full object-cover ring-1 ring-gray-200"
                                />
                            ) : (
                                <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center ring-1 ring-gray-200">
                                    {(sp?.RegName ?? "?").charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <div className="text-base font-semibold text-gray-900 truncate">
                                    {sp?.RegName ?? "Service Provider"}
                                </div>
                                <div className="text-xs text-gray-500">
                                    Sign in to continue
                                </div>
                            </div>
                        </div>

                        {product && (
                            <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                                {product.image ? (
                                    <img
                                        src={product.image}
                                        alt={product.title ?? ""}
                                        className="h-12 w-12 rounded-md object-cover flex-shrink-0"
                                    />
                                ) : (
                                    <div className="h-12 w-12 rounded-md bg-blue-100 flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                    <div className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
                                        {product.type === "services" && "Service"}
                                        {product.type === "article" && "Article"}
                                        {product.type === "events" && "Event"}
                                        {product.type === "portfolio" && "Portfolio"}
                                        {product.type === "packages" && "Package"}
                                        {product.type === "courses" && "Course"}
                                    </div>
                                    <div className="text-sm font-semibold text-gray-900 truncate">
                                        {product.title ?? "Continue to product"}
                                    </div>
                                    {typeof product.price === "number" && product.price > 0 && (
                                        <div className="text-xs text-gray-600 mt-0.5">
                                            ₹{product.price.toLocaleString("en-IN")}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* MOBILE */}
                    {step === "MOBILE" && (
                        <>
                            {/* Welcome note — only on the un-branded Tradebox page;
                                branded SP pages already show their own greeting. */}
                            {!isBranded && (
                                <div className="mb-6 text-center">
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        Welcome!
                                    </h1>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Sign in or create your account with your mobile number
                                    </p>
                                </div>
                            )}

                            <input
                                value={number}
                                onChange={(e) =>
                                    setNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                                }
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleRequestOtp();
                                    }
                                }}
                                placeholder="Enter mobile number"
                                className="w-full border px-4 py-2 rounded mb-4"
                            />

                            <button
                                onClick={handleRequestOtp}
                                disabled={loading}
                                className="w-full bg-blue-500 text-white py-3 rounded disabled:opacity-50"
                            >
                                {loading ? "Requesting OTP..." : "Request OTP"}
                            </button>

                            <p className="text-xs text-center text-gray-500 mt-4">
                                By clicking on proceed, you have read and agree to the {" "}
                                <Link href="/documents/terms-and-conditions" className="text-blue-500 hover:underline">
                                    Terms of Use
                                </Link>{" "}
                                &{" "}
                                <Link href="/documents/privacy-policy" className="text-blue-500 hover:underline">
                                    Privacy Policy
                                </Link>
                                .
                            </p>
                        </>
                    )}

                    {/* OTP */}
                    {step === "OTP" && (
                        <>
                            <p className="text-sm text-gray-600 mb-4 text-center">
                                Enter the OTP sent to <strong>{number}</strong>
                            </p>
                            <div className="flex justify-center gap-2 mb-4">
                                {otp.map((d, i) => (
                                    <input
                                        key={i}
                                        ref={(el: any) => (otpRefs.current[i] = el)}
                                        value={d}
                                        maxLength={1}
                                        inputMode="numeric"
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, "");
                                            if (!val) return;

                                            const newOtp = [...otp];
                                            newOtp[i] = val;
                                            setOtp(newOtp);

                                            if (i < 3) {
                                                otpRefs.current[i + 1]?.focus();
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Backspace") {
                                                e.preventDefault();
                                                const newOtp = [...otp];

                                                if (newOtp[i]) {
                                                    newOtp[i] = "";
                                                    setOtp(newOtp);
                                                } else if (i > 0) {
                                                    otpRefs.current[i - 1]?.focus();
                                                    newOtp[i - 1] = "";
                                                    setOtp(newOtp);
                                                }
                                            }

                                            if (e.key === "Enter") {
                                                handleVerifyOtp();
                                            }
                                        }}
                                        className="w-12 h-12 border text-center rounded"
                                    />
                                ))}
                            </div>

                            <button
                                onClick={handleVerifyOtp}
                                disabled={loading}
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 transition"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Verifying & signing you in…
                                    </>
                                ) : (
                                    "Verify OTP"
                                )}
                            </button>

                            <div className="flex items-center justify-between mt-3">
                                <button
                                    onClick={() => {
                                        setStep("MOBILE");
                                        setOtp(["", "", "", ""]);
                                        setResendTimer(0);
                                    }}
                                    disabled={loading}
                                    className="text-sm text-blue-600 hover:underline disabled:text-gray-400"
                                >
                                    Change Number
                                </button>

                                {resendTimer > 0 ? (
                                    <span className="text-sm text-gray-500">
                                        Resend OTP in {resendTimer}s
                                    </span>
                                ) : (
                                    <button
                                        onClick={handleResendOtp}
                                        disabled={loading}
                                        className="text-sm text-blue-600 hover:underline disabled:text-gray-400"
                                    >
                                        Resend OTP
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {/* PAN */}
                    {step === "PAN" && (
                        <>
                            <input
                                value={pan}
                                onChange={(e) => setPan(e.target.value.toUpperCase())}
                                placeholder="ABCDE1234F"
                                className="w-full border px-4 py-2 rounded mb-4 uppercase"
                            />
                            <button
                                onClick={handleVerifyPan}
                                disabled={loading}
                                className="w-full bg-blue-500 text-white py-3 rounded"
                            >
                                {loading ? "Verifying Pan..." : "Verify PAN"}
                            </button>
                        </>
                    )}

                    {/* DETAILS */}
                    {step === "DETAILS" && (
                        <>
                            <input
                                value={name}
                                disabled={!!panData}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Full Name"
                                className="w-full border px-4 py-2 rounded mb-3"
                            />
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                className="w-full border px-4 py-2 rounded mb-4"
                            />
                            <button
                                onClick={handleSignup}
                                disabled={loading}
                                className="w-full bg-blue-500 text-white py-3 rounded"
                            >
                                {loading ? "Setting up profile" : "Complete Signup"}
                            </button>
                        </>
                    )}
                </div>
            </div>
    );
}
