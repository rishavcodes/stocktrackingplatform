"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";

interface Portfolio {
  _id: string;
  portfolioName: string;
  theme?: string;
  riskLevel?: string;
  minInvestment?: number;
  currency?: string;
  authorData?: {
    id: string;
    name?: string;
  };
}

// Fetch only this author's portfolios server-side. The previous approach
// pulled `get-all-portfolios` (capped at limit=100, page 1 only) and filtered
// client-side by authorData.id — so once the platform had >100 portfolios, an
// expert's portfolios could fall outside the window and the tab showed empty.
async function fetchPortfolios(authorId: string): Promise<Portfolio[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/portfolio/get-portfolios?authorId=${authorId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const result = await response.json();
      return result?.data || result?.portfolios || [];
    }
    // The endpoint returns 404 when the author has no portfolios — treat as empty.
    return [];
  } catch (error) {
    console.error("Failed to fetch portfolios:", error);
    return [];
  }
}

export default function ExpertPortfoliosPage() {
  const params = useParams();
  const id = params?.id as string;
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadPortfolios = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        setError(null);
        const authorPortfolios = await fetchPortfolios(id);

        if (isMounted) {
          setPortfolios(authorPortfolios);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load portfolios");
          console.error("Error loading portfolios:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPortfolios();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 animate-pulse" />
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-gray-200 dark:border-gray-700 overflow-hidden">
              <CardContent className="p-6 space-y-3">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-gray-100 dark:bg-gray-600 rounded w-1/2 animate-pulse" />
                <div className="h-4 bg-gray-100 dark:bg-gray-600 rounded w-1/3 animate-pulse" />
                <div className="h-4 bg-gray-100 dark:bg-gray-600 rounded w-2/3 animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
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
            className="px-4 py-2 bg-[#01a6b6] text-white rounded-lg hover:bg-[#018b99] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!portfolios.length) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No Portfolios Found
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            This expert has no portfolios available at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Portfolios ({portfolios.length})
      </h2>

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-6">
        {portfolios.map((portfolio) => (
          <Link key={portfolio._id} href={`/view/portfolio/${portfolio._id}`}>
            <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                  {portfolio.portfolioName}
                </h3>
                {portfolio.theme && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Theme:</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{portfolio.theme}</span>
                  </div>
                )}
                {portfolio.riskLevel && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Risk Level:</span>
                    <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                      portfolio.riskLevel.toLowerCase() === "high"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : portfolio.riskLevel.toLowerCase() === "medium"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    }`}>
                      {portfolio.riskLevel}
                    </span>
                  </div>
                )}
                {portfolio.minInvestment != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Min Investment:</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {portfolio.currency || "INR"} {portfolio.minInvestment.toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
