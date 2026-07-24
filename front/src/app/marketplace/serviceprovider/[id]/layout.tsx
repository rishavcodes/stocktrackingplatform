"use client"
import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { redirect } from "next/navigation";
import Spdetails from "@/components/Marketplace/Spdetails";

import { SPstats } from "@/components/Home/OurFamily/OurFamily";
import SidebarMP, { SidebarButtonMP } from "@/components/Sidebar/SidebarMP";
import MarketplaceNavbar from "@/components/Marketplace/MarketplaceNavbar";


async function getData(id: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/spdetails?id=${id}`
  );
 console.log("this is service provider data", res);
  if (res.status !== 200) {
    redirect("/marketplace/serviceprovider/user-not-found");
  }

  return res.json();
}

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = useState<SPstats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const marketplaceId = searchParams.get("marketplaceId") || undefined;

  useEffect(() => {
    if (!id) return; // Wait for id to be available

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

  const allowRecommendation: string[] = [
    "Forex Experts",
    "Research Analyst",
    "Registered Investment Advisor",
  ];

  const ProviderSideBar: SidebarButtonMP[] = [
    
    {
      title: "Articles",
      base: `/marketplace/serviceprovider/${id}/articles`,
      href: `/marketplace/serviceprovider/${id}/articles`,
    },

    // {
    //   title: "Videos",
    //   base: `/marketplace/serviceprovider/${id}/videos`,
    //   href: `/marketplace/serviceprovider/${id}/videos`,
    // },
    
    
    // {
    //   title: "Podcasts",
    //   base: `/marketplace/serviceprovider/${id}/podcasts`,
    //   href: `/marketplace/serviceprovider/${id}/podcasts`,
    // },
    {
      title: "Events",
      base: `/marketplace/serviceprovider/${id}/events`,
      href: `/marketplace/serviceprovider/${id}/events`,
    },
    {
      title: "Plans",
      base: `/marketplace/serviceprovider/${id}/services`,
      href: `/marketplace/serviceprovider/${id}/services`,
    },
    {
      title: "Courses",
      base: `/marketplace/serviceprovider/${id}/courses`,
      href: `/marketplace/serviceprovider/${id}/courses`,
    },
    {
      title: "Trading Ideas",
      base: `/marketplace/serviceprovider/${id}/recommendations`,
      href: `/marketplace/serviceprovider/${id}/recommendations`,
    },
  ];

  // Add performance tab for allowed categories
  const fullSidebar = data?.category && allowRecommendation.includes(data.category) 
    ? [
        ...ProviderSideBar,
        // {
        //   title: "Performance",
        //   base: `/view/serviceprovider/${id}/performance`,
        //   href: `/view/serviceprovider/${id}/performance`,
        // },
      ]
    : ProviderSideBar;

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-blackShade flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading service provider details...</p>
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
      {/* Marketplace Navbar - shown when coming from marketplace (marketplaceId in URL) */}
      {marketplaceId && (
        <div className="sticky top-0 z-50">
          <MarketplaceNavbar marketplaceId={marketplaceId} />
        </div>
      )}

      {/* Sidebar and Main Content Layout */}
      <div className="flex">
        {/* Sidebar - offset below navbar when MarketplaceNavbar is shown */}
        <div className={`fixed left-0 h-screen z-40 ${marketplaceId ? "top-[76px]" : "top-0"}`}>
          <SidebarMP
            marketplaceId={marketplaceId}
            haveAvatar={false}
            heading=""
            buttonsArray={fullSidebar}
            iconIndex={0}
            height="h-screen"
            collapsed={false}
          />
        </div>
  
        {/* Main Content Area */}
        <div className="flex-1 top-0 ml-0 md:ml-64 transition-all duration-300">
          {/* Spdetails Section */}
          {data && (
            <div className="  w-full">
              <Spdetails SPData={data} />
            </div>
          )}

          {/* Page Content */}
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}