import { Request, Response } from "express";
import mongoose from "mongoose";
import { UserModel } from "../models/AuthModels";
import { uploadSignedDocToS3 } from "../helpers/uploadDocument";
import { LeadModel } from "../models/TransactionModels";
import { ServiceModel } from "../models/PostModels";
import { Portfolio } from "../lib/schema";
import { PackageModel } from "../models/PackageModel";
import { mailQueue } from "../queues/MailQueues";
import {
  AadhaarMatchStatus,
  EsignSessionModel,
} from "../models/EsignSessionModel";
import { logOnboardingIssue } from "../lib/onboardingIssueLogger";
import { debitOnboardingCharge } from "../helpers/walletDebit";

interface AadhaarCheckResult {
  status: AadhaarMatchStatus;
  last4FromPan: string | null;
  last4FromEsign: string | null;
}

/**
 * Calls Surepass eSign "report" API, extracts the Aadhaar last-4 from the
 * signing certificate, and compares against the user's `aadhaarLast4` (which
 * was saved earlier from the PAN comprehensive response). On a confirmed
 * mismatch we also update the open Lead and notify the service provider so
 * they have visibility on the failed customer.
 *
 * "report_unavailable" is returned when Surepass cannot give us a clean last-4
 * (their side errored, certificate parsing failed, user missing, etc.) and is
 * treated by callers as a hard block — same as "mismatched".
 */
async function verifyAadhaarAgainstEsignReport(
  clientId: string,
  userId: string,
  serviceId?: string
): Promise<AadhaarCheckResult> {
  let last4FromEsign: string | null = null;
  let last4FromPan: string | null = null;

  try {
    const response = await fetch(
      `${process.env.SUREPASS_BASE_URL}/report/${clientId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUREPASS_API_KEY}`,
        },
        body: JSON.stringify({ categories: ["name_match"] }),
      }
    );

    const data = await response.json();

    if (
      !data?.success ||
      !data?.data?.reports?.name_match?.certificate_details
    ) {
      console.error("eSign report: invalid response", data);
      return { status: "report_unavailable", last4FromPan, last4FromEsign };
    }

    const rawLast4 =
      data.data.reports.name_match.certificate_details
        .aaadhar_last_four_digits;
    if (!rawLast4) {
      console.error("eSign report: aadhaar last 4 missing", data);
      return { status: "report_unavailable", last4FromPan, last4FromEsign };
    }
    last4FromEsign = String(rawLast4);

    const user = await UserModel.findById(userId);
    if (!user) {
      console.error("eSign report: user not found", userId);
      return { status: "report_unavailable", last4FromPan, last4FromEsign };
    }
    last4FromPan = user.aadhaarLast4 ? String(user.aadhaarLast4) : null;

    const matched =
      !!last4FromPan && last4FromPan === last4FromEsign;

    if (serviceId) {
      const service = await ServiceModel.findById(serviceId);
      const leadFilter = {
        subscribedToId: serviceId,
        "user.id": user._id.toString(),
        serviceProviderId: service?.authorData?.id,
      };

      if (!matched) {
        // Capture Aadhaar mismatch for admin triage
        logOnboardingIssue({
          step: "esign_aadhaar_mismatch",
          severity: "warning",
          reason: "Aadhaar on signed document doesn't match Aadhaar linked to PAN",
          errorCode: "aadhaar_mismatch",
          customerId: user._id.toString(),
          customerName: user.name,
          customerEmail: user.email,
          customerPhone: user.number ? String(user.number) : undefined,
          planId: serviceId,
          planTitle: service?.title,
          spId: service?.authorData?.id,
          spName: service?.authorData?.name,
          clientId,
          metadata: { last4FromPan, last4FromEsign },
        });

        await LeadModel.findOneAndUpdate(
          leadFilter,
          { $set: { failureStep: "eSign Aadhaar mismatch" } },
          { new: true, upsert: false }
        );

        if (service?.authorData?.email) {
          const mailOptions = {
            from: process.env.EMAIL,
            to: service.authorData.email,
            subject: `New Lead Generated`,
            html: `
        <div style="font-family: Arial, sans-serif; background-color:#f9f9f9; padding:20px;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1); padding:20px;">
      <h2 style="color:#2c3e50; text-align:center;">📢 New Lead Generated</h2>

      <p style="font-size:15px; color:#333;">
        Hello <strong>${service?.authorData?.name}</strong>,
      </p>

      <p style="font-size:15px; color:#333;">
        A new lead has been generated for your service:
        <strong>${service?.title}</strong>.
      </p>

      <h3 style="color:#2c3e50; margin-top:20px;">👤 Lead Details:</h3>
      <ul style="font-size:14px; color:#555; line-height:1.6;">
        <li><strong>Name:</strong> ${user?.name}</li>
        <li><strong>Email:</strong> ${user?.email}</li>
        <li><strong>Failure Step:</strong> eSign Aadhaar mismatch</li>
      </ul>

      <p style="margin-top:20px; font-size:14px; color:#333;">
        Please review this lead in your dashboard and take the necessary steps.
      </p>

      <p style="font-size:14px; color:#333; margin-top:30px;">
        Best Regards, <br/>
        <strong>Tradebox Team</strong>
      </p>
    </div>
  </div>
        `,
          };
          await mailQueue.add(
            service.authorData.email,
            { mailOptions },
            { removeOnComplete: false, removeOnFail: false }
          );
        }
      } else {
        await LeadModel.findOneAndUpdate(
          leadFilter,
          { $set: { failureStep: "eSign Completed" } },
          { new: true }
        );
      }
    }

    return {
      status: matched ? "matched" : "mismatched",
      last4FromPan,
      last4FromEsign,
    };
  } catch (err) {
    console.error("verifyAadhaarAgainstEsignReport error:", err);
    return { status: "report_unavailable", last4FromPan, last4FromEsign };
  }
}

