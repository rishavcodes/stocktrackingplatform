"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";

interface PackageData {
  _id: string;
  title: string;
  description?: string;
  pricingPlans?: { price: number; validity: number }[];
  includedServices?: { _id: string; title: string }[];
}

async function fetchPackages(id: string): Promise<PackageData[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/package/mypackages?id=${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const result = await response.json();
      return result?.data || [];
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch packages:", error);
    return [];
  }
}

export default function ExpertPackagesPage() {
  const params = useParams();
  const id = params?.id as string;
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadPackages = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchPackages(id);

        if (isMounted) {
          setPackages(data);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load packages");
          console.error("Error loading packages:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPackages();

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

  if (!packages.length) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No Packages Found
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            This expert has no packages available at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Packages ({packages.length})
      </h2>

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <Link key={pkg._id} href={`/view/packages/${pkg._id}`}>
            <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                  {pkg.title}
                </h3>
                {pkg.pricingPlans && pkg.pricingPlans.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-[#01a6b6]">
                      From ₹{Math.min(...pkg.pricingPlans.map((t) => t.price)).toLocaleString()}
                    </span>
                  </div>
                )}
                {pkg.pricingPlans && pkg.pricingPlans.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Tiers:</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {pkg.pricingPlans.length} option{pkg.pricingPlans.length > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {pkg.includedServices && pkg.includedServices.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Included Services:</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      {pkg.includedServices.length}
                    </span>
                  </div>
                )}
                {pkg.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {pkg.description}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
