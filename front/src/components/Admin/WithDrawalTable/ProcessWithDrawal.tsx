import { Input } from "@/components";
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
import { ChangeEvent, FormEvent, useState } from "react";

type ProcessWithdrawalTypes = {
  id: string;
  name: string;
};

export default function ProcessWithdrawal({
  name,
  id,
}: ProcessWithdrawalTypes) {
  const session = useSession();

  const { toast } = useToast();

  const [processData, setProcessData] = useState({
    referenceNo: "",
    notes: "",
  });

  async function changehandler(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;

    setProcessData((prev) => ({ ...prev, [name]: value }));
  }

  async function submitHandler(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = { id, ...processData };

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/withdrawal/process`,
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
        description: "Failed to Process withdrawal",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Withdrawal processed",
      variant: "default",
    });

    window.location.reload();
  }

  return (
    <>
      <Toaster />
      <Dialog>
        <DialogTrigger className="bg-green px-2 py-1 rounded-xl text-black">
          Process
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process withdrawal for {name}</DialogTitle>

            <form method="POST" onSubmit={submitHandler} className="pt-5">
              <Input
                title={"Reference Number"}
                type={"text"}
                name={"referenceNo"}
                height="py-2"
                value={processData.referenceNo}
                onChange={changehandler}
              />
              <div className="flex flex-col my-5">
                <div className="text-black font-semibold dark:text-white/70">
                  Notes
                </div>
                <textarea
                  className="border p-2 dark:bg-blackShade"
                  name="notes"
                  value={processData.notes}
                  onChange={changehandler}
                  rows={5}
                />
              </div>
              <input
                type="submit"
                value={"Approve"}
                className="bg-green px-5 py-2 rounded-xl text-black cursor-pointer"
              />
            </form>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
