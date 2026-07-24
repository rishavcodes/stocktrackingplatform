import cron from "node-cron";

import { ServiceProviderRegModel } from "../models/AuthModels";
import { mailQueue } from "../queues/MailQueues";
import { notificationModel } from "../models/NotificationModel";

const LOW_BALANCE_THRESHOLD = 500;

export const startWalletLowBalanceReminder = () => {
  console.log("[CRON] Wallet low-balance reminder registered");

  // Daily at 9:00 AM IST
  cron.schedule("0 9 * * *", async () => {
    console.log("[CRON] Wallet low-balance reminder job started");

    try {
      const providers = await ServiceProviderRegModel.find({
        verified: true,
        "wallet.amount": { $lt: LOW_BALANCE_THRESHOLD },
      })
        .select("_id RegName companyName name email wallet")
        .lean();

      console.log(
        `[CRON] Found ${providers.length} provider(s) below ₹${LOW_BALANCE_THRESHOLD}`
      );

      for (const provider of providers) {
        try {
          if (!provider.email) continue;

          const displayName =
            provider.RegName || provider.companyName || provider.name || "there";
          const balance = provider.wallet?.amount ?? 0;

          await mailQueue.add(
            provider.email,
            {
              mailOptions: {
                from: process.env.EMAIL,
                to: provider.email,
                subject: "Action Required: Low Wallet Balance — Please Recharge",
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #d97706;">Your wallet balance is running low</h2>
                    <p>Hi ${displayName},</p>
                    <p>
                      Your Trade Box wallet currently has
                      <b style="color: #dc2626;">₹${balance.toFixed(2)}</b>,
                      which is below the recommended minimum of
                      <b>₹${LOW_BALANCE_THRESHOLD}</b>.
                    </p>
                    <p>
                      A low wallet balance may interrupt services such as
                      subscription renewals, onboarding charges, and other
                      automated deductions. To avoid any service disruption,
                      please recharge your wallet at the earliest.
                    </p>
                    <p style="margin: 24px 0;">
                      <a
                        href="https://tradeboxlive.com/dashboard/serviceprovider/wallet"
                        style="background:#059669;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;"
                      >
                        Recharge Wallet
                      </a>
                    </p>
                    <p style="color:#6b7280;font-size:12px;">
                      You will continue to receive this reminder daily until
                      your wallet balance reaches ₹${LOW_BALANCE_THRESHOLD} or more.
                    </p>
                    <p>Regards,<br/>Trade Box Fintech Solutions</p>
                  </div>
                `,
              },
            },
            { removeOnComplete: true, removeOnFail: true }
          );

          // In-app notification (separate from email) so it shows up in the
          // SP's notification feed and the admin's All Notifications page.
          // Uses type "wallet" — same as notifyWalletChange helper — so flow
          // filters group all wallet-related notifications together.
          await new notificationModel({
            message: `Your Tradebox wallet balance is low — ₹${balance.toFixed(2)} remaining. Please recharge to avoid service interruptions.`,
            sendTo: [{ id: String(provider._id), name: displayName }],
            sentBy: { id: "system", name: "System" },
            type: "wallet",
          }).save();

          console.log(
            `[CRON] Low-balance reminder queued for ${provider.email} (balance: ₹${balance})`
          );
        } catch (err) {
          console.error(
            "[CRON] Failed to queue reminder for provider:",
            provider._id,
            err
          );
        }
      }

      console.log("[CRON] Wallet low-balance reminder job completed");
    } catch (err) {
      console.error("[CRON] Wallet low-balance reminder job crashed:", err);
    }
  });
};
