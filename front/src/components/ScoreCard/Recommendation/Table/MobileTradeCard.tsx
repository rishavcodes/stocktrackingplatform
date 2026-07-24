import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TradeExitConfirmationBox from "./TradeExitConfirmationBox";
import TradeDeleteConfirmationBox from "./TradeDeleteConfirmationBox";
import TradeModifyBox from "./TradeModifyBox";
import { formatTargets, getFinalTarget } from "./targetHelpers";

interface MobileTradeCardProps {
  item: any;
  type?: string;
  isDashboard?: boolean;
  onTradeUpdate: (trade: any) => void;
  calculateTradePnl: (item: any) => number | null | "not_initiated";
  calculatePnlPercentage: (item: any, pnl: number | null | "not_initiated") => number;
  getPlanNames: (planIds: string[]) => string;
  checkMarketStatus: (exchange: string) => "open" | "closed";
  showActions?: boolean;
  onBuySellClick?: (rec: any) => void;
}

export function MobileTradeCard({
  item,
  type,
  isDashboard = false,
  onTradeUpdate,
  calculateTradePnl,
  calculatePnlPercentage,
  getPlanNames,
  checkMarketStatus,
  showActions = true,
  onBuySellClick,
}: MobileTradeCardProps) {
  // Move the function declaration to the top
  const calculateProgressFromEntry = (entry: number, current: number, target: number, stoploss: number) => {
    if (!entry || !current || !target || !stoploss) {
      return { isProfit: false, percentage: 0 };
    }

    if (current >= entry) {
      const totalRangeToTarget = Math.max(target - entry, 0.001);
      const currentProgressToTarget = current - entry;
      const percentageToTarget = Math.min((currentProgressToTarget / totalRangeToTarget) * 100, 100);
      
      return {
        isProfit: true,
        percentage: Math.max(0, percentageToTarget),
      };
    } else {
      const totalRangeToStoploss = Math.max(entry - stoploss, 0.001);
      const currentProgressToStoploss = entry - current;
      const percentageToStoploss = Math.min((currentProgressToStoploss / totalRangeToStoploss) * 100, 100);
      
      return {
        isProfit: false,
        percentage: Math.max(0, percentageToStoploss),
      };
    }
  };

  const entry = Number(item.entryPrice) || Number(item.rate) || 0;
  const target = getFinalTarget(item);
  const stoploss = Number(item.stoploss) || 0;
  const current = type === "open" ? Number(item.ltp) || 0 : Number(item.exitRate) || 0;
  
  const calculatedPnl = calculateTradePnl(item);
  const calculatedPnlPercentage = calculatePnlPercentage(item, calculatedPnl);
  const lotsize = Number(item.lotsize) || 1;

  const progressData = calculateProgressFromEntry(entry, current, target, stoploss);
  const isProfit = progressData.isProfit;

  const getPnLColor = (pnl: number | null | "not_initiated") => {
    if (pnl === "not_initiated") return "text-amber-600 dark:text-amber-400";
    if (pnl === null) return "text-slate-500 dark:text-slate-400";
    if (pnl > 0) return "text-green-600 dark:text-green-400";
    if (pnl < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const renderPnlDisplay = () => {
    // Handle NOT initiated case
    if (calculatedPnl === "not_initiated") {
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800 text-xs">
          NOT initiated
        </Badge>
      );
    }

    // Handle closed trades
    if (item.status === 'closed') {
      return (
        <div className="text-right">
          <div className="flex items-center gap-1">
            <span className="font-bold">₹{(calculatedPnl || 0).toFixed(2)}</span>
            {calculatedPnl && calculatedPnl > 0 ? <TrendingUp className="w-3 h-3" /> : 
             calculatedPnl && calculatedPnl < 0 ? <TrendingDown className="w-3 h-3" /> : null}
          </div>
          <div className="text-xs">{calculatedPnlPercentage.toFixed(2)}%</div>
        </div>
      );
    }

    // Handle open trades
    if (item.status === 'open') {
      if (calculatedPnl === null) {
        return (
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Clock className="w-3 h-3" />
            <span className="text-xs">Market Closed</span>
          </div>
        );
      } else {
        return (
          <div className="text-right">
            <div className="flex items-center gap-1">
              <span className="font-bold">₹{calculatedPnl.toFixed(2)}</span>
              {calculatedPnl > 0 ? <TrendingUp className="w-3 h-3" /> :
               calculatedPnl < 0 ? <TrendingDown className="w-3 h-3" /> : null}
            </div>
            <div className="text-xs">{calculatedPnlPercentage.toFixed(2)}%</div>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {item.scriptname}
            </h3>
            <Badge 
              variant={item.entryType === "buy" ? "default" : "destructive"} 
              className="text-xs px-1.5 py-0 h-5"
            >
              {item.entryType}
            </Badge>
            {item.istriggered === "not triggered" && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800 text-xs">
                Not Triggered
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span>{item.exchange}</span>
            <span>•</span>
            <span>Lot: {lotsize}</span>
            {item.authorData?.name && (
              <>
                <span>•</span>
                <span>by {item.authorData.name}</span>
              </>
            )}
            {item.validity && (
              <>
                <span>•</span>
                <span>Valid: {new Date(item.validity).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>
        <div className={getPnLColor(calculatedPnl)}>
          {renderPnlDisplay()}
        </div>
      </div>

      {/* Price Info */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 font-semibold">SL</div>
          <div>{stoploss}</div>
        </div>
        <div className="text-center">
          <div className="text-blue-600 dark:text-blue-400 font-semibold">Entry</div>
          <div>{entry}</div>
        </div>
        <div className="text-center">
          <div className="text-green-600 dark:text-green-400 font-semibold">Targets</div>
          <div>{formatTargets(item)}</div>
        </div>
      </div>

      {/* Current Price */}
      <div className="text-center mb-2">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {type === "open" ? "Current" : "Exit"}
        </div>
        <div className={`text-sm font-bold ${isProfit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {current}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
        <div className="text-xs text-slate-600 dark:text-slate-400 truncate flex-1 mr-2">
          {getPlanNames(item?.shareWithPlans)}
        </div>
        {showActions && (
          <div className="flex gap-1">
            {/* Only show Exit button for triggered open trades */}
            {item.status === 'open' && item.istriggered === "triggered" && (
              <TradeExitConfirmationBox
                id={item._id}
                name={item.scriptname}
                pnl={item.pnl}
                pnlpercentage={item.pnlpercentage}
                ltp={Number(item.ltp)}
              />
            )}
            <TradeDeleteConfirmationBox
              id={item._id}
              name={item.scriptname}
            />
            {item.status === 'open' && (
              <TradeModifyBox trade={item} onUpdate={onTradeUpdate} />
            )}
          </div>
        )}
        {onBuySellClick && item.status === "open" && (
          <Button
            size="sm"
            onClick={() => onBuySellClick(item)}
            className={`h-7 px-3 text-[11px] font-semibold ${
              (item.entryType || "").toLowerCase() === "sell"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {(item.entryType || "").toLowerCase() === "sell" ? "Sell Now" : "Buy Now"}
          </Button>
        )}
      </div>
    </div>
  );
}