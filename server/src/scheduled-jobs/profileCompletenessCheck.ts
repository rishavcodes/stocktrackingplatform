import cron from "node-cron";
import { UserModel } from "../models/AuthModels";
import { notificationModel } from "../models/NotificationModel";
import { sendNotification } from "../helpers/sendNotification";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Weekly profile-completeness reminder. Sends customers a "Complete Profile"
 * notification when their PAN or Aadhaar is missing, throttled to at most
 * one reminder per 7 days per user — so a user who ignores the notification
 * isn't pinged every cron run.
 *
 * Runs Mondays at 10am IST (4:30 UTC).
 */
export default function startProfileCompletenessCron() {
  cron.schedule(
    "30 4 * * 1",
    async () => {
      try {
        console.log("[CRON] Profile completeness check starting");
        const cutoff = new Date(Date.now() - SEVEN_DAYS_MS);

        const incompleteUsers = await UserModel.find({
          $or: [
            { pannumber: { $in: [null, ""] } },
            { aadhaarLast4: { $in: [null, ""] } },
          ],
        }).select("_id name pannumber aadhaarLast4 notifications");

        let sent = 0;
        for (const user of incompleteUsers) {
          const userId = user._id.toString();

          // Throttle — skip if a profile-incomplete notification for this
          // user already exists within the last 7 days. Looking up by id
          // list (user.notifications) instead of sendTo because the
          // recipient linkage is the user's notifications[] array.
          const notificationIds = (user.notifications || []).map(String);
          if (notificationIds.length) {
            const recent = await notificationModel.findOne({
              _id: { $in: notificationIds },
              type: "profile-incomplete",
              createdAt: { $gte: cutoff },
            });
            if (recent) continue;
          }

          const missing: string[] = [];
          if (!user.pannumber) missing.push("PAN");
          if (!user.aadhaarLast4) missing.push("Aadhaar");

          await sendNotification({
            recipientIds: [userId],
            recipientRole: "user",
            message: `Your profile is missing ${missing.join(" and ")}. Complete it to unlock all features.`,
            type: "profile-incomplete",
            category: "admin",
            sentBy: { id: "admin", name: "Tradebox" },
            postLink: "/dashboard/user/myprofile",
            ctaLabel: "Complete Profile",
            sendToLabel: user.name || "",
          });
          sent++;
        }

        console.log(`[CRON] Profile completeness check done — sent ${sent} reminders`);
      } catch (err) {
        console.error("[CRON] Profile completeness check failed:", err);
      }
    },
    { timezone: "Asia/Kolkata" }
  );
}
