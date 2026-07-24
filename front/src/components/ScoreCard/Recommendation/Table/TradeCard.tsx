import { Clock, Eye, Info, FileText, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "./ProgressBar";
import TradeExitConfirmationBox from "./TradeExitConfirmationBox";
import TradeDeleteConfirmationBox from "./TradeDeleteConfirmationBox";
import TradeModifyBox from "./TradeModifyBox";
import { TradeDetailsModal } from "./TradeDetailsModal";
import { RationalModal } from "./RationalModal";
import * as React from "react";
import { formatTargets } from "./targetHelpers";
import { getEntryDisplay } from "./entryDisplay";

interface TradeCardProps {
  item: any;
  type?: string;
  isDashboard?: boolean;
  onTradeUpdate: (trade: any) => void;
  calculateTradePnl: (item: any) => number | null | "not_initiated";
  calculatePnlPercentage: (item: any, pnl: number | null | "not_initiated") => number;
  getPlanNames: (planIds: string[]) => string;
  checkMarketStatus: (exchange: string) => "open" | "closed";
  showActions?: boolean;
  user?: {
    RegName?: string;
    regNumber?: string;
  };
}

export function TradeCard({
  item,
  type,
  isDashboard = false,
  onTradeUpdate,
  calculateTradePnl,
  calculatePnlPercentage,
  getPlanNames,
  checkMarketStatus,
  showActions = true,
  user
}: TradeCardProps) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isRationalModalOpen, setIsRationalModalOpen] = React.useState(false);
  const calculatedPnl = calculateTradePnl(item);
  const calculatedPnlPercentage = calculatePnlPercentage(item, calculatedPnl);
  const lotsize = Number(item.lotsize) || 1;

  const getPnLColor = (pnl: number | null | "not_initiated") => {
    if (pnl === "not_initiated") return "text-amber-600 dark:text-amber-400";
    if (pnl === null) return "text-slate-500 dark:text-slate-400";
    if (pnl > 0) return "text-green-600 dark:text-green-400";
    if (pnl < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const renderPnlDisplay = () => {
    // Handle NOT initiated case - show badge instead of P&L
    if (calculatedPnl === "not_initiated") {
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800">
          Not Initiated
        </Badge>
      );
    }

    // Handle closed trades
    if (item.status === 'closed') {
      return (
        <div className="flex flex-col items-end">
          <div className={`flex items-center gap-1 ${getPnLColor(calculatedPnl)}`}>
            <span className="font-bold">{(calculatedPnl || 0).toFixed(2)}</span>
          </div>
          {calculatedPnl !== null && (
            <span className={`text-xs ${getPnLColor(calculatedPnl)}`}>
              ({calculatedPnlPercentage > 0 ? "+" : ""}{calculatedPnlPercentage.toFixed(2)}%)
            </span>
          )}
        </div>
      );
    }
    
    // Handle open trades
    if (item.status === 'open') {
      if (calculatedPnl === null) {
        return (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Clock className="w-3 h-3" />
              <span className="text-sm font-medium">Market Closed</span>
            </div>
          </div>
        );
      } else {
        return (
          <div className="flex flex-col items-end">
            <div className={`flex items-center gap-1 ${getPnLColor(calculatedPnl)}`}>
              <span className="font-bold">{calculatedPnl.toFixed(2)}</span>
            </div>
            <span className={`text-xs ${getPnLColor(calculatedPnl)}`}>
              ({calculatedPnlPercentage > 0 ? "+" : ""}{calculatedPnlPercentage.toFixed(2)}%)
            </span>
          </div>
        );
      }
    }
    
    return "--";
  };

  const renderStatusBadge = () => {
    if (item.istriggered === "not triggered") {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800">
          Not Triggered
        </Badge>
      );
    }
    
    if (item.status === 'open') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800">
          Active
        </Badge>
      );
    }
    
    if (item.status === 'closed') {
      const pnl = calculatedPnl as number;
      if (pnl > 0) {
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800">
            Profit
          </Badge>
        );
      } else if (pnl < 0) {
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800">
            Loss
          </Badge>
        );
      } else {
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/20 dark:text-gray-300 dark:border-gray-800">
            Breakeven
          </Badge>
        );
      }
    }
    
    return null;
  };

  // Fixed handler - now matches what RationalModal sends
  const handleRationalGenerated = (pdfData: { 
    pdfUrl: string; 
    // pdfBase64: string; 
    filename: string;
  }) => {
    console.log("PDF generated:", pdfData.filename);
    
    // Use pdfBase64 instead of base64
    const updatedTrade = { 
      ...item, 
      // rationalPDF: `data:application/pdf;base64,${pdfData.pdfBase64}` 
    };
    onTradeUpdate(updatedTrade);
  };

  return (
    <>
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 hover:shadow-lg transition-all duration-300 border border-slate-200 dark:border-slate-700">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {item.scriptname}
              </h3>
              {renderStatusBadge()}
            </div>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className={`font-semibold uppercase ${item.entryType === "buy" ? "text-green-500" : "text-red-500"}`}>
                {item.entryType}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 dark:text-slate-400">
                {item.exchange}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 dark:text-slate-400">
                Lot: {lotsize}
              </span>
              {item.authorData?.name && (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    by {item.authorData.name}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500 mt-1">
              <span>
                {new Date(item.createdAt || item.updatedAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              {item.validity && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <span>
                    Valid till: {new Date(item.validity).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right ml-2 flex-shrink-0">
            {renderPnlDisplay()}
          </div>
        </div>

        {/* Progress Bar - Show for both triggered and non-triggered trades */}
        <ProgressBar item={item} type={type} />

        {/* Trade Info Section */}
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          <div className="text-slate-600 dark:text-slate-400">
            {(() => {
              const e = getEntryDisplay(item);
              return (
                <>
                  <span className="font-medium">Entry:</span> {e.primary}
                  {e.subtitle && (
                    <div className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">
                      {e.subtitle}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          {item.status === 'closed' ? (
            <div className="text-slate-600 dark:text-slate-400">
              <span className="font-medium">Exit:</span> {Number(item.exitRate || 0).toFixed(2)}
            </div>
          ) : (
            <div className="text-slate-600 dark:text-slate-400">
              <span className="font-medium">LTP:</span> {Number(item.ltp || 0).toFixed(2)}
            </div>
          )}
          <div className="text-slate-600 dark:text-slate-400">
            <span className="font-medium">Targets:</span> {formatTargets(item)}
          </div>
          <div className="text-slate-600 dark:text-slate-400">
            <span className="font-medium">SL:</span> {Number(item.stoploss || 0).toFixed(2)}
          </div>
        </div>

        {/* Footer Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 border-t border-slate-200 dark:border-slate-700 gap-2">
          <div className="text-xs text-slate-600 dark:text-slate-400 flex-1 min-w-0">
            <span className="font-medium">Plans: </span>
            {getPlanNames(item?.shareWithPlans) || "None"}
          </div>

          {showActions && (
            <div className="flex gap-1 self-end">
              {/* Info Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(true)}
                className="h-8 w-8 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                title="View Details"
              >
                <Info className="w-4 h-4" />
              </Button>

              {/* Rational PDF Button - Show Download if PDF exists, else Generate */}
              {item.rationalPDF ? (
                <a 
                  href={item.rationalPDF} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="h-8 w-8 flex items-center justify-center text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors"
                  title="Download Rational PDF"
                >
                  <Download className="w-4 h-4" />
                </a>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsRationalModalOpen(true)}
                  className="h-8 w-8 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  title="Generate Rational PDF"
                >
                  <FileText className="w-4 h-4" />
                </Button>
              )}

              {/* Show Exit button only for triggered open trades */}
              {item.status === 'open' && item.istriggered === "triggered" && (
                <TradeExitConfirmationBox
                  id={item._id}
                  name={item.scriptname}
                  pnl={item.pnl}
                  pnlpercentage={item.pnlpercentage}
                  ltp={Number(item.ltp)}
                />
              )}

              {/* Delete Trade Button */}
              <TradeDeleteConfirmationBox
                id={item._id}
                name={item.scriptname}
              />

              {/* Modify Trade Button - Only for open trades */}
              {item.status === 'open' && (
                <TradeModifyBox trade={item} onUpdate={onTradeUpdate} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Trade Details Modal */}
      <TradeDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        trade={item}
        calculateTradePnl={calculateTradePnl}
        calculatePnlPercentage={calculatePnlPercentage}
        getPlanNames={getPlanNames}
        checkMarketStatus={checkMarketStatus}
      />

      {/* Rational PDF Modal */}
      <RationalModal
        isOpen={isRationalModalOpen}
        onClose={() => setIsRationalModalOpen(false)}
        trade={item}
        user={user || {}}
        onRationalGenerated={handleRationalGenerated}
      />
    </>
  );
}