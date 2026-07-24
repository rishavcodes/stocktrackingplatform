import IORedis from "ioredis";

export const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  family: 4,

  // IMPORTANT for BullMQ
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
