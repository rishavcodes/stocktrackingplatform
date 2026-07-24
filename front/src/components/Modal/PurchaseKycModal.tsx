"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { updateUserKyc } from "@/lib/api/auth";
import { PanData } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

interface PurchaseKycModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function PurchaseKycModal({
  open,
  onClose,
  onComplete,
}: PurchaseKycModalProps) {
  const { data: session, update: updateSession } = useSession();
  const { toast } = useToast();

  const [step, setStep] = useState<"PAN" | "EMAIL">("PAN");
  const [pan, setPan] = useState("");
  const [panData, setPanData] = useState<PanData | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyPan = async () => {
    const trimmedPan = pan.trim();
    if (!PAN_REGEX.test(trimmedPan)) {
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
          body: JSON.stringify({ panNumber: trimmedPan }),
        }
      );

      const data: PanData = await res.json();

      if (!res.ok || !data.success || !data.data || data.data.status !== "valid") {
        throw new Error("PAN verification failed");
      }

      setPanData(data);
      setStep("EMAIL");
    } catch (e: any) {
      toast({
        title: "PAN Verification Failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!panData || !session?.user?.id) return;

    setLoading(true);
    try {
      await updateUserKyc({
        id: session.user.id,
        name: panData.data.full_name,
        email: email.trim(),
        pannumber: panData.data.pan_number,
        dob: panData.data.dob,
        gender: panData.data.gender,
        aadhaarLast4: panData.data.masked_aadhaar?.slice(-4),
      });

      // Update session JWT with new values
      await updateSession({
        RegName: panData.data.full_name,
        email: email.trim(),
        pannumber: panData.data.pan_number,
      });

      toast({ title: "KYC completed successfully" });
      onComplete();
    } catch (e: any) {
      toast({
        title: "Update Failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle>Complete KYC to Purchase</DialogTitle>
          <DialogDescription>
            We need your PAN and email to proceed with this purchase.
          </DialogDescription>
        </DialogHeader>

        {step === "PAN" && (
          <div className="space-y-4 mt-2">
            <input
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase().trim())}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyPan()}
              placeholder="Enter PAN (e.g. ABCDE1234F)"
              className="w-full border px-4 py-2 rounded uppercase"
            />
            <button
              onClick={handleVerifyPan}
              disabled={loading}
              className="w-full bg-blue-500 text-white py-3 rounded disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify PAN"}
            </button>
          </div>
        )}

        {step === "EMAIL" && (
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm text-gray-500">Name (from PAN)</label>
              <input
                value={panData?.data.full_name || ""}
                disabled
                className="w-full border px-4 py-2 rounded bg-gray-50"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Enter your email"
                className="w-full border px-4 py-2 rounded"
                type="email"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-green-500 text-white py-3 rounded disabled:opacity-50"
            >
              {loading ? "Saving..." : "Complete & Proceed"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
