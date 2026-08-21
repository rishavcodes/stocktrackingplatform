"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { APEX_DOMAIN } from "@/lib/customDomain";

// Mirrors the allowlist used by NextAuth's `redirect` callback so that
// a callbackUrl from `acme.tradeboxlive.com/dashboard/leads` survives the
// apex login round-trip but a foreign host cannot redirect us off-site.
function isAllowedTradeboxUrl(target: string): boolean {
    try {
        const u = new URL(target, typeof window !== "undefined" ? window.location.origin : `https://${APEX_DOMAIN}`);
        const host = u.hostname.toLowerCase();
        return (
            host === APEX_DOMAIN ||
            host.endsWith(`.${APEX_DOMAIN}`) ||
            host === "localhost"
        );
    } catch {
        return false;
    }
}

type Step = "MOBILE" | "OTP" | "PROVIDER_FORM";

interface ValidationError {
    field: string;
    message: string;
}

// Regex patterns
const REGEX = {
    mobile: /^[6-9]\d{9}$/,
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    name: /^[a-zA-Z\s.'-]{2,50}$/,
    city: /^[a-zA-Z\s]{2,50}$/,
    state: /^[a-zA-Z\s]{2,50}$/,
    sebiReg: /^[A-Z]{3}[0-9]{4,12}$/i,
    otp: /^\d{4}$/,
};

// Validation helpers
const validators = {
    mobile: (value: string): string | null => {
        if (!value) return "Mobile number is required";
        if (!REGEX.mobile.test(value)) return "Enter valid 10-digit mobile number starting with 6-9";
        return null;
    },
    otp: (value: string): string | null => {
        if (!value) return "OTP is required";
        if (!REGEX.otp.test(value)) return "OTP must be 4 digits";
        return null;
    },
    name: (value: string): string | null => {
        if (!value.trim()) return "Name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        if (!REGEX.name.test(value.trim())) return "Name contains invalid characters";
        return null;
    },
    email: (value: string): string | null => {
        if (!value.trim()) return "Email is required";
        if (!REGEX.email.test(value.trim())) return "Enter a valid email address";
        return null;
    },
    city: (value: string): string | null => {
        if (!value.trim()) return "City is required";
        if (!REGEX.city.test(value.trim())) return "City contains invalid characters";
        return null;
    },
    state: (value: string): string | null => {
        if (!value.trim()) return "State is required";
        if (!REGEX.state.test(value.trim())) return "State contains invalid characters";
        return null;
    },
    sebiRegNumber: (value: string): string | null => {
        if (!value.trim()) return "SEBI Registration Number is required";
        const trimmed = value.trim();
        if (trimmed.length < 12 || trimmed.length > 16) {
            return "SEBI Registration Number must be 12-16 characters";
        }
        if (!/^[a-zA-Z0-9]+$/.test(trimmed)) {
            return "SEBI Registration Number must be alphanumeric";
        }
        return null;
    },
    sebiDoc: (file: File | null): string | null => {
        if (!file) return "SEBI Certificate is required";

        const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(file.type)) {
            return "Only PDF, JPG, or PNG files are allowed";
        }
        if (file.size > maxSize) {
            return "File size must be less than 5MB";
        }
        return null;
    },
};

