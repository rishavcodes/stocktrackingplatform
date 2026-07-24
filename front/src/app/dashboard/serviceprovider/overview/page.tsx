"use client";

import { useEffect, useState } from "react";
import OverviewCards from "@/components/Stats/OverviewCards";
import RecommendationStats from "@/components/Stats/RecommendationStats";
import ContentStats from "@/components/Stats/ContentStats";
import EventsList from "@/components/Stats/EventsList";
import SalesOrdersGraph from "@/components/Stats/SalesOrdersGraph";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useSession } from "next-auth/react";

export default function SPStatsPage() {
  const { data: session } = useSession();
  const id = session?.user?.id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("1 Month");

  const filters = ["1 Day", "1 Week", "1 Month", "1 Year"];

  // Build a human-readable date range for the currently selected filter
  const getDateRangeLabel = (filter: string): string => {
    const now = new Date();
    const formatDate = (d: Date) =>
      d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    switch (filter) {
      case "1 Day":
        return `Today · ${formatDate(now)}`;
      case "1 Week": {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return `${formatDate(weekAgo)} — ${formatDate(now)}`;
      }
      case "1 Month": {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return `${formatDate(monthAgo)} — ${formatDate(now)}`;
      }
      case "1 Year": {
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return `${formatDate(yearAgo)} — ${formatDate(now)}`;
      }
      default:
        return "";
    }
  };

  const fetchSPStats = async (id: string, filter: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/spstats?id=${id}&filter=${filter}`
      );
      if (!response.ok) throw new Error("Failed to fetch stats");

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
  };

  useEffect(() => {
    if (id) fetchSPStats(id, selectedFilter);
  }, [id, selectedFilter]);

  const monthlySales = data?.currentStats?.monthlyStats?.map((item: any) => ({
    month: new Date(2025, item._id.month - 1).toLocaleString("en-US", { month: "short" }),
    orders: item.totalOrders,
    renewOrders: 0, // If you have renewals, map them here later
  }));

  if (loading || !data)
    return <p className="p-6 text-gray-500">Loading statistics...</p>;

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 mx-2 sm:mx-4">
      {/* Filter Bar with explicit date range */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Showing data for
          </span>
          <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
            {getDateRangeLabel(selectedFilter)}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-white dark:bg-gray-900 border rounded-lg px-4 py-2 text-sm font-medium"
            >
              <span className="text-gray-500 dark:text-gray-400">Range:</span>
              <span className="font-semibold">{selectedFilter}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-36">
            {filters.map((filter) => (
              <DropdownMenuItem
                key={filter}
                onClick={() => handleFilterChange(filter)}
                className={`cursor-pointer ${selectedFilter === filter
                    ? "bg-gray-100 dark:bg-gray-700 font-semibold"
                    : ""
                  }`}
              >
                {filter}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Data */}
      <OverviewCards data={data} />
      {data?.currentStats?.monthlyStats?.length > 0 && (
        <SalesOrdersGraph
          data={data.currentStats.monthlyStats.map((item: any) => ({
            month: new Date(2025, item._id.month - 1).toLocaleString("en-US", {
              month: "short",
            }),
            orders: item.totalOrders,
            renewOrders: 0,
          }))}
        />
      )}

      {/* <div className="grid grid-cols-2 gap-x-4">
        <RecommendationStats data={data} />
        <EventsList data={data} />
      </div> */}

      {/* <ContentStats data={data} /> */}
    </div>
  );
}
