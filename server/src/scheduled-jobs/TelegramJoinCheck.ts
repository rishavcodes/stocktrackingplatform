// import cron from "node-cron";
// import { telegramJoinCheckQueue } from "../queues/telegramJoinCheckQueue";

// export default function () {
//   // Run every 2 minutes
//   cron.schedule("*/2 * * * *", async () => {
//     try {
//       await telegramJoinCheckQueue.add("check-joins", {
//         removeOnComplete: true,
//         removeOnFail: true,
//       });
//     } catch (error) {
//       console.error("Failed to add join-check job:", error);
//     }
//   });
// }