// Anchor allowed eSign return hosts to the production apex so a tampered
// `originUrl` can't turn the Surepass callback into an open redirect.
function safeOriginOrNull(originUrl: unknown): string | null {
  if (typeof originUrl !== "string" || !originUrl) return null;
  try {
    const u = new URL(originUrl);
    if (u.protocol !== "https:") return null;
    const host = u.host.toLowerCase();
    if (host === "tradeboxlive.com" || host.endsWith(".tradeboxlive.com")) {
      return `${u.protocol}//${u.host}`;
    }
    return null;
  } catch {
    return null;
  }
}

// 1️⃣ Initialize Surepass eSign
export const initEsign = async (req: Request, res: Response) => {
  try {
    const {
      tncFileURL,
      userId,
      serviceId,
      fullName,
      mobile,
      email,
      redirectUrl,
      cartItem,
      originUrl,
    } = req.body;

    const safeOrigin = safeOriginOrNull(originUrl);

    if (!tncFileURL || !userId || !serviceId) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    console.log("passing 1");

    const payload = {
      pdf_pre_uploaded: true,
      // callback_url: `https://tradeboxlive.com/view/services/${serviceId}`,
      callback_url: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/esign/callback`,
      config: {
        auth_mode: "1",
        reason: "Contract",
        positions: {
          "1": [{ x: 341, y: 83 }],
        },
        skip_otp: true,
        skip_welcome_screen: true,
        skip_main_screen: true,
        allow_download: false,
      },
      prefill_options: {
        full_name: fullName,
        mobile_number: mobile,
        user_email: email,
      },
    };
    console.log("passing 2");
    // console.log(JSON.stringify(payload));

    // Init session
    const response = await fetch(
      `${process.env.SUREPASS_BASE_URL}/initialize`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUREPASS_API_KEY}`,
        },
        body: JSON.stringify(payload),
      }
    );
    console.log("passing 3");

    const data = await response.json();
    // console.log("surepass data", data);
    if (!data?.data?.client_id) {
      return res
        .status(500)
        .json({ message: "Failed to initialize eSign", data });
    }
    console.log("passing 4");

    await EsignSessionModel.create({
      clientId: data.data.client_id,
      userId,
      serviceId,
      // Denormalise the RA (exact selling profile id) so a later purchase of a
      // different item by the same RA can find this signature and skip Step 1.
      raId: cartItem?.authorId ?? cartItem?.soldById,
      status: "INITIATED",
      metadata: { cartItem, originUrl: safeOrigin },
    });

    // Upload PDF
    const uploadRes = await fetch(
      `${process.env.SUREPASS_BASE_URL}/upload-pdf`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUREPASS_API_KEY}`,
        },
        body: JSON.stringify({
          client_id: data.data.client_id,
          link: tncFileURL,
        }),
      }
    );
    console.log("passing 5");

    const uploadData = await uploadRes.json();
    if (!uploadData?.success) {
      return res.status(500).json({ message: "PDF upload failed", uploadData });
    }
    console.log("passing 6");

    return res.json({
      clientId: data.data.client_id,
      token: data.data.token,
      esignUrl: `https://esign-client.surepass.app/?token=${data.data.token}`,
    });
  } catch (error: any) {
    console.error("Error initializing eSign:", error);

    // Capture failure into the admin Onboarding Issues inbox
    logOnboardingIssue({
      step: "esign_init",
      severity: "critical",
      reason: "eSign initialization failed (Surepass error)",
      errorMessage: error?.message,
      errorCode: error?.code,
      customerId: req.body?.userId,
      customerName: req.body?.fullName,
      customerEmail: req.body?.email,
      customerPhone: req.body?.mobile ? String(req.body.mobile) : undefined,
      planId: req.body?.serviceId,
      planTitle: req.body?.cartItem?.serviceName,
      planPrice: req.body?.cartItem?.basePrice,
      spId: req.body?.cartItem?.authorId,
      spName: req.body?.cartItem?.authorName,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
      stack: error?.stack,
      metadata: { cartItem: req.body?.cartItem },
    });

    return res
      .status(500)
      .json({ message: error.message || "Internal server error" });
  }
};

