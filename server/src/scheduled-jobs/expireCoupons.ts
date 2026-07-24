import cron from "node-cron";
import { CouponModel } from "../models/PostModels";

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const expireCouponsJob = () => {
  // Runs every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    try {
      // expiryDate is stored at UTC-midnight of the IST calendar day
      // the provider picked. The coupon stays valid through the end of
      // that IST day, so we only deactivate after the next IST midnight
      // has passed. Equivalent to the apply-time check in
      // utils/couponDateRange.ts.
      const cutoff = new Date(Date.now() - IST_OFFSET_MS - ONE_DAY_MS);

      const result = await CouponModel.updateMany(
        {
          expiryDate: { $lte: cutoff },
          isActive: true,
        },
        {
          $set: { isActive: false },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`⏰ Expired ${result.modifiedCount} coupons`);
      }
    } catch (err) {
      console.error("Coupon cron error:", err);
    }
  });
};
