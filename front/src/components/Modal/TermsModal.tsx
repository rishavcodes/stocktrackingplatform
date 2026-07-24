import React from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type TermsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  isTermsAccepted: boolean;
  setIsTermsAccepted: (value: boolean) => void;
  serviceId: string;
  setSignedDocumentUrl: (url: string) => void;
};

const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  onContinue,
  isTermsAccepted,
  setIsTermsAccepted,
  serviceId,
  setSignedDocumentUrl,
}) => {
  const session = useSession();
  const router = useRouter();
  const [clientId, setClientId] = useState<string | null>(null);
  const [esignCompleted, setEsignCompleted] = useState<boolean>(false);
  const [showEsignIframe, setShowEsignIframe] = useState<boolean>(false);
  const [esignUrl, setEsignUrl] = useState<string | null>(null);

  const fetchSignedDocument = async (clientId: string) => {
    try {
      const response = await fetch(
        `https://kyc-api.surepass.io/api/v1/esign/get-signed-document/${clientId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUREPASS_API_KEY}`,
          },
        }
      );

      const data = await response.json();

      if (data?.success && data?.data?.url) {
        console.log("Signed Document URL:", data.data.url);

        // Store temporarily in state
        setSignedDocumentUrl(data.data.url);

        onContinue();
      } else {
        console.error("Failed to fetch signed document:", data?.message);
      }
    } catch (error) {
      console.error("Error retrieving signed document:", error);
    }
  };

  const checkEsignStatus = async () => {
    if (!clientId || esignCompleted) return;

    try {
      const response = await fetch(
        `https://kyc-api.surepass.io/api/v1/esign/status/${clientId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUREPASS_API_KEY}`,
          },
        }
      );

      const data = await response.json();
      console.log("Status:", data?.data?.status);

      if (data?.data?.status === "esign_completed") {
        setEsignCompleted(true); // Mark as completed to stop polling
        fetchSignedDocument(clientId);
        // Close the modal
        onClose();

        // Redirect to the intended page
        router.push(`/view/services/${serviceId}`);
      }
    } catch (error) {
      console.error("Error checking eSign status:", error);
    }
  };

  useEffect(() => {
    if (!clientId || esignCompleted) return;

    let attempts = 0;
    const maxAttempts = 6; // Stop after 6 attempts (~90 seconds)

    const interval = setInterval(() => {
      if (attempts >= maxAttempts) {
        clearInterval(interval); // Stop polling after max attempts
        console.log("Stopping eSign status check to avoid extra API cost.");
        return;
      }

      checkEsignStatus();
      attempts++;
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [clientId, esignCompleted]);

  const handleEsignInitialization = async () => {
    const callbackUrl = `https://tradebox-uat.vercel.app/view/services/${serviceId}`;
    try {
      const payload = {
        pdf_pre_uploaded: true,
        callback_url: `${callbackUrl}`,
        config: {
          auth_mode: "1",
          reason: "Contract",
          positions: {
            "1": [{ x: 10, y: 20 }],
          },
        },
        prefill_options: {
          full_name: `${session?.data?.user?.RegName}`,
          mobile_number: `${session?.data?.user?.number}`,
          user_email: `${session?.data?.user?.email}`,
        },
      };
      const response = await fetch(
        "https://kyc-api.surepass.io/api/v1/esign/initialize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUREPASS_API_KEY}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      console.log("this is the data of data: ", data);

      if (data && data.data?.url && data?.data?.client_id) {
        const clientId = data?.data?.client_id;
        setClientId(clientId);

        const pdfUploadResponse = await fetch(
          "https://kyc-api.surepass.io/api/v1/esign/upload-pdf",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUREPASS_API_KEY}`,
            },
            body: JSON.stringify({
              client_id: clientId,
              link: "https://tradeboxtesting.s3.ap-south-1.amazonaws.com/terms-and-conditions/testing+for+esign.pdf",
            }),
          }
        );

        const pdfData = await pdfUploadResponse.json();
        if (!pdfData.data.uploaded) {
          console.error("PDF upload failed:", pdfData);
          return;
        }

        console.log("PDF uploaded successfully.");
        // Open URL in a new tab (alternative to using router)
        const urlforesign = `https://esign-client.surepass.io/?token=${data.data.token}`;
        // router.push(urlforesign);
        // console.log(data.data);
        setEsignUrl(urlforesign);
        setShowEsignIframe(true);
      } else {
        console.error(
          "Failed to initialize eSign:",
          data.message || "Unknown error"
        );
      }
    } catch (error) {
      console.error("Error initializing eSign:", error);
    }
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-black p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold dark:text-white mb-4">
          Terms and Conditions
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Please read and accept the terms and conditions before proceeding.
        </p>
        <div className="flex items-center space-x-3 mb-4">
          <input
            type="checkbox"
            id="terms"
            checked={isTermsAccepted}
            onChange={(e) => setIsTermsAccepted(e.target.checked)}
          />
          <label htmlFor="terms" className="text-gray-600 dark:text-gray-300">
            I accept the terms and conditions.
          </label>
        </div>
        <div className="flex justify-end space-x-4">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              handleEsignInitialization();
              onContinue();
            }}
            disabled={!isTermsAccepted}
            className={`${isTermsAccepted ? "bg-green-500" : "bg-gray-300"}`}
          >
            Continue
          </Button>
        </div>
      </div>

      {showEsignIframe && esignUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-black p-6 rounded-lg shadow-lg w-full max-w-4xl">
            <h2 className="text-xl font-bold dark:text-white mb-4">
              eSign Contract
            </h2>
            <iframe
              src={esignUrl}
              width="100%"
              height="600px"
              title="eSign"
              className="border-none"
            ></iframe>
            <div className="flex justify-end space-x-4 mt-4">
              <Button onClick={() => setShowEsignIframe(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TermsModal;
