"use client"
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { redirect } from "next/navigation";
import Spdetails from "./Spdetails";

import { SPstats } from "@/components/Home/OurFamily/OurFamily";
import SidebarMP, { SidebarButtonMP } from "@/components/Sidebar/SidebarMP";


async function getData(id: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/spdetails?id=${id}`
  );

  if (res.status !== 200) {
    redirect("/view/serviceprovider/user-not-found");
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
  const id = params?.id as string;

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
        router.push("/view/serviceprovider/user-not-found");
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
      base: `/view/serviceprovider/${id}/articles`,
      href: `/view/serviceprovider/${id}/articles`,
    },
    {
      title: "Videos",
      base: `/view/serviceprovider/${id}/videos`,
      href: `/view/serviceprovider/${id}/videos`,
    },
    {
      title: "Podcasts",
      base: `/view/serviceprovider/${id}/podcasts`,
      href: `/view/serviceprovider/${id}/podcasts`,
    },
    {
      title: "Events",
      base: `/view/serviceprovider/${id}/events`,
      href: `/view/serviceprovider/${id}/events`,
    },
    {
      title: "Services",
      base: `/view/serviceprovider/${id}/services`,
      href: `/view/serviceprovider/${id}/services`,
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
    <div className="   bg-white dark:bg-blackShade">
      {/* Sidebar and Main Content Layout */}
      <div className="flex">
        {/* Sidebar */}
        <div className="fixed top-0 left-0 h-screen z-40">
          <SidebarMP
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