// 2️⃣ Check eSign Status
export const checkStatus = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.query;

    if (!clientId) {
      return res.status(400).json({ message: "Missing clientId" });
    }

    const response = await fetch(
      `${process.env.SUREPASS_BASE_URL}/status/${clientId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUREPASS_API_KEY}`,
        },
      }
    );

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error("Error checking eSign status:", error);
    return res
      .status(500)
      .json({ message: error.message || "Internal server error" });
  }
};

// 5️⃣ Fetch eSign Report & Verify Aadhaar.
// Kept as a controller for ad-hoc manual re-runs. The same comparison runs
// automatically inside `handleCallback`, so this isn't wired to a public route
// in normal flows.
export const getEsignReport = async (req: Request, res: Response) => {
  try {
    const { clientId, userId, serviceId } = req.body;

    if (!clientId || !userId) {
      return res.status(400).json({ message: "Missing clientId or userId" });
    }

    const result = await verifyAadhaarAgainstEsignReport(
      String(clientId),
      String(userId),
      serviceId ? String(serviceId) : undefined
    );

    if (result.status === "matched") {
      return res.json({
        success: true,
        message: "Aadhaar verification successful",
        last4: result.last4FromEsign,
      });
    }

    if (result.status === "mismatched") {
      return res.status(403).json({
        success: false,
        message: "Aadhaar verification failed",
        expected: result.last4FromPan,
        got: result.last4FromEsign,
      });
    }

    return res.status(400).json({
      success: false,
      message: "eSign report unavailable",
    });
  } catch (error: any) {
    console.error("Error fetching eSign report:", error);
    return res
      .status(500)
      .json({ message: error.message || "Internal server error" });
  }
};

export const getsigneddocument = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.query;

    if (!clientId) {
      return res.status(400).json({ message: "Missing clientId" });
    }

    const response = await fetch(
      `${process.env.SUREPASS_BASE_URL}/get-signed-document/${clientId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUREPASS_API_KEY}`,
        },
      }
    );

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error("Error checking eSign status:", error);
    return res
      .status(500)
      .json({ message: error.message || "Internal server error" });
  }
};

