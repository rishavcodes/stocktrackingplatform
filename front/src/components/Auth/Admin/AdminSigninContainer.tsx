"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

/* ---------------- Types ---------------- */
type Step = "MOBILE" | "OTP";

/* ---------------- Regex ---------------- */
const REGEX = {
    mobile: /^[6-9]\d{9}$/,
    otp: /^\d{4}$/,
};

/* ---------------- Validators ---------------- */
const validators = {
    mobile: (value: string) => {
        if (!value) return "Mobile number is required";
        if (!REGEX.mobile.test(value))
            return "Enter valid 10-digit mobile number";
        return null;
    },
    otp: (value: string) => {
        if (!value) return "OTP is required";
        if (!REGEX.otp.test(value)) return "OTP must be 4 digits";
        return null;
    },
};

/* ---------------- UI Helpers ---------------- */
const InputField = ({
    label,
    value,
    onChange,
    placeholder,
    maxLength,
    error,
    disabled,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    maxLength?: number;
    error?: string;
    disabled?: boolean;
}) => (
    <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
            {label}
        </label>
        <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            className={`w-full border px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition ${error ? "border-red-500" : "border-gray-300"
                }`}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
);

const LoadingButton = ({
    loading,
    onClick,
    children,
}: {
    loading: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) => (
    <button
        onClick={onClick}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
    >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
    </button>
);

/* ---------------- Component ---------------- */
export default function AdminSigninContainer() {
    const router = useRouter();
    const { toast } = useToast();

    const [step, setStep] = useState<Step>("MOBILE");
    const [number, setNumber] = useState("");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const clearError = (key: string) => {
        setErrors((prev) => {
            const e = { ...prev };
            delete e[key];
            return e;
        });
    };

    /* ---------------- Request OTP ---------------- */
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
                    body: JSON.stringify({ number }),
                }
            );

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            toast({ title: "OTP sent successfully" });
            setStep("OTP");
        } catch (err: any) {
            toast({
                title: "Failed to send OTP",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- Verify OTP ---------------- */
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
            if (!res.ok) throw new Error(data.message);

            if (!data.userExists || data.role !== "admin") {
                throw new Error("Unauthorized admin");
            }

            const signInResult = await signIn("credentials", {
                number,
                loginAs: "admin",
                redirect: false,
            });

            if (signInResult?.error) {
                throw new Error("Login failed");
            }

            toast({ title: "Admin Login Successful" });
            router.replace("/dashboard/admin");
        } catch (err: any) {
            toast({
                title: "OTP Verification Failed",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- UI ---------------- */
    return (
        <div className="min-h-screen flex">
            {/* Left */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 to-gray-700 text-white p-12 flex-col justify-between">
                <div>
                    <h1 className="text-4xl font-bold mb-4">
                        Admin Panel 🔐
                    </h1>
                    <p className="text-gray-300">
                        Secure access to Tradebox administration.
                    </p>
                </div>
                <p className="text-sm text-gray-400">
                    © 2024 Tradebox. All rights reserved.
                </p>
            </div>

            {/* Right */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
                <div className="w-full max-w-md">
                    <div className="flex justify-center mb-8">
                        <Link href="/" className="flex items-center gap-2">
                            <Image
                                src="/images/logo/nav.png"
                                alt="logo"
                                width={40}
                                height={40}
                            />
                            <span className="text-xl font-semibold">
                                Trade<span className="font-bold">Box</span>
                            </span>
                        </Link>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm p-8">
                        {step === "MOBILE" && (
                            <div className="flex flex-col gap-y-4">
                                <InputField
                                    label="Admin Mobile Number"
                                    value={number}
                                    onChange={(v) => {
                                        setNumber(v.replace(/\D/g, ""));
                                        clearError("mobile");
                                    }}
                                    placeholder="Enter mobile number"
                                    maxLength={10}
                                    error={errors.mobile}
                                    disabled={loading}
                                />
                                <LoadingButton loading={loading} onClick={requestOtp}>
                                    Send OTP
                                </LoadingButton>
                            </div>
                        )}

                        {step === "OTP" && (
                            <div className="flex flex-col gap-y-4">
                                <InputField
                                    label="One-Time Password"
                                    value={otp}
                                    onChange={(v) => {
                                        setOtp(v.replace(/\D/g, ""));
                                        clearError("otp");
                                    }}
                                    placeholder="Enter OTP"
                                    maxLength={4}
                                    error={errors.otp}
                                    disabled={loading}
                                />
                                <LoadingButton loading={loading} onClick={verifyOtp}>
                                    Verify & Login
                                </LoadingButton>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
