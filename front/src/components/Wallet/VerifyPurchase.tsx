import { useState, ChangeEvent } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import Input from "../Inputs/Input";

export default function VerifyPurchaseButton({
  transactionId,
  initialVerified,
}: {
  transactionId: string;
  initialVerified: boolean;
}) {
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingReject, setLoadingReject] = useState(false);
  const [verified, setVerified] = useState(initialVerified);
  const [rejected, setRejected] = useState(false);
  const [reason, setReason] = useState<string>("");
  const { toast } = useToast();

  const handleVerifyPurchase = async () => {
    if (verified) return; // Prevent redundant API calls
    setLoadingVerify(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/verify-manual-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: transactionId }),
        }
      );

      if (response.ok) {
        setVerified(true);
        toast({
          title: "Purchase Verified",
          description: "Your purchase has been successfully verified, telegram link have been sent via mail.",
          variant: "default",
        });
      } else {
        throw new Error("Failed to verify purchase");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleRejectPurchase = async () => {
    if (verified || rejected) return;
    setLoadingReject(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/reject-manual-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: transactionId, reason: reason }),
        }
      );

      if (response.ok) {
        setRejected(true);
        toast({
          title: "Purchase Rejected",
          description: "The transaction has been rejected.",
          variant: "default",
        });
      } else throw new Error("Failed to reject purchase");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingReject(false);
    }
  };

  function handleReasonChangeInput(event: ChangeEvent<HTMLInputElement>) {
    setReason(event.target.value);
  }


  return (
    <>
      <Toaster />
      <div className="flex gap-3">
        <AlertDialog>
          <AlertDialogTrigger>
            <Button className="bg-green-600" variant="green" disabled={verified || loadingVerify}>
              {loadingVerify ? "Verifying..." : verified ? "Verified" : "Verify Purchase"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Verify Purchase</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to verify this purchase?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleVerifyPurchase}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger className="bg-red-500 w-fit px-5 py-1 rounded-md">
              {loadingReject
                ? "Rejecting..."
                : rejected
                  ? "Rejected"
                  : "Reject Transaction"}
            {/* </Button> */}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject Purchase</AlertDialogTitle>
            </AlertDialogHeader>
            <Input
              title="Reason"
              type="text"
              value={reason}
              name="reason"
              onChange={handleReasonChangeInput}
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRejectPurchase}>
                Reject
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
