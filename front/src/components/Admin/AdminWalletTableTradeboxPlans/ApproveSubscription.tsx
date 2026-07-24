"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import fetcher from "@/lib/data/setup";
import { useSession } from "next-auth/react";

type ApproveSubscriptionProps = { purchaseId: string };

export default function ApproveSubscription({ purchaseId }: ApproveSubscriptionProps) {
  const session = useSession();
  const { toast } = useToast();

  async function handleApprove() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/approve-subscription`,
        {
          method: "POST",
          body: JSON.stringify({ purchaseId }),
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${session.data?.backendToken}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to approve subscription");
      }

      toast({
        title: "Success",
        description: "Subscription Approved!",
        variant: "default",
      });

      setTimeout(() => {
        window.location.reload(); // Refresh the data
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Approval failed",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog>
      <DialogTrigger>
        <button className="bg-green-500 py-2 rounded-xl cursor-pointer">
          approve
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Subscription</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <button
            className="bg-blue-500 px-3 py-2 rounded-xl cursor-pointer"
            onClick={handleApprove}
          >
            Confirm Approval
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
