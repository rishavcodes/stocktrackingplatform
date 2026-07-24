import cron from "node-cron";
import { sweepExpiredTriggeredTrades } from "../services/GlobalTradeTracker";

/**
 * End-of-session sweep — guaranteed delivery layer.
 *
 * Runs once per session in IST:
 *   - 15:16 IST (Mon-Fri) for equity / F&O (1 minute after 15:15 validity)
 *   - 23:16 IST (Mon-Fri) for MCX           (1 minute after 23:15 validity)
 *
 * The live tracker and the 30s REST cron are the primary delivery paths
 * during market hours; this sweep is the unconditional safety net that
 * closes any triggered trade whose validity has passed and emits its
 * Telegram message.
 *
 * IMPORTANT: node-cron interprets cron expressions in the host's local
 * timezone by default. Production servers typically run UTC, so we MUST
 * pass `timezone: "Asia/Kolkata"` to fire at the actual IST clock times.
 */
const TZ_OPTS = { timezone: "Asia/Kolkata" } as const;

export default function startEndOfSessionSweep() {
  cron.schedule(
    "16 15 * * 1-5",
    () => sweepExpiredTriggeredTrades({ scope: "equity" }),
    TZ_OPTS
  );

  cron.schedule(
    "16 23 * * 1-5",
    () => sweepExpiredTriggeredTrades({ scope: "mcx" }),
    TZ_OPTS
  );

  console.log(
    "End-of-session sweep cron scheduled: equity 15:16 IST, MCX 23:16 IST (Mon-Fri)"
  );
}
