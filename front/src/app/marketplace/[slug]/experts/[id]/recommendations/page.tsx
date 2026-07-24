"use client";

import { RecommendationCardMini } from "@/components/Marketplace/RecommendationCardMini";
import { Recommendation } from "@/components/Marketplace/types";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { useSession } from "next-auth/react";

const EQUITY_EXCHANGES = ["NSE", "BSE"];
const FNO_EXCHANGES = ["NFO", "BFO"];
const COMMODITIES_EXCHANGES = ["MCX"];

type SegmentFilter = "all" | "equity" | "fno" | "commodities";

async function fetchRecommendations(id: string): Promise<Recommendation[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scorecard/getmyrecommendations?id=${id}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (response.ok) {
      const result = await response.json();
      return result?.data || [];
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch recommendations:", error);
    return [];
  }
}

export default function ExpertRecommendationsPage() {
  const params = useParams();
  const id = params?.id as string;
  const slug = params?.slug as string;

  const { data: session, status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  const [recommendationData, setRecommendationData] = useState<Recommendation[]>([]);
  const [subscribedServiceIds, setSubscribedServiceIds] = useState<Set<string>>(new Set());
  const [marketplaceIds, setMarketplaceIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("all");
  const recsFetchedRef = useRef(false);

  // Fetch marketplace details to get the ObjectId
  // The URL slug could be either a human-readable slug or the ObjectId itself
  useEffect(() => {
    if (!slug) return;
    // Start with slug itself as a possible match (it may already be the ObjectId)
    const ids = [slug];
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${slug}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?._id) {
          // Add the actual ObjectId if different from slug
          if (res.data._id !== slug) {
            ids.push(res.data._id);
          }
        }
        setMarketplaceIds(ids);
      })
      .catch(() => {
        // Even if fetch fails, try with slug directly
        setMarketplaceIds(ids);
      });
  }, [slug]);

  // Fetch user's subscribed services for blur logic. Extracted into a callback
  // so we can re-run it whenever the tab regains focus/visibility — that way a
  // card unlocks as soon as the user returns from checkout, including via the
  // browser back button / bfcache (which restores the page without re-mounting,
  // leaving the old set stale).
  const fetchSubscribedServices = useCallback(() => {
    if (!isAuthenticated || !session?.user?.id) return;
    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/subscribedservices?id=${session.user.id}&role=user`
    )
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

  // Fetch recommendations and filter by marketplace
  useEffect(() => {
    if (!id || marketplaceIds.length === 0) return;
    if (recsFetchedRef.current) return;
    recsFetchedRef.current = true;

    const loadRecommendations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchRecommendations(id);

        // Only keep marketplace-associated recommendations
        // - shareWithPlans empty + status open → show normally (active free trades)
        // - shareWithPlans has values → show blurred (paid, any status, to entice subscription)
        const marketplaceFiltered = data.filter((rec) => {
          const isMarketplace =
            rec.shareWithMarketplaces &&
            rec.shareWithMarketplaces.some((mpId: string) =>
              marketplaceIds.includes(mpId)
            );
          if (!isMarketplace) return false;

          const hasPlan =
            rec.shareWithPlans && rec.shareWithPlans.length > 0;
          if (hasPlan) return true; // show blurred regardless of status
          return rec.status?.toLowerCase() === "open"; // free recs: only active
        });
        setRecommendationData(marketplaceFiltered);
      } catch (err: any) {
        setError("Failed to load recommendations");
        console.error("Error loading recommendations:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecommendations();
  }, [id, marketplaceIds]);

  const filtered = useMemo(() => {
    return recommendationData.filter((rec) => {
      if (segmentFilter !== "all") {
        const ex = rec.exchange?.toUpperCase() || "";
        if (segmentFilter === "equity" && !EQUITY_EXCHANGES.includes(ex)) return false;
        if (segmentFilter === "fno" && !FNO_EXCHANGES.includes(ex)) return false;
        if (segmentFilter === "commodities" && !COMMODITIES_EXCHANGES.includes(ex)) return false;
      }
      return true;
    });
  }, [recommendationData, segmentFilter]);

  const clearFilters = () => {
    setSegmentFilter("all");
  };
  const hasActiveFilters = segmentFilter !== "all";

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">!</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!recommendationData.length) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No Trading Ideas Found
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            There are no Trading Ideas available at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Trading Ideas ({recommendationData.length})
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value as SegmentFilter)}
            className="h-8 px-2.5 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#01a6b6] focus:outline-none"
          >
            <option value="all">All segments</option>
            <option value="equity">Equity (NSE & BSE)</option>
            <option value="fno">F&O (NFO & BFO)</option>
            <option value="commodities">Commodities (MCX)</option>
          </select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2 text-xs text-gray-500 hover:text-[#01a6b6]"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center border border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No Trading Ideas match your filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="border-[#01a6b6] text-[#01a6b6] hover:bg-[#01a6b6]/10"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {filtered.map((recommendation, index) => (
            <RecommendationCardMini
              key={recommendation._id}
              recommendation={recommendation}
              index={index}
              subscribedServiceIds={subscribedServiceIds}
              marketplaceSlug={slug}
            />
          ))}
        </div>
      )}
    </div>
  );
}
