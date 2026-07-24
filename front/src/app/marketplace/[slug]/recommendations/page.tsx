"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { Socket, io } from "socket.io-client";
import { Filter, Search, TrendingUp, TrendingDown, BarChart3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Recommendation } from "@/components/Marketplace/types";
import { RecommendationCardMini } from "@/components/Marketplace/RecommendationCardMini";
import MarketplaceNavbar from "@/components/Marketplace/MarketplaceNavbar";
import { BrokerSelectModal } from "@/components/Marketplace/BrokerSelectModal";
import { BuyOrderModal } from "@/components/Marketplace/BuyOrderModal";
import { Marketplace } from "@/components/Marketplace/types";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { playNotificationSound } from "@/lib/notificationSound";
import { useSession } from "next-auth/react";
import MarketplaceAuthModal from "@/components/Marketplace/MarketplaceAuthModal";
import {
  ALICE_BLUE_SESSION_KEY,
  hasBigulSession as hasBigulSessionFromLib,
  getBrokerClientCode as getBrokerClientCodeFromLib,
  redirectToBigulSSO,
} from "@/lib/brokerSession";
import { useBrokerSessionExpiry } from "@/hooks/useBrokerSessionExpiry";
import { useBigulSsoCallback } from "@/hooks/useBigulSsoCallback";

const BIGUL_BROKER_IDS = ["69450e88dd04c11f024287f9", "6969f526003f2f39ec1ee669"];

type EntryFilter = "all" | "buy" | "sell";
type PnlFilter = "all" | "profit" | "loss";
type SegmentFilter = "all" | "equity" | "fno" | "commodities";
type StatusFilter = "all" | "active" | "closed";
type HoldingFilter = "all" | "intraday" | "forward";
type ViewFilter = "all" | "subscribed";

const EQUITY_EXCHANGES = ["NSE", "BSE"];
const FNO_EXCHANGES = ["NFO", "BFO"];
const COMMODITIES_EXCHANGES = ["MCX"];
const ALL_EXCHANGES = ["NSE", "BSE", "NFO", "BFO", "MCX"];
const ALL_RESULTS = ["tp", "sl", "timeout", "manual"];

