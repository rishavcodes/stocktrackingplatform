export const resolveEntryPrice = ({
  isRateRange,
  isCMPChecked,
  rate,
  cmp,
  upperRange,
  lowerRange,
  entryType,
}: {
  isRateRange: "rate" | "range";
  isCMPChecked: boolean;
  rate?: number;
  cmp: number;
  upperRange?: number;
  lowerRange?: number;
  entryType: "buy" | "sell";
}) => {
  if (isRateRange === "rate") {
    if (isCMPChecked) return cmp;
    if (!rate) throw new Error("Rate is required for rate trade");
    return rate;
  }

  // range trade
  if (entryType === "buy") {
    if (!upperRange)
      throw new Error("Upper range required for BUY range trade");
    return upperRange;
  }

  if (!lowerRange) throw new Error("Lower range required for SELL range trade");
  return lowerRange;
};
