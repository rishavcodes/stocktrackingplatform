"use client";

import { Input, ServiceProviderTabs } from "@/components";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import UploadIcon from "@/icons/UploadIcon";
import fetcher from "@/lib/data/setup";
import { useSession } from "next-auth/react";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import useSWR from "swr";

type PaymentDetailsProps = {
  paymentDetails: {
    _id?: string;
    bankName: string;
    beneficiaryName: string;
    accNumber: string;
    ifsc: string;
    upi: string;
    qrCode: string;
    qrCodeFile: File | null;
  }
  type: string;
  razorpay?: {
    keyId: string;
    name: string;
    email: string;
  };
};

export default function PaymentDetails() {
  const session = useSession();
  const { data } = useSWR<{ data: PaymentDetailsProps }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/get/paymentdetails?id=${session.data?.user.id}`,
    fetcher
  );

  const { toast } = useToast();

  const [details, setDetails] = useState<PaymentDetailsProps["paymentDetails"]>({
    _id: "",
    bankName: "",
    beneficiaryName: "",
    accNumber: "",
    ifsc: "",
    upi: "",
    qrCode: "",
    qrCodeFile: null,
  });

  useEffect(() => {
    if (data?.data) {
      if (data.data.type === "manual") {
        setDetails(data.data.paymentDetails);
      }
    }
  }, [data?.data]);

  console.log(details)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setDetails((prev) => ({ ...prev, [name]: value }));
  }

  function qrCodeFileHandler(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    if (files && files.length > 0) {
      const file = files[0];
      setDetails((prev) => ({
        ...prev,
        qrCodeFile: file,
        qrCode: URL.createObjectURL(file), // Preview image
      }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData();

    formData.append(
      "data",
      JSON.stringify({
        id: session.data?.user.id,
        name: session.data?.user.RegName,
        email: session.data?.user.email,
        ...details,
      })
    );

    if (details.qrCodeFile) {
      formData.append("qrCode", details.qrCodeFile);
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/add/paymentdetails`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (res.status !== 200) {
        toast({
          title: "Error",
          description: "Failed to Add details",
          variant: "destructive",
        });
      }

      toast({
        title: "Added",
        description: "Account details added successfully",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to Add details",
        variant: "destructive",
      });
    }
  }

  async function updateDetails() {
    try {
      const formData = new FormData();

      formData.append("data", JSON.stringify({ ...details }));

      if (details.qrCodeFile) {
        formData.append("qrCode", details.qrCodeFile);
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/update/paymentdetails`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (res.status !== 200) {
        toast({
          title: "Error",
          description: "Failed to Add details",
          variant: "destructive",
        });
      }

      toast({
        title: "Updated",
        description: "Account details updated successfully",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen p-6 dark:bg-blackShade">
      <Toaster />

      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Payment Information</h1>

        {data?.data?.type === "gateway" ? (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-4">Payment Gateway Enabled</h2>
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Your account has Razorpay payment gateway integration enabled.
              </p>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Gateway Details:</h3>
                <p>Merchant Name: {data.data.razorpay?.name}</p>
                <p>Merchant Email: {data.data.razorpay?.email}</p>
                <p>Key ID: {data.data.razorpay?.keyId}</p>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Please go to the integration section to view and update your payment gateway settings.
              </p>
            </div>
          </div>
        ) : (
          <form className="space-y-8" method="POST" onSubmit={handleSubmit}>
            {/* Bank Account Details Section */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-6">Bank Account Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  title={"Bank name"}
                  type={"text"}
                  name={"bankName"}
                  value={details?.bankName}
                  onChange={handleChange}
                  height="py-3"
                />
                <Input
                  title={"Beneficiary name"}
                  type={"text"}
                  name={"beneficiaryName"}
                  value={details?.beneficiaryName}
                  onChange={handleChange}
                  height="py-3"
                />
                <Input
                  title={"Account Number"}
                  type={"text"}
                  name={"accNumber"}
                  value={details?.accNumber}
                  onChange={handleChange}
                  height="py-3"
                />
                <Input
                  title={"IFSC code"}
                  type={"text"}
                  name={"ifsc"}
                  value={details?.ifsc}
                  onChange={handleChange}
                  height="py-3"
                />
              </div>
            </div>

            {/* UPI Section */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold mb-6">UPI Information</h2>
              <div className="space-y-6">
                <Input
                  title={"UPI ID"}
                  type={"text"}
                  name={"upi"}
                  required={false}
                  value={details?.upi}
                  onChange={handleChange}
                  height="py-3"
                />

                {/* QR Code Upload */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    UPI QR Code (Required)
                  </label>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 cursor-pointer hover:border-green transition-colors">
                    <div className="text-center">
                      <UploadIcon className="w-12 h-12 text-gray-400 mb-2 mx-auto" />
                      <p className="text-gray-500 dark:text-gray-400">
                        {details?.qrCodeFile?.name || "Click to upload QR Code image"}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        PNG, JPG up to 2MB
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      name="qrCode"
                      onChange={qrCodeFileHandler}
                      accept="image/*"
                    />
                  </label>
                </div>

                {/* QR Code Preview */}
                {details?.qrCode && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-3">QR Code Preview</h3>
                    <div className="border p-4 rounded-lg inline-block bg-white dark:bg-gray-800">
                      <img
                        src={details?.qrCode}
                        alt="UPI QR Code Preview"
                        className="h-48 w-auto object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                {data?.data.paymentDetails != null ? (
                  <button
                    type="button"
                    onClick={updateDetails}
                    className="bg-green-600 hover:bg-green-900 text-white font-semibold px-8 py-3 rounded-md transition-colors"
                  >
                    Update Details
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-900 text-white font-semibold px-8 py-3 rounded-md transition-colors"
                  >
                    Add Payment Details
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
