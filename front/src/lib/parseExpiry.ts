/**
 * Parses broker-style contract expiry strings like "28APR26" or
 * "28APR2026" into a JS Date pinned to that day's end (23:59:59 IST).
 * Mirrors `server/src/utils/parseExpiry.ts` — keep in sync.
 */
const monthMap: Record<string, number> = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

export function parseExpiry(s: string | undefined | null): Date | null {
  if (!s || typeof s !== "string" || s.length < 7) return null;
  const day = parseInt(s.slice(0, 2), 10);
  const monthStr = s.slice(2, 5).toUpperCase();
  const month = monthMap[monthStr];
  let year = parseInt(s.slice(5), 10);
  if (
    !Number.isFinite(day) ||
    month === undefined ||
    !Number.isFinite(year)
  ) {
    return null;
  }
  if (year < 100) year += 2000;
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const d = new Date(`${year}-${mm}-${dd}T23:59:59+05:30`);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns the expiry as a `YYYY-MM-DD` string suitable for the `max`
 * attribute of an `<input type="date">`, or null if the input can't be
 * parsed. Uses the IST date so the cap matches what the user sees.
 */
export function expiryToInputMax(s: string | undefined | null): string | null {
  const d = parseExpiry(s);
  if (!d) return null;
  // Convert UTC instant back to IST calendar date components.
  const ist = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const yyyy = ist.getFullYear();
  const mm = String(ist.getMonth() + 1).padStart(2, "0");
  const dd = String(ist.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