function PillToggle<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
            value === o.value
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CheckboxGroup({ options, selected, onChange }: { options: { value: string; label: string }[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter((s) => s !== val) : [...selected, val]);
  };
  return (
    <div className="flex flex-col gap-1.5">
      {options.map((o) => (
        <label key={o.value} className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={selected.includes(o.value)}
            onChange={() => toggle(o.value)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
          />
          <span className="text-[11px] text-slate-600 group-hover:text-slate-900">{o.label}</span>
        </label>
      ))}
    </div>
  );
}

export default function AllRecommendationsPage() {
  const router = useRouter();
  const params = useParams();
  const marketplaceId = params.slug as string;

  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  const [marketplace, setMarketplace] = useState<Marketplace | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [showBuyOrderModal, setShowBuyOrderModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const pendingRecommendationRef = useRef<Recommendation | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [subscribedServiceIds, setSubscribedServiceIds] = useState<Set<string>>(new Set());

  const [entryFilter, setEntryFilter] = useState<EntryFilter>("all");
  const [exchangeFilter, setExchangeFilter] = useState<string[]>([]);
  const [pnlFilter, setPnlFilter] = useState<PnlFilter>("all");
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [holdingFilter, setHoldingFilter] = useState<HoldingFilter>("all");
  const [resultFilter, setResultFilter] = useState<string[]>([]);
  const [authorFilter, setAuthorFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { toast } = useToast();
  const prevRecommendationIdsRef = useRef<Set<string>>(new Set());


  const isBigulMarketplace = !!marketplace?.createdByBrokerId && BIGUL_BROKER_IDS.includes(marketplace.createdByBrokerId);

  useBrokerSessionExpiry(isBigulMarketplace);

  const hasAliceBlueSession = useCallback(() => {
    if (typeof window === "undefined") return false;
    const raw = localStorage.getItem(ALICE_BLUE_SESSION_KEY);
    if (!raw) return false;
    try { const d = JSON.parse(raw); if (d?.expiresAt != null && Date.now() > d.expiresAt) return false; return true; } catch { return true; }
  }, []);

  const hasBigulSession = useCallback(() => hasBigulSessionFromLib(session), [session]);

  useBigulSsoCallback({
    status: sessionStatus,
    updateSession,
    onFirstTimeUser: () => setShowAuthModal(true),
  });

  const fetchAndRedirectToBigulSSO = useCallback(() => {
    redirectToBigulSSO();
  }, []);

  const getBrokerClientCode = useCallback(
    (): string => getBrokerClientCodeFromLib(session, isBigulMarketplace),
    [session, isBigulMarketplace]
  );

  const openTradeModal = useCallback((rec: Recommendation) => { setSelectedRecommendation(rec); setShowBuyOrderModal(true); }, []);

  const handleBuySellClick = useCallback((rec: Recommendation) => {
    const hasBroker = isBigulMarketplace ? hasBigulSession() : hasAliceBlueSession();
    if (!hasBroker) { pendingRecommendationRef.current = rec; isBigulMarketplace ? fetchAndRedirectToBigulSSO() : setShowBrokerModal(true); return; }
    if (!isAuthenticated) { pendingRecommendationRef.current = rec; setShowAuthModal(true); return; }
    openTradeModal(rec);
  }, [isBigulMarketplace, hasBigulSession, hasAliceBlueSession, fetchAndRedirectToBigulSSO, isAuthenticated, openTradeModal]);

  const handleViewFilterChange = useCallback((v: ViewFilter) => {
    if (v === "subscribed") {
      const hasBroker = isBigulMarketplace ? hasBigulSession() : hasAliceBlueSession();
      if (!hasBroker) {
        isBigulMarketplace ? fetchAndRedirectToBigulSSO() : setShowBrokerModal(true);
        return;
      }
      if (!isAuthenticated) {
        setShowAuthModal(true);
        return;
      }
    }
    setViewFilter(v);
  }, [isBigulMarketplace, hasBigulSession, hasAliceBlueSession, fetchAndRedirectToBigulSSO, isAuthenticated]);

  const handleAuthComplete = useCallback(() => {
    setShowAuthModal(false);
    const p = pendingRecommendationRef.current;
    if (p) { pendingRecommendationRef.current = null; openTradeModal(p); }
  }, [openTradeModal]);

  // --- Data fetching ---
  useEffect(() => {
    if (marketplaceId) fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}`).then(r => r.json()).then(d => { if (d.success) setMarketplace(d.data); }).catch(() => {});
  }, [marketplaceId]);

  // Fetch the user's purchased plans so we know which recommendation cards to
  // unlock. Extracted into a callback so we can re-run it whenever the tab
  // regains focus/visibility — that way a card unlocks as soon as the user
  // returns from checkout, including via the browser back button / bfcache
  // (which restores the page without re-mounting, leaving the old set stale).
  const fetchSubscribedServices = useCallback(() => {
    if (!isAuthenticated || !session?.user?.id) return;
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/subscribedservices?id=${session.user.id}&role=user`)
      .then((r) => r.json())
      .then((res) => {
        const services = res?.data;
        if (Array.isArray(services)) {
          setSubscribedServiceIds(new Set(services.map((s: any) => s._id)));
        }
      })
      .catch(() => {});
  }, [isAuthenticated, session?.user?.id]);

  useEffect(() => {
    fetchSubscribedServices();
    const refetch = () => fetchSubscribedServices();
    const onVisible = () => { if (document.visibilityState === "visible") fetchSubscribedServices(); };
    window.addEventListener("focus", refetch);
    window.addEventListener("pageshow", refetch);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refetch);
      window.removeEventListener("pageshow", refetch);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchSubscribedServices]);

  useEffect(() => {
    if (!marketplace?._id) return;
    const objectId = marketplace._id;
    setLoading(true);
    let disposed = false;
    const socket: Socket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL}/scorecardlive/marketplace`);
    socket.on("connect", () => socket.emit("details", { marketplaceId: objectId }));
    socket.on("connect_error", () => { if (!disposed) setLoading(false); });
    socket.on("scorecard", (data: { recommendations: Recommendation[]; total: number }) => {
      const recs = data.recommendations || [];
      setRecommendations(recs);
      setLoading(false);
      const currentIds = new Set(recs.map((r) => r._id));
      const prevIds = prevRecommendationIdsRef.current;
      if (prevIds.size === 0) { prevRecommendationIdsRef.current = currentIds; return; }
      const newEntries = recs.filter((r) => !prevIds.has(r._id));
      if (newEntries.length > 0) { playNotificationSound(); toast({ title: "New Trading Idea", description: `${newEntries.length} new Trading Idea${newEntries.length > 1 ? "s" : ""} available` }); }
      prevRecommendationIdsRef.current = currentIds;
    });
    return () => { disposed = true; socket.disconnect(); };
  }, [marketplace?._id]);

  // --- Derived data ---
  const uniqueAuthors = useMemo(() => {
    const map = new Map<string, string>();
    recommendations.forEach((r) => { if (r.authorData?.id && r.authorData?.name) map.set(r.authorData.id, r.authorData.name); });
    return Array.from(map.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [recommendations]);

  const filtered = useMemo(() => {
    return recommendations.filter((rec) => {
      // Hard filter: only show active (open) recommendations OR paid/blurred ones (to entice subscription)
      const hasPlan = rec.shareWithPlans && rec.shareWithPlans.length > 0;
      const isOpen = (rec.status || "").toLowerCase() === "open";
      if (!hasPlan && !isOpen) return false;

      if (viewFilter === "subscribed") {
        if (!rec.shareWithPlans || rec.shareWithPlans.length === 0) return false;
        if (!rec.shareWithPlans.some((planId: string) => subscribedServiceIds.has(planId))) return false;
      }
      if (entryFilter !== "all") { const e = rec.entryType?.toLowerCase(); if (entryFilter !== e) return false; }
      if (exchangeFilter.length > 0 && !exchangeFilter.includes((rec.exchange || "NSE").toUpperCase())) return false;
      if (segmentFilter !== "all") {
        const ex = (rec.exchange || "").toUpperCase();
        if (segmentFilter === "equity" && !EQUITY_EXCHANGES.includes(ex)) return false;
        if (segmentFilter === "fno" && !FNO_EXCHANGES.includes(ex)) return false;
        if (segmentFilter === "commodities" && !COMMODITIES_EXCHANGES.includes(ex)) return false;
      }
      if (statusFilter !== "all") { const s = (rec.status || "open").toLowerCase(); if (statusFilter === "active" && s !== "open") return false; if (statusFilter === "closed" && s !== "closed") return false; }
      if (holdingFilter !== "all" && rec.holdingPeriod && rec.holdingPeriod !== holdingFilter) return false;
      if (pnlFilter !== "all") { const pnl = Number(rec.pnl) || 0; if (pnlFilter === "profit" && pnl <= 0) return false; if (pnlFilter === "loss" && pnl >= 0) return false; }
      if (resultFilter.length > 0 && !resultFilter.includes(rec.result || "open")) return false;
      if (authorFilter.length > 0 && !authorFilter.includes(rec.authorData?.id || "")) return false;
      if (searchQuery.trim()) { const q = searchQuery.trim().toLowerCase(); if (!(rec.scriptname || "").toLowerCase().includes(q) && !(rec.authorData?.name || "").toLowerCase().includes(q)) return false; }
      return true;
    });
  }, [recommendations, viewFilter, subscribedServiceIds, entryFilter, exchangeFilter, segmentFilter, statusFilter, holdingFilter, pnlFilter, resultFilter, authorFilter, searchQuery]);

  const stats = useMemo(() => {
    const open = filtered.filter((r) => r.status === "open").length;
    const closed = filtered.filter((r) => r.status === "closed").length;
    const pnls = filtered.map((r) => Number(r.pnlpercentage) || 0).filter(Boolean);
    const avgPnl = pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0;
    return { total: filtered.length, open, closed, avgPnl };
  }, [filtered]);

  const hasActiveFilters = viewFilter !== "all" || entryFilter !== "all" || exchangeFilter.length > 0 || segmentFilter !== "all" || statusFilter !== "all" || holdingFilter !== "all" || pnlFilter !== "all" || resultFilter.length > 0 || authorFilter.length > 0 || searchQuery.trim();

  const clearAll = () => {
    setViewFilter("all"); setEntryFilter("all"); setExchangeFilter([]); setSegmentFilter("all"); setStatusFilter("all");
    setHoldingFilter("all"); setPnlFilter("all"); setResultFilter([]); setAuthorFilter([]); setSearchQuery("");
  };

  // --- Filter sidebar content (reused for desktop & mobile) ---
  const filterContent = (
    <div className="space-y-5 pt-2">
      <div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search script or analyst..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent bg-white"
          />
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">View</h4>
        <PillToggle value={viewFilter} onChange={handleViewFilterChange} options={[{ value: "all", label: "All" }, { value: "subscribed", label: "Subscribed" }]} />
      </div>

      <div>
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Status</h4>
        <PillToggle value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "closed", label: "Closed" }]} />
      </div>

      <div>
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Type</h4>
        <PillToggle value={entryFilter} onChange={setEntryFilter} options={[{ value: "all", label: "All" }, { value: "buy", label: "Buy" }, { value: "sell", label: "Sell" }]} />
      </div>

      <div>
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Exchange</h4>
        <CheckboxGroup options={ALL_EXCHANGES.map((e) => ({ value: e, label: e }))} selected={exchangeFilter} onChange={setExchangeFilter} />
      </div>

      <div>
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Segment</h4>
        <PillToggle value={segmentFilter} onChange={setSegmentFilter} options={[{ value: "all", label: "All" }, { value: "equity", label: "Equity" }, { value: "fno", label: "F&O" }, { value: "commodities", label: "Comm." }]} />
      </div>

      <div>
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Validity</h4>
        <PillToggle value={holdingFilter} onChange={setHoldingFilter} options={[{ value: "all", label: "All" }, { value: "intraday", label: "Intraday" }, { value: "forward", label: "Positional" }]} />
      </div>

      <div>
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">P&L</h4>
        <PillToggle value={pnlFilter} onChange={setPnlFilter} options={[{ value: "all", label: "All" }, { value: "profit", label: "Profit" }, { value: "loss", label: "Loss" }]} />
      </div>

      <div>
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Result</h4>
        <CheckboxGroup options={ALL_RESULTS.map((r) => ({ value: r, label: r.toUpperCase() }))} selected={resultFilter} onChange={setResultFilter} />
      </div>

      {uniqueAuthors.length > 1 && (
        <div>
          <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Experts</h4>
          <CheckboxGroup options={uniqueAuthors} selected={authorFilter} onChange={setAuthorFilter} />
        </div>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="w-full text-xs text-slate-500 hover:text-slate-800">
          Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <MarketplaceNavbar marketplace={marketplace} />

      <div className="flex pt-[76px]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-60 flex-shrink-0 border-r border-slate-200 bg-white fixed top-[76px] left-0 h-[calc(100vh-76px)] overflow-y-auto scrollbar-thin px-4 py-4 z-30">
          {filterContent}
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-60 min-h-[calc(100vh-76px)] pt-2">
          <div className="px-4 sm:px-6 py-4">
            {/* Mobile filter toggle */}
            <div className="lg:hidden mb-4">
              <Button variant="outline" size="sm" onClick={() => setMobileFiltersOpen(true)} className="text-xs gap-1.5">
                <Filter className="h-3.5 w-3.5" /> Filters {hasActiveFilters && <span className="h-4 w-4 rounded-full bg-slate-900 text-white text-[9px] flex items-center justify-center">!</span>}
              </Button>
            </div>

            {/* Count */}
            <div className="text-xs text-slate-500 mb-3">
              Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of {recommendations.length} Trading Ideas
            </div>

            {/* Cards grid */}
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="border border-slate-200 overflow-hidden">
                    <div className="p-4 space-y-3 animate-pulse">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                      <div className="grid grid-cols-3 gap-2"><div className="h-8 bg-slate-100 rounded" /><div className="h-8 bg-slate-100 rounded" /><div className="h-8 bg-slate-100 rounded" /></div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card className="p-12 border border-slate-200 text-center bg-white">
                <p className="text-slate-500 text-sm">No Trading Ideas match your filters.</p>
                {hasActiveFilters && (
                  <Button variant="outline" className="mt-4 text-xs" onClick={clearAll}>Clear filters</Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filtered.map((item, index) => (
                  <RecommendationCardMini key={item._id} recommendation={item} index={index} onBuySellClick={handleBuySellClick} subscribedServiceIds={subscribedServiceIds} marketplaceSlug={marketplaceId} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Filters</h3>
              <button onClick={() => setMobileFiltersOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4">{filterContent}</div>
          </div>
        </div>
      )}

      {/* Modals */}
      <MarketplaceAuthModal isOpen={showAuthModal} onClose={() => { setShowAuthModal(false); pendingRecommendationRef.current = null; }} onAuthenticated={handleAuthComplete} brokerType={isBigulMarketplace ? "bigul" : "aliceblue"} clientCode={getBrokerClientCode()} />
      <BrokerSelectModal isOpen={showBrokerModal} onClose={() => setShowBrokerModal(false)} />
      {selectedRecommendation && (
        <BuyOrderModal isOpen={showBuyOrderModal} onClose={() => { setShowBuyOrderModal(false); setSelectedRecommendation(null); }} recommendation={selectedRecommendation} brokerType={isBigulMarketplace ? "bigul" : "alice-blue"} />
      )}
    </div>
  );
}
