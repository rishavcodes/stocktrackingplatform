"use client";

import { CreateServicesType } from "@/app/dashboard/serviceprovider/services/createplan/page";
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
import TypePlanInput from "./TypePlanInput";
import PlanDurationInput from "./PlanDurationInput";
import TradeBoxPlansTable from "./TradeBoxPlansTable";

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
  gold: { 30: 1500, 90: 3600, 180: 6750, 360: 11700 },
  platinum: { 30: 3000, 90: 7200, 180: 13500, 360: 23400 },
};

export default function TradeboxPlans({
  serviceData,
  documents,
  isFund,
}: {
  serviceData: CreateServicesType;
  documents: { name: string; link: string; _id: string }[];
  isFund: boolean;
}) {
  const [planData, setPlanData] = useState<planDataTypes>({
    planName: "",
    duration: 0,
  });
  const [open, setOpen] = useState<boolean>(true);
  const [coupenCode, setCoupenCode] = useState("");
  const { toast } = useToast();
  const session = useSession();
  const date = new Date();

  const planNames = ["PROMOS1", "PROMOG1", "PROMOP1"];

  async function PostService() {
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

    const data = {
      name: session.data?.user.RegName,
      email: session.data?.user.email,
      id: session.data?.user._id,
      type: session.data?.user.category,
      authorImage: session.data?.user.profileUrl,
      serviceType: isFund ? "fund" : "normal",
      returnsByTime: [
        serviceData.onemonth,
        serviceData.sixmonths,
        serviceData.oneyear,
        serviceData.threeyears,
        serviceData.fiveyears,
      ],
      Documents: documents,
      ...serviceData,
      ...planData,
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/createservice`,
        {
          method: "POST",
          body: JSON.stringify(data),
          headers: { "Content-type": "application/json" },
        }
      );

      const res = await response.json();

      if (response.status === 200) {
        await checkOut(res.id, price);
      } else {
        toast({
          title: "Error!",
          description: "There was an error creating service please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error!",
        description: "There was an error creating service please try again",
        variant: "destructive",
      });
    }
  }

  async function checkOut(id: string, price: number) {
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
          description: `Tradebox Plan paid and service created`,
          variant: "default",
        });

        setTimeout(() => {
          window.location.reload();
        }, 2000);
      },
      notes: {
        type: "tradeboxplan",
        serviceId: id,
        serviceTitle: serviceData.title.replaceAll("/", " "),
        buyerName: session.data?.user.RegName?.replaceAll("/", " "),
        buyerId: session.data?.user._id,
        orderedByEmail: session.data?.user.email,
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

  async function claimPromo() {
    const validTill = new Date(date.setDate(date.getDate() + 30)).toISOString();

    const data = {
      name: session.data?.user.RegName,
      email: session.data?.user.email,
      id: session.data?.user._id,
      type: session.data?.user.category,
      authorImage: session.data?.user.profileUrl,
      serviceType: isFund ? "fund" : "normal",
      validTill: validTill,
      returnsByTime: [
        serviceData.onemonth,
        serviceData.sixmonths,
        serviceData.oneyear,
        serviceData.threeyears,
        serviceData.fiveyears,
      ],
      Documents: documents,
      coupenCode,
      ...serviceData,
      ...planData,
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/promo/PROMO1`,
        {
          method: "POST",
          body: JSON.stringify(data),
          headers: { "Content-type": "application/json" },
        }
      );
      const res = await response.json();
      if (response.status === 200) {
        toast({
          title: "Service Created",
          description: res.message,
          variant: "default",
        });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: "Error!",
          description: res.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error!",
        description: "There was an error claiming please try again",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog modal={open}>
      <DialogTrigger
        onClick={() => setOpen(true)}
        className="mt-5 bg-green px-7 py-2 max-ss:mx-5 cursor-pointer dark:text-black w-fit"
      >
        Create
      </DialogTrigger>
      <DialogContent className="h-[80vh] w-screen overflow-auto">
        <DialogHeader>
          <DialogTitle>Purchase Tradebox plans</DialogTitle>
          <DialogDescription className="flex flex-col gap-5">
            <div>You need to buy tradebox plan in order to submit service</div>

            <TradeBoxPlansTable />

            <div>
              <div className="flex flex-col w-full">
                <label htmlFor="coupen" className={`dark:text-white/70`}>
                  Coupen Code
                </label>
                <input
                  type="text"
                  name="coupen"
                  className={`border border-darkGrey/30 dark:border-darkGrey/70 pl-4 dark:bg-blackShade focus:outline-none py-2 rounded-lg mt-1`}
                  onChange={(event) => {
                    setCoupenCode(event.target.value);
                  }}
                />
              </div>
            </div>

            {planNames.includes(coupenCode) ? (
              <div
                className="mt-5 bg-green px-7 py-2 max-ss:mx-5 cursor-pointer dark:text-black w-fit"
                onClick={() => claimPromo()}
              >
                Claim
              </div>
            ) : (
              <>
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
                  onClick={PostService}
                >
                  Pay
                </div>
              </>
            )}
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
