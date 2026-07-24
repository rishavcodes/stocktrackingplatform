import cron from "node-cron";
import { Portfolio } from "../lib/schema";
import { getCachedPriceBulk } from "../services/PriceCache";

const updateAllPortfolioPrices = async () => {
  try {
    const portfolios = await Portfolio.find();

    for (const portfolio of portfolios) {
      const tokenList = portfolio.scripts.map((s) => ({
        exchange: s.scriptName.exchange,
        token: s.scriptName.token,
      }));
      const priceMap = await getCachedPriceBulk(tokenList);

      let updated = false;
      for (const script of portfolio.scripts) {
        const liveCMP = priceMap.get(script.scriptName.token);
        if (liveCMP != null) {
          script.cmp = liveCMP;
          script.value = liveCMP * script.quantity;
          script.lastUpdated = new Date();
          updated = true;
        }
      }

      if (updated) {
        await portfolio.save();
      }
    }

    console.log("Portfolio script prices updated in DB.");
  } catch (error) {
    console.error("Error updating portfolio prices:", error);
  }
};

export default function startUpdatePortfolioPricesCron() {
  // 09:55 UTC = 15:25 IST — 5 min before NSE/BSE close at 15:30 IST.
  // Runs during market hours so the Redis price cache (10s TTL, populated by
  // AngelWebSocket ticks) is guaranteed to be warm. Outside trading hours
  // the cache is empty and the cron silently writes nothing.
  // Mon–Fri only: markets are closed on weekends.
  cron.schedule("55 9 * * 1-5", () => {
    console.log("Running portfolio price update cron...");
    updateAllPortfolioPrices();
  });
}
