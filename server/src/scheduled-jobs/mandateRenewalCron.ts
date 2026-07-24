import cron from "node-cron";
import { MandateModel } from "../models/MandateModel";
import { RazorpayKeyModel } from "../models/IntegrationModels";
import { fetchRazorpaySubscription } from "../helpers/razorpaySubscription";
import { processAutoRenewal } from "../services/autoRenewalService";
import { OrderModel } from "../models/TransactionModels";

/**
 * Mandate Renewal Cron Job
 *
 * Runs every hour. Polls Razorpay's Subscription API for active mandates
 * to detect new charges and process renewals. This replaces webhooks
 * which can deactivate due to inactivity.
 *
 * How it works:
 * 1. Find all active mandates where nextChargeAt <= now
 * 2. Fetch subscription status from Razorpay
 * 3. If paid_count increased → new charge detected → process renewal
 * 4. If status changed to cancelled/halted/etc → update mandate
 */
export default function startMandateRenewalCron() {
  cron.schedule("0 * * * *", async () => {
    console.log("[CRON] Mandate renewal check started");

    try {
      // Find mandates that are active and potentially due for a charge
      const activeMandates = await MandateModel.find({
        status: { $in: ["active", "authenticated"] },
      });

      if (!activeMandates.length) {
        console.log("[CRON] No active mandates to check");
        return;
      }

      console.log(
        `[CRON] Checking ${activeMandates.length} active mandate(s)`
      );

      const spKeysCache = new Map<string, { keyId: string; keySecret: string } | null>();

      for (const mandate of activeMandates) {
        try {
          const spId = mandate.serviceProviderId;
          console.log(
            `[CRON][DEBUG] Processing mandate ${mandate._id} | SP: ${spId} | sub: ${mandate.razorpaySubscriptionId} | status: ${mandate.status} | paidCount: ${mandate.paidCount}`
          );

          if (!spKeysCache.has(spId)) {
            console.log(`[CRON][DEBUG] Cache miss for SP ${spId}, querying RazorpayKeyModel...`);
            const keys = await RazorpayKeyModel.findOne({ userId: spId })
              .select("keyId keySecret")
              .lean();
            spKeysCache.set(
              spId,
              keys ? { keyId: keys.keyId, keySecret: keys.keySecret } : null
            );
            console.log(
              `[CRON][DEBUG] RazorpayKeyModel result for SP ${spId}: ${keys ? "FOUND" : "NOT FOUND"}`
            );
          } else {
            console.log(`[CRON][DEBUG] Cache hit for SP ${spId}`);
          }

          const spKeys = spKeysCache.get(spId);
          if (!spKeys) {
            console.warn(
              `[CRON] No Razorpay credentials found for SP ${spId}, skipping mandate ${mandate._id}`
            );
            continue;
          }

          console.log(
            `[CRON][DEBUG] Fetching Razorpay subscription ${mandate.razorpaySubscriptionId} with SP key ${spKeys.keyId.slice(0, 8)}...`
          );
          const rzpSub = await fetchRazorpaySubscription(
            mandate.razorpaySubscriptionId,
            spKeys.keyId,
            spKeys.keySecret
          );
          console.log(
            `[CRON][DEBUG] Razorpay response: status=${rzpSub.status} | paid_count=${rzpSub.paid_count} | charge_at=${rzpSub.charge_at}`
          );

          /* ---------- CHECK FOR NEW CHARGES ---------- */

          if (rzpSub.paid_count > mandate.paidCount) {
            const newCharges = rzpSub.paid_count - mandate.paidCount;
            console.log(
              `[CRON] Detected ${newCharges} new charge(s) for mandate ${mandate._id} ` +
                `(rzp paid_count: ${rzpSub.paid_count}, local paidCount: ${mandate.paidCount})`
            );

            console.log(
              `[CRON][DEBUG] Looking up latest order for userId=${mandate.userId}, subscribedToId=${mandate.subscribedToId}`
            );
            const latestOrder = await OrderModel.findOne({
              "orderdBy.id": mandate.userId,
              subscribedToId: mandate.subscribedToId,
              paymentStatus: "verified",
            }).sort({ createdAt: -1 });

            const previousOrderId = latestOrder
              ? latestOrder._id.toString()
              : mandate.orderId.toString();
            console.log(
              `[CRON][DEBUG] previousOrderId=${previousOrderId} (from ${latestOrder ? "latestOrder" : "mandate.orderId"})`
            );

            for (let i = 0; i < newCharges; i++) {
              const chargeNum = mandate.paidCount + i + 1;
              const paymentId = `auto_${mandate.razorpaySubscriptionId}_${chargeNum}`;
              console.log(
                `[CRON][DEBUG] Processing charge ${i + 1}/${newCharges} | paymentId=${paymentId}`
              );

              const result = await processAutoRenewal({
                planDetails: mandate.planDetails as any,
                razorpayPaymentId: paymentId,
                previousOrderId,
              });
              console.log(
                `[CRON][DEBUG] processAutoRenewal result: success=${result.success}, newOrderId=${result.newOrderId}, error=${result.error || "none"}`
              );

              mandate.renewalHistory.push({
                chargedAt: new Date(),
                razorpayPaymentId: paymentId,
                newOrderId: result.newOrderId
                  ? (result.newOrderId as any)
                  : undefined,
                amount: mandate.planDetails.total,
                status: result.success ? "success" : "failed",
              } as any);

              if (result.success) {
                console.log(
                  `[CRON] Auto-renewal successful. New order: ${result.newOrderId}`
                );
              } else {
                console.error(
                  `[CRON] Auto-renewal failed for mandate ${mandate._id}:`,
                  result.error
                );
              }
            }

            mandate.paidCount = rzpSub.paid_count;
            if (rzpSub.charge_at) {
              mandate.nextChargeAt = new Date(rzpSub.charge_at * 1000);
            }
            console.log(
              `[CRON][DEBUG] Updated mandate paidCount=${mandate.paidCount}, nextChargeAt=${mandate.nextChargeAt}`
            );
          } else {
            console.log(
              `[CRON][DEBUG] No new charges (rzp paid_count=${rzpSub.paid_count}, local paidCount=${mandate.paidCount})`
            );
          }

          /* ---------- HANDLE STATUS CHANGES ---------- */

          const terminalStatuses = [
            "cancelled",
            "halted",
            "completed",
            "expired",
          ];

          if (terminalStatuses.includes(rzpSub.status)) {
            if (mandate.status !== rzpSub.status) {
              console.log(
                `[CRON] Mandate ${mandate._id} status changed: ${mandate.status} → ${rzpSub.status}`
              );
              mandate.status = rzpSub.status as any;
            } else {
              console.log(
                `[CRON][DEBUG] Mandate already in terminal status: ${mandate.status}`
              );
            }
          } else if (
            rzpSub.status === "active" &&
            mandate.status === "authenticated"
          ) {
            console.log(
              `[CRON][DEBUG] Promoting mandate ${mandate._id} from authenticated → active`
            );
            mandate.status = "active";
          } else {
            console.log(
              `[CRON][DEBUG] No status change needed (rzp=${rzpSub.status}, local=${mandate.status})`
            );
          }

          await mandate.save();
          console.log(`[CRON][DEBUG] Mandate ${mandate._id} saved successfully`);

          await new Promise((r) => setTimeout(r, 200));
        } catch (err) {
          console.error(
            `[CRON] Error processing mandate ${mandate._id}:`,
            err
          );
        }
      }

      console.log("[CRON] Mandate renewal check completed");
    } catch (err) {
      console.error("[CRON] Mandate renewal job crashed:", err);
    }
  });

  console.log("[CRON] Mandate renewal cron registered (runs every hour)");
}
