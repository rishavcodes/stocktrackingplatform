import { authFetch } from "@/lib/authFetch";

export type ConvertLeadResult =
  | { ok: true; order: any; idempotent?: boolean; message?: string }
  | { ok: false; message: string };

export interface ConvertLeadInput {
  note?: string;
  couponCode?: string;
  // Manual overrides for any-stage conversions. All optional.
  signedDocument?: File | null;
  subtotal?: number;
  gst?: number;
  total?: number;
  validity?: string;
  aadhaarUrl?: string;
  panUrl?: string;
  panNumber?: string;
  dob?: string;
}

export async function convertLeadToSubscriber(
  leadId: string,
  token: string,
  input: ConvertLeadInput = {},
): Promise<ConvertLeadResult> {
  try {
    // FormData (always) so the optional signed-doc upload can ride along.
    // Multer parses the text fields too; backend reads everything off req.body.
    const fd = new FormData();
    fd.append("note", input.note ?? "");
    if (input.couponCode) fd.append("couponCode", input.couponCode);
    if (input.signedDocument)
      fd.append("signedDocument", input.signedDocument);
    if (input.subtotal !== undefined)
      fd.append("subtotal", String(input.subtotal));
    if (input.gst !== undefined) fd.append("gst", String(input.gst));
    if (input.total !== undefined) fd.append("total", String(input.total));
    if (input.validity) fd.append("validity", input.validity);
    if (input.aadhaarUrl) fd.append("aadhaarUrl", input.aadhaarUrl);
    if (input.panUrl) fd.append("panUrl", input.panUrl);
    if (input.panNumber) fd.append("panNumber", input.panNumber);
    if (input.dob) fd.append("dob", input.dob);

    const res = await authFetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/leads/${leadId}/convert`,
      {
        method: "POST",
        headers: {
          // No Content-Type — browser sets multipart/form-data boundary.
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      },
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.success) {
      return {
        ok: false,
        message: data?.message || "Could not convert lead to subscriber.",
      };
    }

    return {
      ok: true,
      order: data.order,
      idempotent: data.idempotent,
      message: data.message,
    };
  } catch (err) {
    return {
      ok: false,
      message: "Network error. Please try again.",
    };
  }
}
