"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import * as React from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PieChart, TrendingUp, TrendingDown, Grid3X3, List, Calendar, Download, Filter, Clock, Loader2 } from "lucide-react";
import TradeExitConfirmationBox from "./TradeExitConfirmationBox";
import TradeDeleteConfirmationBox from "./TradeDeleteConfirmationBox";
import TradeModifyBox from "./TradeModifyBox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// Import extracted components
import { TableHeader } from "./TableHeader";
import { ProgressBar } from "./ProgressBar";
import { TradeCard } from "./TradeCard";
import { TradeList, type SortKey, type SortState } from "./TradeList";
import { MobileTradeCard } from "./MobileTradeCard";
import { RecommendationCardMini } from "@/components/Marketplace/RecommendationCardMini";
import { getMcxPnlMultiplier } from "@/lib/mcxLotMultipliers";

interface DataTableProps<TData, TValue> {
  data: TData[];
  type?: string;
  isDashboard?: boolean;
  totalOpenTrades?: number;
  filterInput?: boolean;
  showActions?: boolean;
  onBuySellClick?: (rec: any) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  // True until the first scorecard payload lands. While true AND the
  // table is empty, render a skeleton instead of the "No recommendations
  // found" empty state — otherwise users see the empty state for the
  // ~500ms-2s cold-start window and assume the page is broken.
  initializing?: boolean;
  // Which view to render on first mount. SP-side dashboards default to
  // "list" (dense, more columns), customer-facing surfaces default to
  // "cards" (warmer, easier to scan on mobile). User can still toggle.
  defaultViewMode?: "cards" | "list";
}

// Define common interface for trade calculation functions
interface TradeCalculationProps {
  calculateTradePnl: (item: any) => number | null | "not_initiated";
  calculatePnlPercentage: (item: any, pnl: number | null | "not_initiated") => number;
  getPlanNames: (planIds: string[]) => string;
  checkMarketStatus: (exchange: string) => "open" | "closed";
}

// Hoisted out of the component — pure function, no closure deps. Was being
// recreated on every render before, which would invalidate `React.memo` on
// every row when passed down as a prop.
function checkMarketStatus(exchange: string): "open" | "closed" {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;

  // NSE/BSE: 9:15 AM to 3:30 PM IST
  const equityMarketOpen = 9 * 60 + 15;
  const equityMarketClose = 15 * 60 + 30;

  // MCX: 9:00 AM to 11:30 PM IST
  const mcxMarketOpen = 9 * 60 + 0;
  const mcxMarketClose = 23 * 60 + 30;

  const dayOfWeek = now.getDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  if (!isWeekday) return "closed";

  if (exchange?.toLowerCase().includes('mcx')) {
    return currentTime >= mcxMarketOpen && currentTime <= mcxMarketClose ? "open" : "closed";
  }
  return currentTime >= equityMarketOpen && currentTime <= equityMarketClose ? "open" : "closed";
}

