import fetch from "node-fetch";

const BASE_URL = "https://kyc-api.aadhaarkyc.io/api/v1/esign";
const API_KEY = process.env.SUREPASS_API_KEY as string;

interface EsignInitResponse {
  client_id: string;
  [key: string]: any;
}

interface EsignStatusResponse {
  success: boolean;
  message: string;
  [key: string]: any;
}

export const initializeEsign = async (): Promise<EsignInitResponse> => {
  const response = await fetch(`${BASE_URL}/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      redirect_url: process.env.ESIGN_REDIRECT_URL,
      callback_url: process.env.ESIGN_CALLBACK_URL,
    }),
  });

  if (!response.ok) throw new Error("Failed to initialize Surepass eSign");
  return (await response.json()) as EsignInitResponse;
};

export const checkEsignStatus = async (
  clientId: string
): Promise<EsignStatusResponse> => {
  const response = await fetch(`${BASE_URL}/status/${clientId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  if (!response.ok) throw new Error("Failed to check Surepass status");
  return (await response.json()) as EsignStatusResponse;
};

export const downloadSignedDoc = async (clientId: string): Promise<Buffer> => {
  const response = await fetch(`${BASE_URL}/get-signed-document/${clientId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${API_KEY}` },
  });

  if (!response.ok) throw new Error("Failed to download signed document");
  return Buffer.from(await response.arrayBuffer());
};
