import {
  Clock,
  Info,
  PieChart,
  FileText,
  Download,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TradeExitConfirmationBox from "./TradeExitConfirmationBox";
import TradeDeleteConfirmationBox from "./TradeDeleteConfirmationBox";
import TradeModifyBox from "./TradeModifyBox";
import { TradeDetailsModal } from "./TradeDetailsModal";
import { RationalModal } from "./RationalModal";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { formatTargets, getFinalTarget } from "./targetHelpers";
import { getEntryDisplay } from "./entryDisplay";

export type SortKey =
  | "createdAt"
  | "scriptname"
  | "exchange"
  | "entryType"
  | "entryPrice"
  | "stoploss"
  | "cmp"
  | "pnl"
  | "validity";

export type SortState = { key: SortKey; dir: "asc" | "desc" } | null;

interface TradeListProps {
  data: any[];
  type?: string;
  isDashboard?: boolean;
  isMobile: boolean;
  onTradeUpdate: (trade: any) => void;
  calculateTradePnl: (item: any) => number | null | "not_initiated";
  calculatePnlPercentage: (item: any, pnl: number | null | "not_initiated") => number;
  getPlanNames: (planIds: string[]) => string;
  checkMarketStatus: (exchange: string) => "open" | "closed";
  showActions?: boolean;
  onBuySellClick?: (rec: any) => void;
  user?: {
    RegName?: string;
    regNumber?: string;
  };
  sortBy?: SortState;
  onSort?: (key: SortKey) => void;
}

// Pure formatting helpers — hoisted out of the component so they don't get
// recreated on every render and don't trip React.memo prop comparisons.
function getPnLColor(pnl: number | null | "not_initiated") {
  if (pnl === "not_initiated") return "text-amber-600 dark:text-amber-400";
  if (pnl === null) return "text-slate-500 dark:text-slate-400";
  if (pnl > 0) return "text-green-600 dark:text-green-400";
  if (pnl < 0) return "text-red-600 dark:text-red-400";
  return "text-gray-600 dark:text-gray-400";
}

function calculateProgressFromEntry(entry: number, current: number, target: number, stoploss: number) {
  if (!entry || !current || !target || !stoploss) {
    return { isProfit: false, percentage: 0 };
  }
  if (current >= entry) {
    const totalRangeToTarget = Math.max(target - entry, 0.001);
    const currentProgressToTarget = current - entry;
    const percentageToTarget = Math.min((currentProgressToTarget / totalRangeToTarget) * 100, 100);
    return { isProfit: true, percentage: Math.max(0, percentageToTarget) };
  }
  const totalRangeToStoploss = Math.max(entry - stoploss, 0.001);
  const currentProgressToStoploss = entry - current;
  const percentageToStoploss = Math.min((currentProgressToStoploss / totalRangeToStoploss) * 100, 100);
  return { isProfit: false, percentage: Math.max(0, percentageToStoploss) };
}

function renderPnlDisplay(item: any, calculatedPnl: number | null | "not_initiated", calculatedPnlPercentage: number) {
  if (calculatedPnl === "not_initiated") {
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800 text-xs">
        Not Initiated
      </Badge>
    );
  }
  if (item.status === 'closed') {
    return (
      <div className="flex flex-col">
        <span className="text-sm">{`${(calculatedPnl || 0).toFixed(2)}`}</span>
        <span className="text-xs">({calculatedPnlPercentage.toFixed(2)}%)</span>
      </div>
    );
  }
  if (item.status === 'open') {
    if (calculatedPnl === null) {
      return (
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <Clock className="w-3 h-3" />
          <span className="text-xs">Market Closed</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        <span className="text-sm">{`${calculatedPnl.toFixed(2)}`}</span>
        <span className="text-xs">({calculatedPnlPercentage.toFixed(2)}%)</span>
      </div>
    );
  }
  return "--";
}

// Per-row memoized component. Custom equality function compares only the
// fields this row visually depends on; without it the row would re-render
// every 1.5s tick because shapeTrade always allocates a fresh object.
interface TradeRowProps {
  item: any;
  type?: string;
  isMobile: boolean;
  showActions: boolean;
  showTradeColumn: boolean;
  onTradeUpdate: (trade: any) => void;
  onBuySellClick?: (rec: any) => void;
  onViewDetails: (e: React.MouseEvent, trade: any) => void;
  onGenerateRational: (trade: any) => void;
  calculateTradePnl: (item: any) => number | null | "not_initiated";
  calculatePnlPercentage: (item: any, pnl: number | null | "not_initiated") => number;
  getPlanNames: (planIds: string[]) => string;
}

function TradeRowImpl(props: TradeRowProps) {
  const {
    item,
    type,
    isMobile,
    showActions,
    showTradeColumn,
    onTradeUpdate,
    onBuySellClick,
    onViewDetails,
    onGenerateRational,
    calculateTradePnl,
    calculatePnlPercentage,
    getPlanNames,
  } = props;

  const entry = item._entryPriceNum ?? (Number(item.entryPrice) || Number(item.rate) || 0);
  const target = getFinalTarget(item);
  const stoploss = Number(item.stoploss) || 0;
  const current = type === "open" ? Number(item.ltp) || 0 : Number(item.exitRate) || 0;
  const calculatedPnl = calculateTradePnl(item);
  const calculatedPnlPercentage = calculatePnlPercentage(item, calculatedPnl);
  const lotsize = item._lotsize ?? (Number(item.lotsize) || 1);
  const progressData = calculateProgressFromEntry(entry, current, target, stoploss);
  const isProfit = progressData.isProfit;

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
      <td className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {new Date(item.createdAt || item.updatedAt).toLocaleDateString()}
        {!isMobile && (
          <>
            <br />
            <span className="text-[10px]">{new Date(item.createdAt || item.updatedAt).toLocaleTimeString()}</span>
          </>
        )}
      </td>
      <td className="px-2 py-1.5">
        <div className="font-medium text-slate-900 dark:text-white text-sm">
          {item.scriptname}
        </div>
        {isMobile && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {item.exchange} • Lot: {lotsize}
            {item.authorData?.name && (
              <> • by {item.authorData.name}</>
            )}
            {item.istriggered === "not triggered" && (
              <Badge variant="outline" className="ml-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800 text-xs">
                Not Triggered
              </Badge>
            )}
          </div>
        )}
      </td>
      {!isMobile && (
        <>
          <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300 text-sm whitespace-nowrap">
            {item.authorData?.name ?? "--"}
          </td>
          <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300 text-sm">
            {item.exchange}
          </td>
          <td className="px-2 py-1.5">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
              item.entryType === "buy"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            }`}>
              {item.entryType}
            </span>
          </td>
        </>
      )}
      <td className="px-2 py-1.5 font-medium text-slate-900 dark:text-white text-sm whitespace-nowrap">
        {(() => {
          const e = getEntryDisplay(item);
          return (
            <div className="leading-tight">
              <div>{e.primary}</div>
              {e.subtitle && (
                <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                  {e.subtitle}
                </div>
              )}
            </div>
          );
        })()}
      </td>
      <td className="px-2 py-1.5 font-medium text-black dark:text-green-400 text-sm whitespace-nowrap">
        {formatTargets(item)}
      </td>
      <td className="px-2 py-1.5 font-medium text-black dark:text-red-400 text-sm">
        {stoploss.toFixed(2)}
      </td>
      <td className="px-2 py-1.5 font-bold text-sm">
        <span className={isProfit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
          {current.toFixed(2)}
        </span>
      </td>
      <td className="px-2 py-1.5">
        <div className={`font-bold ${getPnLColor(calculatedPnl)}`}>
          {renderPnlDisplay(item, calculatedPnl, calculatedPnlPercentage)}
        </div>
      </td>
      {!isMobile && (
        <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400 text-xs max-w-[100px] truncate">
          {getPlanNames(item?.shareWithPlans)}
        </td>
      )}
      {!isMobile && (
        <td className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {item.validity ? (
            <>
              {new Date(item.validity).toLocaleDateString()}
              <br />
              <span className="text-[10px]">{new Date(item.validity).toLocaleTimeString()}</span>
            </>
          ) : "--"}
        </td>
      )}
      {showActions && (
        <td className="px-2 py-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={(e) => onViewDetails(e, item)}
                className="cursor-pointer"
              >
                <Info className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>

              {item.rationalPDF ? (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <a
                    href={item.rationalPDF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-green-600 dark:text-green-400"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Rational
                  </a>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => onGenerateRational(item)}
                  className="cursor-pointer text-blue-600 dark:text-blue-400"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Rational
                </DropdownMenuItem>
              )}

              {item.status === 'open' && (
                <>
                  <DropdownMenuSeparator />
                  <TradeModifyBox trade={item} onUpdate={onTradeUpdate} isDropdownItem />
                </>
              )}

              {item.status === 'open' && item.istriggered === "triggered" && (
                <TradeExitConfirmationBox
                  id={item._id}
                  name={item.scriptname}
                  pnl={item.pnl}
                  pnlpercentage={item.pnlpercentage}
                  ltp={Number(item.ltp)}
                  isDropdownItem
                />
              )}

              <DropdownMenuSeparator />

              <TradeDeleteConfirmationBox
                id={item._id}
                name={item.scriptname}
                isDropdownItem
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      )}
      {showTradeColumn && (
        <td className="px-2 py-1.5">
          {item.status === "open" && (
            <Button
              size="sm"
              onClick={() => onBuySellClick?.(item)}
              className={`h-7 px-3 text-[11px] font-semibold ${
                (item.entryType || "").toLowerCase() === "sell"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {(item.entryType || "").toLowerCase() === "sell" ? "Sell Now" : "Buy Now"}
            </Button>
          )}
        </td>
      )}
    </tr>
  );
}