export const handleCallback = async (req: Request, res: Response) => {
  try {
    const { client_id } = req.query;

    if (!client_id) {
      return res.status(400).send("Missing client_id");
    }

    const session = await EsignSessionModel.findOne({ clientId: client_id });
    if (!session) {
      return res.status(404).send("Session not found");
    }

    // Return the user to the host they started checkout on (SP subdomain or
    // apex). Re-validate even though we already validated on init — metadata
    // is Mixed and could in principle be poisoned.
    const returnOrigin =
      safeOriginOrNull((session.metadata as any)?.originUrl) ??
      process.env.FRONTEND_URL ??
      process.env.NEXTAUTH_URL ??
      "";

    // Verify with Surepass
    const statusRes = await fetch(
      `${process.env.SUREPASS_BASE_URL}/status/${client_id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUREPASS_API_KEY}`,
        },
      }
    );

    const statusData = await statusRes.json();

    if (!statusData?.data?.completed) {
      return res.redirect(
        `${returnOrigin}/view/services/${session.serviceId}?esign=failed`
      );
    }

    // Fetch signed document
    const docMetaRes = await fetch(
      `${process.env.SUREPASS_BASE_URL}/get-signed-document/${client_id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUREPASS_API_KEY}`,
        },
      }
    );

    const docMeta = await docMetaRes.json();

    if (!docMeta?.data?.url) {
      throw new Error("Signed document URL not received");
    }

    // ✅ Fetch ACTUAL PDF from the returned URL
    const pdfRes = await fetch(docMeta.data.url);

    if (!pdfRes.ok) {
      throw new Error("Failed to download signed PDF");
    }

    const contentType = pdfRes.headers.get("content-type");
    if (contentType !== "application/pdf") {
      throw new Error(`Invalid file type: ${contentType}`);
    }

    const buffer = Buffer.from(await pdfRes.arrayBuffer());

    const uploaded = await uploadSignedDocToS3({
      buffer,
      session,
      mimetype: "application/pdf",
    });

    // Verify PAN-side Aadhaar against the signing certificate. The result is
    // the gate that the checkout page and the payment controller both read
    // before allowing the user to reach / complete payment.
    const aadhaarCheck = await verifyAadhaarAgainstEsignReport(
      String(client_id),
      session.userId.toString(),
      session.serviceId?.toString()
    );

    await EsignSessionModel.updateOne(
      { clientId: client_id },
      {
        status: "COMPLETED",
        signedDocURL: uploaded.location,
        aadhaarMatchStatus: aadhaarCheck.status,
        aadhaarLast4FromPan: aadhaarCheck.last4FromPan ?? undefined,
        aadhaarLast4FromEsign: aadhaarCheck.last4FromEsign ?? undefined,
      }
    );

    // SP onboarding charge is debited up-front, the moment Aadhaar is verified
    // matched. Mismatched/unavailable signings already block payment, so don't
    // charge the SP for them.
    let blocked = false;
    if (aadhaarCheck.status === "matched") {
      blocked = await debitOnEsignCompletion(String(client_id));
    }

    return res.redirect(
      `${returnOrigin}/checkout?esign=${blocked ? "blocked" : "success"}&client_id=${client_id}`
    );
  } catch (err) {
    console.error("eSign callback error", err);
    return res.status(500).send("Callback failed");
  }
};

// Runs the SP-wallet debit for a freshly-completed e-sign session. Idempotent:
// guarded by EsignSessionModel.chargeDebited, and re-checked inside the txn.
// Returns true when the session ends up PAYMENT_BLOCKED (caller redirects the
// user to the "service unavailable" screen).
async function debitOnEsignCompletion(clientId: string): Promise<boolean> {
  const fresh = await EsignSessionModel.findOne({ clientId });
  if (!fresh || fresh.chargeDebited) return false;

  const meta = (fresh.metadata as any) ?? {};
  const cartItem = meta.cartItem ?? {};

  // Cart payload uses authorId/basePrice/title (see PricingSection.buildCartItem
  // on the frontend). Coupons aren't applied until Step 2, so subtotal here is
  // always pre-discount.
  const soldById = cartItem.soldById ?? cartItem.authorId;
  const subtotal =
    typeof cartItem.subtotal === "number"
      ? cartItem.subtotal
      : typeof cartItem.basePrice === "number"
      ? cartItem.basePrice
      : undefined;
  const serviceName = cartItem.serviceName ?? cartItem.title ?? "service";

  if (!soldById || typeof subtotal !== "number") {
    console.warn(
      `[esign-debit] skipping debit for ${clientId}: cart missing soldById/subtotal`
    );
    return false;
  }

  let blocked = false;
  const txSession = await mongoose.startSession();
  try {
    await txSession.withTransaction(async () => {
      const locked = await EsignSessionModel.findOne({
        clientId,
        chargeDebited: { $ne: true },
      }).session(txSession);
      if (!locked) return;

      const orderByUser = await UserModel.findById(fresh.userId).session(
        txSession
      );

      const result = await debitOnboardingCharge({
        soldById: String(soldById),
        orderById: String(fresh.userId),
        subscribedToId: String(fresh.serviceId),
        subtotal: Number(subtotal),
        serviceName,
        orderByName: orderByUser?.name ?? "",
        orderByEmail: orderByUser?.email ?? "",
        esignClientId: clientId,
        session: txSession,
      });

      if (!result.ok) {
        if (result.reason === "insufficient-balance") {
          await EsignSessionModel.updateOne(
            { clientId },
            {
              status: "PAYMENT_BLOCKED",
              errorMessage:
                "SP wallet insufficient at e-sign completion",
            }
          ).session(txSession);
          blocked = true;
        }
        // "no-subscription" — leave session COMPLETED; PaymentController's
        // existing subscription check will surface it on the payment attempt.
        return;
      }

      await EsignSessionModel.updateOne(
        { clientId },
        {
          chargeDebited: true,
          chargeDebitedAt: new Date(),
          chargeAmount: result.amount,
          walletTransactionId: result.transactionId,
        }
      ).session(txSession);
    });
  } catch (err) {
    console.error(`[esign-debit] failed for ${clientId}`, err);
  } finally {
    await txSession.endSession();
  }
  return blocked;
}


