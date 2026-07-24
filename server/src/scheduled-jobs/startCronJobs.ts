import AddStatsToVideos from "./AddStatsToVideos";
import AutoRestart from "./AutoRestart";
import PlanExpiryStatusCheck from "./PlanExpiryStatusCheck";
import FreeTrailExpiryStatusCheck from "./FreeTrailExpiryStatusCheck";
import portfolioReportCron from "./portfolioReportCron";
import { expireCouponsJob } from "./expireCoupons";
// import TelegramJoinCheck from "./TelegramJoinCheck";
import { startGlobalTradeTracker } from "../services/GlobalTradeTracker";
import { startMarketPriceFetcher } from "../services/MarketPriceFetcher";
import { bootstrapRegistry } from "../services/OpenTradeRegistry";
import { startEventReminder } from "./eventReminder";
import { startScriptMasterSync } from "./syncScriptMaster";
import { startServiceProviderStatsCron } from "./updatestats";
import startPnLCron from "./clubScriptsCron";
import startPerformanceCron from "./performanceCron";
import startUpdatePortfolioPricesCron from "./updatePortfolioPricesCron";
import startMandateRenewalCron from "./mandateRenewalCron";
import { startBigulPartnerSessionRefresh } from "./bigulPartnerSessionRefresh";
import { startBigulScriptMasterSync } from "./syncBigulScriptMaster";
import startEndOfSessionSweep from "./endOfSessionSweep";
import { startWalletLowBalanceReminder } from "./walletLowBalanceReminder";
import { startServiceProviderBirthdayReminder } from "./serviceProviderBirthdayReminder";
import { startUserBirthdayReminder } from "./userBirthdayReminder";
import startProfileCompletenessCron from "./profileCompletenessCheck";


export default async function () {
  PlanExpiryStatusCheck();
  AutoRestart();
  AddStatsToVideos();
  FreeTrailExpiryStatusCheck();
  // Generate + email the portfolio factsheet to subscribers on a rolling 15-day cadence
  portfolioReportCron();
  expireCouponsJob();
  startEventReminder();
  startServiceProviderStatsCron();

  // Portfolio P&L daily snapshot (3:35 PM weekdays)
  startPnLCron();

  // Update portfolio script prices in DB (5:00 PM daily)
  startUpdatePortfolioPricesCron();

  // Portfolio monthly performance (last day of month)
  startPerformanceCron();

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

  // Mandate auto-renewal — polls Razorpay for subscription charges
  startMandateRenewalCron();

  // Bigul partner session — logout + login daily to refresh session and vendorAuth in Redis
  startBigulPartnerSessionRefresh();

  // Bigul script master CSV sync — daily at 8:20 AM IST (after Angel One sync at 8:15)
  startBigulScriptMasterSync();

  // Daily reminder to service providers whose wallet balance is below ₹500
  // startWalletLowBalanceReminder();

  // Daily birthday notification to service providers whose DOB matches today
  startServiceProviderBirthdayReminder();

  // Daily birthday notification to customers — one per SP they're subscribed to
  startUserBirthdayReminder();
  // Weekly profile-completeness reminder for users missing PAN/Aadhaar
  // (Monday 10am IST, throttled to one reminder per 7 days per user).
  startProfileCompletenessCron();
}
