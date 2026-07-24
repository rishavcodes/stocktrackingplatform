"use client";

import fetcher from "@/lib/data/setup";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useMemo, useState, useEffect } from "react";
import { Search, BadgeCheck, Eye } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function MyExpertsPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [spDetails, setSpDetails] = useState({});

  // Fetch all orders for this user
  const { data: billingData, isLoading } = useSWR(
    session?.user?.id
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/user-billing?userId=${session.user.id}`
      : null,
    fetcher
  );

  const orders = billingData?.data?.orders ?? [];

  // Extract unique service providers from orders
  const uniqueSPs = useMemo(() => {
    const map = new Map();
    for (const order of orders) {
      if (!order.soldBy?.id) continue;
      if (!map.has(order.soldBy.id)) {
        map.set(order.soldBy.id, {
          id: order.soldBy.id,
          name: order.soldBy.name,
          orders: [],
        });
      }
      map.get(order.soldBy.id).orders.push(order);
    }
    return Array.from(map.values());
  }, [orders]);

  // Fetch SP details for each unique SP
  useEffect(() => {
    if (uniqueSPs.length === 0) return;

    const fetchAll = async () => {
      const details = {};
      await Promise.all(
        uniqueSPs.map(async (sp) => {
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/spdetails?id=${sp.id}`
            );
            const json = await res.json();
            if (json.success && json.data) {
              details[sp.id] = json.data;
            }
          } catch (e) {
            console.error("Failed to fetch SP:", sp.id, e);
          }
        })
      );
      setSpDetails(details);
    };

    fetchAll();
  }, [uniqueSPs.length]);

  // Filter by search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return uniqueSPs;
    return uniqueSPs.filter((sp) => {
      const detail = spDetails[sp.id];
      const name = (detail?.RegName || sp.name || "").toLowerCase();
      const category = (detail?.category || "").toLowerCase();
      return name.includes(q) || category.includes(q);
    });
  }, [uniqueSPs, search, spDetails]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-10">
     

      <div className="bg-white dark:bg-black rounded-xl border shadow-sm p-3 sm:p-5 md:p-6">
        {!isLoading && uniqueSPs.length > 0 && (
          <div className="mb-4 md:mb-6 flex flex-col gap-3 md:gap-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filtered.length}</span> expert{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3 sm:gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 sm:h-64 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : uniqueSPs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center px-4">
            <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">👨‍💼</div>
            <h3 className="text-base sm:text-lg font-semibold">No experts yet</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Once you subscribe to any plan, portfolio, or course, the service provider will appear here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center border border-dashed rounded-xl px-4">
            <p className="text-sm text-muted-foreground mb-3">No experts match your search.</p>
            <button type="button" onClick={() => setSearch("")} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3 sm:gap-4 md:gap-6">
            {filtered.map((sp) => {
              const detail = spDetails[sp.id];
              const displayName = detail?.RegName || sp.name || "—";
              const category = detail?.category || detail?.type || "Service Provider";
              const location = detail?.city && detail?.state ? `${detail.city}, ${detail.state}` : detail?.state || "";
              const about = detail?.AboutMe || "";
              const verified = detail?.verified || false;
              const profileUrl = detail?.profileUrl || "";

              // Stats
              const stats = detail?.stats || {};
              const totalRecs = stats?.recommendationStats?.total || 0;
              const openRecs = stats?.recommendationStats?.open || 0;
              const closedRecs = stats?.recommendationStats?.close || 0;
              const totalArticles = stats?.contentStats?.articles || 0;
              const totalPlans = stats?.serviceStats?.totalPlans || 0;
              const totalPortfolios = stats?.modelPortfolioStates?.totalPortfolios || 0;

              return (
                <div
                  key={sp.id}
                  className="group bg-white dark:bg-[#161616] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md hover:shadow-xl hover:border-indigo-300/60 dark:hover:border-indigo-800/80 transition-all overflow-hidden flex flex-col"
                >
                  {/* Header with avatar */}
                  <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 h-16">
                    <div className="absolute -bottom-6 left-5">
                      <Avatar className="w-12 h-12 ring-2 ring-white dark:ring-gray-900">
                        {profileUrl ? (
                          <AvatarImage src={profileUrl} />
                        ) : null}
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-lg font-bold">
                          {displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="absolute top-3  right-3">
                      <Link
                        href={`/dashboard/user/experts/${sp.id}`}
                        className="h-7 px-3 bg-stone-400 hover:bg-white text-slate-700 font-semibold text-[10px] rounded-full shadow-sm border border-white/50 backdrop-blur-sm inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View Profile
                      </Link>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-10 flex-1 flex flex-col gap-3">
                    {/* Name + verified + category */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{displayName}</h3>
                        {verified && (
                          <BadgeCheck className="w-4.5 h-4.5 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="px-2 py-0.5 bg-[#01a6b6]/10 text-[#01a6b6] rounded-full text-[10px] font-semibold">{category}</span>
                        {location && (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-[10px] font-medium">{location}</span>
                        )}
                      </div>
                    </div>

                    {/* About */}
                    {about && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-0.5">About</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{about}</p>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-x-4 gap-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
                      <div>
                        <div className="text-md font-bold text-slate-900 dark:text-white">{totalRecs}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Recommendations</div>
                      </div>
                      <div>
                        <div className="text-md font-bold text-emerald-600">{openRecs}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Active</div>
                      </div>
                      <div>
                        <div className="text-md font-bold text-slate-600 dark:text-slate-300">{closedRecs}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Closed</div>
                      </div>
                      <div>
                        <div className="text-md font-bold text-blue-600">{totalArticles}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Research Reports</div>
                      </div>
                      <div>
                        <div className="text-md font-bold text-purple-600">{totalPlans}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Plans</div>
                      </div>
                      <div>
                        <div className="text-md font-bold text-amber-600">{totalPortfolios}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Portfolios</div>
                      </div>
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
