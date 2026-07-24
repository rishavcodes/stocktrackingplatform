import type { Request, Response } from "express";
import mongoose from "mongoose";
import { ServiceModel } from "../models/PostModels";
import { sendTelegramMessage, sendTelegramPhoto } from "../config/telegram";
import { sendNotification } from "../helpers/sendNotification";
import { getProfileFamilyIds } from "../utils/profileHelpers";

/**
 * POST /api/post/quickmessage
 *
 * Broadcast a free-form text message to one or more of the calling SP's plans.
 * The SP picks which plans get it. Delivery channel depends on the plan:
 *   - plan HAS a Telegram channel → message goes to that channel (+ in-app/push
 *     to its subscribers, as before).
 *   - plan has NO Telegram channel → its subscribers get an in-app bell + PWA
 *     push notification instead (no longer skipped).
 *
 * Body:  { message: string, planIds: string[] }
 * Auth:  requires verifyUserRATokenMiddleware (sets req.user)
 *
 * Response shape:
 *   {
 *     success:  true,
 *     sent:     [{ planId, title, channelId }],  // delivered via Telegram
 *     notified: [{ planId, title }],             // delivered via notification only
 *     skipped:  [{ planId, reason }],            // deactivated / not yours / failed
 *   }
 * Returns mixed results so the UI can show "3 via Telegram, 2 via notification".
 */
