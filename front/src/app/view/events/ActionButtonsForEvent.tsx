"use client";

import { useEffect, useState } from "react";

import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import NumberContact from "../services/NumberContact";
import { AnimatePresence } from "framer-motion";
import ContactDialouge from "../services/ContactDialogue";
import SubscribeEvent from "@/components/Cards/EventCard/SubscribeEvent";

type ActionButtonsPropsForEvents = {
  category: string;
  authorid: string;
  authorName: string;
  authorEmail: string;
  eventName: string;
  eventId: string;
  description: string;
  price: number;
  authorLogo: string;
  sellerName: string;
  sellerId: string;
  serviceProviderId: string;
  transactionType: string;
  setIsRegistered: (value: boolean) => void;
  handleRegister: (eventId: string) => Promise<void>;
};

export default function ActionButtonsForEvents({
  category,
  authorid,
  authorName,
  authorEmail,
  eventName,
  eventId,
  description,
  price,
  authorLogo,
  sellerName,
  sellerId,
  setIsRegistered,
  handleRegister,
  transactionType,
  serviceProviderId,
}: ActionButtonsPropsForEvents) {
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

  async function contactedEvent() {
    if (!session.data?.user.number) {
      toast({
        description:
          "Failed to contact, please add phone number on my profile page first",
        variant: "destructive",
      });
      return;
    }

    const reqData = {
      initiatingId: session.data?.user._id,
      initiatingname: session.data?.user.RegName,
      number: session.data?.user.number,
      email: session.data?.user.email,
      plan: eventName,
      targetId: authorid,
      targetname: authorName,
      targetEmail: authorEmail,
    };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/servicepage/contact`,
      {
        method: "POST",
        body: JSON.stringify(reqData),
        headers: { "Content-type": "application/json" },
      }
    );

    if (res.status === 200) {
      toast({
        description: "Notified service provider he will contact you ASAP",
        variant: "default",
      });
    } else {
      toast({
        description: "Failed to send notification",
        variant: "destructive",
      });
    }
  }

  return (
    <div>
      <Toaster />
      {!isSubscribeShow && (
        <>
          {session.data?.user.number ? (
            <div
              className="cursor-pointer bg-blueShade/60 w-full px-5 py-2 mx-auto rounded-xl"
              onClick={() => contactedEvent()}
            >
              Contact
            </div>
          ) : (
            <NumberContact
              plan={eventName}
              targetId={authorid}
              targetname={authorName}
              targetEmail={authorEmail}
            />
          )}
        </>
      )}

      {isSubscribeShow && (
        <div className="cursor-pointer w-full mx-auto">
          <SubscribeEvent
            id={eventId}
            title={eventName}
            price={price}
            authorLogo={authorLogo}
            sellerName={sellerName}
            sellerId={sellerId}
            setIsRegistered={setIsRegistered}
            handleRegister={handleRegister}
            transactionType={transactionType}
           serviceProviderId={serviceProviderId}
          />
        </div>
      )}

      {/* <AnimatePresence>
        {isContactDialogueOpen && (
          <ContactDialouge
            id={id}
            setIsContactDialogueOpen={setIsContactDialogueOpen}
          />
        )}
      </AnimatePresence> */}
    </div>
  );
}
