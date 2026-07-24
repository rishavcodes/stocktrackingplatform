"use client";

import { Input } from "@/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSession } from "next-auth/react";
import { ChangeEvent, FormEvent, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

type WithdrawButtonProps = {
  balance: number;
};

export default function WithdrawButton({ balance }: WithdrawButtonProps) {
  const session = useSession();

  const { toast } = useToast();

  const [amountToWithDraw, setAmounttoWithDraw] = useState({ amount: "" });

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setAmounttoWithDraw((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amountToWithDraw.amount);

    if (!parsedAmount || parsedAmount <= 0 || parsedAmount > balance) {
      toast({
        title: "Invalid amount",
        description: `Enter an amount between 1 and ${balance}`,
        variant: "destructive",
      });
      return;
    }

    const data = {
      amount: parsedAmount,
      name: session.data?.user.RegName,
      email: session.data?.user.email,
      spId: session.data?.user.id,
    };

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/withdraw/serviceprovider`,
      {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-type": "application/json",
        },
      }
    );

    if (response.status !== 200) {
      toast({
        title: "Error",
        description: "Failed to create withdraw request",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Withdraw request created",
      variant: "default",
    });
  }

  return (
    <>
      <Toaster />
      <Dialog>
        <DialogTrigger className="rounded-2xl bg-green-600 px-20 py-2 text-white dark:text-white text-center cursor-pointer w-fit">
          Withdraw
        </DialogTrigger>
        <DialogContent className="sm:max-w-md rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Withdraw Funds
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
              Enter the amount to withdraw from your wallet.
            </DialogDescription>

            <form method="POST" onSubmit={handleSubmit} className="pt-5 space-y-4">
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/70 dark:bg-emerald-900/20 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Available balance: ₹{balance.toFixed(2)}
              </div>
              <Input
                title={"Amount"}
                type={"number"}
                min={"0"}
                max={`${balance}`}
                name={"amount"}
                value={amountToWithDraw.amount}
                height="py-2"
                placeholder="Enter amount"
                onChange={handleChange}
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-colors px-10 py-2.5 text-white text-center font-semibold cursor-pointer"
              >
                Withdraw
              </button>
            </form>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
