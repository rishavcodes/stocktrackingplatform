export default function buildExitTelegramMessage(params: {
  scriptname: string;
  exitPrice: number;
  pnl: number;
  pnlPercentage: string;
  reason: "tp" | "sl" | "timeout" | string;
  targetIndex?: number;
  totalTargets?: number;
}) {
  let reasonLabel = "";
  let isIntermediate = false;

  if (params.reason === "tp") {
    reasonLabel = "Final Target Hit";
  } else if (params.reason === "sl") {
    reasonLabel = "Stop Loss Hit";
  } else if (params.reason === "timeout") {
    reasonLabel = "Validity Expired";
  } else if (params.reason.startsWith("target")) {
    const total = params.totalTargets || 0;
    isIntermediate = total > 0 && (params.targetIndex || 0) < total;
    if (isIntermediate) {
      reasonLabel = `Target ${params.targetIndex} Achieved, Book Profit or Trail Stop Loss`;
    } else {
      reasonLabel = total > 1
        ? `Target ${params.targetIndex} of ${total} Hit`
        : `Target ${params.targetIndex} Hit`;
    }
  }

  const header = isIntermediate ? "📊 Target Update" : "📉 Trade Update";
  const priceLabel = isIntermediate ? "Target Price" : "Exit Rate";

  const absPct = Math.abs(parseFloat(params.pnlPercentage || "0")).toFixed(2);
  // Sign the return so providers can read a glance whether the trade
  // closed up or down without parsing the Profit/Loss line.
  const returnSign = params.pnl < 0 ? "-" : "+";

  // Suppress the celebratory closer for losses, SL hits, and timeouts —
  // a "Happy Trading 🚀" under a loss reads as tone-deaf.
  const isLoss =
    params.pnl < 0 ||
    params.reason === "sl" ||
    params.reason === "timeout";
  const footer = isLoss ? "" : "\nHappy Trading 🚀";

  return `
${header}

${params.scriptname}
${priceLabel}: ${params.exitPrice}

${params.pnl < 0 ? "Loss" : "Profit"}: ₹${Math.abs(params.pnl).toFixed(2)}
Return: ${returnSign}${absPct}%

Reason: ${reasonLabel}${footer}
`;
}
