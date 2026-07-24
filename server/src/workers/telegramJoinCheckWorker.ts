// src/workers/telegramJoinCheckWorker.ts
import { Worker } from "bullmq";
import { connection } from "../config/redisConnection";
import { OrderModel } from "../models/TransactionModels";
import { UserModel } from "../models/AuthModels";
// import fetch from "node-fetch";

export function telegramJoinCheckWorker() {
  const worker = new Worker(
    "telegram-join-check-queue",
    async (job) => {
      try {
        const token = process.env.TELEGRAM_BOT as string;

        // get all orders with invite links
       const activeOrders = await OrderModel.find({
         status: "active",
       }).populate("orderdBy");

        for (const order of activeOrders) {
          try {
            const apiUrl = `https://api.telegram.org/bot${token}/getChatMember?chat_id=${order.subscribedToId}&user_id=${order?.orderdBy?.id}`;
            const res = await fetch(apiUrl);
            const data = await res.json();

            if (
              data.ok &&
              ["member", "administrator"].includes(data.result.status)
            ) {
              // user joined → save telegram id
              await UserModel.findByIdAndUpdate(order?.orderdBy?.id, {
                $set: { telegramUserId: data.result.user.id },
              });
            }
          } catch (err) {
            console.error(
              `Join check failed for order ${order._id}`,
              err
            );
          }
        }
      } catch (error) {
        console.log("Error in join check worker", error);
      }
    },
    {
      connection,
      autorun: true,
    }
  );

  return worker;
}
