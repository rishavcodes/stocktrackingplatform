"use client";

import Link from "next/link";
import fetcher from "@/lib/data/setup";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useMemo, useState, useEffect } from "react";
import { FileDown, List, Grid3X3, Eye, RefreshCw, AlertTriangle, Search, TrendingUp, TrendingDown } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export default function PortfolioPage() {
  const { data: session } = useSession();
  const [viewMode, setViewMode] = useState("list");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useSWR(
    session?.user?.id
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/portfolio/get-all-portfolios?page=1&limit=100`
      : null,
    fetcher
  );

  const { data: billingData } = useSWR(
    session?.user?.id
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/user-billing?userId=${session.user.id}`
      : null,
    fetcher
  );

  const portfolios =
    data?.data?.portfolios?.filter((p) =>
      p.subscribedBy?.includes(session?.user?.id || "")
    ) || [];

  const orders = billingData?.data?.orders ?? [];

  // Map portfolioId -> latest order
  const orderByPortfolioId = useMemo(() => {
    const map = new Map();
    for (const order of orders) {
      if (order.type !== "portfolio") continue;
      const sid = order.subscribedToId;
      if (!sid) continue;
      const existing = map.get(sid);
      if (!existing || new Date(order.createdAt) > new Date(existing.createdAt)) {
        map.set(sid, order);
      }
    }
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return portfolios;
    return portfolios.filter(
      (p) =>
        p.portfolioName?.toLowerCase().includes(q) ||
        p.theme?.toLowerCase().includes(q) ||
        p.authorData?.name?.toLowerCase().includes(q)
    );
  }, [portfolios, search]);

  const getOrderStatus = (order) => {
    if (!order) return { label: "Active", color: "bg-green-100 text-green-700" };
    if (order.isExpired) return { label: "Expired", color: "bg-red-100 text-red-700" };

    const endDate = order.endDate ? new Date(order.endDate) : null;
    if (endDate) {
      const now = new Date();
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 0) return { label: "Expired", color: "bg-red-100 text-red-700" };
      if (daysLeft <= 5) return { label: "Expiring", color: "bg-amber-100 text-amber-700", icon: AlertTriangle };
      return { label: "Active", color: "bg-green-100 text-green-700" };
    }
    return { label: "Active", color: "bg-green-100 text-green-700" };
  };

  const getValidityInfo = (order) => {
    if (!order?.endDate) return { validTill: "—", daysRemaining: null };
    const endDate = new Date(order.endDate);
    const now = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      validTill: endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      daysRemaining: daysLeft > 0 ? daysLeft : 0,
    };
  };

  // Total return % — matches the factsheet's "Total return percentage" card
  // exactly. Backend computes this in getAllPortfoliosController using the
  // same buyRate/value formula as the by-id (factsheet) endpoint.
  const getPerformance = (portfolio) => {
    const pct = portfolio?.performance?.totalProfitLossPercentage;
    if (typeof pct === "number" && !Number.isNaN(pct)) return pct;
    return null;
  };

  // Force cards-only on mobile — list rows with 12-col grids never look right on a phone.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const effectiveViewMode = isMobile ? "cards" : viewMode;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4">
      <div className="bg-white dark:bg-black rounded-xl border shadow-sm p-3 sm:p-5 md:p-6">
        {!isLoading && portfolios.length > 0 && (
          <div className="mb-4 md:mb-6 flex flex-col gap-3 md:gap-4">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by name, theme, or RA…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="hidden md:flex items-center border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-2 ${viewMode === "list" ? "bg-gray-900 text-white dark:bg-white dark:text-black" : "bg-white text-gray-500 dark:bg-black dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`p-2 ${viewMode === "cards" ? "bg-gray-900 text-white dark:bg-white dark:text-black" : "bg-white text-gray-500 dark:bg-black dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filtered.length}</span> of {portfolios.length} portfolio{portfolios.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3 sm:gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 sm:h-48 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : portfolios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center px-4">
            <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📊</div>
            <h3 className="text-base sm:text-lg font-semibold">No subscribed portfolios</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              You have not subscribed to any model portfolio yet.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center border border-dashed rounded-xl px-4">
            <p className="text-sm text-muted-foreground mb-3">No portfolios match your search.</p>
            <button type="button" onClick={() => setSearch("")} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
              Clear search
            </button>
          </div>
        ) : effectiveViewMode === "list" ? (
          /* LIST VIEW */
          <div className="space-y-0 border rounded-xl overflow-hidden">
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-900 border-b text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <div className="col-span-2">RA Info</div>
              <div className="col-span-3">Portfolio</div>
              <div className="col-span-2">Performance</div>
              <div className="col-span-2">Validity</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>

            {filtered.map((portfolio) => {
              const order = orderByPortfolioId.get(portfolio._id);
              const status = getOrderStatus(order);
              const validity = getValidityInfo(order);
              const perf = getPerformance(portfolio);

              return (
                <div
                  key={portfolio._id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-3 sm:px-5 py-3 md:py-4 border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors items-center"
                >
                  {/* RA Info */}
                  <div className="col-span-1 md:col-span-2 flex items-center gap-2.5">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      {portfolio.authorData?.authorImage ? (
                        <AvatarImage src={portfolio.authorData.authorImage} />
                      ) : null}
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                        {portfolio.authorData?.name?.charAt(0) || "P"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {portfolio.authorData?.name || "—"}
                    </p>
                  </div>

                  {/* Portfolio Details */}
                  <div className="col-span-1 md:col-span-3 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {portfolio.portfolioName}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {portfolio.scripts?.length || 0} Stocks {portfolio.theme ? `| ${portfolio.theme}` : ""}
                    </p>
                  </div>

                  {/* Performance */}
                  <div className="col-span-1 md:col-span-2">
                    {perf !== null ? (
                      <div className="flex items-center gap-1">
                        {perf >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm font-semibold ${perf >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {perf >= 0 ? "+" : ""}{perf.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>

                  {/* Validity + Status */}
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                      {validity.validTill}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {validity.daysRemaining !== null && (
                        <p className="text-xs text-gray-500">{validity.daysRemaining}d left</p>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.color}`}>
                        {status.icon && <status.icon className="w-2.5 h-2.5" />}
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 md:col-span-3 flex items-center justify-end gap-2">
                    {(status.label === "Expiring" || status.label === "Expired") && (
                      <Link
                        href={`/view/portfolio/${portfolio._id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Renew
                      </Link>
                    )}
                    <Link
                      href={`/view/portfolio/${portfolio._id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium rounded-lg transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </Link>
                    <Link
                      href={`/view/factsheet/${portfolio._id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium rounded-lg transition-colors"
                    >
                      <FileDown className="w-3 h-3" />
                      Factsheet
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* CARD VIEW */
          <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3 sm:gap-4 md:gap-6">
            {filtered.map((portfolio) => {
              const order = orderByPortfolioId.get(portfolio._id);
              const status = getOrderStatus(order);
              const validity = getValidityInfo(order);
              const perf = getPerformance(portfolio);

              return (
                <div
                  key={portfolio._id}
                  className="bg-white dark:bg-[#161616] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md hover:shadow-xl transition-all overflow-hidden"
                >
                  {/* Banner */}
                  <div className="relative h-[140px] w-full overflow-hidden bg-gray-200 dark:bg-gray-800">
                    {portfolio.bannerImageURL ? (
                      <img
                        src={portfolio.bannerImageURL}
                        alt={portfolio.portfolioName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                        No Image
                      </div>
                    )}
                    <span className={`absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${status.color}`}>
                      {status.icon && <status.icon className="w-3 h-3" />}
                      {status.label}
                    </span>
                    {perf !== null && (
                      <span className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${perf >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {perf >= 0 ? "+" : ""}{perf.toFixed(1)}%
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    <h2 className="text-lg font-semibold line-clamp-2 dark:text-white">
                      {portfolio.portfolioName}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1">
                      {portfolio.scripts?.length || 0} Stocks {portfolio.theme ? `| ${portfolio.theme}` : ""}
                    </p>

                    {/* Author */}
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8">
                        {portfolio.authorData?.authorImage ? (
                          <AvatarImage src={portfolio.authorData.authorImage} />
                        ) : null}
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                          {portfolio.authorData?.name?.charAt(0) || "P"}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium dark:text-white">
                        {portfolio.authorData?.name}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{validity.validTill}</p>
                      {validity.daysRemaining !== null && (
                        <p className="text-xs text-gray-500">{validity.daysRemaining} day{validity.daysRemaining !== 1 ? "s" : ""} left</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {(status.label === "Expiring" || status.label === "Expired") && (
                        <Link
                          href={`/view/portfolio/${portfolio._id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Renew
                        </Link>
                      )}
                      <Link
                        href={`/view/factsheet/${portfolio._id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium rounded-lg transition-colors"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        Factsheet
                      </Link>
                      <Link
                        href={`/view/portfolio/${portfolio._id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
