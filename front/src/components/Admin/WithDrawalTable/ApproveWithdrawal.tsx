import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";

type ApproveWithdrawalTypes = {
  id: string;
  name: string;
};

export default function ApproveWithdrawal({
  name,
  id,
}: ApproveWithdrawalTypes) {
  const session = useSession();

  const { toast } = useToast();

  async function submitHandler() {
    const data = { id };

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/withdrawal/approve`,
      {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data?.backendToken}`,
        },
      }
    );

    if (response.status !== 200) {
      toast({
        title: "Error",
        description: "Failed to approve withdrawal",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Withdrawal approved",
      variant: "default",
    });

    window.location.reload();
  }

  async function rejectHandler() {
    const data = { id };

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/withdrawal/reject`,
      {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data?.backendToken}`,
        },
      }
    );

    if (response.status !== 200) {
      toast({
        title: "Error",
        description: "Failed to reject withdrawal",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Withdrawal rejected",
      variant: "default",
    });

    window.location.reload();
  }

  return (
    <>
      <Toaster />
      <Dialog>
        <DialogTrigger className="bg-green px-2 py-1 rounded-xl text-black">
          Action
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprrove/Reject withdrawal for {name}</DialogTitle>

            <div className="pt-10"></div>
            <div className="flex items-center gap-5">
              <div
                className="bg-green px-5 py-1 rounded-xl text-black cursor-pointer w-fit"
                onClick={submitHandler}
              >
                Approve
              </div>

              <div
                className="bg-red-500 px-5 py-1 rounded-xl text-black cursor-pointer w-fit"
                onClick={rejectHandler}
              >
                Reject
              </div>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
