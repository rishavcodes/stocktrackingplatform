"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";

type KycModalProps = {
  serviceId: string;
  onClose: () => void;
  onClientIdReceived: (clientId: string) => void;
};

export default function KycModal({
  serviceId,
  onClose,
  onClientIdReceived,
}: KycModalProps) {
  const session = useSession();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [kycUrl, setKycUrl] = useState<string | null>(null);

  async function startKyc() {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/kyc/initiate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.data?.user._id,
            fullName: session.data?.user.RegName,
            mobileNumber: session.data?.user.number,
            userEmail: session.data?.user.email,
            serviceId: serviceId,
          }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        setKycUrl(data.url);
        onClientIdReceived(data.client_id);
        console.log("kyc data: ", data)
      } else {
        toast({
          title: "Error",
          description: "Failed to start KYC",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error starting KYC:", error);
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          KYC Verification Required
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mt-2">
          You need to complete KYC before purchasing a plan.
        </p>

        {!kycUrl ? (
          <button
            onClick={startKyc}
            disabled={isLoading}
            className="w-full mt-4 bg-blue-500 hover:bg-blue-600 font-bold py-2 px-4 rounded transition-all duration-300"
          >
            {isLoading ? "Starting KYC..." : "Start KYC"}
          </button>
        ) : (
          <a
            href={kycUrl}
            rel="noopener noreferrer"
            className="w-full mt-4 block text-center bg-green-500 hover:bg-green-600 font-bold py-2 px-4 rounded transition-all duration-300"
          >
            Complete KYC
          </a>
        )}

        <button
          onClick={onClose}
          className="w-full mt-2 bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded transition-all duration-300"
        >
          Close
        </button>
      </div>
    </div>
  );
}
