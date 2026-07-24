// app/marketplace/[slug]/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Socket, io } from "socket.io-client";
import { useToast } from "@/components/ui/use-toast";
import { playNotificationSound } from "@/lib/notificationSound";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react"; 
import MarketplaceNavbar from "@/components/Marketplace/MarketplaceNavbar";
import HeroSection from "@/components/Marketplace/HeroSection";
import { CategoryGrid, TopPerformers, HowItWorks, Testimonials, ProfessionalFooter } from "@/components/Marketplace/StaticSections";
import FAQSection from "@/components/Marketplace/FAQSection";
import { TabType, Marketplace, TabData, Recommendation, Service, Portfolio, Course } from "@/components/Marketplace/types";
import { ServiceCard, PortfolioCard, CourseCard, ExpertCardMini } from "@/components/Marketplace/CardComponents";

import { AllResearchAnalysts } from "@/components/Marketplace/AllResearchAnalysts";
import { BrokerSelectModal } from "@/components/Marketplace/BrokerSelectModal";
import { BuyOrderModal } from "@/components/Marketplace/BuyOrderModal";
import MarketplaceAuthModal from "@/components/Marketplace/MarketplaceAuthModal";
import {
  ALICE_BLUE_SESSION_KEY,
  hasBigulSession as hasBigulSessionFromLib,
  getBrokerClientCode as getBrokerClientCodeFromLib,
  redirectToBigulSSO,
} from "@/lib/brokerSession";
import { useBrokerSessionExpiry } from "@/hooks/useBrokerSessionExpiry";
import { useBigulSsoCallback } from "@/hooks/useBigulSsoCallback";

const BIGUL_BROKER_IDS = ["69450e88dd04c11f024287f9", "6969f526003f2f39ec1ee669","694514f5dd04c11f0242887d"];