// UI Components defined outside to prevent remounting
const InputField = ({
    label,
    value,
    onChange,
    placeholder,
    error,
    maxLength,
    type = "text",
    disabled = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    error?: string;
    maxLength?: number;
    type?: string;
    disabled?: boolean;
}) => (
    <div className="space-y-2">
        <div>
            <label className="block text-sm font-medium text-gray-700">
                {label}
            </label>

            <div className="flex gap-2">
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    disabled={disabled}
                    autoComplete="off"
                    className={`flex-1 border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition mb-2 ${error ? "border-red-500" : "border-gray-300"
                        } ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
                />
            </div>
            {error && <p className="text-xs text-red-600 text-left mb-2">{error}</p>}
        </div>
    </div>
);

const LoadingButton = ({
    onClick,
    loading,
    children,
    disabled = false,
}: {
    onClick: () => void;
    loading: boolean;
    children: React.ReactNode;
    disabled?: boolean;
}) => (
    <button
        onClick={onClick}
        disabled={loading || disabled}
        className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium transition flex items-center justify-center gap-x-4"
    >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
    </button>
);

function getValidCallbackUrl(raw: string | null): string | null {
    if (!raw) return null;
    try {
        const u = new URL(raw, typeof window !== "undefined" ? window.location.href : "https://tradeboxlive.com");
        if (
            u.hostname === "tradeboxlive.com" ||
            u.hostname.endsWith(".tradeboxlive.com") ||
            u.hostname === "localhost"
        ) {
            return u.toString();
        }
    } catch {}
    return null;
}

export default function ProviderSigninContainer() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = getValidCallbackUrl(searchParams?.get("callbackUrl") ?? null);
    const { toast } = useToast();

    const [step, setStep] = useState<Step>("MOBILE");
    const [number, setNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);

    // Provider form
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [sebiRegNumber, setSebiRegNumber] = useState("");
    const [sebiDoc, setSebiDoc] = useState<File | null>(null);

    // Resend OTP timer
    const [resendTimer, setResendTimer] = useState(0);

    // Field-level errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Countdown timer for resend OTP
    useEffect(() => {
        if (resendTimer <= 0) return;
        const interval = setInterval(() => {
            setResendTimer((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [resendTimer]);

    // Clear error for a specific field
    const clearError = (field: string) => {
        setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
    };

    /* ---------------- MOBILE ---------------- */

    const requestOtp = async () => {
        const error = validators.mobile(number);
        if (error) {
            setErrors({ mobile: error });
            toast({ title: error, variant: "destructive" });
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/requestoptformobile`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ number, loginAs: "provider" }),
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to send OTP");
            }

            if (data.existsAs && data.existsAs !== "provider") {
                toast({
                    title: "Number already registered",
                    description: `This number is already registered as a ${data.existsAs === "user" ? "User" : "Admin"}. Please sign in from the respective page.`,
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "OTP sent successfully",
                description: `Sent to ${number}`
            });
            setResendTimer(60);
            setStep("OTP");
        } catch (err: any) {
            toast({
                title: "Failed to send OTP",
                description: err.message || "Please try again",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- RESEND OTP ---------------- */

    const handleResendOtp = async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/requestoptformobile`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ number, loginAs: "provider" }),
                }
            );

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to resend OTP");

            toast({ title: "OTP Resent", description: `New OTP sent to ${number}` });
            setOtp("");
            setResendTimer(60);
        } catch (err: any) {
            toast({ title: "Resend Failed", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- OTP ---------------- */

    const verifyOtp = async () => {
        const error = validators.otp(otp);
        if (error) {
            setErrors({ otp: error });
            toast({ title: error, variant: "destructive" });
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/checkotpnumber`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ number, otp }),
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Invalid OTP");
            }

            // Existing provider → login
            if (data.userExists && data.role === "provider") {
                const signInResult = await signIn("credentials", {
                    number,
                    loginAs: "provider",
                    redirect: false
                });

                if (signInResult?.error) {
                    throw new Error("Login failed");
                }
                toast({ title: "Sign In Successful!", description: "Redirecting to dashboard", variant: "default" });
                const category = data.category;

                if (category === "Broker") {
                    router.push("/dashboard/serviceprovider/recommendations");
                    return;
                }

                // If the user came in via a callbackUrl pointing back to a
                // tradeboxlive.com host (e.g. deep-link from their subdomain),
                // honor it so we land on the exact page they wanted.
                if (callbackUrl && isAllowedTradeboxUrl(callbackUrl)) {
                    window.location.href = callbackUrl;
                    return;
                }

                // Approved white-label subdomain → send the SP to their branded URL.
                // Full-page nav is required to switch origin onto the subdomain
                // (the session cookie is `.tradeboxlive.com`-scoped).
                if (
                    data.customSubdomainStatus === "active" &&
                    typeof data.customSubdomain === "string" &&
                    data.customSubdomain.length > 0
                ) {
                    window.location.href = `https://${data.customSubdomain}.${APEX_DOMAIN}/dashboard`;
                    return;
                }

                router.push("/dashboard/serviceprovider/recommendations");
                return;
            }

            // Number exists but as a different role — block signup
            if (data.userExists && data.role !== "provider") {
                toast({
                    title: "Number already registered",
                    description: `This number is already registered as a ${data.role === "user" ? "User" : "Admin"}. Please sign in from the respective page.`,
                    variant: "destructive",
                });
                setStep("MOBILE");
                return;
            }

            // New provider → show form
            toast({
                title: "OTP verified",
                description: "Complete your registration"
            });
            setStep("PROVIDER_FORM");
        } catch (err: any) {
            toast({
                title: "OTP verification failed",
                description: err.message || "Please try again",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- PROVIDER SIGNUP ---------------- */

    const validateProviderForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        const nameError = validators.name(name);
        if (nameError) newErrors.name = nameError;

        const emailError = validators.email(email);
        if (emailError) newErrors.email = emailError;

        const cityError = validators.city(city);
        if (cityError) newErrors.city = cityError;

        const stateError = validators.state(state);
        if (stateError) newErrors.state = stateError;

        const sebiError = validators.sebiRegNumber(sebiRegNumber);
        if (sebiError) newErrors.sebiRegNumber = sebiError;

        const docError = validators.sebiDoc(sebiDoc);
        if (docError) newErrors.sebiDoc = docError;

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            toast({
                title: "Validation Error",
                description: Object.values(newErrors)[0],
                variant: "destructive",
            });
            return false;
        }

        return true;
    };

    const submitProviderSignup = async () => {
        if (!validateProviderForm()) return;

        setLoading(true);

        try {
            const formData = new FormData();

            formData.append(
                "data",
                JSON.stringify({
                    RegName: name.trim(),
                    email: email.trim().toLowerCase(),
                    number,
                    city: city.trim(),
                    state: state.trim(),
                    regNumber: sebiRegNumber.trim().toUpperCase(),
                })
            );

            if (sebiDoc) {
                formData.append("certificate", sebiDoc);
            }

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/provider/signup`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Signup failed");
            }

            const signInResult = await signIn("credentials", {
                number,
                redirect: false
            });

            if (signInResult?.error) {
                throw new Error("Registration successful but login failed");
            }

            toast({
                title: "Registration successful!",
                description: "CRM Team will contact you"
            });
            router.replace("/");
        } catch (err: any) {
            toast({
                title: "Registration failed",
                description: err.message || "Please try again",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- MAIN UI ---------------- */

    return (
        <div className="min-h-screen flex">
            <div className="w-full flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md">
                    {/* <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
                        Service Provider Sign In
                    </h1> */}

                    <div className="flex items-center justify-center mb-8">
                        <div className="flex items-center gap-2">
                            <Link
                                href={"/"}
                                className="flex gap-2 items-center text-[20px] cursor-pointer"
                            >
                                <Image
                                    src={"/images/logo/nav.png"}
                                    alt="navlogo"
                                    width={45}
                                    height={45}
                                />
                                <h1 className="text-2xl text-foreground">
                                    Trade<span className="font-semibold">Box</span>
                                </h1>
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-8">
                        {/* STEP 1: MOBILE */}
                        {step === "MOBILE" && (
                            <>
                                <InputField
                                    label="Mobile Number"
                                    value={number}
                                    onChange={(val) => {
                                        setNumber(val.replace(/\D/g, ""));
                                        clearError("mobile");
                                    }}
                                    placeholder="Enter 10-digit mobile number"
                                    maxLength={10}
                                    error={errors.mobile}
                                    disabled={loading}
                                />
                                <LoadingButton onClick={requestOtp} loading={loading}>
                                    {loading ? "Sending OTP..." : "Send OTP"}
                                </LoadingButton>

                                <p className="text-xs text-center text-gray-500 mt-4">
                                    By clicking on proceed, you have read and agree to the {" "}
                                    <a href="#" className="text-blue-500 hover:underline">
                                        Terms of Use
                                    </a>{" "}
                                    &{" "}
                                    <a href="#" className="text-blue-500 hover:underline">
                                        Privacy Policy
                                    </a>
                                    .
                                </p>
                            </>
                        )}

                        {/* STEP 2: OTP */}
                        {step === "OTP" && (
                            <div>
                                <p className="text-sm text-gray-600 mb-4 text-center">
                                    Enter the OTP sent to <strong>{number}</strong>
                                </p>
                                <InputField
                                    label="One-Time Password"
                                    value={otp}
                                    onChange={(val) => {
                                        setOtp(val.replace(/\D/g, ""));
                                        clearError("otp");
                                    }}
                                    placeholder="Enter 4-digit OTP"
                                    maxLength={4}
                                    error={errors.otp}
                                    disabled={loading}
                                />
                                <LoadingButton onClick={verifyOtp} loading={loading}>
                                    {loading ? "Verifying..." : "Verify OTP"}
                                </LoadingButton>

                                <div className="flex items-center justify-between mt-3">
                                    <button
                                        onClick={() => {
                                            setStep("MOBILE");
                                            setOtp("");
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
                            </div>
                        )}

                        {/* STEP 3: PROVIDER FORM */}
                        {step === "PROVIDER_FORM" && (
                            <div>
                                <InputField
                                    label="Full Name *"
                                    value={name}
                                    onChange={(val) => {
                                        setName(val);
                                        clearError("name");
                                    }}
                                    placeholder="Enter your full name"
                                    error={errors.name}
                                    disabled={loading}
                                />
                                <InputField
                                    label="Email Address *"
                                    value={email}
                                    onChange={(val) => {
                                        setEmail(val);
                                        clearError("email");
                                    }}
                                    placeholder="your.email@example.com"
                                    type="email"
                                    error={errors.email}
                                    disabled={loading}
                                />
                                <InputField
                                    label="City *"
                                    value={city}
                                    onChange={(val) => {
                                        setCity(val);
                                        clearError("city");
                                    }}
                                    placeholder="Enter city"
                                    error={errors.city}
                                    disabled={loading}
                                />
                                <InputField
                                    label="State *"
                                    value={state}
                                    onChange={(val) => {
                                        setState(val);
                                        clearError("state");
                                    }}
                                    placeholder="Enter state"
                                    error={errors.state}
                                    disabled={loading}
                                />
                                <InputField
                                    label="SEBI Registration Number *"
                                    value={sebiRegNumber}
                                    onChange={(val) => {
                                        setSebiRegNumber(val.toUpperCase());
                                        clearError("sebiRegNumber");
                                    }}
                                    placeholder="e.g., IN123456...."
                                    maxLength={16}
                                    error={errors.sebiRegNumber}
                                    disabled={loading}
                                />

                                {/* File Upload */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        SEBI Certificate *
                                    </label>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setSebiDoc(file);
                                            clearError("sebiDoc");
                                        }}
                                        disabled={loading}
                                        className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 disabled:opacity-50"
                                    />
                                    {sebiDoc && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Selected: {sebiDoc.name} ({(sebiDoc.size / 1024).toFixed(1)} KB)
                                        </p>
                                    )}
                                    {errors.sebiDoc && (
                                        <p className="text-red-500 text-xs mt-1">{errors.sebiDoc}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">
                                        PDF, JPG, or PNG (max 5MB)
                                    </p>
                                </div>

                                <LoadingButton onClick={submitProviderSignup} loading={loading}>
                                    {loading ? "Submitting..." : "Complete Registration"}
                                </LoadingButton>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}