// GET /api/esign/session?serviceId=...&userId=...  OR  ?clientId=...
export const getEsignSession = async (req: Request, res: Response) => {
  const { serviceId, userId, clientId } = req.query;

  const query: any = clientId
    ? { clientId }
    : { serviceId, userId, status: "COMPLETED" };

  const session = await EsignSessionModel.findOne(query);

  if (!session) {
    return res.status(404).json({ success: false });
  }

  // Lazy backfill for sessions completed before the Aadhaar-match feature
  // shipped. Run the comparison once and persist it so subsequent reads — and
  // the server-side payment guard — see a concrete status.
  if (session.status === "COMPLETED" && !session.aadhaarMatchStatus) {
    const check = await verifyAadhaarAgainstEsignReport(
      session.clientId,
      session.userId.toString(),
      session.serviceId?.toString()
    );
    session.aadhaarMatchStatus = check.status;
    if (check.last4FromPan) session.aadhaarLast4FromPan = check.last4FromPan;
    if (check.last4FromEsign) session.aadhaarLast4FromEsign = check.last4FromEsign;
    await session.save();
  }

  return res.json({
    success: true,
    data: {
      signedDocURL: session.signedDocURL ?? null,
      status: session.status,
      aadhaarMatchStatus: session.aadhaarMatchStatus ?? "pending",
      aadhaarLast4FromEsign: session.aadhaarLast4FromEsign ?? null,
      serviceId: session.serviceId,
      userId: session.userId,
      cartItem: (session.metadata as any)?.cartItem ?? null,
    },
  });
};

// Resolve the RA (exact selling profile id) that owns a purchasable item.
// Items can be a service / portfolio / package and all expose `authorData.id`.
async function resolveItemRaId(
  serviceId: string,
  type?: string
): Promise<string | undefined> {
  try {
    if (type === "portfolio") {
      const p = (await Portfolio.findById(serviceId)
        .select("authorData.id")
        .lean()) as any;
      return p?.authorData?.id;
    }
    if (type === "package") {
      const pkg = (await PackageModel.findById(serviceId)
        .select("authorData.id")
        .lean()) as any;
      return pkg?.authorData?.id;
    }
    const s = (await ServiceModel.findById(serviceId)
      .select("authorData.id")
      .lean()) as any;
    return s?.authorData?.id;
  } catch (err) {
    console.error("resolveItemRaId failed", { serviceId, type, err });
    return undefined;
  }
}