export function MyRecommendationTable<TData, TValue>({
  data,
  type,
  isDashboard = false,
  totalOpenTrades,
  filterInput = true,
  showActions = true,
  onBuySellClick,
  onLoadMore,
  hasMore,
  loadingMore,
  initializing = false,
  defaultViewMode = "list",
}: DataTableProps<TData, TValue>) {
  const session = useSession();
  // Note: live data comes from the parent via the `data` prop (driven by
  // socket). Past versions kept a local `tableData` mirror for optimistic
  // updates after modify/exit — but the table renders from `data` directly,
  // so the mirror was never read. Removed to drop a stale-state hazard.
  const [services, setServices] = React.useState<any[]>([]);
  // Lazy id→title cache. Filled by the sweep effect below for plan IDs
  // that aren't in `services` (e.g. unapproved plans the bulk fetch hides,
  // or cross-RA shares). Keeps the Plans column readable even when the
  // bulk fetch returns nothing useful.
  const [planTitleCache, setPlanTitleCache] = React.useState<Record<string, string>>({});
  const [selectedPlan, setSelectedPlan] = React.useState<string>("all");
  const [viewMode, setViewMode] = React.useState<"cards" | "list">(defaultViewMode);
  const [dateFilter, setDateFilter] = React.useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });
  const [showFilters, setShowFilters] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [marketStatus, setMarketStatus] = React.useState<"open" | "closed">("open");
  const [sortBy, setSortBy] = React.useState<SortState>(null);

  const handleSort = React.useCallback((key: SortKey) => {
    setSortBy((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  }, []);

  // Infinite-scroll sentinel — observed at the bottom of the list/cards.
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!onLoadMore || !hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "200px 0px" }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [onLoadMore, hasMore, loadingMore]);

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/allservices/sharewith?id=${session.data?.user?.id}`
        );
        const result = await response.json();
        if (result.success) {
          const sorted = (result.data ?? [])
            .slice()
            .sort((a: any, b: any) =>
              (a.title ?? "").localeCompare(b.title ?? "", undefined, {
                sensitivity: "base",
              })
            );
          setServices(sorted);
        }
      } catch (error) {
        console.error("Error fetching services:", error);
      }
    };

    if (session.data?.user?.id) fetchServices();
  }, [session.data?.user?.id]);

  // Function to calculate P&L for both open and closed trades with market status check.
  // Fast path: useScoreCardData.shapeTrade stamps `_pnlAbs` once per emit —
  // we just read it. Slow path (homepage / other consumers without the
  // precompute) recomputes inline. useCallback so the row memo holds.
  const calculateTradePnl = React.useCallback((item: any): number | null | "not_initiated" => {
    if (item.istriggered === "not triggered") return "not_initiated";

    if (item._pnlAbs !== undefined) {
      // Open trades with no LTP yet stash null — preserve that signal.
      return item._pnlAbs === null && item.status === "open" ? null : (item._pnlAbs ?? 0);
    }

    const mcxMultiplier = getMcxPnlMultiplier(item.exchange, item.scriptname);

    if (item.status === 'closed' && item.exitRate && item.entryPrice) {
      const lotsize = item.lotsize === "" ? 1 : Number(item.lotsize) || 1;
      const effectiveQty = lotsize * mcxMultiplier;
      const entryPrice = Number(item.entryPrice) || Number(item.rate) || 0;
      const exitRate = Number(item.exitRate) || 0;

      if (item.entryType === 'buy') return (exitRate - entryPrice) * effectiveQty;
      if (item.entryType === 'sell') return (entryPrice - exitRate) * effectiveQty;
    }

    if (item.status === 'open') {
      const lotsize = item.lotsize === "" ? 1 : Number(item.lotsize) || 1;
      const effectiveQty = lotsize * mcxMultiplier;
      const entryPrice = Number(item.entryPrice) || Number(item.rate) || 0;
      const currentPrice = Number(item.ltp) || 0;
      if (currentPrice > 0) {
        if (item.entryType === 'buy') return (currentPrice - entryPrice) * effectiveQty;
        if (item.entryType === 'sell') return (entryPrice - currentPrice) * effectiveQty;
      } else {
        return null;
      }
    }

    return item.pnl || 0;
  }, []);

  // Function to calculate P&L percentage
  const calculatePnlPercentage = React.useCallback((item: any, calculatedPnl: number | null | "not_initiated"): number => {
    if (calculatedPnl === "not_initiated") return 0;
    if (calculatedPnl === null) return 0;

    // Fast path: precomputed by shapeTrade.
    if (item._pnlPctAbs !== undefined && item._pnlPctAbs !== null) {
      return item._pnlPctAbs;
    }

    const entryPrice = Number(item.entryPrice) || Number(item.rate) || 0;
    const lotsize = item.lotsize === "" ? 1 : Number(item.lotsize) || 1;
    const mcxMultiplier = getMcxPnlMultiplier(item.exchange, item.scriptname);
    const effectiveQty = lotsize * mcxMultiplier;

    if (entryPrice > 0 && effectiveQty > 0) {
      const totalInvestment = entryPrice * effectiveQty;
      return totalInvestment > 0 ? (calculatedPnl / totalInvestment) * 100 : 0;
    }

    return item.pnlpercentage || 0;
  }, []);

  // Function to map plan IDs to plan names. Two sources: the bulk `services`
  // fetch and the lazy id→title cache filled per-rec by the sweep effect
  // below. String-coerces both sides so an ObjectId/string mismatch doesn't
  // silently miss every plan.
  const getPlanNames = React.useCallback((planIds: string[]) => {
    if (!planIds || planIds.length === 0) return "None";

    const planNames = planIds.map(planId => {
      const needle = String(planId);
      const service = services.find(s => String(s._id) === needle);
      if (service) return service.title;
      if (planTitleCache[needle]) return planTitleCache[needle];
      return needle;
    });

    return planNames.join(", ");
  }, [services, planTitleCache]);

  // Same id→title resolution as getPlanNames(), but as a Map for the card view.
  // RecommendationCardMini renders its plan chips only when handed a
  // `planNamesById` map — without it the chips silently disappear. Reuses the
  // bulk `services` fetch plus the lazily-filled planTitleCache so the card and
  // list views resolve plan names identically.
  const planNamesById = React.useMemo(() => {
    const m = new Map<string, string>();
    services.forEach((s: any) => {
      if (s?._id) m.set(String(s._id), s.title);
    });
    Object.entries(planTitleCache).forEach(([id, title]) => m.set(id, title));
    return m;
  }, [services, planTitleCache]);

  // Sweep visible recommendations and lazily fill `planTitleCache` for any
  // referenced plan ID we can't resolve from `services`. The per-rec endpoint
  // /api/scorecard/getsharedwithplans has no approvalStatus filter, so it
  // resolves plans the bulk endpoint hides (drafts, rejected, etc.).
  const sweptRecIds = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (!Array.isArray(data) || data.length === 0) return;

    const resolved = new Set([
      ...services.map((s) => String(s._id)),
      ...Object.keys(planTitleCache),
    ]);

    const recsToFetch = (data as any[]).filter((rec) => {
      if (!rec?._id || sweptRecIds.current.has(String(rec._id))) return false;
      const planIds: string[] = rec?.shareWithPlans || [];
      if (planIds.length === 0) return false;
      return planIds.some((pid) => !resolved.has(String(pid)));
    });

    if (recsToFetch.length === 0) return;

    let cancelled = false;
    (async () => {
      const updates: Record<string, string> = {};
      await Promise.all(
        recsToFetch.map(async (rec: any) => {
          sweptRecIds.current.add(String(rec._id));
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scorecard/getsharedwithplans?id=${rec._id}`,
            );
            const json = await res.json();
            if (!json?.success || !Array.isArray(json.data)) return;
            const planIds: string[] = rec?.shareWithPlans || [];
            json.data.forEach((p: any, i: number) => {
              const id = p?._id ? String(p._id) : planIds[i];
              if (id && p?.title) updates[id] = p.title;
            });
          } catch {
            /* swallow — table stays usable on network blips */
          }
        }),
      );
      if (!cancelled && Object.keys(updates).length > 0) {
        setPlanTitleCache((prev) => ({ ...prev, ...updates }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data, services, planTitleCache]);

  const exportToExcel = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString().replace(/\//g, "-");
    const timeStr = now.toLocaleTimeString().replace(/:/g, "-");

    const formattedData = filteredData.map((item: any) => {
      const calculatedPnl = calculateTradePnl(item);
      const calculatedPnlPercentage = calculatePnlPercentage(item, calculatedPnl);
      const lotsize = Number(item.lotsize) || 1;

      let pnlDisplay = "";
      let pnlPercentageDisplay = "";

      if (calculatedPnl === "not_initiated") {
        pnlDisplay = "NOT initiated";
        pnlPercentageDisplay = "--";
      } else if (calculatedPnl === null) {
        pnlDisplay = "Market Closed";
        pnlPercentageDisplay = "--";
      } else {
        pnlDisplay = `${calculatedPnl.toFixed(2)}`;
        pnlPercentageDisplay = `${calculatedPnlPercentage.toFixed(2)}%`;
      }

      return {
        Status: item.status ?? "--",
        "Trigger Status": item.istriggered ?? "--",
        "Start Date": new Date(item.createdAt).toLocaleString("en-IN") ?? "--",
        Exchange: item.exchange ?? "--",
        Scriptname: item.scriptname ?? "--",
        "Posted By": item.authorData?.name ?? "--",
        "Entry Type": item.entryType ?? "--",
        "Entry Price": item.entryPrice ?? item.rate ?? "--",
        "Exit Price": item.exitRate ?? "--",
        Target: item.targets?.length > 0
          ? item.targets.map((t: any, i: number) => `T${i + 1}: ${t.price}`).join(", ")
          : item.target ?? "--",
        Stoploss: item.stoploss ?? "--",
        Validity: item.validity
          ? new Date(item.validity).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--",
        "Risk Reward Ratio": item.riskRewardRatio ?? "--",
        "Lot Size": lotsize,
        "P&L": pnlDisplay,
        "P&L %": pnlPercentageDisplay,
        "Modified on": new Date(item.updatedAt).toLocaleString("en-IN") ?? "--",
        "Holding time": item.holdingPeriod ?? "--",
        "Shared with Plans": getPlanNames(item?.shareWithPlans),
        "Rational": item.rational ?? "--",
        "Link": item.link,
        "PDF/Chart": item.recommendationPDF ? item.recommendationPDF : "--",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Recommendations");

    XLSX.writeFile(
      workbook,
      `ScoreCard_${session.data?.user?.RegName}_${type}_${dateStr}_${timeStr}.xlsx`
    );
  };

  // Filter and sort data by latest first with date filtering
  const filteredData = React.useMemo(() => {
    let result = data;
    
    if (selectedPlan !== "all") {
      result = result.filter((item: any) => item.shareWithPlans?.includes(selectedPlan));
    }
    
    if (dateFilter.from) {
      // Anchor to LOCAL midnight. `new Date("YYYY-MM-DD")` parses as UTC
      // midnight, which excludes early-IST-morning trades on the From day.
      const fromDate = new Date(`${dateFilter.from}T00:00:00`);
      result = result.filter((item: any) => {
        const itemDate = new Date(item.createdAt || item.updatedAt);
        return itemDate >= fromDate;
      });
    }

    if (dateFilter.to) {
      const toDate = new Date(`${dateFilter.to}T00:00:00`);
      toDate.setHours(23, 59, 59, 999); // end of day, local TZ
      result = result.filter((item: any) => {
        const itemDate = new Date(item.createdAt || item.updatedAt);
        return itemDate <= toDate;
      });
    }
    
    if (sortBy) {
      const readSortValue = (item: any, key: SortKey): number | string => {
        switch (key) {
          case "createdAt":
            return new Date(item.createdAt || item.updatedAt || 0).getTime();
          case "validity":
            return new Date(item.validity || 0).getTime();
          case "scriptname":
            return (item.scriptname ?? "").toString().toLowerCase();
          case "exchange":
            return (item.exchange ?? "").toString().toLowerCase();
          case "entryType":
            return (item.entryType ?? "").toString().toLowerCase();
          case "entryPrice":
            return Number(item.entryPrice ?? item.rate ?? 0);
          case "stoploss":
            return Number(item.stoploss ?? 0);
          case "cmp":
            return Number(
              (type === "open" ? item.ltp : item.exitRate) ?? 0,
            );
          case "pnl": {
            const v = calculateTradePnl(item);
            if (typeof v === "number") return v;
            return -Infinity; // "not_initiated" / null sink to bottom in asc
          }
          default:
            return 0;
        }
      };
      result = [...result].sort((a: any, b: any) => {
        const va = readSortValue(a, sortBy.key);
        const vb = readSortValue(b, sortBy.key);
        if (va === vb) return 0;
        const cmp = va > vb ? 1 : -1;
        return sortBy.dir === "asc" ? cmp : -cmp;
      });
      return result;
    }

    return result.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0);
      const dateB = new Date(b.createdAt || b.updatedAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [data, selectedPlan, dateFilter, sortBy, type]);

  // Clear date filters
  const clearDateFilters = () => {
    setDateFilter({ from: "", to: "" });
  };

  // No-op: live `data` already streams in via socket, so the next 1.5s tick
  // re-renders with the modified trade. Kept as a stable callback because
  // children (TradeModifyBox, etc.) call it; useCallback keeps the row memo
  // intact across renders.
  const handleTradeUpdate = React.useCallback((_updatedTrade: any) => {}, []);

  const renderContent = () => {
    if (viewMode === "cards") {
      // Subscriber surfaces (user dashboard) use the marketplace card on every
      // breakpoint — it already collapses to one column on mobile and reads
      // far better than the older MobileTradeCard. RA dashboards still need
      // the action-bearing TradeCard / MobileTradeCard pair because those
      // expose edit / close / modify controls.
      if (showActions === false) {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
            {filteredData.map((item: any, idx: number) => (
              <RecommendationCardMini
                key={item._id ?? idx}
                recommendation={item}
                index={idx}
                subscribedServiceIds={new Set(item.shareWithPlans ?? [])}
                onBuySellClick={onBuySellClick}
                planNamesById={planNamesById}
              />
            ))}
          </div>
        );
      }

      return isMobile ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredData.map((item: any, idx: number) => (
            <MobileTradeCard
              key={item._id ?? idx}
              item={item}
              type={type}
              isDashboard={isDashboard}
              onTradeUpdate={handleTradeUpdate}
              calculateTradePnl={calculateTradePnl}
              calculatePnlPercentage={calculatePnlPercentage}
              getPlanNames={getPlanNames}
              checkMarketStatus={checkMarketStatus}
              showActions={showActions}
              onBuySellClick={onBuySellClick}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
          {filteredData.map((item: any, idx: number) => (
            <TradeCard
              key={item._id ?? idx}
              item={item}
              type={type}
              isDashboard={isDashboard}
              onTradeUpdate={handleTradeUpdate}
              calculateTradePnl={calculateTradePnl}
              calculatePnlPercentage={calculatePnlPercentage}
              getPlanNames={getPlanNames}
              checkMarketStatus={checkMarketStatus}
              showActions={showActions}
            />
          ))}
        </div>
      );
    } else {
      return (
        <TradeList
          data={filteredData}
          type={type}
          isDashboard={isDashboard}
          isMobile={isMobile}
          onTradeUpdate={handleTradeUpdate}
          calculateTradePnl={calculateTradePnl}
          calculatePnlPercentage={calculatePnlPercentage}
          getPlanNames={getPlanNames}
          checkMarketStatus={checkMarketStatus}
          showActions={showActions}
          onBuySellClick={onBuySellClick}
          sortBy={sortBy}
          onSort={handleSort}
        />
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Market Status Banner - Only show for open trades */}
      {type === "open" && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Market Hours Information
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                <strong>NSE/BSE:</strong> 9:15 AM - 3:30 PM (Mon-Fri) • 
                <strong> MCX:</strong> 9:00 AM - 11:30 PM (Mon-Fri)
              </p>
            </div>
          </div>
        </div>
      )}

      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-lg">
        <TableHeader
          filteredData={filteredData}
          type={type}
          services={services}
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          viewMode={viewMode}
          setViewMode={setViewMode}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          isMobile={isMobile}
          clearDateFilters={clearDateFilters}
          onExport={exportToExcel}
        />

        <CardContent className="px-3 sm:px-6">
          {filteredData.length > 0 ? (
            renderContent()
          ) : initializing ? (
            // Cold-start: socket is connecting / first emit hasn't landed.
            // Render skeleton rows so the user knows the page is working.
            <div className="space-y-2 py-2" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-md bg-slate-100 dark:bg-slate-800/60 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <PieChart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">No recommendations found</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                Try adjusting your filters or date range
              </p>
            </div>
          )}

          {hasMore && (
            <div
              ref={sentinelRef}
              className="py-4 flex justify-center"
              aria-hidden
            >
              {loadingMore ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              ) : (
                <span className="text-xs text-slate-400">Scroll for more</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}