export const broadcastQuickMessage = async (
  req: Request,
  res: Response,
) => {
  try {
    const spId = (req.user as any)?._id?.toString() || (req.user as any)?.id;
    if (!spId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const { message, planIds: rawPlanIds } = req.body as {
      message?: string;
      planIds?: string[] | string;
    };

    // Optional image attachment — multer-S3 sets req.file.location to the
    // public URL when the route uses uploadPosts.single("image"). We validate
    // it's a parseable URL because node-telegram-bot-api's URL check throws
    // the cryptic "The string did not match the expected pattern" otherwise.
    const rawImageLocation = (req as any).file?.location as string | undefined;
    let imageUrl: string | undefined;
    if (rawImageLocation) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _validate = new URL(rawImageLocation);
        imageUrl = rawImageLocation;
      } catch (urlErr) {
        console.error(
          "[quickmessage] uploaded file URL invalid, falling back to text-only:",
          rawImageLocation,
          urlErr,
        );
        imageUrl = undefined;
      }
    }

    // When the request is multipart (image upload) planIds arrives as either
    // a JSON-encoded string or repeated "planIds[]" fields. Normalise here so
    // the rest of the function can treat it as a string array regardless of
    // the inbound content-type.
    let planIds: string[] = [];
    if (Array.isArray(rawPlanIds)) {
      planIds = rawPlanIds.filter((s): s is string => typeof s === "string");
    } else if (typeof rawPlanIds === "string" && rawPlanIds.length > 0) {
      try {
        const parsed = JSON.parse(rawPlanIds);
        if (Array.isArray(parsed))
          planIds = parsed.filter((s): s is string => typeof s === "string");
      } catch {
        // Fall back to comma-delimited form-data (older clients).
        planIds = rawPlanIds.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    const trimmed = (message || "").trim();
    // An image-only message is allowed — Telegram supports captionless photos
    // and the bell can render an image-only row. Reject only when BOTH are
    // missing so the SP doesn't accidentally broadcast nothing.
    if (!trimmed && !imageUrl) {
      return res
        .status(400)
        .json({ success: false, message: "Message or image is required" });
    }
    // Telegram's per-message hard cap is 4096 chars (1024 for captions).
    // Reject anything beyond the lower bound when an image is attached so
    // the caption isn't silently truncated downstream.
    const maxLen = imageUrl ? 1000 : 4000;
    if (trimmed.length > maxLen) {
      return res.status(400).json({
        success: false,
        message: `Message exceeds ${maxLen} characters — please shorten`,
      });
    }

    if (planIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Select at least one plan" });
    }

    const validIds = planIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (validIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No valid plan ids supplied" });
    }

    // Expand `spId` into the calling SP's profile family so admin sub-profiles
    // can broadcast on the master's plans (they see what the parent sees).
    // For Individuals / user sub-profiles / masters this resolves to just self,
    // so the ownership check still gates malicious payloads from other RAs.
    const familyIds = await getProfileFamilyIds(String(spId));

    // Only fetch plans the calling SP (or their family) actually owns.
    // Also pull subscribedBy so we can fan out in-app + push notifications to
    // subscribers in addition to the Telegram broadcast.
    const plans = await ServiceModel.find({
      _id: { $in: validIds },
      "authorData.id": { $in: familyIds },
    })
      .select("_id title telegramChannelId activated subscribedBy")
      .lean();

    const senderName =
      (req.user as any)?.RegName ||
      (req.user as any)?.name ||
      "Your Research Analyst";

    const sent: { planId: string; title: string; channelId: string }[] = [];
    // Plans with NO Telegram channel are not a failure — they're delivered to
    // their subscribers via in-app bell + PWA push instead (handled by the
    // notification fan-out below, which covers `sent` AND `notified` plans).
    const notified: { planId: string; title: string }[] = [];
    const skipped: { planId: string; reason: string }[] = [];

    // Track which requested ids were resolved so we can report the rest as
    // "not yours / not found".
    const ownedIds = new Set(plans.map((p: any) => String(p._id)));
    for (const reqId of planIds) {
      if (!ownedIds.has(reqId)) {
        skipped.push({ planId: reqId, reason: "Plan not found or not yours" });
      }
    }

    // Fan out the sends in parallel — Telegram bot API handles concurrent
    // requests fine and the SP just wants this to feel snappy.
    await Promise.all(
      plans.map(async (plan: any) => {
        const planIdStr = String(plan._id);
        if (plan.activated === false) {
          skipped.push({
            planId: planIdStr,
            reason: "Plan is deactivated",
          });
          return;
        }
        // No Telegram channel → deliver to this plan's subscribers via the
        // in-app + push notification fan-out only. Don't skip it.
        if (!plan.telegramChannelId) {
          notified.push({ planId: planIdStr, title: plan.title });
          return;
        }
        try {
          // Photo path when an image is attached — caption carries the
          // RA's text. Photo-only (no caption) is supported too.
          if (imageUrl) {
            await sendTelegramPhoto(
              plan.telegramChannelId,
              imageUrl,
              trimmed,
            );
          } else {
            await sendTelegramMessage(plan.telegramChannelId, trimmed);
          }
          sent.push({
            planId: planIdStr,
            title: plan.title,
            channelId: plan.telegramChannelId,
          });
        } catch (err: any) {
          console.error(
            `[quickmessage] send failed for plan ${planIdStr}:`,
            err?.message || err,
          );
          skipped.push({
            planId: planIdStr,
            reason: "Telegram delivery failed",
          });
        }
      }),
    );

    // In-app bell + PWA push fan-out to subscribers of the plans we actually
    // delivered to via Telegram. sendNotification() already auto-fires push
    // notifications for every recipient (wired in helpers/sendNotification.ts),
    // so a single call covers both channels.
    //
    // We dedupe subscriber ids across plans — a customer subscribed to 3 of
    // the selected plans should still only see one bell entry / one push.
    try {
      // Deliver in-app + push to subscribers of every plan we actually reached —
      // both Telegram-delivered (`sent`) and channel-less (`notified`) plans.
      const deliveredPlanIds = new Set([
        ...sent.map((s) => s.planId),
        ...notified.map((n) => n.planId),
      ]);
      const recipientIds = new Set<string>();
      for (const plan of plans) {
        if (!deliveredPlanIds.has(String((plan as any)._id))) continue;
        const subs = ((plan as any).subscribedBy || []) as string[];
        for (const uid of subs) {
          if (uid) recipientIds.add(String(uid));
        }
      }

      // Strip basic HTML tags so the bell + OS push banner show clean text.
      // Pulled out so we can reuse for both the subscriber broadcast and the
      // RA self-confirmation below.
      const plain = trimmed.replace(/<[^>]*>/g, "").trim();
      const preview = plain.length > 140 ? plain.slice(0, 137) + "…" : plain;
      const planTitles = [
        ...sent.map((s) => s.title),
        ...notified.map((n) => n.title),
      ].join(", ");

      if (recipientIds.size > 0) {
        await sendNotification({
          recipientIds: Array.from(recipientIds),
          recipientRole: "both",
          // Just the raw message, no "RA name:" prefix. The bell row still
          // shows the sender's name/avatar separately, and the OS push
          // banner's title is set to the sender name by sendNotification
          // — so the recipient knows who it's from without it bloating
          // the body text.
          message: preview || "📷 Photo",
          type: "quickmessage",
          category: "sp",
          sentBy: { id: String(spId), name: senderName },
          postLink: "/dashboard/user/subscribedservices",
          ctaLabel: "Open",
          sendToLabel: planTitles,
          image: imageUrl,
        });
      }

      // RA self-confirmation — mirrors what subscribers see: just the raw
      // message text, no prefix and no plan list in the body. The sender is
      // the RA themself, so the notifications page renders "You" automatically
      // via the isSelf check. Plan titles still surface as a sendToLabel chip
      // on the bell row. Fires when at least one plan was reached via Telegram
      // OR via the notification-only path.
      if (sent.length > 0 || notified.length > 0) {
        await sendNotification({
          recipientIds: [String(spId)],
          recipientRole: "provider",
          message: preview || "📷 Photo",
          type: "quickmessage",
          category: "sp",
          sentBy: { id: String(spId), name: senderName },
          postLink: "/dashboard/serviceprovider/content/researchreports/quickmessage",
          ctaLabel: "Open Quick Message",
          sendToLabel: planTitles,
          image: imageUrl,
        });
      }
    } catch (notifyErr) {
      // Notification failure shouldn't block the success response — the
      // Telegram delivery already happened.
      console.error("[quickmessage] notification fan-out failed:", notifyErr);
    }

    const reached = sent.length + notified.length;
    return res.status(200).json({
      success: true,
      sent,
      notified,
      skipped,
      message:
        notified.length > 0
          ? `Delivered to ${reached} of ${planIds.length} plan(s) — ${sent.length} via Telegram, ${notified.length} via notification`
          : `Sent to ${sent.length} of ${planIds.length} plan(s)`,
    });
  } catch (error: any) {
    console.error("broadcastQuickMessage error:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to broadcast message",
    });
  }
};