// Memo comparator: skip re-render when none of the fields the row reads
// changed. shapeTrade allocates a fresh object every tick — without this
// every visible row re-renders on every 1.5s emit.
const TradeRow = React.memo(TradeRowImpl, (prev, next) => {
  if (prev.isMobile !== next.isMobile) return false;
  if (prev.type !== next.type) return false;
  if (prev.showActions !== next.showActions) return false;
  if (prev.showTradeColumn !== next.showTradeColumn) return false;
  if (prev.onTradeUpdate !== next.onTradeUpdate) return false;
  if (prev.onBuySellClick !== next.onBuySellClick) return false;
  if (prev.onViewDetails !== next.onViewDetails) return false;
  if (prev.onGenerateRational !== next.onGenerateRational) return false;
  if (prev.calculateTradePnl !== next.calculateTradePnl) return false;
  if (prev.calculatePnlPercentage !== next.calculatePnlPercentage) return false;
  if (prev.getPlanNames !== next.getPlanNames) return false;

  const a = prev.item;
  const b = next.item;
  if (a === b) return true;
  return (
    a._id === b._id &&
    a.status === b.status &&
    a.istriggered === b.istriggered &&
    a.ltp === b.ltp &&
    a.exitRate === b.exitRate &&
    a.entryPrice === b.entryPrice &&
    a.stoploss === b.stoploss &&
    a.entryType === b.entryType &&
    a.scriptname === b.scriptname &&
    a.exchange === b.exchange &&
    a.validity === b.validity &&
    a.pnl === b.pnl &&
    a.pnlpercentage === b.pnlpercentage &&
    a._pnlAbs === b._pnlAbs &&
    a._pnlPctAbs === b._pnlPctAbs &&
    a.updatedAt === b.updatedAt &&
    a.rationalPDF === b.rationalPDF
  );
});

