import { Queue } from "bullmq";
import { connection } from "../config/redisConnection";

export const mailQueue = new Queue(`mail-queue`, {
  connection,
});
