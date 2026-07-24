"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { redirect } from "next/navigation";
import Link from "next/link";
import Spdetails from "@/components/Marketplace/Spdetails";
import { SPstats } from "@/components/Home/OurFamily/OurFamily";

async function getData(id: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/spdetails?id=${id}`
  );
  if (res.status !== 200) {
    redirect("/dashboard/user");
  }
  return res.json();
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<SPstats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const id = params?.id as string;

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
        router.push("/dashboard/user");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  const tabs = [
    { title: "Research Reports", href: `/dashboard/user/experts/${id}/articles` },
    { title: "Plans", href: `/dashboard/user/experts/${id}/services` },
    { title: "Events", href: `/dashboard/user/experts/${id}/events` },
    { title: "Courses", href: `/dashboard/user/experts/${id}/courses` },
    { title: "Portfolios", href: `/dashboard/user/experts/${id}/portfolios` },
    { title: "Packages", href: `/dashboard/user/experts/${id}/packages` },
    { title: "Recommendations", href: `/dashboard/user/experts/${id}/recommendations` },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-blackShade flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading expert details...</p>
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
    <div className="bg-white dark:bg-blackShade">
      {/* Spdetails Section */}
      {data && (
        <div className="w-full">
          <Spdetails SPData={data} />
        </div>
      )}

      {/* Horizontal Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <nav className="flex gap-1 px-4 sm:px-8 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                pathname === tab.href || pathname?.startsWith(tab.href + "/")
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.title}
            </Link>
          ))}
        </nav>
      </div>

      {/* Page Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  );
}
