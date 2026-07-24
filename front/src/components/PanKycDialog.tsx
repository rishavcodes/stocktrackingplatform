"use client";

import { useEffect, useState } from "react";
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
import { PanData } from "@/lib/types";
import { Loader2, ShieldCheck, BadgeCheck } from "lucide-react";

type Props = {
  open: boolean;
  userId?: string;
  onClose: () => void;
  /** Called after KYC is saved successfully (parent should refetch). */
  onCompleted: () => void;
};

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export default function PanKycDialog({
  open,
  userId,
  onClose,
  onCompleted,
}: Props) {
  const { toast } = useToast();
  const [pan, setPan] = useState("");
  const [panData, setPanData] = useState<PanData | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset whenever the modal closes so reopening starts clean.
  useEffect(() => {
    if (!open) {
      setPan("");
      setPanData(null);
      setVerifying(false);
      setSaving(false);
    }
  }, [open]);

  async function handleVerifyPan() {
    if (!PAN_REGEX.test(pan)) {
      toast({
        title: "Invalid PAN",
        description: "Format should be ABCDE1234F",
        variant: "destructive",
      });
      return;
    }
    setVerifying(true);
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

      if (!res.ok || !data.success || data.data?.status !== "valid") {
        throw new Error("PAN verification failed");
      }
      setPanData(data);
    } catch (e: any) {
      toast({
        title: "PAN verification failed",
        description: e?.message || "Please check the PAN and try again.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  }

  async function handleSaveKyc() {
    if (!panData || !userId) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/updateprofile/user/kyc`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: userId,
            pannumber: panData.data.pan_number,
            dob: panData.data.dob,
            gender: panData.data.gender,
            aadhaarLast4: panData.data.masked_aadhaar?.slice(-4),
          }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        toast({ title: "KYC completed successfully" });
        onCompleted();
        onClose();
      } else {
        toast({
          title: "Could not save KYC",
          description: json.message || "Something went wrong.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to save KYC",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
            <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle className="text-center">Complete your KYC</DialogTitle>
          <DialogDescription className="text-center">
            {!panData
              ? "Enter your PAN to verify your identity."
              : "Confirm the details fetched from your PAN."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {!panData ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  PAN number
                </label>
                <input
                  type="text"
                  maxLength={10}
                  autoFocus
                  placeholder="ABCDE1234F"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase().trim())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleVerifyPan();
                  }}
                  className="w-full h-11 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-center tracking-[0.3em] font-mono text-base uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button
                type="button"
                onClick={handleVerifyPan}
                disabled={verifying || pan.length !== 10}
                className="w-full h-11"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" /> Verify PAN
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 divide-y divide-gray-100 dark:divide-gray-700">
                <KycRow label="PAN" value={panData.data.pan_number} mono />
                <KycRow label="Name" value={panData.data.full_name} />
                {panData.data.dob && (
                  <KycRow label="Date of birth" value={panData.data.dob} />
                )}
                {panData.data.gender && (
                  <KycRow label="Gender" value={panData.data.gender} />
                )}
              </div>

              <Button
                type="button"
                onClick={handleSaveKyc}
                disabled={saving}
                className="w-full h-11"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <BadgeCheck className="w-4 h-4 mr-2" /> Complete KYC
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => setPanData(null)}
                className="block mx-auto text-xs font-medium text-gray-500 dark:text-gray-400 hover:underline"
              >
                ← Use a different PAN
              </button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KycRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span
        className={`text-sm font-medium text-gray-900 dark:text-white ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
