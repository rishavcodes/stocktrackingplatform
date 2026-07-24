"use client";

import { useEffect, useState } from "react";

import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import NumberContact from "./NumberContact";
import { SubscribeService } from "@/components";

type ActionButtonsProps = {
  category: string;
  authorid: string;
  authorName: string;
  authorEmail: string;
  planName: string;
  serviceId: string;
  description: string;
  price: number;
  authorLogo: string;
  sellerName: string;
  sellerId: string;
  validity: number;
  transactionType: string;
};

export default function ActionButtons({
  category,
  authorid,
  authorName,
  authorEmail,
  planName,
  serviceId,
  description,
  price,
  authorLogo,
  sellerName,
  sellerId,
  validity,
  transactionType,
}: ActionButtonsProps) {
  const { toast } = useToast();

  const [isSubscribeShow, setIsSubscribeShow] = useState<boolean>(false);

  useEffect(() => {
    const subscribeAllow = [
      "Forex Experts",
      "Research Analyst",
      "Registered Investment Advisor",
      "Trainers",
    ];

    if (subscribeAllow.includes(category)) {
      setIsSubscribeShow(true);
    }
  }, []);

  const session = useSession();

  return (
    <div>
      <Toaster />
      {isSubscribeShow && (
        <div className="cursor-pointer w-full mx-auto">
          <SubscribeService
            id={serviceId}
            title={planName}
            price={price}
            authorLogo={authorLogo}
            sellerName={sellerName}
            sellerId={sellerId}
            validity={validity}
            transactionType={transactionType}
            authorid={authorid}
          />
        </div>
      )}
    </div>
  );
}
