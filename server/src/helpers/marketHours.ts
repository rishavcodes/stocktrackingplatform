/**
 * IST-aware market-hours utility for the trade tracking system.
 *
 * Trading windows extend to actual market close (not validity time) so that
 * timeout messages fired exactly at validity (15:15 / 23:15 IST) are still
 * inside the gate.
 *
 *   Equity / F&O (everything except MCX): Mon-Fri, 09:15:00 - 15:30:00 IST
 *   MCX:                                  Mon-Fri, 09:00:00 - 23:30:00 IST
 */

const EQUITY_OPEN_MINUTES = 9 * 60 + 15; // 09:15
const EQUITY_CLOSE_MINUTES = 15 * 60 + 30; // 15:30
const MCX_OPEN_MINUTES = 9 * 60; // 09:00
const MCX_CLOSE_MINUTES = 23 * 60 + 30; // 23:30

interface ISTParts {
  weekday: number; // 0 = Sun, 6 = Sat
  minutes: number; // minutes since IST midnight
}

function getISTParts(now: Date = new Date()): ISTParts {
  // Mirror the convention already used in ScoreCardController for IST conversion.
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  return {
    weekday: ist.getDay(),
    minutes: ist.getHours() * 60 + ist.getMinutes(),
  };
}

export function isWithinTradingHours(exchange: string): boolean {
  const { weekday, minutes } = getISTParts();

  if (weekday === 0 || weekday === 6) return false;

  if (exchange === "MCX") {
    return minutes >= MCX_OPEN_MINUTES && minutes <= MCX_CLOSE_MINUTES;
  }

  return (
    minutes >= EQUITY_OPEN_MINUTES && minutes <= EQUITY_CLOSE_MINUTES
  );
}
