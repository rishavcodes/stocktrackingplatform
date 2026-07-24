import React from "react";

const KycComplete = () => {
  return (
    <div className="w-full flex flex-col items-center pt-10">
      <h1 className="text-2xl font-semibold mb-4 text-green-600">
        KYC Completed
      </h1>
      <p className="text-gray-600 text-center max-w-md">
        Your KYC verification is complete. You can now close this tab and return
        to your original page.
      </p>
    </div>
  );
};

export default KycComplete;
