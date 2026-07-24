import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

type PaymentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string;
  spId: string;
  onFileUpload: (file: File | null) => void; // Function to pass file to parent
  onSubmitPayment: () => void;
};

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  serviceId,
  spId,
  onFileUpload,
  onSubmitPayment,
}) => {
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!isOpen || !spId) return;

    const fetchPaymentDetails = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/get/paymentdetails?id=${spId}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch payment details");
        }

        const data = await response.json();
        setPaymentDetails(data.data);
        setLoading(false);
      } catch (err) {
        setError("Error loading payment details");
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [isOpen, spId]);

  if (!isOpen) return null;
 
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setPaymentProof(file); // ✅ Ensure paymentProof is updated
    onFileUpload(file);
  };


  const handleSubmitPayment = async () => {
    if (!paymentProof) {
      alert("Please upload a payment proof before submitting.");
      return;
    }

    const formData = new FormData();
    formData.append("file", paymentProof);
    formData.append("serviceId", serviceId);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/upload-proof`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to submit payment proof.");
      }

      alert("Payment proof submitted successfully!");
      onClose();
    } catch (error) {
      console.error("Error submitting payment proof:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-black p-6 rounded-lg shadow-lg max-w-lg w-full">
        <h2 className="text-xl font-bold dark:text-white mb-4">
          Payment Details
        </h2>

        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Transfer the payment to the following details and upload proof:
        </p>

        {loading ? (
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <div className="flex gap-6">
            {/* Left Side: QR Code */}
            <div className="flex-shrink-0">
              {paymentDetails?.qrCode ? (
                <img
                  src={paymentDetails.qrCode}
                  alt="Payment QR Code"
                  className="w-40 h-40 object-contain border rounded-lg"
                />
              ) : (
                <p className="text-gray-600 dark:text-gray-300">
                  No QR Code Available
                </p>
              )}
            </div>

            {/* Right Side: Bank & UPI Details */}
            <div>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Bank Name:</strong> {paymentDetails?.bankName}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Beneficiary Name:</strong>{" "}
                {paymentDetails?.beneficiaryName}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Account Number:</strong> {paymentDetails?.accNumber}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>IFSC Code:</strong> {paymentDetails?.ifsc}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>UPI ID:</strong> {paymentDetails?.upi}
              </p>
            </div>
          </div>
        )}

        <label className="block text-gray-600 dark:text-gray-300 mb-2">
          Upload Payment Proof (Screenshot or PDF)
        </label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="w-full mb-4"
        />

        <div className="flex justify-end space-x-4">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={onSubmitPayment}
            disabled={!paymentProof}
            className={`${paymentProof ? "bg-green-500" : "bg-gray-300"}`}
          >
            Submit Payment
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
