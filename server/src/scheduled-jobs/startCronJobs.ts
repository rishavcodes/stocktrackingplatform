import AutoRestart from "./AutoRestart";
import { expireCouponsJob } from "./expireCoupons";
// import TelegramJoinCheck from "./TelegramJoinCheck";
import { startGlobalTradeTracker } from "../services/GlobalTradeTracker";
import { startMarketPriceFetcher } from "../services/MarketPriceFetcher";
import { bootstrapRegistry } from "../services/OpenTradeRegistry";
import { startEventReminder } from "./eventReminder";
import { startScriptMasterSync } from "./syncScriptMaster";
import { startServiceProviderStatsCron } from "./updatestats";
import startEndOfSessionSweep from "./endOfSessionSweep";
import { startServiceProviderBirthdayReminder } from "./serviceProviderBirthdayReminder";
import { startUserBirthdayReminder } from "./userBirthdayReminder";
import startProfileCompletenessCron from "./profileCompletenessCheck";


export default async function () {
  AutoRestart();
  expireCouponsJob();
  startEventReminder();
  startServiceProviderStatsCron();




  // ScriptMaster data sync — fetches Angel JSON daily, populates MongoDB
  startScriptMasterSync();

  // Bootstrap open trade registry from DB → Redis (one-time)
  await bootstrapRegistry();

  // Centralized price ingestion — streams from Angel WebSocket, writes to Redis
  startMarketPriceFetcher();

  // Trade tracking — reads from Redis, processes SL/TP/triggers
  startGlobalTradeTracker();

  // End-of-session sweep — IST cron at 15:16 (equity) and 23:16 (MCX)
  // guarantees a Telegram message for any expired-triggered trade missed by
  // the live tracker.
  startEndOfSessionSweep();

  // TelegramJoinCheck()





  // Daily birthday notification to service providers whose DOB matches today
  startServiceProviderBirthdayReminder();

  // Daily birthday notification to customers — one per SP they're subscribed to
  startUserBirthdayReminder();
  // Weekly profile-completeness reminder for users missing PAN/Aadhaar
  // (Monday 10am IST, throttled to one reminder per 7 days per user).
  startProfileCompletenessCron();
}
