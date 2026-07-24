import cron from "node-cron";
import { Portfolio } from "../lib/schema";
import { getCachedPriceBulk } from "../services/PriceCache";

// Helper to get current month in YYYY-MM format
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

// Function to record monthly performance for all portfolios
const recordAllPortfoliosPerformance = async () => {
  const portfolios = await Portfolio.find();
  for (const portfolio of portfolios) {
    // Batch-fetch all script prices from Redis
    const tokenList = portfolio.scripts.map((s) => ({
      exchange: s.scriptName.exchange,
      token: s.scriptName.token,
    }));
    const priceMap = await getCachedPriceBulk(tokenList);

    // Calculate total value using live CMP from Redis
    const totalValue = portfolio.scripts.reduce((sum, script) => {
      const liveCMP = priceMap.get(script.scriptName.token);
      const cmpToUse = liveCMP ?? script.cmp;
      return sum + cmpToUse * script.quantity;
    }, 0);

    const month = getCurrentMonth();
    // Check if entry for this month exists
    const entry = portfolio.performanceHistory.find(
      (e: any) => e.month === month
    );
    if (entry) {
      entry.value = totalValue;
    } else {
      portfolio.performanceHistory.push({ month, value: totalValue });
    }
    await portfolio.save();
  }
  console.log(
    `Portfolio performance recorded for all portfolios for month: ${getCurrentMonth()}`
  );
};

export default function startPerformanceCron() {
  // Schedule the cron job to run at 3:30 PM on the last day of every month
  // Runs after P&L cron to ensure Redis cache is still fresh
  cron.schedule("0 30 15 * * *", async () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (now.getDate() === lastDay) {
      await recordAllPortfoliosPerformance();
    }
  });
}
