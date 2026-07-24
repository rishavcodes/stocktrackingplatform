"use client";

import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import Script from "next/script";
import { useEffect, useState } from "react";
import KycModal from "@/components/Modal/KycModal";
import TermsModal from "@/components/Modal/TermsModal";
import PaymentModal from "@/components/Modal/PaymentModal";

type SubscribeServiceTypes = {
  id: string;
  title: string;
  price: number;
  authorLogo: string;
  sellerName: string;
  sellerId: string;
  validity: number;
  transactionType: string;
  authorid: string;
};

export default function SubscribeService({
  id,
  title,
  price,
  authorLogo,
  sellerName,
  sellerId,
  transactionType,
  validity,
  authorid,
}: SubscribeServiceTypes) {
  const session = useSession();
  const { toast } = useToast();

  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [signedDocumentUrl, setSignedDocumentUrl] = useState<string | null>(
    null
  );
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  // Retrieve signed document URL from session storage
  let signedDocumentUrlFromStorage =
    sessionStorage.getItem("signedDocumentUrl");

  // Use the stored URL if state is null
  const finalSignedDocumentUrl =
    signedDocumentUrl || signedDocumentUrlFromStorage;

  useEffect(() => {
    // Optionally, store in sessionStorage for access across pages
    if (signedDocumentUrl) {
      sessionStorage.setItem("signedDocumentUrl", signedDocumentUrl);
      setIsPaymentModalOpen(true);
    }
  }, [signedDocumentUrl]);
  const date = new Date();
  const validTill = new Date(
    date.setDate(date.getDate() + Number(validity))
  ).toISOString();

  async function checkOut() {
    try {
      const telegramCheckResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/checktelegram`,
        {
          method: "POST",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify({ userId: session?.data?.user?._id }),
        }
      );

      if (!telegramCheckResponse.ok) {
        throw new Error("Failed to verify Telegram handle");
      }

      const telegramCheckData = await telegramCheckResponse.json();

      if (!telegramCheckData.hasTelegram) {
        toast({
          title: "Telegram Not Added",
          description:
            "Please add your Telegram handle in your profile before proceeding with the purchase.",
          variant: "destructive",
        });
        return;
      }

      if (!signedDocumentUrl) {
        console.log("Signed document URL is missing!");
        return;
      }

      setIsPaymentModalOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description:
          "Unable to verify Telegram handle. Please try again later.",
        variant: "destructive",
      });
      return;
    }
  }

  // Payment Submission inside checkOut()
  async function handleSubmitPayment() {
    if (!paymentProof) {
      toast({
        title: "Payment Proof Missing",
        description: "Please upload a payment screenshot before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!paymentProof) {
        alert("Please upload a payment proof before submitting.");
        return;
      }

      if (!finalSignedDocumentUrl) {
        alert("Signed document is missing. Please complete e-signing first.");
        return;
      }

      if (!session?.data?.user?._id) {
        alert("User not logged in.");
        return;
      }

      if (!id) {
        alert("Service ID is missing.");
        return;
      }

      // 🔹 Prepare Data Object
      const data = {
        subscribedToId: sellerId,
        serviceName: title,
        orderByName: session.data?.user.RegName,
        orderById: session.data?.user._id,
        orderByEmail: session.data.user.email,
        soldByName: sellerName,
        soldById: sellerId,
        amount: price,
        validity: validTill,
        signedDocumentUrl: finalSignedDocumentUrl,
      };

      console.log("Payment Submission Data:", data);

      // 🔹 Convert to FormData
      const formData = new FormData();
      formData.append("data", JSON.stringify(data));
      formData.append("paymentProof", paymentProof);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/createorder`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to submit payment");
      }

      toast({
        title: "Payment Submitted",
        description: "Your payment has been successfully recorded!",
        variant: "default",
      });

      setIsPaymentModalOpen(false);
    } catch (error) {
      toast({
        title: "Payment Submission Failed",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="md:container mx-auto dark:bg-black">
      <div className="border rounded-md p-5 md:p-8 shadow-lg  bg-white dark:bg-black mx-auto md:w-96 sm:max-w-xl ">
        <div
          // key={index}
          className={`flex items-center justify-between p-4 mb-4 border rounded-lg cursor-pointer transition-colors duration-200 dark:bg-[#353434]`}
        >
          <div className="flex items-center justify-start mx-auto">
            <div>
              <span className="ml-3 text-sm md:text-lg  dark:text-white text-gray-900">
                {validity} Days Plan
              </span>
              <div>
                <p className="text-2xl dark:text-white font-medium pt-2 pl-4">
                  Rs. {price / 1.18} <span className="text-sm">+ 18% GST</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="cursor-pointer bg-[#01E3A1] dark:bg-[#009E70] dark:text-white text-black font-medium text-2xl hover:bg-green-600 hover:shadow-lg hover:scale-105 transition-all duration-300 ease-in-out text-center w-full px-4 py-4 rounded-lg mt-4 max-w-lg mx-auto md:w-96 sm:max-w-xl"
        onClick={() => setIsTermsModalOpen(true)}
      >
        Buy Plan
      </div>

      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onContinue={checkOut} // Proceed with checkout after eSign
        isTermsAccepted={isTermsAccepted}
        setIsTermsAccepted={setIsTermsAccepted}
        serviceId={id}
        setSignedDocumentUrl={setSignedDocumentUrl}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        serviceId={id}
        spId={authorid}
        onFileUpload={setPaymentProof} // Pass file to parent
        onSubmitPayment={handleSubmitPayment} // Handle payment submission
      />
    </div>
  );
}
