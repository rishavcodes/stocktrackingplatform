"use client";

import { options } from "@/app/api/auth/[...nextauth]/options";
import { useToast } from "@/components/ui/use-toast";
import { ConstructionIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import Script from "next/script";

type SubscribeEventTypes = {
  id: string;
  title: string;
  price: number;
  authorLogo: string;
  sellerName: string;
  sellerId: string;
  transactionType: string;
  setIsRegistered: (value: boolean) => void;
  handleRegister: (eventId: string) => Promise<void>;
  serviceProviderId: string; // ADD THIS
};

export default function SubscribeEvent({
  id,
  title,
  price,
  authorLogo,
  sellerName,
  sellerId,
  setIsRegistered,
  handleRegister,
  transactionType,
  serviceProviderId, // ADD THIS
}: SubscribeEventTypes) {
  const session = useSession();
  const { toast } = useToast();

  const date = new Date();

  async function checkOut() {
  console.log("DEBUG - Sending payment request with:", {
    originalPrice: price,
    priceType: typeof price,
    roundedAmount: Math.round(price * 100),
  });

  try {
    // Convert to integer paise
    const amountInPaise = Math.round(price * 100);
    
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/checkout`,
      {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({ 
          amount: amountInPaise, // Send amount in paise as integer
          spId: serviceProviderId,
        }),
      }
    );

    console.log("DEBUG - Response status:", res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.log("DEBUG - Error response:", errorText);
      try {
        const errorData = JSON.parse(errorText);
        toast({
          title: "Payment Failed",
          description: errorData.message || `HTTP ${res.status}: ${errorText}`,
          variant: "destructive",
        });
      } catch {
        toast({
          title: "Payment Failed",
          description: `HTTP ${res.status}: ${errorText}`,
          variant: "destructive",
        });
      }
      return;
    }

    const rawRes = await res.json();
    console.log("DEBUG - Success response:", rawRes);

    const options = {
      key: rawRes.razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_API_KEY as string,
      amount: rawRes.checkout.amount,
      currency: "INR",
      name: title.replaceAll("/", " "),
      image: authorLogo,
      order_id: rawRes.checkout.id,
      handler: async function (response: any) {
        toast({
          title: "Event Subscribed",
          description: `Purchased ${title}`,
          variant: "default",
        });
        handleRegister(id);
      },
      notes: {
        eventId: id,
        eventTitle: title.replaceAll("/", " "),
        buyerName: session.data?.user.RegName?.replaceAll("/", " "),
        buyerId: session.data?.user._id,
        orderedByEmail: session.data?.user.email,
        sellerName: sellerName.replaceAll("/", " "),
        sellerId,
        amount: price,
        spId: serviceProviderId,
        transactionType: transactionType,
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
      console.error("Payment failed:", response.error);
      toast({
        title: "Payment Failed",
        description: response.error.description || "Payment failed",
        variant: "destructive",
      });
    });

  } catch (error: any) {
    console.error("DEBUG - Fetch error:", error);
    toast({
      title: "Network Error",
      description: error.message || "Failed to connect to server",
      variant: "destructive",
    });
  }
}
  return (
    <div className="flex items-center justify-center">
      <div className="dark:bg-black">
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
      </div>

      {/* <div
        className="cursor-pointer bg-[#D5F0F9] text-[#296072] w-full px-5 py-2 rounded-md"
        onClick={() => checkOut()}
      >
        Buy At: ₹{price}
      </div > */}
      <button  
  className="cursor-pointer bg-gradient-to-r from-[#D5F0F9] to-[#AEE4F1]
             text-[#296072] transition-all duration-300 
             hover:from-indigo-400 hover:to-indigo-600 hover:text-white 
             w-70 px-5 py-2 rounded-md shadow-md  "
  onClick={() => checkOut()}
>
  Buy At: ₹{price}
</button>

    </div>
  );
}