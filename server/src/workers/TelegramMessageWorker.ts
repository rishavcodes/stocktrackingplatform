import { Worker } from "bullmq";
import { connection } from "../config/redisConnection";
import { sendTelegramMessage } from "../config/telegram";

export function sendTelegramMessageWorker() {
  const telegramWorker = new Worker(
    `telegram-message-queue`,
    async (job) => {
      try {
        const { to, message } = job.data;

        sendTelegramMessage(to, message);

        telegramWorker.pause();
        await new Promise((resolve) => setTimeout(resolve, 200));
        telegramWorker.resume();
      } catch (error) {
        console.log("Error Sending message", error);
      }
    },
    {
      connection,
      autorun: true,
    }
  );
  return telegramWorker;
}
