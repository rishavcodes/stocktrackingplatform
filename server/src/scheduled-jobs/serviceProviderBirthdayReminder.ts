import cron from "node-cron";

import { ServiceProviderRegModel } from "../models/AuthModels";
import { notificationModel } from "../models/NotificationModel";

// Sends a birthday in-app notification to each verified service provider
// whose DOB month/day matches today (IST). Runs once daily at 09:00 IST.
//
// SP.DOB is a Date but only the month + day matter — we compare in JS rather
// than via Mongo aggregation so the cron stays simple and DST-agnostic. The
// SP count is bounded; full scan is fine.
export const startServiceProviderBirthdayReminder = () => {
  console.log("[CRON] SP birthday reminder registered (runs daily at 09:00 IST)");

  cron.schedule(
    "0 9 * * *",
    async () => {
      console.log("[CRON] SP birthday reminder job started");

      try {
        const today = new Date();
        const todayMonth = today.getMonth();
        const todayDay = today.getDate();

        const providers = await ServiceProviderRegModel.find({
          verified: true,
          DOB: { $ne: null },
        })
          .select("_id RegName name DOB")
          .lean();

        const birthdaySps = providers.filter((sp) => {
          if (!sp.DOB) return false;
          const dob = new Date(sp.DOB);
          if (isNaN(dob.getTime())) return false;
          return dob.getMonth() === todayMonth && dob.getDate() === todayDay;
        });

        console.log(
          `[CRON] Found ${birthdaySps.length} service provider birthday(s) today`
        );

        for (const sp of birthdaySps) {
          try {
            const displayName = sp.RegName || sp.name || "there";
            await new notificationModel({
              message: `🎉 Happy Birthday, ${displayName}! Wishing you a wonderful year ahead from the entire Tradebox team.`,
              sendTo: [{ id: String(sp._id), name: displayName }],
              sentBy: { id: "system", name: "System" },
              type: "birthday",
            }).save();
            console.log(`[CRON] Birthday notification sent to SP ${sp._id}`);
          } catch (err) {
            console.error(
              "[CRON] Failed to send birthday notification:",
              sp._id,
              err
            );
          }
        }

        console.log("[CRON] SP birthday reminder job completed");
      } catch (err) {
        console.error("[CRON] SP birthday reminder job crashed:", err);
      }
    },
    { timezone: "Asia/Kolkata" }
  );
};
