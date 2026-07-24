// utils/otpRateLimiter.ts
type AttemptRecord = {
  attempts: number;
  lastAttempt: number;
  lockUntil: number;
};

const otpRateLimitStore: Record<string, AttemptRecord> = {};

export default otpRateLimitStore;
