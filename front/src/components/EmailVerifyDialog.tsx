"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Mail, BadgeCheck } from "lucide-react";

type Props = {
  open: boolean;
  userId?: string;
  email?: string;
  onClose: () => void;
  /** Called after a successful verification (parent should refetch). */
  onVerified: () => void;
};

export default function EmailVerifyDialog({
  open,
  userId,
  email,
  onClose,
  onVerified,
}: Props) {
  const { toast } = useToast();
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  // Reset the flow whenever the modal closes so reopening starts clean.
  useEffect(() => {
    if (!open) {
      setOtpSent(false);
      setOtpValue("");
      setCooldown(0);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    }
  }, [open]);

  // Clear the running interval on unmount.
  useEffect(
    () => () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    },
    []
  );

  async function handleSendOTP() {
    setOtpLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/send-email-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }
      );
      const json = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setCooldown(60);
        cooldownRef.current = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(cooldownRef.current!);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        toast({ title: "OTP sent to your email" });
      } else {
        toast({
          title: "Failed",
          description: json.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (!otpValue || otpValue.length !== 4) {
      toast({ title: "Enter 4-digit OTP", variant: "destructive" });
      return;
    }
    setVerifyLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/verify-email-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, otp: otpValue }),
        }
      );
      const json = await res.json();
      if (res.ok) {
        toast({ title: "Email verified successfully" });
        onVerified();
        onClose();
      } else {
        toast({
          title: "Verification failed",
          description: json.message,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Verification failed",
        variant: "destructive",
      });
    } finally {
      setVerifyLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-md p-4">
        <DialogHeader>
          <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle className="text-center">Verify your email</DialogTitle>
          <DialogDescription className="text-center">
            {email ? (
              <>
                We&apos;ll send a 4-digit code to{" "}
                <span className="font-medium text-gray-900 dark:text-white">
                  {email}
                </span>
                .
              </>
            ) : (
              "Add an email to your profile before verifying."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {!otpSent ? (
            <Button
              type="button"
              onClick={handleSendOTP}
              disabled={otpLoading || !email}
              className="w-full h-11"
            >
              {otpLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" /> Send verification code
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                  Enter the 4-digit code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  autoFocus
                  placeholder="••••"
                  value={otpValue}
                  onChange={(e) =>
                    setOtpValue(e.target.value.replace(/\D/g, ""))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && otpValue.length === 4)
                      handleVerifyOTP();
                  }}
                  className="mx-auto block w-40 h-12 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-center tracking-[0.5em] font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Button
                type="button"
                onClick={handleVerifyOTP}
                disabled={verifyLoading || otpValue.length !== 4}
                className="w-full h-11"
              >
                {verifyLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying…
                  </>
                ) : (
                  <>
                    <BadgeCheck className="w-4 h-4 mr-2" /> Verify email
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpValue("");
                  }}
                  className="font-medium text-gray-500 dark:text-gray-400 hover:underline"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={cooldown > 0 || otpLoading}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend code (${cooldown}s)` : "Resend code"}
                </button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
