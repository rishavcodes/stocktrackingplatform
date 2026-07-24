/**
 * MARKET HOURS HELPERS (IST)
 *
 * - NSE / BSE equity: 09:15 - 15:30 IST, weekdays
 * - MCX commodities: 09:00 - 23:30 IST, weekdays
 *
 * The dashboard's 1.5s tick exists to push live LTP/PnL updates to the
 * frontend. Outside both market windows there's no fresh price data —
 * MarketPriceFetcher isn't receiving ticks, so re-emitting the same
 * snapshot every 1.5s is pure waste (bandwidth + render cost on the
 * client). Pubsub events (create/close/manual_exit/delete) still need
 * to fire; only the periodic emit is gated.
 */

const IST_OFFSET_MINUTES = 330; // UTC+05:30

function istNowMinutes(): { dayOfWeek: number; minuteOfDay: number } {
  // Date.UTC + IST offset, in pure JS — independent of the server's TZ.
  const now = new Date();
  const istMs = now.getTime() + (now.getTimezoneOffset() + IST_OFFSET_MINUTES) * 60_000;
  const ist = new Date(istMs);
  return {
    dayOfWeek: ist.getDay(),
    minuteOfDay: ist.getHours() * 60 + ist.getMinutes(),
  };
}

export function isEquityMarketOpen(): boolean {
  const { dayOfWeek, minuteOfDay } = istNowMinutes();
  if (dayOfWeek < 1 || dayOfWeek > 5) return false;
  return minuteOfDay >= 9 * 60 + 15 && minuteOfDay <= 15 * 60 + 30;
}

export function isMcxMarketOpen(): boolean {
  const { dayOfWeek, minuteOfDay } = istNowMinutes();
  if (dayOfWeek < 1 || dayOfWeek > 5) return false;
  return minuteOfDay >= 9 * 60 && minuteOfDay <= 23 * 60 + 30;
}

/**
 * True iff at least one tracked market is currently open. Used by the
 * live dashboard tick to skip pointless emits while every market is
 * shut.
 */
export function isAnyMarketOpen(): boolean {
  return isEquityMarketOpen() || isMcxMarketOpen();
}
