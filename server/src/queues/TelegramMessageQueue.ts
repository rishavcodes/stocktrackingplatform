import { Queue } from "bullmq";
import { connection } from "../config/redisConnection";

export const telegramQueue = new Queue(`telegram-message-queue`, {
  connection,
});
