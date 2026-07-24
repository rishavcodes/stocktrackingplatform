// workers/pnlCron.ts
import cron from "node-cron";
import { Portfolio } from "../lib/schema";
import { PortfolioHistory } from "../models/ScoreCardModel";
import { getCachedPriceBulk } from "../services/PriceCache";

console.log("PnL Cron file loaded");

const calculateAndStorePnL = async () => {
  try {
    const portfolios = await Portfolio.find().lean();

    for (const portfolio of portfolios) {
      let totalValue = 0;
      let totalInvestment = 0;

      // Batch-fetch all script prices from Redis
      const tokenList = portfolio.scripts.map((s) => ({
        exchange: s.scriptName.exchange,
        token: s.scriptName.token,
      }));
      const priceMap = await getCachedPriceBulk(tokenList);

      for (const script of portfolio.scripts) {
        const liveCMP = priceMap.get(script.scriptName.token);
        const cmpToUse = liveCMP ?? script.cmp; // fallback if cache miss
        totalValue += cmpToUse * script.quantity;
        totalInvestment += script.buyRate * script.quantity;
      }

      const pnl = totalValue - totalInvestment;
      console.log(`Portfolio ID: ${portfolio._id}, PnL: ${pnl}`);

      await PortfolioHistory.create({
        portfolioId: portfolio._id,
        totalValue,
        totalInvestment,
        pnl,
      });
    }

    console.log("P&L snapshot stored.");
  } catch (error) {
    console.error("Error calculating P&L:", error);
  }
};

export default function startPnLCron() {
  // Run at 3:35 PM Mon-Fri (right after market close at 3:30 PM)
  // so Redis cache has fresh closing prices
  cron.schedule("35 15 * * 1-5", () => {
    console.log("Running P&L cron job at market close...");
    calculateAndStorePnL();
  });
}
