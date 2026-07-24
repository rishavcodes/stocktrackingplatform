/**
 * Coupons store `startDate` / `expiryDate` as the calendar day the
 * provider picked. Mongoose receives "YYYY-MM-DD" from the HTML date
 * input and persists it at UTC midnight — which, displayed in IST, is
 * 05:30 AM of that same date (5.5h later than the moment the SP meant
 * to pick). The redemption check should treat the picked date as the
 * inclusive IST calendar day:
 *   - active from 00:00 IST on startDate
 *   - active through 23:59:59.999 IST on expiryDate
 * Helpers below convert the stored UTC-midnight Date to those IST
 * boundaries by *subtracting* the IST offset (so the boundary lands at
 * 00:00 IST of the picked day) and, for the end edge, adding a full
 * day so the comparison is half-open at the next IST midnight.
 *
 * This is a comparison-side fix — existing rows in the database keep
 * their UTC-midnight values and "just work" without a migration.
 */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function couponActiveStart(startDate: Date): Date {
  // Stored UTC midnight of the picked date represents 05:30 IST of that
  // date; subtract the IST offset to land on 00:00 IST of the same date,
  // which is the actual moment the SP intended the coupon to become live.
  return new Date(startDate.getTime() - IST_OFFSET_MS);
}

export function couponActiveEnd(expiryDate: Date): Date {
  // Mirror of couponActiveStart, plus a full day so the comparison is
  // half-open at the next IST midnight (the entire IST expiry day is
  // inclusive).
  return new Date(expiryDate.getTime() - IST_OFFSET_MS + ONE_DAY_MS);
}

export function isCouponExpired(expiryDate: Date, now: Date = new Date()): boolean {
  return now >= couponActiveEnd(expiryDate);
}

export function isCouponNotYetActive(startDate: Date, now: Date = new Date()): boolean {
  return now < couponActiveStart(startDate);
}
