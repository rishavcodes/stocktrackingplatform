// components/Marketplace/HeroSection.tsx
"use client";

import { ShieldCheck, TrendingUp, History, Users, Zap, Radio, FileText, CalendarDays, Layers, Rocket, GraduationCap, Clock4, Briefcase, Trophy, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Marketplace, Recommendation, TabType, TabData } from "./types";
import LatestArticlesCard from "./LatestArticlesCard";
import LatestEventsCard from "./LatestEventsCard";
import { RecommendationCardMini, RunningLightBorderWrapper } from "./RecommendationCardMini";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import Typewriter from "typewriter-effect";
import { AnimatePresence } from 'framer-motion';

interface HeroSectionProps {
  marketplace: Marketplace;
  recommendations?: Recommendation[];
  tabData?: TabData;
  onBuySellClick?: (rec: Recommendation) => void;
  // Purchased plan ids — used to render a recommendation card unlocked when the
  // viewer has bought a plan it's shared with. Omitted → cards stay locked.
  subscribedServiceIds?: Set<string>;
}

// Neon Glow Border Wrapper for larger cards
function NeonGlowBorderWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative p-[2px] rounded-xl overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-xl animate-neon-glow" />
      <div className="absolute inset-[1px] bg-white rounded-xl z-0" />
      <div className="relative z-10 bg-white rounded-xl">
        {children}
      </div>

      <style jsx>{`
        @keyframes neon-glow {
          0%, 100% {
            filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.7)) 
                   drop-shadow(0 0 10px rgba(147, 51, 234, 0.5));
            opacity: 0.8;
          }
          50% {
            filter: drop-shadow(0 0 10px rgba(59, 130, 246, 1)) 
                   drop-shadow(0 0 20px rgba(147, 51, 234, 0.7))
                   drop-shadow(0 0 30px rgba(236, 72, 153, 0.4));
            opacity: 1;
          }
        }
        
        .animate-neon-glow {
          animation: neon-glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Pulsing Border Wrapper for Top Experts card
function PulsingBorderWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative p-[2px] rounded-xl overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 animate-pulse-glow rounded-xl" />
      <div className="absolute inset-[1px] bg-white rounded-xl z-0" />
      <div className="relative z-10 bg-white rounded-xl">
        {children}
      </div>

      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.5;
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.4);
          }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function HeroSection({
  marketplace,
  recommendations = [],
  tabData = {},
  onBuySellClick,
  subscribedServiceIds,
}: HeroSectionProps) {
  const params = useParams();
  const marketplaceId = params?.slug as string | undefined;
  const [currentTitleIndex, setCurrentTitleIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const titles = [
    {
      title: "Expert Trading Ideas",
      subtitle: "Real-time trade signals from SEBI-approved analysts.\nMaximize your returns with precision execution.",
      highlight: true,
      tab: "recommendations",
      image: "/mp2.png"  // Add image path
    },
    {
      title: "Expert Model Portfolios",
      subtitle: "Mirror top-performing investment strategies.\nDiversify like the pros with curated portfolios.",
      highlight: false,
      tab: "portfolio",
      image: "/mp3.png"  // Add image path
    },
    {
      title: "Premium Trading Plans",
      subtitle: "Premium membership plans with exclusive features.\nGet maximum value with our tailored packages.",
      highlight: false,
      tab: "Plans",
      image: "/mp4.png"  // Add image path
    },
    {
      title: "Market Mastery Courses",
      subtitle: "Learn from market legends and chart masters.\nTransform your trading with proven strategies.",
      highlight: false,
      tab: "lms",
      image: "/mp5.png"  // Add image path
    }
  ];
  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);

      setTimeout(() => {
        setCurrentTitleIndex((prevIndex) =>
          prevIndex === titles.length - 1 ? 0 : prevIndex + 1
        );
        setIsVisible(true);
      }, 300);

    }, 4000);

    return () => clearInterval(interval);
  }, [titles.length]);

  const firstTwoRecommendations = recommendations.slice(0, 2);
  const current = titles[currentTitleIndex];

  // Banner carousel state — only show if marketplace has banners configured
  const banners = marketplace.banners && marketplace.banners.length > 0
    ? marketplace.banners
    : [];
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => {
      setCurrentBannerIndex((p) => (p + 1) % banners.length);
    }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners.length]);





  return (
    <div className="bg-gradient-to-b from-slate-50 mt-[76px] to-white min-w-0 overflow-x-hidden">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Recommendations */}
          <div className="min-w-0">


            {/* Live Recommendations Section */}
            <div className="space-y-3 sm:space-y-5 mt-3 sm:mt-5">
              {/* Section Header */}
              

              {/* Banner Carousel - only shown if banners are configured */}
              {banners.length > 0 && (
                <div className="relative w-full aspect-[16/6] sm:aspect-[16/5] rounded-xl overflow-hidden bg-slate-100 shadow-sm">
                  {banners.map((banner, idx) => {
                    const img = (
                      <img
                        key={banner.imageUrl}
                        src={banner.imageUrl}
                        alt={`Banner ${idx + 1}`}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                          currentBannerIndex === idx ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    );
                    return banner.ctaLink ? (
                      <a
                        key={banner.imageUrl}
                        href={banner.ctaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`absolute inset-0 cursor-pointer transition-opacity duration-700 ${
                          currentBannerIndex === idx ? "opacity-100 z-[1]" : "opacity-0 z-0"
                        }`}
                      >
                        <img
                          src={banner.imageUrl}
                          alt={`Banner ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ) : (
                      img
                    );
                  })}
                  {/* Indicator dots */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {banners.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentBannerIndex(idx)}
                        aria-label={`Show banner ${idx + 1}`}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          currentBannerIndex === idx ? "w-6 bg-white" : "w-1.5 bg-white/60"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5">
                    {/* <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span> */}
                    {/* <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Live</span> */}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Trading Ideas</h3>
                  {/* <span className="text-xs text-slate-400 font-medium">{recommendations.length} open</span> */}
                </div>
                <Link
                  href={marketplaceId ? `/marketplace/${marketplaceId}/recommendations` : "#"}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  View All &rarr;
                </Link>
              </div>

              {/* Recommendations Grid - 2 cards below the banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {firstTwoRecommendations.map((item, index) => (
                  <div key={item._id} className="relative">
                    <RecommendationCardMini recommendation={item} index={index} onBuySellClick={onBuySellClick} marketplaceSlug={marketplaceId} subscribedServiceIds={subscribedServiceIds} />
                  </div>
                ))}

                {/* Skeleton Loaders with border animation */}
                {firstTwoRecommendations.length === 0 && (
                  <>
                    {[1, 2].map((i) => (
                      <RunningLightBorderWrapper key={i}>
                        <Card className="border-0 shadow-none h-full">
                          <CardContent className="p-2">
                            <div className="animate-pulse">
                              <div className="h-2 bg-gray-900 rounded w-3/4 mb-1.5"></div>
                              <div className="h-3.5 bg-gray-200 rounded w-1/2 mb-2"></div>
                              <div className="space-y-1">
                                <div className="h-1.5 bg-gray-200 rounded"></div>
                                <div className="h-1.5 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </RunningLightBorderWrapper>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Latest Articles & Top Experts */}
          <div className="space-y-4 mt-[22px] sm:space-y-6 min-w-0">
            {/* Latest Articles Card */}
            <div className="relative">
              {/* <NeonGlowBorderWrapper> */}
                <LatestArticlesCard
                  tabData={tabData}
                  marketplaceSlug={marketplaceId}
                />
              {/* </NeonGlowBorderWrapper> */}
            </div>

            {/* Events & Webinars Card */}
            <div className="relative min-w-0">
              {/* <PulsingBorderWrapper> */}
                <LatestEventsCard tabData={tabData} marketplaceSlug={marketplaceId} />
              {/* </PulsingBorderWrapper> */}
            </div>
          </div>
        </div>
      </div>

      {/* Global Styles for Animations */}
      <style jsx global>{`
        @keyframes pulse-fast {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        
        .animate-pulse-fast {
          animation: pulse-fast 1s ease-in-out infinite;
        }
        
        /* Smooth transitions */
        * {
          transition: all 0.3s ease;
        }
      `}</style>

    </div>
  );
}