// POST /api/esign/prepare
//
// SEBI compliance requires the subscriber to e-sign an RA's T&C — but only ONCE
// per RA. This endpoint decides, for the item being purchased, whether the
// e-sign Step 1 is still required or can be skipped because the user already
// signed this RA's T&C on an earlier purchase.
//
// On a skip we materialise a "reused" EsignSession for the new serviceId that
// mirrors a fresh completed sign (same shape the payment gate + order-creation
// charge already expect) and run the existing SP onboarding charge on it. That
// keeps billing per-purchase and leaves the payment/charge code untouched.
//
// Body:  { userId, serviceId, type?, cartItem }
// Reply: { required: true }                                  → show Step 1
//        { required: false, signedDocURL }                   → skip to payment
//        { required: false, blocked: true }                  → SP wallet/plan issue
export const prepareEsign = async (req: Request, res: Response) => {
  try {
    const { userId, serviceId, type, cartItem } = req.body as {
      userId?: string;
      serviceId?: string;
      type?: string;
      cartItem?: any;
    };

    if (!userId || !serviceId) {
      return res
        .status(400)
        .json({ message: "userId and serviceId are required" });
    }

    // Idempotency: a COMPLETED/PAYMENT_BLOCKED session for this exact (user,
    // item) already settles the decision — return it without charging again,
    // so checkout reloads don't double-charge.
    const existing = await EsignSessionModel.findOne({
      userId,
      serviceId,
      status: { $in: ["COMPLETED", "PAYMENT_BLOCKED"] },
    }).sort({ updatedAt: -1 });

    if (existing) {
      if (existing.status === "PAYMENT_BLOCKED") {
        return res.json({ required: false, blocked: true });
      }
      return res.json({
        required: existing.aadhaarMatchStatus !== "matched",
        signedDocURL: existing.signedDocURL ?? null,
        aadhaarMatchStatus: existing.aadhaarMatchStatus ?? "pending",
      });
    }

    // Exact selling profile id (no profile-family expansion, by design).
    const raId =
      (await resolveItemRaId(String(serviceId), type)) ??
      cartItem?.authorId ??
      cartItem?.soldById;

    // Without a resolvable RA we can't safely skip — fall back to a fresh sign.
    if (!raId) {
      return res.json({ required: true });
    }

    // Has the user already signed THIS RA's T&C (any item, matched Aadhaar)?
    // Match BOTH new sessions (top-level raId, set since this feature shipped)
    // AND legacy sessions signed before raId existed — those only carry the RA
    // id inside metadata.cartItem. Without the legacy fallback, anyone who
    // signed pre-update is wrongly asked to sign the same RA's T&C again.
    const reusable = await EsignSessionModel.findOne({
      userId,
      status: "COMPLETED",
      aadhaarMatchStatus: "matched",
      $or: [
        { raId },
        { "metadata.cartItem.authorId": raId },
        { "metadata.cartItem.soldById": raId },
      ],
    }).sort({ updatedAt: -1 });

    if (!reusable || !reusable.signedDocURL) {
      return res.json({ required: true });
    }

    // Self-heal: stamp raId onto a legacy session we matched via metadata, so
    // subsequent lookups hit the indexed raId path and the one-time backfill
    // becomes optional. Best-effort — never block the checkout on it.
    if (!reusable.raId) {
      reusable.raId = raId;
      await reusable
        .save()
        .catch((e: unknown) =>
          console.error("[prepareEsign] raId self-heal failed", e),
        );
    }

    // Materialise a reused session for the new item, mirroring a fresh sign.
    const syntheticClientId = `reuse_${userId}_${serviceId}_${new mongoose.Types.ObjectId().toString()}`;
    await EsignSessionModel.create({
      clientId: syntheticClientId,
      userId,
      serviceId,
      raId,
      status: "COMPLETED",
      signedDocURL: reusable.signedDocURL,
      aadhaarMatchStatus: "matched",
      aadhaarLast4FromPan: reusable.aadhaarLast4FromPan,
      aadhaarLast4FromEsign: reusable.aadhaarLast4FromEsign,
      reusedFromClientId: reusable.clientId,
      metadata: { cartItem },
    });

    // Run the SP onboarding charge for this purchase — same path a fresh sign
    // takes, so the fee stays per-purchase. Returns true when it ended up
    // PAYMENT_BLOCKED (SP wallet insufficient).
    const blocked = await debitOnEsignCompletion(syntheticClientId);

    // Re-read to confirm the charge actually committed. If it didn't (e.g. the
    // SP has no active Tradebox subscription) block here, before payment,
    // rather than letting the order-creation gate reject after the customer pays.
    const settled = await EsignSessionModel.findOne({
      clientId: syntheticClientId,
    }).select("chargeDebited");

    if (blocked || !settled?.chargeDebited) {
      return res.json({ required: false, blocked: true });
    }

    return res.json({
      required: false,
      signedDocURL: reusable.signedDocURL,
    });
  } catch (error: any) {
    console.error("Error preparing eSign:", error);
    return res
      .status(500)
      .json({ message: error?.message || "Internal server error" });
  }
};
