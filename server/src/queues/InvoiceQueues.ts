import { Queue } from "bullmq";
import { connection } from "../config/redisConnection";

export const InvoiceQueueTradeboxPlans = new Queue(
  "invoice-queue-tradeboxplans",
  { connection }
);

export const InvoiceQueueService = new Queue("invoice-queue-service", {
  connection,
});
