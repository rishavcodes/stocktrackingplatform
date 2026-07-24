"use client";

import { useState, useCallback } from "react";
import { signIn } from "next-auth/react";
import { BIGUL_SESSION_KEY } from "@/lib/brokerSession";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { requestOtp, verifyOtp, signupUser } from "@/lib/api/auth";
import { Loader2, Phone, ShieldCheck } from "lucide-react";

interface MarketplaceAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
  brokerType?: "bigul" | "aliceblue";
  clientCode?: string;
}

type Step = "phone" | "otp";

export default function MarketplaceAuthModal({
  isOpen,
  onClose,
  onAuthenticated,
  brokerType,
  clientCode,
}: MarketplaceAuthModalProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = useCallback(async () => {
    if (phone.length !== 10) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await requestOtp(phone, "user");
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }, [phone]);

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== 4) {
      setError("Enter the 4-digit OTP");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await verifyOtp(phone, otp);

      if (!result.userExists) {
        await signupUser({
          name: clientCode || `User-${phone.slice(-4)}`,
          number: phone,
          email: `${phone}@marketplace.user`,
        });
      }

      const signInResult = await signIn("credentials", {
        number: phone,
        loginAs: "user",
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Sign-in failed. Please try again.");
        setLoading(false);
        return;
      }

      if (brokerType && clientCode) {
        try {
          const sessionRes = await fetch("/api/auth/session");
          const sessionData = await sessionRes.json();
          const token = sessionData?.backendToken;

          if (token) {
            await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/link-broker`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ brokerType, clientCode }),
              }
            );

            // Merge broker session into NextAuth JWT so one source of truth; then clear localStorage
            if (typeof window !== "undefined" && brokerType === "bigul") {
              try {
                const raw = localStorage.getItem(BIGUL_SESSION_KEY);
                const stored = raw ? (JSON.parse(raw) as { accessToken?: string; clientCode?: string; expiresAt?: number }) : null;
                if (stored?.accessToken != null && stored?.expiresAt != null) {
                  await signIn("credentials", {
                    brokerType: "bigul",
                    clientCode: stored.clientCode ?? clientCode,
                    loginAs: "user",
                    accessToken: stored.accessToken,
                    expiresAt: String(stored.expiresAt),
                    redirect: false,
                  });
                  localStorage.removeItem(BIGUL_SESSION_KEY);
                }
              } catch {
                // best-effort
              }
            }
          }
        } catch {
          // broker linking is best-effort
        }
      }

      onAuthenticated();
    } catch (err: any) {
      setError(err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  }, [otp, phone, clientCode, brokerType, onAuthenticated]);

  const handleClose = () => {
    setStep("phone");
    setPhone("");
    setOtp("");
    setError("");
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl border border-slate-200">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-5 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 mb-3">
            {step === "phone" ? (
              <Phone className="h-6 w-6 text-white" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            )}
          </div>
          <h2 className="text-lg font-bold text-white">
            {step === "phone" ? "Verify to Trade" : "Enter OTP"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {step === "phone"
              ? "Enter your phone number to start trading"
              : `We sent a 4-digit code to +91 ${phone}`}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {step === "phone" ? (
            <>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                  Phone Number
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-2 rounded-lg">
                    +91
                  </span>
                  <Input
                    type="tel"
                    maxLength={10}
                    placeholder="Enter 10-digit number"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                      setError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                    className="flex-1 h-10"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 font-medium">{error}</p>
              )}

              <Button
                onClick={handleSendOtp}
                disabled={loading || phone.length !== 10}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Send OTP"
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center">
                <label className="text-xs font-medium text-slate-600 mb-3 block">
                  Verification Code
                </label>
                <InputOTP
                  maxLength={4}
                  value={otp}
                  onChange={(val) => {
                    setOtp(val);
                    setError("");
                  }}
                  autoFocus
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                    <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                    <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                    <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && (
                <p className="text-xs text-red-600 font-medium text-center">{error}</p>
              )}

              <Button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 4}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify & Continue"
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError("");
                }}
                className="w-full text-xs text-slate-500 hover:text-slate-700 font-medium"
              >
                Change phone number
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
