"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter, usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Building2, Eye, FileText, ArrowRight } from "lucide-react";
import { TabType, Marketplace, TabData } from "@/components/userdashboard/Overview/types";

// Import card components
import { RACard, RecommendationCard, PortfolioCard, ServiceCard, ArticleCard, EventCard } from "@/components/userdashboard/Overview/CardComponents";
import { AllResearchAnalysts } from "@/components/userdashboard/Overview/AllResearchAnalysts";
import HeroSection from "@/components/userdashboard/Overview/HeroSection";

const ALICE_BLUE_SESSION_KEY = "aliceBlueSession";
const ALICE_BLUE_SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export default function OverviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const marketplaceId = (params?.id as string) ?? "6997e2da224d14cfd510b67b";
  const authCode = searchParams.get("authCode");
  const userId = searchParams.get("userId");

  // Exchange authCode/userId for Alice Blue session and store in localStorage
  useEffect(() => {
    if (!authCode || !userId || typeof window === "undefined") return;

    const exchangeSession = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/aliceblue/get-session`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, authCode }),
          }
        );
        const result = await response.json();

        if (result.success && result.data) {
          const sessionData = {
            userId: result.data.userId,
            userSession: result.data.userSession,
            clientId: result.data.clientId,
            expiresAt: Date.now() + ALICE_BLUE_SESSION_EXPIRY_MS,
          };
          localStorage.setItem(ALICE_BLUE_SESSION_KEY, JSON.stringify(sessionData));
          window.dispatchEvent(new CustomEvent("aliceBlueSessionStored"));
          if (pathname) router.replace(pathname, { scroll: false });
        }
      } catch (err) {
        console.error("Alice Blue get-session error:", err);
      }
    };

    exchangeSession();
  }, [authCode, userId, pathname, router]);

  const [activeTab, setActiveTab] = useState<TabType>("recommendations");
  const [mainSectionTab, setMainSectionTab] = useState<TabType>("portfolio");
  const [hasInteracted, setHasInteracted] = useState(false);

  const [marketplace, setMarketplace] = useState<Marketplace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabData, setTabData] = useState<TabData>({});
  const marketplaceSlug = marketplace?.slug ?? marketplaceId;

  // Create ref for the SINGLE content area
  const contentSectionRef = useRef<HTMLDivElement>(null);

  // Fetch marketplace data
  useEffect(() => {
    const fetchMarketplace = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}`,
        );

        if (!response.ok) throw new Error("Failed to fetch marketplace");
        const result = await response.json();
        if (result.success) {
          setMarketplace(result.data);
        }
        // console.log("this is the authoer",result.data)
        
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (marketplaceId) {
      fetchMarketplace();
    }
  }, [marketplaceId]);

  // Fetch tab data for all sections
  const fetchTabData = async (tab: TabType, page: number = 1) => {
    if (tab === "about" || tab === "algo_strategies" || tab === "lms") {
      return;
    }

    setTabData((prev) => ({
      ...prev,
      [tab]: { ...(prev[tab] || { data: [] }), loading: true },
    }));

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}?type=${tab}&page=${page}&limit=12`,
      );

      if (!response.ok) throw new Error(`Failed to fetch ${tab} data`);
      const result = await response.json();
      
      if (result.success) {
        setTabData((prev) => ({
          ...prev,
          [tab]: {
            data: result.data || [],
            pagination: result.pagination,
            loading: false,
          }, 
        }));
      } 
    } catch (err) {
      console.error(`Error fetching ${tab} data:`, err);
      setTabData((prev) => ({
        ...prev,
        [tab]: { data: [], loading: false },
      }));
    }
  };

  // Pre-fetch all data when component mounts
  useEffect(() => {
    if (marketplaceId) {
      // Fetch data for all sections
      fetchTabData("ra", 1);
      fetchTabData("recommendations", 1);
      fetchTabData("portfolio", 1);
      fetchTabData("services", 1);
      fetchTabData("articles", 1);
      fetchTabData("events", 1);
    }
  }, [marketplaceId]);

  // Function to handle tab click from HeroSection
  const handleTabClick = (tab: TabType) => {
    setHasInteracted(true);
    setActiveTab(tab);

    // If recommendations clicked → only change highlight, no scroll
    if (tab === "recommendations") {
      return;
    }

    // For all other tabs:
    setMainSectionTab(tab);

    setTimeout(() => {
      contentSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  // Get current tab data
  const currentTabData = tabData[mainSectionTab]?.data || [];
  const currentTabLoading = tabData[mainSectionTab]?.loading || false;

  // Show only 3 cards
  const displayData = currentTabData.slice(0, 3);

  // Get tab info for display
  const getTabInfo = (tab: TabType) => {
    switch (tab) {
      case "ra":
        return {
          title: "Research Analysts",
          subtitle: "SEBI registered experts",
          emptyMessage: "No research analysts found in this marketplace.",
          viewAllLink: `/marketplace/${marketplaceSlug}/experts`,
          renderItem: (ra: any) => <RACard key={ra._id} ra={ra} />,
        };
      case "recommendations":
        return {
          title: "Live Recommendations",
          subtitle: "Real-time trading ideas",
          emptyMessage: "No recommendations available yet.",
          viewAllLink: `/marketplace/${marketplaceSlug}?tab=recommendations`,
          renderItem: (rec: any) => <RecommendationCard key={rec._id} recommendation={rec} />,
        };
      case "portfolio":
        return {
          title: "Model Portfolios",
          subtitle: "Curated investment strategies",
          emptyMessage: "No portfolios available yet.",
          viewAllLink: `/marketplace/${marketplaceSlug}?tab=portfolio`,
          renderItem: (portfolio: any) => <PortfolioCard key={portfolio._id} portfolio={portfolio} />,
        };
      case "services":
        return {
          title: "Professional Plans",
          subtitle: "Expert advisory plans",
          emptyMessage: "No services available yet.",
          viewAllLink: `/marketplace/${marketplaceSlug}?tab=services`,
          renderItem: (service: any) => <ServiceCard key={service._id} service={service} />,
        };
      case "articles":
        return {
          title: "Articles & Insights",
          subtitle: "Latest market analysis",
          emptyMessage: "No articles published yet.",
          viewAllLink: `/marketplace/${marketplaceSlug}?tab=articles`,
          renderItem: (article: any) => <ArticleCard key={article._id} article={article} />,
        };
      case "events":
        return {
          title: "Events & Webinars",
          subtitle: "Upcoming learning sessions",
          emptyMessage: "No upcoming events.",
          viewAllLink: `/marketplace/${marketplaceSlug}?tab=events`,
          renderItem: (event: any) => <EventCard key={event._id} event={event} />,
        };
      case "algo_strategies":
        return {
          title: "Algorithmic Strategies",
          subtitle: "Advanced trading algorithms (Coming Soon)",
          emptyMessage: "Advanced algorithmic trading strategies will be available soon.",
          viewAllLink: "#",
          renderItem: () => null,
        };
      case "lms":
        return {
          title: "Learning Management System",
          subtitle: "Comprehensive courses (Coming Soon)",
          emptyMessage: "Comprehensive courses and learning materials coming soon.",
          viewAllLink: "#",
          renderItem: () => null,
        };
      default:
        return {
          title: "Content",
          subtitle: "",
          emptyMessage: "No content available.",
          viewAllLink: "#",
          renderItem: () => null,
        };
    }
  };

  const tabInfo = getTabInfo(mainSectionTab);

  if (loading) {
    return (
      <div className="w-full max-w-full min-w-0 overflow-x-hidden">
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
          <Skeleton className="h-16 w-full mb-8" />
          <Skeleton className="h-64 w-full mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !marketplace) {
    return (
      <div className="w-full max-w-full min-w-0 overflow-x-hidden">
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Marketplace Not Found</h2>
              <p className="text-gray-600 mb-6">
                {error || "The marketplace you're looking for doesn't exist."}
              </p>
              <Link href="/marketplace">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Marketplace
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden px-0">
      {/* Hero Section with Navigation Tabs */}
      <div className="w-full overflow-x-hidden">
        <HeroSection
          marketplace={marketplace}
          onTabClick={handleTabClick}
          activeTab={activeTab}
          recommendations={tabData.recommendations?.data || []}
          tabData={tabData}
        />
      </div>

      {/* SINGLE CONTENT AREA - All cards appear HERE based on active tab */}
      <div ref={contentSectionRef} className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 w-full max-w-full min-w-0">
        {/* Tab Content Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{tabInfo.title}</h2>
              <p className="text-sm sm:text-base text-gray-600">{tabInfo.subtitle}</p>
            </div>
            
            {/* Show count */}
            {currentTabData.length > 0 && (
              <div className="text-sm text-gray-600">
                {currentTabData.length} total items
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {currentTabLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border border-gray-200">
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : currentTabData.length === 0 ? (
          // Empty State
          <Card className="p-12 border border-gray-200 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{tabInfo.title}</h3>
            <p className="text-gray-500">{tabInfo.emptyMessage}</p>
          </Card>
        ) : (
          <>
            {/* Content Grid - Show only 3 CARDS IN ONE PLACE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {displayData.map((item) => tabInfo.renderItem(item))}
            </div>

            {/* View All Button - Only show if there are more than 3 items */}
            {currentTabData.length > 3 && (
              <div className="mt-6 sm:mt-8 text-center px-2">
                <Link href={tabInfo.viewAllLink} className="inline-block">
                  <Button 
                    variant="outline" 
                    className="border-[#01a6b6] text-[#01a6b6] hover:bg-[#e6f7f9] px-4 sm:px-8 py-2 text-sm sm:text-base w-full sm:w-auto"
                  >
                    <span className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      View All {currentTabData.length} {activeTab === "ra" ? "Analysts" : 
                                                       activeTab === "recommendations" ? "Recommendations" :
                                                       activeTab === "portfolio" ? "Portfolios" :
                                                       activeTab === "services" ? "Services" :
                                                       activeTab === "articles" ? "Articles" :
                                                       activeTab === "events" ? "Events" : "Items"}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </span>
                  </Button>
                </Link>
                <p className="text-sm text-gray-500 mt-2">
                  Showing 3 of {currentTabData.length} items
                </p>
              </div>
            )}
          </>
        )}

        {/* Coming Soon Sections */}
        {(activeTab === "algo_strategies" || activeTab === "lms") && (
          <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-dashed text-center">
            <p className="text-gray-600">{tabInfo.emptyMessage}</p>
            <div className="mt-4 text-sm text-gray-500">
              This feature is currently under development
            </div>
          </div>
        )}
      </div>
      
      <div className="container mx-auto px-3 sm:px-4 w-full max-w-full min-w-0">
        <AllResearchAnalysts 
          analysts={marketplace?.activeRaIds || []}
        />
      </div>
      
      
    </div>
  );
}