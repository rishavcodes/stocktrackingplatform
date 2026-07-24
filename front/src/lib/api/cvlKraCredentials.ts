/**
 * CVL KRA per-provider credentials API client. All endpoints are protected;
 * the provider is derived from the Bearer token server-side. Secrets are
 * write-only — the GET never returns secret values, only "has*" flags.
 */

export interface CvlKraCredentialMeta {
  configured: boolean;
  username?: string;
  posCode?: string;
  environment?: "uat" | "live";
  fetchType?: "E" | "I" | "X";
  name?: string;
  hasApiKey?: boolean;
  hasPassword?: boolean;
  hasAesKey?: boolean;
  updatedAt?: string;
}

export interface CvlKraCredentialPayload {
  username: string;
  posCode: string;
  environment: "uat" | "live";
  fetchType: "E" | "I" | "X";
  apiKey?: string;
  password?: string;
  aesKey?: string;
  name?: string;
}

const base = () => `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/cvlkra`;

export async function getCvlKraCredentials(
  token: string,
): Promise<CvlKraCredentialMeta> {
  const res = await fetch(`${base()}/credentials`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || "Failed to load CVL KRA credentials");
  }
  return data.data as CvlKraCredentialMeta;
}

export async function saveCvlKraCredentials(
  payload: CvlKraCredentialPayload,
  token: string,
): Promise<{ message: string }> {
  const res = await fetch(`${base()}/credentials/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || "Failed to save CVL KRA credentials");
  }
  return data;
}

export async function testCvlKraConnection(
  token: string,
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${base()}/credentials/test`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  // The test endpoint returns 200 with success:false on validation failure.
  return { success: Boolean(data?.success), message: data?.message || "" };
}
