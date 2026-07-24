import { AlertCircle } from "lucide-react";
import { getFinalTarget } from "./targetHelpers";

interface ProgressBarProps {
  item: any;
  type?: string;
}

export function ProgressBar({ item, type }: ProgressBarProps) {
  const entry = Number(item.entryPrice) || Number(item.rate) || 0;
  const target = getFinalTarget(item);
  const stoploss = Number(item.stoploss) || 0;
  const current = type === "open" ? Number(item.ltp) || 0 : Number(item.exitRate) || 0;

  const calculateProgressFromEntry = () => {
    if (!entry || !current || !target || !stoploss || current === 0) {
      return { 
        isProfit: false, 
        percentage: 0, 
        position: 50, // Center position
        isValid: false 
      };
    }

    if (current >= entry) {
      // Moving towards target (right side)
      const totalRangeToTarget = Math.max(target - entry, 0.001);
      const currentProgressToTarget = current - entry;
      const percentageToTarget = Math.min((currentProgressToTarget / totalRangeToTarget) * 100, 100);
      
      // Position from center (50%) to right (95% - keeping within bounds)
      const position = 50 + (percentageToTarget * 0.45);
      
      return {
        isProfit: true,
        percentage: Math.max(0, percentageToTarget),
        position: Math.min(95, position), // Max 95% to stay within bounds
        isValid: true
      };
    } else {
      // Moving towards stoploss (left side)
      const totalRangeToStoploss = Math.max(entry - stoploss, 0.001);
      const currentProgressToStoploss = entry - current;
      const percentageToStoploss = Math.min((currentProgressToStoploss / totalRangeToStoploss) * 100, 100);
      
      // Position from center (50%) to left (5% - keeping within bounds)
      const position = 50 - (percentageToStoploss * 0.45);
      
      return {
        isProfit: false,
        percentage: Math.max(0, percentageToStoploss),
        position: Math.max(5, position), // Min 5% to stay within bounds
        isValid: true
      };
    }
  };

  const progressData = calculateProgressFromEntry();
  const isProfit = progressData.isValid ? progressData.isProfit : false;
  const currentPosition = progressData.isValid ? progressData.position : 50;

  if (!progressData.isValid || current === 0) {
    return (
      <div className="mt-4 mb-3 mx-2">
        <div className="relative">
          {/* Progress Bar Container */}
          <div className="flex items-center gap-1 mb-6">
            {/* Stoploss Side (Left) */}
            <div className="flex-1 h-6 relative bg-slate-200 dark:bg-slate-700 rounded-l-full overflow-hidden border border-slate-300 dark:border-slate-600">
              <div className="absolute left-1 top-1/2 -translate-y-1/2 text-xs font-semibold text-red-900 dark:text-red-400 truncate max-w-[60px]">
                {stoploss || "SL"}
              </div>
            </div>

            {/* Entry Point Marker (Center) */}
            <div className="relative flex flex-col items-center">
              <div className="w-0.5 h-6 bg-blue-900 dark:bg-blue-200 rounded-full shadow-lg" />
            </div>

            {/* Target Side (Right) */}
            <div className="flex-1 h-6 relative bg-slate-200 dark:bg-slate-700 rounded-r-full overflow-hidden border border-slate-300 dark:border-slate-600">
              <div className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-semibold text-green-900 dark:text-green-400 truncate max-w-[60px]">
                {target || "TGT"}
              </div>
            </div>
          </div>

          {/* Labels Row */}
          <div className="flex justify-between items-center px-1">
            {/* Entry Label - Fixed in center below bar */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-6 px-2 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 whitespace-nowrap border border-blue-200 dark:border-blue-700">
              <span className="font-thin">ENTRY:</span> {entry || "N/A"}
            </div>

            {/* Current Price Label - Above bar with pointer */}
            <div 
              className="absolute -top-8 flex flex-col items-center transition-all duration-500 z-10"
              style={{ 
                left: `${currentPosition}%`, 
                transform: 'translateX(-50%)',
                minWidth: '80px'
              }}
            >
              {/* Pointer Arrow pointing DOWN to the bar */}
              <div 
                className="w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent mb-1"
                style={{
                  borderTopColor: progressData.isValid ? (isProfit ? '#16a34a' : '#dc2626') : '#6b7280'
                }}
              />
              {/* Current Price Box */}
              <div 
                className="px-2 py-1 rounded-full text-xs font-bold bg-white dark:bg-slate-800 border shadow-sm whitespace-nowrap min-w-[70px] text-center"
                style={{
                  color: progressData.isValid ? (isProfit ? '#16a34a' : '#dc2626') : '#6b7280',
                  borderColor: progressData.isValid ? (isProfit ? '#16a34a' : '#dc2626') : '#6b7280'
                }}
              >
                <span className="font-thin text-slate-600 dark:text-slate-400">
                  {type === "open" ? "CURR:" : "EXIT:"}
                </span> {current || "N/A"}
              </div>
            </div>
          </div>
          
          {type === "open" && current === 0 && (
            <div className="text-center mt-2">
              <div className="flex items-center justify-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3 h-3" />
                <span>Waiting for price data</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-7 mb-3 mx-2">
      <div className="relative  ">
        {/* Progress Bar Container */}
        <div className="flex items-center gap-1 mb-6">
          {/* Stoploss Side (Left) */}
          <div className="flex-1 h-6 relative bg-slate-200 dark:bg-slate-700 rounded-l-full overflow-hidden border border-slate-300 dark:border-slate-600">
            {!isProfit && (
              <div
                className="absolute top-0 right-0 bottom-0 bg-gradient-to-l from-red-500 to-red-600 transition-all duration-500"
                style={{ width: `${progressData.percentage}%` }}
              />
            )}
            <div className="absolute left-1 top-1/2 -translate-y-1/2 text-xs font-semibold text-red-900 dark:text-red-400 truncate max-w-[60px]">
              {stoploss}
            </div>
          </div>

          {/* Entry Point Marker (Center) */}
          <div className="relative flex flex-col items-center">
            <div className="w-0.5 h-6 bg-blue-900 dark:bg-blue-200 rounded-full shadow-lg" />
          </div>

          {/* Target Side (Right) */}
          <div className="flex-1 h-6 relative bg-slate-200 dark:bg-slate-700 rounded-r-full overflow-hidden border border-slate-300 dark:border-slate-600">
            {isProfit && (
              <div
                className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                style={{ width: `${progressData.percentage}%` }}
              />
            )}
            <div className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-semibold text-green-900 dark:text-green-400 truncate max-w-[60px]">
              {target}
            </div>
          </div>
        </div>

        {/* Labels Row */}
        <div className="flex justify-between items-center px-1">
          {/* Entry Label - Fixed in center below bar */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 px-2 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 whitespace-nowrap border border-blue-200 dark:border-blue-700">
            <span className="font-thin">ENTRY:</span> {entry}
          </div>

          {/* Current Price Label - Above bar with pointer */}
          <div 
            className="absolute -top-8 flex flex-col items-center transition-all duration-500 z-10"
            style={{ 
              left: `${currentPosition}%`, 
              transform: 'translateX(-50%)',
              minWidth: '80px'
            }}
          >
            {/* Pointer Arrow pointing DOWN to the bar */}
            <div 
              className="w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent mb-1"
              style={{
                borderTopColor: isProfit ? '#16a34a' : '#dc2626'
              }}
            />
            {/* Current Price Box */}
            <div 
              className="px-2 py-1 rounded-full text-xs font-bold bg-white dark:bg-slate-800 border shadow-sm whitespace-nowrap min-w-[70px] text-center"
              style={{
                color: isProfit ? '#16a34a' : '#dc2626',
                borderColor: isProfit ? '#16a34a' : '#dc2626'
              }}
            >
              <span className="font-thin text-slate-600 dark:text-slate-400">
                {type === "open" ? "CURR:" : "EXIT:"}
              </span> {current}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}