"use client";

import Link from "next/link";
import fetcher from "@/lib/data/setup";
import { useSession } from "next-auth/react";
import useSWR from "swr";

type UserPortfolio = {
  _id: string;
  portfolioName: string;
  theme?: string;
  bannerImageURL?: string;
  subscribedBy?: string[];
  minimumInvestment?: number;
  riskLevel?: number;
};

type PortfolioApiResponse = {
  data?: {
    portfolios?: UserPortfolio[];
  };
};

export default function PortfolioPage() {
  const { data: session } = useSession();

  const { data, isLoading } = useSWR<PortfolioApiResponse>(
    session?.user?.id
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/portfolio/get-all-portfolios?page=1&limit=100`
      : null,
    fetcher
  );

  const portfolios =
    data?.data?.portfolios?.filter((p) =>
      p.subscribedBy?.includes(session?.user?.id || "")
    ) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">My Portfolios</h1>
        <p className="text-muted-foreground mt-1">
          View and access your subscribed model portfolios
        </p>
      </div>

      <div className="bg-white dark:bg-black rounded-xl border shadow-sm p-6">
        {isLoading ? (
          <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : portfolios.length > 0 ? (
          <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-6">
            {portfolios.map((portfolio) => (
              <Link
                key={portfolio._id}
                href={`/view/portfolio/${portfolio._id}`}
                className="group rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md transition"
              >
                <div className="h-32 bg-gray-100 dark:bg-gray-800">
                  {portfolio.bannerImageURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
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
                </div>
                <div className="p-4 space-y-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                    {portfolio.portfolioName}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {portfolio.theme || "Model portfolio"}
                  </p>
                  <div className="pt-2 text-xs text-gray-600 dark:text-gray-300 flex justify-between">
                    <span>
                      Min: Rs. {(portfolio.minimumInvestment || 0).toLocaleString()}
                    </span>
                    <span>Risk: {portfolio.riskLevel ?? "-"}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-lg font-semibold">No subscribed portfolios</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              You have not subscribed to any model portfolio yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
