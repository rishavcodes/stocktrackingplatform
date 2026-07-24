/**
 * CVL KRA API client. Mirrors the structured result returned by the backend
 * controller (POST /api/cvlkra/check). PAN + DOB are resolved server-side from
 * the subscriber record, so the client only sends the subscriberId.
 */

export interface CvlKraAddress {
  line1: string;
  line2: string;
  line3: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  addressProof: string;
}

export interface CvlKraResult {
  appName: string;
  appStatus: string;
  statusLabel: string;
  kraName: string;
  appStatusDt: string;
  fatcaApplicable: string;
  identity: {
    name: string;
    fatherOrSpouseName: string;
    gender: string;
    dob: string;
    pan: string;
  };
  contact: { email: string; mobile: string };
  correspondenceAddress: CvlKraAddress;
  permanentAddress: CvlKraAddress;
  other: {
    kycMode: string;
    ipvFlag: string;
    occupation: string;
    income: string;
    maritalStatus: string;
    kraInfo: string;
    errorDesc: string;
  };
  fatca: Record<string, string>;
  raw?: unknown;
  errorCode: string;
  errorMessage: string;
}

export async function checkCvlKra(
  subscriberId: string,
  backendToken: string,
): Promise<CvlKraResult> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/cvlkra/check`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${backendToken}`,
      },
      body: JSON.stringify({ subscriberId }),
    },
  );

  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || "CVL KRA check failed");
  }
  return data.data as CvlKraResult;
}