export function TradeList({
  data,
  type,
  isDashboard = false,
  isMobile,
  onTradeUpdate,
  calculateTradePnl,
  calculatePnlPercentage,
  getPlanNames,
  checkMarketStatus,
  showActions = true,
  onBuySellClick,
  user,
  sortBy,
  onSort,
}: TradeListProps) {
  const showTradeColumn = !!onBuySellClick && type === "open";

  // Reusable header cell with a sort toggle. Renders a faint dual-chevron when
  // the column isn't the active sort key.
  const SortHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => {
    const isActive = sortBy?.key === sortKey;
    return (
      <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
        <button
          type="button"
          onClick={() => onSort?.(sortKey)}
          disabled={!onSort}
          className="inline-flex items-center gap-1 hover:text-indigo-600 disabled:cursor-default disabled:hover:text-slate-600"
        >
          {label}
          {isActive ? (
            sortBy?.dir === "asc" ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )
          ) : (
            onSort && <ChevronsUpDown className="w-3 h-3 text-slate-400" />
          )}
        </button>
      </th>
    );
  };
  const [selectedTrade, setSelectedTrade] = React.useState<any>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isRationalModalOpen, setIsRationalModalOpen] = React.useState(false);
  const [selectedTradeForRational, setSelectedTradeForRational] = React.useState<any>(null);
  const [triggerPosition, setTriggerPosition] = React.useState({ x: 0, y: 0 });

  const handleViewDetails = React.useCallback((event: React.MouseEvent, trade: any) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTriggerPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    });
    setSelectedTrade(trade);
    setIsModalOpen(true);
  }, []);

  const handleGenerateRational = React.useCallback((trade: any) => {
    setSelectedTradeForRational(trade);
    setIsRationalModalOpen(true);
  }, []);


  const handleRationalGenerated = (pdfData: {
    pdfUrl: string;
    // pdfBase64: string;
    filename: string;
  }) => {
    console.log("PDF generated:", pdfData.filename);

    if (selectedTradeForRational) {
      const updatedTrade = {
        ...selectedTradeForRational,
        // rationalPDF: `data:application/pdf;base64,${pdfData.pdfBase64}`
      };
      onTradeUpdate(updatedTrade);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTrade(null);
  };

  const handleCloseRationalModal = () => {
    setIsRationalModalOpen(false);
    setSelectedTradeForRational(null);
  };

  return (
    <>
      {/* COMPACT TABLE FIX */}
      <div className="overflow-x-auto w-full max-w-full">
        <table className="w-full border-collapse text-sm min-w-[900px]">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
              <SortHeader label="Date" sortKey="createdAt" />
              <SortHeader label="Script" sortKey="scriptname" />
              {!isMobile && (
                <>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Posted By
                  </th>
                  <SortHeader label="Exch" sortKey="exchange" />
                  <SortHeader label="Type" sortKey="entryType" />
                </>
              )}
              <SortHeader label="Entry" sortKey="entryPrice" />
              <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Targets
              </th>
              <SortHeader label="SL" sortKey="stoploss" />
              <SortHeader label={isMobile ? "Curr/Exit" : "CMP"} sortKey="cmp" />
              <SortHeader label="P&L" sortKey="pnl" />
              {!isMobile && (
                <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Plans
                </th>
              )}
              {!isMobile && <SortHeader label="Validity" sortKey="validity" />}
              {showActions && (
                <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Actions
                </th>
              )}
              {showTradeColumn && (
                <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Trade
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
            {data.length > 0 ? (
              data.map((item: any, idx: number) => (
                <TradeRow
                  key={item._id ?? idx}
                  item={item}
                  type={type}
                  isMobile={isMobile}
                  showActions={showActions}
                  showTradeColumn={showTradeColumn}
                  onTradeUpdate={onTradeUpdate}
                  onBuySellClick={onBuySellClick}
                  onViewDetails={handleViewDetails}
                  onGenerateRational={handleGenerateRational}
                  calculateTradePnl={calculateTradePnl}
                  calculatePnlPercentage={calculatePnlPercentage}
                  getPlanNames={getPlanNames}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={(isMobile ? 10 : 12) + (showTradeColumn ? 1 : 0)}
                  className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  <PieChart className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm">No results found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Trade Details Modal */}
      {selectedTrade && (
        <TradeDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          trade={selectedTrade}
          calculateTradePnl={calculateTradePnl}
          calculatePnlPercentage={calculatePnlPercentage}
          getPlanNames={getPlanNames}
          checkMarketStatus={checkMarketStatus}
        />
      )}

      {/* Rational PDF Modal */}
      {selectedTradeForRational && (
        <RationalModal
          isOpen={isRationalModalOpen}
          onClose={handleCloseRationalModal}
          trade={selectedTradeForRational}
          user={user || {}}
          onRationalGenerated={handleRationalGenerated}
        />
      )}
    </>
  );
}
