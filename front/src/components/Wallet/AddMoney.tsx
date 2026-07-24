"use client"
import { useState, useEffect } from "react";
import Script from "next/script";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Toast } from "@radix-ui/react-toast";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";



const AddMoney = () => {
  const { toast } = useToast();
  const session = useSession();
  const [amount, setAmount] = useState("");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    if (window.Razorpay) {
      setRazorpayLoaded(true);
    }
  }, []);


const confirmTopup = async ({
  paymentId,
  amount,
}: {
  paymentId: string;
  amount: number;
}) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/RAtopUp`,
    { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spID: session.data?.user?.id,
        amount,
        transactionId: paymentId,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Topup confirmation failed");
  }
};

  const handleChange = (e: any) => {
    setAmount(e.target.value);
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    checkout(amount);
  };

  const checkout = async (price: any) => {
    if (!session?.data?.user) {
      alert("Please log in to continue.");
      return;
    }

    if (!razorpayLoaded) {
      alert("Razorpay is still loading. Please wait a moment.");
      return;
    }
const amountinPaise= Number(price)*100;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/topupcheckout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountinPaise }),
        }
      );

      const order = await response.json();
      if (!response.ok) throw new Error(order.message || order.error);

      const razorpayKey = order.razorpayKeyId ?? process.env.NEXT_PUBLIC_RAZORPAY_API_KEY;
      if (!razorpayKey) {
        alert("Payment configuration error. Please try again.");
        return;
      }

      const options = {
        key: razorpayKey,
        amount: order.checkout.amount,
        currency: "INR",
        name: "Wallet Top-up",
        description: `Adding ₹${price} to Wallet`,
        order_id: order.checkout.id,
        handler: async function (response: any) {
  try {
    await confirmTopup({
      paymentId: response.razorpay_payment_id,
      amount: Number(price),
    });

    toast({
      title: "Money Added",
      description: `₹${price} added to wallet successfully!`,
      variant: "success",
    });
  } catch {
    toast({
      title: "Topup Failed",
      description: "Payment done but wallet not updated",
      variant: "destructive",
    });

  }
}
,
        notes: {
          buyerName: session?.data?.user?.RegName?.replaceAll("/", " "),
          buyerId: session?.data?.user?._id,
          buyerEmail: session?.data?.user?.email,
          amount: price,
          type: "topup",
        },
        prefill: {
          name: session.data.user.name,
          email: session.data.user.email,
        },
        theme: { color: "#01E3A1" },
      };

      const _window = window as any;
      const paymentObj = new _window.Razorpay(options);
      paymentObj.open();

      paymentObj.on("payment.failed", function (response: any) {
        toast({
          title: "Payment Failed",
          description: `Payment failed: ${response.error.description}`,
          variant: "destructive",
        });
      });
    } catch (error) {
      console.error("Payment Error:", error);
      alert("Payment failed. Please try again.");
    }
  };

  return (
    <div>
      {/* Razorpay Checkout Script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayLoaded(true)}
      />

      <Dialog>
        <DialogTrigger className="rounded-2xl   bg-green-600 px-20 py-2 text-white text-center cursor-pointer w-fit">
          Add Money
        </DialogTrigger>
        <DialogContent className="bg-green-100 p-5">
          <DialogHeader>
            <DialogTitle className="">Amount you want to Topup</DialogTitle>
            <form onSubmit={handleSubmit} className="pt-5">
              <Input
                type="number"
                min="1999"
                value={amount}
                onChange={handleChange}
                className="py-2"
              />
             <div className="flex justify-center mt-5">
    <input
      type="submit"
      value="topUp"
      className="rounded-xl bg-green-500 px-10 py-2 text-black cursor-pointer"
    />
  </div>
            </form>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};


export default AddMoney;
