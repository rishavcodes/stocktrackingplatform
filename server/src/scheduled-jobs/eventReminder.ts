import cron from "node-cron";
import { differenceInDays } from "date-fns";

import { EventModel, EventRegistrationModel } from "../models/PostModels";
import { UserModel } from "../models/AuthModels";
import { notificationModel } from "../models/NotificationModel";
import { sendNotification } from "../helpers/sendNotification";

/**
 * Normalize date to start of day (avoids timezone bugs)
 */
function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const startEventReminder = () => {
  console.log("[CRON] Event reminder registered");

  // ⏰ TEST TIME — change back later
  cron.schedule("0 10 * * *", async () => {
    console.log("[CRON] Event reminder job started");

    const today = startOfDay(new Date());

    try {
      // ❗ DO NOT filter by schedule in Mongo (it's a string)
      const events = await EventModel.find({});

      for (const event of events) {
        try {
          if (!event.schedule) continue;

          const eventDate = startOfDay(new Date(event.schedule));

          if (isNaN(eventDate.getTime())) continue;

          const daysLeft = differenceInDays(eventDate, today);

          const reminderDays = [7, 3, 1, 0];

          // Skip non-reminder days
          if (!reminderDays.includes(daysLeft)) continue;

          // Prevent duplicate reminders
          if (event.reminderSent?.includes(daysLeft)) continue;

          const reminderMessages: Record<number, string> = {
            7: `Your registered event "${event.title}" is in 7 days on ${eventDate.toDateString()}`,
            3: `Your registered event "${event.title}" is in 3 days on ${eventDate.toDateString()}`,
            1: `Your registered event "${event.title}" is tomorrow!`,
            0: `Your registered event "${event.title}" is today!`,
          };

          const message = reminderMessages[daysLeft];

          /* ================= SEND TO REGISTERED USERS ================= */
          const registrations = await EventRegistrationModel.find({ eventId: event._id }).lean();
          for (const reg of registrations) {
            const user = await UserModel.findById(reg.userId);
            if (!user?.email) continue;


            await sendNotification({
              recipientIds: [user._id.toString()],
              recipientRole: "user",
              message,
              type: "event",
              category: "admin",
              sentBy: { id: "system", name: "Tradebox" },
              postLink: "/dashboard/user/events",
              ctaLabel: "Join Event",
            });
          }

          /* ================= MARK REMINDER SENT ================= */
          await EventModel.findByIdAndUpdate(event._id, {
            $addToSet: { reminderSent: daysLeft },
          });

          console.log(
            `[CRON] Event reminder sent for "${event.title}" (${daysLeft} days left)`
          );
        } catch (err) {
          console.error("[CRON] Event failed:", event._id, err);
        }
      }

      console.log("[CRON] Event reminder job completed");
    } catch (err) {
      console.error("[CRON] Job crashed:", err);
    }
  });
};
