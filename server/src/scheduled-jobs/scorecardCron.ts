import cron from "node-cron";
import { ScoreCardModel } from "../models/ScoreCardModel";
import { fetchCMPInGroup } from "../helpers/ScoreCardData";
import updateScoreCard from "../helpers/updateScoreCard";
import { GroupedByExchange, ScoreCardTypes, dataQueryType } from "../types";
import { isWithinTradingHours } from "../helpers/marketHours";

/**
 * Backup cron job for scorecard tracking.
 * This runs as a fallback in case the WebSocket-based queue tracking fails.
 * Runs every 30 seconds to ensure trades are not missed.
 */
export default function startScorecardCronJob() {
  // Run every 30 seconds for faster backup tracking
  cron.schedule("*/30 * * * * *", async () => {
    try {
      // Fetch all open scorecards
      const scorecardDocs = await ScoreCardModel.find({ status: "open" });

      if (!scorecardDocs.length) {
        return;
      }

      const allOpenScorecards: ScoreCardTypes[] = scorecardDocs.map((doc) =>
        doc.toObject()
      );

      // Filter to trades whose exchange is currently in IST trading hours.
      // Outside the window we silently skip — no REST fetch, no Telegram fires.
      // The end-of-session sweep guarantees any expired-triggered trade still
      // gets a message at validity-time + 1 min.
      const openScorecards = allOpenScorecards.filter((item) =>
        isWithinTradingHours(item.exchange)
      );

      if (openScorecards.length === 0) {
        return;
      }

      // Group by exchange for batch price fetch
      const groupedByExchange: GroupedByExchange = {};
      openScorecards.forEach((item) => {
        const exchange = item.exchange;
        if (!groupedByExchange[exchange]) {
          groupedByExchange[exchange] = [];
        }
        if (!groupedByExchange[exchange].includes(item.token)) {
          groupedByExchange[exchange].push(item.token);
        }
      });

      const formattedData: dataQueryType = {
        mode: "LTP",
        exchangeTokens: groupedByExchange,
      };

      // Fetch current market prices
      const fetchedPrices: { symbolToken: string; ltp: string }[] =
        await fetchCMPInGroup(formattedData);

      if (fetchedPrices.length === 0) {
        console.log("Scorecard cron: No prices fetched");
        return;
      }

      // Get current timestamp as Date object
      const now = new Date();

      // Update scorecards
      await updateScoreCard(openScorecards, fetchedPrices, now);

      console.log(
        `Scorecard cron: Updated ${openScorecards.length} trades at ${now.toISOString()}`
      );
    } catch (error) {
      console.error("Scorecard cron job failed:", error);
    }
  });

  console.log("Scorecard backup cron job started (runs every 30 seconds)");
}
