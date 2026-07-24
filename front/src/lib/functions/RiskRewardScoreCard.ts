export function calculateRatio(
  target: number,
  entryPrice: number,
  stoploss: number,
  tradeType: string
) {
  let potentialProfit, potentialLoss;

  if (tradeType === "buy") {
    potentialProfit = target - entryPrice;
    potentialLoss = entryPrice - stoploss;
  } else if (tradeType === "sell") {
    potentialProfit = entryPrice - target;
    potentialLoss = stoploss - entryPrice;
  } else {
    return 'Invalid trade type. Please specify either "buy" or "sell".';
  }

  let ratio = potentialLoss / potentialProfit;

  if (ratio < 1) {
    ratio = 1 / ratio;
    return `1:${ratio.toFixed(1)}`;
  } else {
    return `${ratio.toFixed(1)}:1`;
  }
}

export function calculateRiskRewardInPercentage(
  entryPrice: number,
  target: number,
  stopLoss: number,
  tradeType: string
) {
  if (tradeType === "buy") {
    const riskPercentage = ((entryPrice - stopLoss) / entryPrice) * 100;
    const rewardPercentage = ((target - entryPrice) / entryPrice) * 100;
    return {
      risk: riskPercentage.toFixed(2) + "%",
      reward: rewardPercentage.toFixed(2) + "%",
    };
  } else if (tradeType === "sell") {
    const riskPercentage = ((stopLoss - entryPrice) / entryPrice) * 100;
    const rewardPercentage = ((entryPrice - target) / entryPrice) * 100;
    return {
      risk: riskPercentage.toFixed(2) + "%",
      reward: rewardPercentage.toFixed(2) + "%",
    };
  } else {
    return {
      risk: "",
      reward: "",
    };
  }
}


// export function calculateRiskRewardInNumbers(
//   entryPrice: number,
//   target: number,
//   stopLoss: number,
//   tradeType: string
// ) {
//   if (tradeType === "buy") {
//     const riskAmount = entryPrice - stopLoss * 100;
//     const rewardAmount = target - entryPrice;
//     return {
//       risk: riskAmount.toFixed(2),
//       reward: rewardAmount.toFixed(2),
//     };
//   } else if (tradeType === "sell") {
//     const riskAmount = stopLoss - entryPrice;
//     const rewardAmount = entryPrice - target;
//     return {
//       risk: riskAmount.toFixed(2),
//       reward: rewardAmount.toFixed(2),
//     };
//   } else {
//     return {
//       risk: "0",
//       reward: "0",
//     };
//   }
// }

export function calculateRiskRewardInNumbers(
  entryPrice: number,
  target: number,
  stopLoss: number,
  tradeType: string,
  quantity: number = 1,
  lotSize: number = 1
): { risk: string; reward: string; ratio?: string } {
  // Input validation
  if (entryPrice <= 0 || target <= 0 || stopLoss <= 0 || quantity <= 0 || lotSize <= 0) {
    return { risk: "Invalid", reward: "Invalid" };
  }

  let riskAmount: number, rewardAmount: number;

  if (tradeType === "buy") {
    // For BUY trades:
    // Risk = (Entry Price - Stop Loss) * Lot Size
    // Reward = (Target - Entry Price) * Lot Size
    
    if (stopLoss >= entryPrice || target <= entryPrice) {
      return { risk: "Invalid", reward: "Invalid" };
    }
    
    riskAmount = (entryPrice - stopLoss) * lotSize;
    rewardAmount = (target - entryPrice) * lotSize;
    
  } else if (tradeType === "sell") {
    // For SELL trades:
    // Risk = (Stop Loss - Entry Price) * Lot Size  
    // Reward = (Entry Price - Target) * Lot Size
    
    if (stopLoss <= entryPrice || target >= entryPrice) {
      return { risk: "Invalid", reward: "Invalid" };
    }
    
    riskAmount = (stopLoss - entryPrice) * lotSize;
    rewardAmount = (entryPrice - target) * lotSize;
    
  } else {
    return { risk: "Invalid", reward: "Invalid" };
  }

  // Calculate risk-reward ratio
  let ratio: string | undefined;
  if (riskAmount > 0) {
    const ratioValue = rewardAmount / riskAmount;
    ratio = `${ratioValue.toFixed(2)}:1`;
  } else {
    ratio = "Invalid";
  }

  return {
    risk: riskAmount.toFixed(2),
    reward: rewardAmount.toFixed(2),
    ratio
  };
}

// Additional function specifically for range trades
export function calculateRangeRiskReward(
  upperEnd: number,
  lowerEnd: number,
  target: number,
  stopLoss: number,
  tradeType: string,
  lotSize: number = 1
): { risk: string; reward: string; ratio?: string } {
  // Input validation
  if (upperEnd <= 0 || lowerEnd <= 0 || target <= 0 || stopLoss <= 0 || lotSize <= 0) {
    return { risk: "Invalid", reward: "Invalid" };
  }

  let riskAmount: number, rewardAmount: number;

  if (tradeType === "buy") {
    // For range BUY trades (buying at upper end):
    // Risk = (Upper End - Stop Loss) * Lot Size
    // Reward = (Target - Upper End) * Lot Size
    
    if (stopLoss >= upperEnd || target <= upperEnd) {
      return { risk: "Invalid", reward: "Invalid" };
    }
    
    riskAmount = (upperEnd - stopLoss) * lotSize;
    rewardAmount = (target - upperEnd) * lotSize;
    
  } else if (tradeType === "sell") {
    // For range SELL trades (selling at lower end):
    // Risk = (Stop Loss - Lower End) * Lot Size
    // Reward = (Lower End - Target) * Lot Size
    
    if (stopLoss <= lowerEnd || target >= lowerEnd) {
      return { risk: "Invalid", reward: "Invalid" };
    }
    
    riskAmount = (stopLoss - lowerEnd) * lotSize;
    rewardAmount = (lowerEnd - target) * lotSize;
    
  } else {
    return { risk: "Invalid", reward: "Invalid" };
  }

  // Calculate risk-reward ratio
  let ratio: string | undefined;
  if (riskAmount > 0) {
    const ratioValue = rewardAmount / riskAmount;
    ratio = `${ratioValue.toFixed(2)}:1`;
  } else {
    ratio = "Invalid";
  }

  return {
    risk: riskAmount.toFixed(2),
    reward: rewardAmount.toFixed(2),
    ratio
  };
}

// Unified function that can handle both scenarios
export function calculateRiskReward(
  entryData: {
    entryPrice?: number;
    upperEnd?: number;
    lowerEnd?: number;
  },
  target: number,
  stopLoss: number,
  tradeType: string,
  isRangeTrade: boolean = false,
  lotSize: number = 1
): { risk: string; reward: string; ratio?: string } {
  
  if (isRangeTrade) {
    // Handle range trade
    if (!entryData.upperEnd || !entryData.lowerEnd) {
      return { risk: "Invalid", reward: "Invalid" };
    }
    return calculateRangeRiskReward(
      entryData.upperEnd,
      entryData.lowerEnd,
      target,
      stopLoss,
      tradeType,
      lotSize
    );
  } else {
    // Handle regular CMP/RATE trade
    if (!entryData.entryPrice) {
      return { risk: "Invalid", reward: "Invalid" };
    }
    return calculateRiskRewardInNumbers(
      entryData.entryPrice,
      target,
      stopLoss,
      tradeType,
      1, // quantity is typically 1 for calculation
      lotSize
    );
  }
}