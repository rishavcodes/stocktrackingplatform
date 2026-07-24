import cron from "node-cron";
import { OrderModel } from "../models/TransactionModels";
import { mailQueue } from "../queues/MailQueues";
import { notificationModel } from "../models/NotificationModel";
import { ServiceProviderRegModel, UserModel } from "../models/AuthModels";
import { sendNotification } from "../helpers/sendNotification";
import { removeUserFromChannel } from "../config/telegram";
import { parse, intervalToDuration, compareAsc } from "date-fns";

export default function () {
    cron.schedule("0 */4 * * *", async () => {
        const date = new Date().toLocaleString("en-IN");
        const parsedDateToday = parse(date, "dd/M/yyyy, h:mm:ss a", new Date());

        // Fetch all active free trial orders
        const freeTrials = await OrderModel.find({
            isExpired: false,
            paymentMethod: "Free trial",
        });

        for (const trial of freeTrials) {
            const parsedDatevalidity = parse(
                trial.validity,
                "dd/M/yyyy, h:mm:ss a",
                new Date()
            );

            const daysLeft = intervalToDuration({
                start: new Date(parsedDateToday),
                end: new Date(parsedDatevalidity),
            });

            // Notify about expiry (1 day left)
            if (daysLeft.days === 1 && trial.remainder === 0) {
                await OrderModel.findByIdAndUpdate(trial.id, {
                    $inc: { remainder: 1 },
                });

                const mailOptions = {
                    from: process.env.EMAIL,
                    to: trial.orderdBy?.email,
                    subject: `Free Trial ${trial.serviceName} Expiring Soon`,
                    html: `<p>Your free trial for ${trial.serviceName} is expiring in 1 day.</p> <br /> <br /> Best regards,<br />Trade Box Fintech Solutions`,
                };

                await mailQueue.add(
                    trial.orderdBy?.email!,
                    { mailOptions },
                    { removeOnComplete: true, removeOnFail: true }
                );

                await sendNotification({
                    recipientIds: [trial.orderdBy?.id].filter(Boolean) as string[],
                    recipientRole: "both",
                    message: `Your free trial for ${trial.serviceName} will expire tomorrow. Consider subscribing to continue access.`,
                    type: "plan-expiring",
                    category: "admin",
                    sentBy: { id: "admin", name: "Tradebox" },
                    postLink: "/dashboard/user/subscribedservices",
                    ctaLabel: "Subscribe Now",
                });
            }

            // Handle trial expiry (0 days left)
            // if (daysLeft.days === 0) {
            //     await removeUserFromChannel(trial.subscribedToId, trial?.orderdBy?.id);

            //     const dateDiff = compareAsc(
            //         new Date(parsedDateToday),
            //         new Date(parsedDatevalidity)
            //     );

            //     if (dateDiff === 1) {
            //         await OrderModel.findByIdAndUpdate(trial.id, {
            //             isExpired: true,
            //         });
            //     }
            // }
        }
    });
}
