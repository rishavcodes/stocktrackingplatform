"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import Script from "next/script";
import { useState } from "react";
import TypePlanInput from "../TradeboxPlans/TypePlanInput";
import PlanDurationInput from "../TradeboxPlans/PlanDurationInput";
import TradeBoxPlansTable from "../TradeboxPlans/TradeBoxPlansTable";

export type planDataTypes = {
  planName: string;
  duration: number;
};

const pricingMap: {
  silver: { [duration: number]: number };
  gold: { [duration: number]: number };
  platinum: { [duration: number]: number };
} = {
  silver: { 30: 1000, 90: 2400, 180: 4500, 360: 7800 },
  gold: { 30: 1500, 90: 3600, 180: 6750, 360: 1170 },
  platinum: { 30: 3000, 90: 7200, 180: 13500, 360: 23400 },
};

export default function RenewTradeboxPlan({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [planData, setPlanData] = useState<planDataTypes>({
    planName: "",
    duration: 0,
  });

  const [open, setOpen] = useState<boolean>(true);

  const { toast } = useToast();

  const session = useSession();

  const date = new Date();

  async function checkOut() {
    if (planData.planName === "") {
      toast({
        title: "Error!",
        description: "Please select plan type",
        variant: "destructive",
      });

      return;
    }

    if (planData.duration === 0) {
      toast({
        title: "Error!",
        description: "Please plan duration",
        variant: "destructive",
      });

      return;
    }

    if (!(pricingMap as any)[planData.planName]?.[planData.duration]) {
      toast({
        title: "Error!",
        description: "Error pricing",
        variant: "destructive",
      });

      return;
    }

    const price =
      (pricingMap as any)[planData.planName]?.[planData.duration] * 1.18;

    setOpen(false);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/checkout`,
      {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ amount: price }),
      }
    );

    const rawRes = await res.json();

    const validTill = new Date(
      date.setDate(date.getDate() + planData.duration)
    ).toISOString();

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_API_KEY as string,
      amount: rawRes.checkout.amount,
      name: session.data?.user.RegName?.replaceAll("/", " "),
      image: session.data?.user.profileUrl,
      order_id: rawRes.checkout.id,
      handler: function (response: any) {
        toast({
          title: "Product Purchased",
          description: `Tradebox Plan paid and service activated`,
          variant: "default",
        });

        setTimeout(() => {
          window.location.reload();
        }, 2000);
      },
      notes: {
        type: "tradeboxplan",
        serviceId: id,
        serviceTitle: title.replaceAll("/", " "),
        buyerName: session.data?.user.RegName?.replaceAll("/", " "),
        buyerId: session.data?.user._id,
        sellerName: "Tradebox",
        sellerId: `Tradebox plan ${planData.planName}`,
        validity: validTill,
        planName: planData.planName,
        duration: planData.duration,
      },
      prefill: {
        name: session.data?.user.RegName,
        email: session.data?.user.email,
      },
      theme: {
        color: "#356A7A",
      },
    };

    const _window = window as any;
    var paymentObj = new _window.Razorpay(options);

    paymentObj.open();

    paymentObj.on("payment.failed", function (response: any) {
      setOpen(true);

      toast({
        title: "Payment Failed",
        description: `payment failed`,
        variant: "destructive",
      });
    });
  }

  return (
    <Dialog modal={open}>
      <DialogTrigger
        onClick={() => setOpen(true)}
        className="bg-green text-black px-8 py-3 cursor-pointer"
      >
        Activate again
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Purchase Tradebox plans</DialogTitle>
          <DialogDescription className="flex flex-col gap-5">
            <div>You need to buy tradebox plan in order to submit service</div>

            <TradeBoxPlansTable />

            <div className="flex items-center gap-5">
              <TypePlanInput
                onChange={setPlanData}
                value={planData.planName}
                title={"Select your plan"}
                name={"planName"}
              />

              <PlanDurationInput
                onChange={setPlanData}
                value={planData.duration.toString()}
                title="Select Duration"
                name="duration"
              />
            </div>

            <div className="text-lg font-bold">
              Price :{" "}
              {(pricingMap as any)[planData.planName]?.[planData.duration] *
                1.18 || "0"}{" "}
              <span className="text-xs">(Including GST)</span>
            </div>

            <div
              className="mt-5 bg-green px-7 py-2 max-ss:mx-5 cursor-pointer dark:text-black w-fit"
              onClick={checkOut}
            >
              Pay
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
      <Script
        className="bg-black"
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => {
          // console.log("Script has loaded");
          const myElement = document.getElementById("html");
          if (myElement) {
            myElement.style.colorScheme = "";
          }
        }}
      />
    </Dialog>
  );
}
