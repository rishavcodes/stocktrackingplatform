// lib/aadhaarVerification.ts

export async function verifyAadhaarNumber(aadhaar: string, apiKey: string) {
  if (!aadhaar || aadhaar.length !== 12 || isNaN(Number(aadhaar))) {
    throw new Error("Please enter a valid 12-digit Aadhaar number.");
  }

  const response = await fetch(
    "https://sandbox.surepass.io/api/v1/aadhaar-v2/generate-otp",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ id_number: aadhaar }),
    }
  );

  const result = await response.json();

  if (response.status !== 200 || !result.success) {
    throw new Error(result.message || "Failed to verify Aadhaar.");
  }

  return result.data.client_id;
}

export async function submitAadhaarOtp(
  clientId: string,
  otp: string,
  apiKey: string
) {
  if (!otp || otp.length !== 6 || isNaN(Number(otp))) {
    throw new Error("Please enter a valid 6-digit OTP.");
  }

  const response = await fetch(
    "https://sandbox.surepass.io/api/v1/aadhaar-v2/submit-otp",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ client_id: clientId, otp: otp }),
    }
  );

  const result = await response.json();

  if (response.status !== 200 || !result.success) {
    throw new Error(result.message || "Failed to verify Aadhaar with OTP.");
  }

  return result.data; // Aadhaar verification data
}

export async function saveVerifiedAadhaar(
  userId: string,
  aadhaarData: any,
  backendUrl: string
) {
  const response = await fetch(`${backendUrl}/api/user/save-aadhaar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, aadhaarData }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to save Aadhaar data.");
  }

  return result;
}
