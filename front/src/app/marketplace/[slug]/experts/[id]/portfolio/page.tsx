"use client";

import { PortfolioCard } from "@/components/Marketplace/CardComponents";
import { Portfolio } from "@/components/Marketplace/types";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ExpertPortfolioPage() {
  const params = useParams();
  const id = params?.id as string;
  const slug = params?.slug as string;
  const [portfolioData, setPortfolioData] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadPortfolios = async () => {
      if (!id || !slug) return;

      try {
        setIsLoading(true);
        setError(null);

        // Use marketplace API to get marketplace-associated portfolios
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${slug}?type=portfolio&page=1&limit=100`
        );

        if (!response.ok) throw new Error("Failed to fetch portfolios");

        const result = await response.json();
        if (isMounted && result.success && Array.isArray(result.data)) {
          // Filter by this expert's ID
          const expertPortfolios = result.data.filter(
            (p: Portfolio) => p.authorData?.id === id
          );
          setPortfolioData(expertPortfolios);
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
  }, [id, slug]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 animate-pulse" />
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="h-36 bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <CardContent className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-1/2 animate-pulse" />
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
          <div className="text-red-500 text-xl mb-2">!</div>
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

  if (!portfolioData.length) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <PieChart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No Portfolios Found
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            There are no portfolios available at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Portfolios ({portfolioData.length})
        </h2>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-6">
        {portfolioData.map((portfolio) => (
          <PortfolioCard key={portfolio._id} portfolio={portfolio} marketplaceSlug={slug} />
        ))}
      </div>
    </div>
  );
}
