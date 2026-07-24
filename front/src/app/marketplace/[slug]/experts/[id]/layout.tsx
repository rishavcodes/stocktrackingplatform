"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { redirect } from "next/navigation";
import Link from "next/link";
import Spdetails from "@/components/Marketplace/Spdetails";
import { SPstats } from "@/components/Home/OurFamily/OurFamily";
import MarketplaceNavbar from "@/components/Marketplace/MarketplaceNavbar";
import {
  FileText,
  CalendarDays,
  CreditCard,
  GraduationCap,
  TrendingUp,
  PieChart,
  Package,
} from "lucide-react";

async function getData(id: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/spdetails?id=${id}`
  );
  if (res.status !== 200) {
    redirect("/marketplace/serviceprovider/user-not-found");
  }
  return res.json();
}

const tabs = [
  { key: "articles", label: "Articles", icon: FileText },
  { key: "events", label: "Events", icon: CalendarDays },
  { key: "services", label: "Plans", icon: CreditCard },
  { key: "courses", label: "Courses", icon: GraduationCap },
  // { key: "recommendations", label: "Recommendations", icon: TrendingUp },
  { key: "portfolio", label: "Portfolios", icon: PieChart },
  { key: "packages", label: "Packages", icon: Package },
];

export default function ExpertProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = useState<SPstats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const id = params?.id as string;
  const slug = params?.slug as string;

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await getData(id);
        setData(result.data);
        setError(null);
      } catch (err) {
        setError("Service provider not found");
        router.push("/marketplace/serviceprovider/user-not-found");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  const activeTab = tabs.find((t) => pathname?.endsWith(`/${t.key}`))?.key || "articles";

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-blackShade flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading expert profile...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-blackShade flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Error</h2>
          <p className="text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-blackShade min-h-screen">
      {/* Marketplace Navbar */}
      <div className="sticky top-0 z-50">
        <MarketplaceNavbar marketplaceId={slug} />
      </div>

      {/* Profile Card */}
      {data && (
        <div className="w-full mt-32 lg:mt-20">
          <Spdetails SPData={data} />
        </div>
      )}

      {/* Horizontal Tabs */}
      <div className="sticky top-[76px] z-40 bg-white dark:bg-blackShade border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.key}
                  href={`/marketplace/${slug}/experts/${id}/${tab.key}`}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 ${
                    isActive
                      ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </div>
    </div>
  );
}
