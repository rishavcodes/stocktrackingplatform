"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

type PackageType = {
  _id: string;
  title: string;
  description: string;
  pricingPlans: {
    price: number;
    validity: number;
  }[];
  includedServices: {
    _id: string;
    title: string;
  }[];
  activated: boolean;
};

async function fetchPackages(id: string): Promise<PackageType[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/package/mypackages?id=${id}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (response.ok) {
      const { data } = await response.json();
      return data || [];
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
  const slug = params?.slug as string;
  const [packageData, setPackageData] = useState<PackageType[]>([]);
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
          // Only show activated packages
          setPackageData(data.filter((p) => p.activated));
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
              <CardContent className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-full animate-pulse" />
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

  if (!packageData.length) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No Packages Found
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            There are no packages available at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Packages ({packageData.length})
        </h2>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-6">
        {packageData.map((pkg) => (
          <Link key={pkg._id} href={`/view/packages/${pkg._id}?marketplace=${slug}`}>
            <Card className="group hover:shadow-lg transition-all duration-300 border border-slate-200 overflow-hidden h-full bg-white rounded-xl cursor-pointer">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                    {pkg.title}
                  </h3>
                  <span className="text-sm font-bold text-emerald-600 whitespace-nowrap ml-2">
                    {(() => {
                      const tiers = pkg.pricingPlans || [];
                      if (tiers.length === 0) return "—";
                      const min = Math.min(...tiers.map((t: any) => t.price));
                      return min === 0 ? "Free" : `From ₹${min.toLocaleString("en-IN")}`;
                    })()}
                  </span>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2">
                  {pkg.description}
                </p>

                {pkg.pricingPlans?.length > 0 && (
                  <div className="text-[11px] text-slate-400">
                    {pkg.pricingPlans.length} {pkg.pricingPlans.length === 1 ? "tier" : "tiers"} available
                  </div>
                )}

                {pkg.includedServices.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Included Plans
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {pkg.includedServices.slice(0, 3).map((service) => (
                        <span
                          key={service._id}
                          className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-medium"
                        >
                          {service.title}
                        </span>
                      ))}
                      {pkg.includedServices.length > 3 && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-medium">
                          +{pkg.includedServices.length - 3} more
                        </span>
                      )}
                    </div>
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
