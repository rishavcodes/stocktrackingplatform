"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Portfolio, Marketplace } from "@/components/Marketplace/types";
import { PortfolioCard } from "@/components/Marketplace/CardComponents";
import MarketplaceNavbar from "@/components/Marketplace/MarketplaceNavbar";
import { Card } from "@/components/ui/card";

function PillToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
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

function CheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (val: string) => {
    onChange(
      selected.includes(val) ? selected.filter((s) => s !== val) : [...selected, val]
    );
  };
  return (
    <div className="flex flex-col gap-1.5">
      {options.map((o) => (
        <label
          key={o.value}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <input
            type="checkbox"
            checked={selected.includes(o.value)}
            onChange={() => toggle(o.value)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
          />
          <span className="text-[11px] text-slate-600 group-hover:text-slate-900">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

type RiskFilter = "all" | "low" | "medium" | "high";
type InvestmentFilter = "all" | "under10k" | "10k-50k" | "50k-1l" | "above1l";
type PriceFilter = "all" | "free" | "paid";
type HorizonFilter = "all" | "short" | "medium" | "long";

const RISK_OPTIONS: { value: RiskFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const INVESTMENT_OPTIONS: { value: InvestmentFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "under10k", label: "Under 10K" },
  { value: "10k-50k", label: "10K-50K" },
  { value: "50k-1l", label: "50K-1L" },
  { value: "above1l", label: "Above 1L" },
];

const PRICE_OPTIONS: { value: PriceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

const HORIZON_OPTIONS: { value: HorizonFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "short", label: "Short (1-6m)" },
  { value: "medium", label: "Mid (7-12m)" },
  { value: "long", label: "Long (12m+)" },
];

export default function AllPortfolioPage() {
  const params = useParams();
  const marketplaceId = params.slug as string;

  const [marketplace, setMarketplace] = useState<Marketplace | null>(null);
  const [list, setList] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [themeFilter, setThemeFilter] = useState<string[]>([]);
  const [investmentFilter, setInvestmentFilter] = useState<InvestmentFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [horizonFilter, setHorizonFilter] = useState<HorizonFilter>("all");

  useEffect(() => {
    const fetchMarketplace = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}`
        );
        if (!res.ok) return;
        const result = await res.json();
        if (result.success) setMarketplace(result.data);
      } catch {
        // ignore
      }
    };
    if (marketplaceId) fetchMarketplace();
  }, [marketplaceId]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}?type=portfolio&page=1&limit=100`
        );
        if (!res.ok) throw new Error("Failed to fetch");
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          setList(result.data);
        }
      } catch {
        setList([]);
      } finally {
        setLoading(false);
      }
    };
    if (marketplaceId) fetchData();
  }, [marketplaceId]);

  const themeOptions = useMemo(() => {
    const themes = new Set<string>();
    list.forEach((p) => {
      if (p.theme?.trim()) themes.add(p.theme.trim());
    });
    return Array.from(themes).sort().map((t) => ({ value: t, label: t }));
  }, [list]);

  const filtered = useMemo(() => {
    return list.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const name = (p.portfolioName || "").toLowerCase();
        const author = (p.authorData?.name || "").toLowerCase();
        if (!name.includes(q) && !author.includes(q)) return false;
      }
      if (riskFilter !== "all") {
        const level = p.riskLevel ?? 5;
        if (riskFilter === "low" && level > 3) return false;
        if (riskFilter === "medium" && (level <= 3 || level > 7)) return false;
        if (riskFilter === "high" && level <= 7) return false;
      }
      if (themeFilter.length > 0 && !themeFilter.includes(p.theme || "")) return false;
      if (investmentFilter !== "all") {
        const amt = p.minInvestmentAmount ?? 0;
        if (investmentFilter === "under10k" && amt >= 10000) return false;
        if (investmentFilter === "10k-50k" && (amt < 10000 || amt > 50000)) return false;
        if (investmentFilter === "50k-1l" && (amt < 50000 || amt > 100000)) return false;
        if (investmentFilter === "above1l" && amt <= 100000) return false;
      }
      if (priceFilter !== "all") {
        if (priceFilter === "free" && p.fees !== 0) return false;
        if (priceFilter === "paid" && p.fees === 0) return false;
      }
      if (horizonFilter !== "all") {
        const h = p.investmentHorizon ?? 0;
        if (horizonFilter === "short" && h > 6) return false;
        if (horizonFilter === "medium" && (h < 7 || h > 12)) return false;
        if (horizonFilter === "long" && h <= 12) return false;
      }
      return true;
    });
  }, [list, searchQuery, riskFilter, themeFilter, investmentFilter, priceFilter, horizonFilter]);

  const hasActiveFilters =
    !!searchQuery.trim() ||
    riskFilter !== "all" ||
    themeFilter.length > 0 ||
    investmentFilter !== "all" ||
    priceFilter !== "all" ||
    horizonFilter !== "all";

  const clearAll = () => {
    setSearchQuery("");
    setRiskFilter("all");
    setThemeFilter([]);
    setInvestmentFilter("all");
    setPriceFilter("all");
    setHorizonFilter("all");
  };

  const filterContent = (
    <div className="space-y-5 pt-2">
      <div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search portfolio or analyst..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent bg-white"
          />
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Risk Level
        </h4>
        <PillToggle value={riskFilter} onChange={setRiskFilter} options={RISK_OPTIONS} />
      </div>

      <div>
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Min Investment
        </h4>
        <PillToggle value={investmentFilter} onChange={setInvestmentFilter} options={INVESTMENT_OPTIONS} />
      </div>

      <div>
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Price
        </h4>
        <PillToggle value={priceFilter} onChange={setPriceFilter} options={PRICE_OPTIONS} />
      </div>

      <div>
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Investment Horizon
        </h4>
        <PillToggle value={horizonFilter} onChange={setHorizonFilter} options={HORIZON_OPTIONS} />
      </div>

      {themeOptions.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Theme
          </h4>
          <CheckboxGroup
            options={themeOptions}
            selected={themeFilter}
            onChange={setThemeFilter}
          />
        </div>
      )}

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="w-full text-xs text-slate-500 hover:text-slate-800"
        >
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
            {/* Mobile filter button */}
            <div className="lg:hidden mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileFiltersOpen(true)}
                className="text-xs gap-1.5"
              >
                <Filter className="h-3.5 w-3.5" /> Filters
                {hasActiveFilters && (
                  <span className="h-4 w-4 rounded-full bg-slate-900 text-white text-[9px] flex items-center justify-center">
                    !
                  </span>
                )}
              </Button>
            </div>

            <div className="text-xs text-slate-500 mb-3">
              Showing{" "}
              <span className="font-semibold text-slate-700">{filtered.length}</span>{" "}
              of {list.length} portfolios
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card
                    key={i}
                    className="border border-slate-200 overflow-hidden"
                  >
                    <div className="p-4 space-y-3 animate-pulse">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                      <div className="grid grid-cols-4 gap-2">
                        <div className="h-8 bg-slate-100 rounded" />
                        <div className="h-8 bg-slate-100 rounded" />
                        <div className="h-8 bg-slate-100 rounded" />
                        <div className="h-8 bg-slate-100 rounded" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card className="p-12 border border-slate-200 text-center bg-white">
                <p className="text-slate-500 text-sm">
                  No portfolios match your filters.
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    className="mt-4 text-xs"
                    onClick={clearAll}
                  >
                    Clear filters
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((p) => (
                  <PortfolioCard key={p._id} portfolio={p} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Filters</h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">{filterContent}</div>
          </div>
        </div>
      )}
    </div>
  );
}
