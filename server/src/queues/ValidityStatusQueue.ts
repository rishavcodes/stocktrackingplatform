import { Queue } from "bullmq";
import { connection } from "../config/redisConnection";

export const validityStatusQueue = new Queue(`ValidityStatusQueue`, {
  connection,
});

export const tradeboxplansValidityStatusQueue = new Queue(
  "TradeboxPlansValidityStatusQueue",
  { connection }
);

// Queue for handling free trial validity status
export const freeTrialValidityStatusQueue = new Queue("FreeTrialValidityStatusQueue", {
  connection,
});