import cron from "node-cron";

import { UserModel } from "../models/AuthModels";
import { OrderModel } from "../models/TransactionModels";
import { notificationModel } from "../models/NotificationModel";

// Sends a birthday in-app notification to each customer from every SP they
// are subscribed to (one notification per SP). Runs once daily at 09:00 IST.
//
// User.dob is a string (free-form historically) — try ISO first, then a
// DD/MM/YYYY fallback. If both fail, skip the user rather than guess.
//
// "Subscribed SP" is derived from OrderModel: any user whose orders include
// soldBy.id is considered a customer of that SP. We dedupe on soldBy.id so
// a user with multiple orders from the same SP only gets one wish from them.
export const startUserBirthdayReminder = () => {
  console.log("[CRON] User birthday reminder registered (runs daily at 09:00 IST)");

  cron.schedule(
    "0 9 * * *",
    async () => {
      console.log("[CRON] User birthday reminder job started");

      try {
        const today = new Date();
        const todayMonth = today.getMonth();
        const todayDay = today.getDate();

        const users = await UserModel.find({
          dob: { $exists: true, $ne: "" },
        })
          .select("_id name email dob")
          .lean();

        const birthdayUsers = users.filter((u) => {
          const parsed = parseDob(u.dob);
          if (!parsed) return false;
          return parsed.month === todayMonth && parsed.day === todayDay;
        });

        console.log(
          `[CRON] Found ${birthdayUsers.length} user birthday(s) today`
        );

        for (const user of birthdayUsers) {
          try {
            // Distinct SPs this user has bought from.
            const sps = await OrderModel.aggregate([
              { $match: { "orderdBy.id": String(user._id) } },
              {
                $group: {
                  _id: "$soldBy.id",
                  name: { $first: "$soldBy.name" },
                },
              },
            ]);

            if (sps.length === 0) {
              console.log(
                `[CRON] User ${user._id} has birthday but no SP subscriptions — skipping`
              );
              continue;
            }

            const userName = user.name || "there";
            for (const sp of sps) {
              if (!sp._id) continue;
              await new notificationModel({
                message: `🎂 Happy Birthday, ${userName}! Wishing you a great year ahead — from ${sp.name || "your service provider"}.`,
                sendTo: [{ id: String(user._id), name: userName }],
                sentBy: { id: String(sp._id), name: sp.name || "Service Provider" },
                type: "birthday",
              }).save();
            }
            console.log(
              `[CRON] Birthday wishes sent to user ${user._id} from ${sps.length} SP(s)`
            );
          } catch (err) {
            console.error(
              "[CRON] Failed to send birthday notifications for user:",
              user._id,
              err
            );
          }
        }

        console.log("[CRON] User birthday reminder job completed");
      } catch (err) {
        console.error("[CRON] User birthday reminder job crashed:", err);
      }
    },
    { timezone: "Asia/Kolkata" }
  );
};

// Returns {month, day} (0-indexed month) for a free-form dob string, or null
// if it cannot be parsed. Tries native Date first (handles ISO and similar),
// then a DD/MM/YYYY fallback (handles "17/05/1990", "17-05-1990").
function parseDob(dob: unknown): { month: number; day: number } | null {
  if (typeof dob !== "string" || !dob.trim()) return null;

  const native = new Date(dob);
  if (!isNaN(native.getTime())) {
    return { month: native.getMonth(), day: native.getDate() };
  }

  const m = dob.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.]\d{2,4}$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return { month, day };
    }
  }
  return null;
}