export default function MarketplaceDetailsPage() {
  const params = useParams();
  const marketplaceId = params.slug as string;

  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  const [marketplace, setMarketplace] = useState<Marketplace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabData, setTabData] = useState<TabData>({});
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [showBuyOrderModal, setShowBuyOrderModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const pendingRecommendationRef = useRef<Recommendation | null>(null);
  // Purchased plans → drives which recommendation cards render unlocked in the
  // home page's HeroSection. Mirrors the all-recommendations page so a card
  // unlocks here too once the user buys the plan it's shared with.
  const [subscribedServiceIds, setSubscribedServiceIds] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  const prevRecommendationIdsRef = useRef<Set<string>>(new Set());

  // Fetch the user's purchased plans, re-running on focus/visibility so a card
  // unlocks as soon as the user returns from checkout (incl. browser back /
  // bfcache, which restores the page without re-mounting).
  const fetchSubscribedServices = useCallback(() => {
    if (!isAuthenticated || !session?.user?.id) return;
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/subscribedservices?id=${session.user.id}&role=user`)
      .then((r) => r.json())
      .then((res) => {
        const services = res?.data;
        if (Array.isArray(services)) {
          setSubscribedServiceIds(new Set(services.map((s: any) => s._id)));
        }
      })
      .catch(() => {});
  }, [isAuthenticated, session?.user?.id]);

  useEffect(() => {
    fetchSubscribedServices();
    const refetch = () => fetchSubscribedServices();
    const onVisible = () => { if (document.visibilityState === "visible") fetchSubscribedServices(); };
    window.addEventListener("focus", refetch);
    window.addEventListener("pageshow", refetch);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refetch);
      window.removeEventListener("pageshow", refetch);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchSubscribedServices]);

  // Reusable fetcher for tab data (used by initial load and pagination)
  const fetchTabData = useCallback(
    async (tab: TabType, page: number = 1, signal?: AbortSignal) => {
      if (tab === "about" || tab === "algo_strategies") {
        return;
      }

      setTabData((prev) => ({
        ...prev,
        [tab]: { ...(prev[tab] || { data: [] }), loading: true },
      }));

      try {
        const limit = tab === "recommendations" ? 500 : 12;
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}?type=${tab}&page=${page}&limit=${limit}`,
          signal ? { signal } : undefined,
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
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error(`Error fetching ${tab} data:`, err);
        setTabData((prev) => ({
          ...prev,
          [tab]: { data: [], loading: false },
        }));
      }
    },
    [marketplaceId],
  );

  // Fetch marketplace details first, then all tab data in parallel
  useEffect(() => {
    if (!marketplaceId) return;

    const controller = new AbortController();
    const { signal } = controller;

    const fetchAll = async () => {
      try {
        setLoading(true);

        // Step 1: Fetch marketplace details
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}`,
          { signal },
        );
        if (!response.ok) throw new Error("Failed to fetch marketplace");
        const result = await response.json();
        if (!result.success) throw new Error("Marketplace not found");

        if (signal.aborted) return;
        setMarketplace(result.data);

        // Step 2: Fetch tab data for landing page sections
        await Promise.allSettled([
          fetchTabData("articles", 1, signal),
          fetchTabData("events", 1, signal),
          fetchTabData("services", 1, signal),
          fetchTabData("portfolio", 1, signal),
          fetchTabData("lms", 1, signal),
        ]);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchAll();

    return () => controller.abort();
  }, [marketplaceId, fetchTabData]);

  // Live recommendations via Socket.IO (Redis-first, no REST polling)
  // Waits for marketplace to be fetched so we can send the ObjectId (not the slug)
  useEffect(() => {
    if (!marketplace?._id) return;

    let disposed = false;
    const objectId = marketplace._id;

    const socket: Socket = io(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/scorecardlive/marketplace`
    );

    socket.on("connect", () => {
      socket.emit("details", { marketplaceId: objectId });
    });

    socket.on("connect_error", () => {
      if (!disposed) {
        setTabData((prev) => ({
          ...prev,
          recommendations: { ...(prev.recommendations || { data: [] }), loading: false },
        }));
      }
    });

    socket.on("scorecard", (data: { recommendations: any[]; total: number }) => {
      const recs = data.recommendations || [];

      setTabData((prev) => ({
        ...prev,
        recommendations: {
          data: recs,
          loading: false,
        },
      }));

      const currentIds = new Set(recs.map((r: any) => r._id));
      const prevIds = prevRecommendationIdsRef.current;

      if (prevIds.size === 0) {
        prevRecommendationIdsRef.current = currentIds;
        return;
      }

      const newEntries = recs.filter((r: any) => !prevIds.has(r._id));
      if (newEntries.length > 0) {
        playNotificationSound();
        toast({
          title: "New Trading Idea",
          description: `${newEntries.length} new Trading Idea${newEntries.length > 1 ? "s" : ""} available`,
        });
      }

      prevRecommendationIdsRef.current = currentIds;
    });

    return () => {
      disposed = true;
      socket.disconnect();
    };
  }, [marketplace?._id, toast]);

  const isBigulMarketplace = !!marketplace?.createdByBrokerId && BIGUL_BROKER_IDS.includes(marketplace.createdByBrokerId);

  useBrokerSessionExpiry(isBigulMarketplace);

  const hasAliceBlueSession = useCallback(() => {
    if (typeof window === "undefined") return false;
    const raw = localStorage.getItem(ALICE_BLUE_SESSION_KEY);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      if (data?.expiresAt != null && Date.now() > data.expiresAt) return false;
      return true;
    } catch {
      return true;
    }
  }, []);

  const hasBigulSession = useCallback(() => hasBigulSessionFromLib(session), [session]);

  // Handle Bigul SSO callback: detect access_token in URL after Bigul redirects
  // back. Also branches to the dashboard when `state === "dashboard-broker"`.
  useBigulSsoCallback({
    status: sessionStatus,
    updateSession,
    onFirstTimeUser: () => setShowAuthModal(true),
  });

  const fetchAndRedirectToBigulSSO = useCallback(() => {
    redirectToBigulSSO();
  }, []);

  const getBrokerClientCode = useCallback(
    (): string => getBrokerClientCodeFromLib(session, isBigulMarketplace),
    [session, isBigulMarketplace]
  );

  const openTradeModal = useCallback(
    (recommendation: Recommendation) => {
      setSelectedRecommendation(recommendation);
      setShowBuyOrderModal(true);
    },
    [],
  );

  const handleBuySellClick = useCallback(
    (recommendation: Recommendation) => {
      const hasBroker = isBigulMarketplace ? hasBigulSession() : hasAliceBlueSession();

      if (!hasBroker) {
        pendingRecommendationRef.current = recommendation;
        if (isBigulMarketplace) {
          fetchAndRedirectToBigulSSO();
        } else {
          setShowBrokerModal(true);
        }
        return;
      }

      if (!isAuthenticated) {
        pendingRecommendationRef.current = recommendation;
        setShowAuthModal(true);
        return;
      }

      openTradeModal(recommendation);
    },
    [isBigulMarketplace, hasBigulSession, hasAliceBlueSession, fetchAndRedirectToBigulSSO, isAuthenticated, openTradeModal],
  );

  const handleAuthComplete = useCallback(() => {
    setShowAuthModal(false);
    const pending = pendingRecommendationRef.current;
    if (pending) {
      pendingRecommendationRef.current = null;
      openTradeModal(pending);
    }
  }, [openTradeModal]);



  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
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
    );
  } 

  return (
    <div className="min-h-screen bg-white">
      <MarketplaceNavbar marketplace={marketplace} />

      <HeroSection
        marketplace={marketplace}
        recommendations={
          (tabData.recommendations?.data || [])
            .filter((r: any) => r.status === "open")
            .slice(0, 4)
        }
        tabData={tabData}
        onBuySellClick={handleBuySellClick}
        subscribedServiceIds={subscribedServiceIds}
      />

      {/* Plans */}
      {(tabData.services?.data?.length ?? 0) > 0 && (
        <div className="bg-slate-50/80">
          <section className="max-w-6xl mx-auto px-3 sm:px-4 py-14">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="w-8 h-[2px] rounded-full bg-blue-500" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Plans</span>
                <div className="w-8 h-[2px] rounded-full bg-blue-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Subscription Plans</h2>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto mt-2">
                Subscription-based access to curated trading and investment strategies. Choose what fits your style and start following proven approaches
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(tabData.services.data as Service[]).slice(0, 3).map((service) => (
                <ServiceCard key={service._id} service={service} marketplaceSlug={marketplaceId} />
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                href={`/marketplace/${marketplaceId}/services`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-5 py-2.5 rounded-full transition-all"
              >
                View All Plans
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </section>
        </div>
      )}

      {/* Model Portfolios */}
      {(tabData.portfolio?.data?.length ?? 0) > 0 && (
        <div className="bg-white">
          <section className="max-w-6xl mx-auto px-3 sm:px-4 py-14">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="w-8 h-[2px] rounded-full bg-purple-500" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-purple-600">Portfolios</span>
                <div className="w-8 h-[2px] rounded-full bg-purple-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Model Portfolios</h2>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto mt-2">
                Ready-made portfolios built and managed by SEBI-registered experts. Track performance, understand allocation, and invest with clarity
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(tabData.portfolio.data as Portfolio[]).slice(0, 3).map((portfolio) => (
                <PortfolioCard key={portfolio._id} portfolio={portfolio} marketplaceSlug={marketplaceId} />
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                href={`/marketplace/${marketplaceId}/portfolio`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-5 py-2.5 rounded-full transition-all"
              >
                View All Portfolios
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </section>
        </div>
      )}

      {/* Courses */}
      {(tabData.lms?.data?.length ?? 0) > 0 && (
        <div className="bg-slate-50/80">
          <section className="max-w-6xl mx-auto px-3 sm:px-4 py-14">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="w-8 h-[2px] rounded-full bg-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Learning</span>
                <div className="w-8 h-[2px] rounded-full bg-indigo-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Courses</h2>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto mt-2">
                Structured learning programs to sharpen your trading and investing skills. From basics to advanced strategies, learn at your own pace
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(tabData.lms.data as Course[]).slice(0, 3).map((course) => (
                <CourseCard key={course._id} course={course} />
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                href={`/marketplace/${marketplaceId}/lms`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-5 py-2.5 rounded-full transition-all"
              >
                View All Courses
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </section>
        </div>
      )}

      {/* Experts */}
      {(marketplace?.activeRaIds?.length ?? 0) > 0 && (
        <div className="bg-white">
          <section className="max-w-6xl mx-auto px-3 sm:px-4 py-14">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="w-8 h-[2px] rounded-full bg-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Experts</span>
                <div className="w-8 h-[2px] rounded-full bg-emerald-500" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Our Experts</h2>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto mt-2">
                Connect with verified market professionals and research analysts. Get insights, guidance, and strategies directly from the source
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketplace!.activeRaIds.slice(0, 3).map((ra) => (
                <ExpertCardMini key={ra._id} ra={ra} marketplaceId={marketplaceId} />
              ))}
            </div>
            <div className="text-center mt-8">
              <Link
                href={`/marketplace/${marketplaceId}/experts`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-5 py-2.5 rounded-full transition-all"
              >
                View All Experts
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </section>
        </div>
      )}

      <MarketplaceAuthModal
        isOpen={showAuthModal}
        onClose={() => { setShowAuthModal(false); pendingRecommendationRef.current = null; }}
        onAuthenticated={handleAuthComplete}
        brokerType={isBigulMarketplace ? "bigul" : "aliceblue"}
        clientCode={getBrokerClientCode()}
      />
      <BrokerSelectModal isOpen={showBrokerModal} onClose={() => setShowBrokerModal(false)} />
      {selectedRecommendation && (
        <BuyOrderModal
          isOpen={showBuyOrderModal}
          onClose={() => {
            setShowBuyOrderModal(false);
            setSelectedRecommendation(null);
          }}
          recommendation={selectedRecommendation}
          brokerType={isBigulMarketplace ? "bigul" : "alice-blue"}
        />
      )}

      {/* <CategoryGrid /> */}
      {/* <TopPerformers /> */}
      {/* <HowItWorks /> */}
      {/* <Testimonials /> */}
      <FAQSection faqs={marketplace?.faqs} />
      <ProfessionalFooter footerConfig={marketplace?.footerConfig} />
    </div>
  );
}