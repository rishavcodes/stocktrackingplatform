"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/rootReducer";
import { FileSignature, Loader2, ShieldCheck } from "lucide-react";
import { updateLead } from "@/lib/updateLead";
import { useToast } from "@/components/ui/use-toast";

interface Step1Props {
  tncFileURL: string;
  serviceId: string;
  setStep: (step: number) => void;
}

export default function Step1({
  tncFileURL,
  serviceId,
  setStep,
}: Step1Props) {
  const { data: session } = useSession();
  const dispatch = useDispatch();
  const { toast } = useToast();

  const cartItem = useSelector((state: RootState) => state.cart.items[0]);
  const { isEsignCompleted } = useSelector(
    (state: RootState) => state.cartSteps.step2Data
  );

  const [isEsignLoading, setIsEsignLoading] = useState(false);
  const esignInitiatedRef = useRef(false);
  const leadType = cartItem?.type || "service";

  /* ------------------------------------------------
     Auto-skip if already eSigned (resume-safe)
  ------------------------------------------------- */
  useEffect(() => {
    if (isEsignCompleted) {
      setStep(2);
    }
  }, [isEsignCompleted, setStep]);

  /* ------------------------------------------------
     Start eSign flow (redirect to Surepass)
  ------------------------------------------------- */
  const handleEsignInitialization = async () => {
    if (!session?.user?.id || !cartItem || isEsignLoading || esignInitiatedRef.current) return;

    esignInitiatedRef.current = true;
    setIsEsignLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/esign/init`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.user.id,
            serviceId: cartItem.subscribedToId,
            tncFileURL,
            fullName: session.user.RegName,
            mobile: String(session.user.number),
            email: session.user.email,
            cartItem,
            // Originating host so the Surepass callback can return the user
            // to the same SP subdomain they started checkout on.
            originUrl: window.location.origin,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data?.token || !data?.clientId) {
        throw new Error("Failed to initialize eSign");
      }

      sessionStorage.setItem(
        "pending_esign",
        JSON.stringify({
          clientId: data.clientId,
          serviceId: cartItem.subscribedToId,
          initiatedAt: Date.now(),
        })
      );

      if (session.backendToken) {
        updateLead("esign_started", cartItem.subscribedToId, session.backendToken, leadType);
      }

      window.location.href = `https://esign-client.surepass.app/?token=${data.token}`;
    } catch (error) {
      console.error("eSign initialization failed:", error);
      esignInitiatedRef.current = false;
      toast({
        title: "eSign Failed",
        description: "Unable to start eSign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEsignLoading(false);
    }
  };

  /* ------------------------------------------------
     UI
  ------------------------------------------------- */
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-6">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Terms & Conditions</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please review and electronically sign to continue
        </p>
      </div>

      {/* T&C Viewer */}
      <div className="h-[60vh] border rounded-lg overflow-hidden mb-6">
        {tncFileURL ? (
          <iframe
            src={`${tncFileURL}#toolbar=0&navpanes=0`}
            title="Terms & Conditions"
            className="w-full h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Terms & Conditions document is not available.
          </div>
        )}
      </div>

      {/* Security note */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <ShieldCheck className="w-4 h-4 text-green-600" />
        Secure & legally binding electronic signature
      </div>

      {/* CTA */}
      <Button
        onClick={handleEsignInitialization}
        disabled={isEsignLoading}
        className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
      >
        {isEsignLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Redirecting to eSign…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Continue to eSign
          </span>
        )}
      </Button>
    </div>
  );
}
