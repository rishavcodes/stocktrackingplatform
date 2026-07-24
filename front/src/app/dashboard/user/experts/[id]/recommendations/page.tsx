"use client";

import { RecommendationCardMini } from "@/components/Marketplace/RecommendationCardMini";
import { Recommendation } from "@/components/Marketplace/types";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

const EQUITY_EXCHANGES = ["NSE", "BSE"];
const FNO_EXCHANGES = ["NFO", "BFO"];
const COMMODITIES_EXCHANGES = ["MCX"];

type SegmentFilter = "all" | "equity" | "fno" | "commodities";
type StatusFilter = "all" | "active" | "closed";

type ApiPlan = { _id: string; title: string };

async function fetchRecommendations(
  id: string,
): Promise<{ recs: Recommendation[]; plans: ApiPlan[] }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scorecard/getmyrecommendations?id=${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const result = await response.json();
      return {
        recs: result?.data || [],
        plans: result?.plans || [],
      };
    }
    return { recs: [], plans: [] };
  } catch (error) {
    console.error("Failed to fetch recommendations:", error);
    return { recs: [], plans: [] };
  }
}

export default function SPRecommendationsPage() {
  const params = useParams();
  const id = params?.id as string;
  const [recommendationData, setRecommendationData] = useState<Recommendation[]>(
    []
  );
  // Lookup table for plan title by id — backend returns these on the same
  // endpoint, so the card can render the plan name instead of just the id.
  const [planNamesById, setPlanNamesById] = useState<Map<string, string>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = recommendationData.filter((rec) => {
    if (segmentFilter !== "all") {
      const ex = rec.exchange?.toUpperCase() || "";
      if (segmentFilter === "equity" && !EQUITY_EXCHANGES.includes(ex)) return false;
      if (segmentFilter === "fno" && !FNO_EXCHANGES.includes(ex)) return false;
      if (segmentFilter === "commodities" && !COMMODITIES_EXCHANGES.includes(ex)) return false;
    }
    if (statusFilter !== "all") {
      const st = rec.status?.toLowerCase() || "";
      if (statusFilter === "active" && st !== "open") return false;
      if (statusFilter === "closed" && st !== "closed") return false;
    }
    return true;
  });

  const clearFilters = () => {
    setSegmentFilter("all");
    setStatusFilter("all");
  };
  const hasActiveFilters = segmentFilter !== "all" || statusFilter !== "all";

  useEffect(() => {
    let isMounted = true;

    const loadRecommendations = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        setError(null);
        const { recs, plans } = await fetchRecommendations(id);

        if (isMounted) {
          setRecommendationData(recs);
          setPlanNamesById(
            new Map(plans.map((p) => [String(p._id), p.title || ""])),
          );
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load recommendations");
          console.error("Error loading recommendations:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadRecommendations();

    return () => {
      isMounted = false;
    };
  }, [id]);

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
          <div className="text-red-500 text-xl mb-2">⚠️</div>
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
          <div className="text-gray-400 text-4xl mb-4">📈</div>
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No Recommendations Found
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            There are no recommendations available at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Recommendations ({recommendationData.length})
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
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-8 px-2.5 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#01a6b6] focus:outline-none"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
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
            No recommendations match your filters.
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
            planNamesById={planNamesById}
          />
        ))}
      </div>
      )}
    </div>
  );
}
