// app/marketplace/[id]/components/HeroSection.tsx
"use client";

import { ShieldCheck, TrendingUp, TrendingDown,History, Users, Zap, Radio, FileText, CalendarDays, Layers, Rocket, GraduationCap, Clock4, Briefcase, Trophy, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Marketplace, Recommendation, TabType, TabData } from "./types";
import LatestArticlesCard from "./LatestArticlesCard";
import { BrokerSelectModal } from "./BrokerSelectModal";
import { BuyOrderModal } from "@/components/Marketplace/BuyOrderModal";
import { useEffect, useState, useCallback } from "react";

const ALICE_BLUE_SESSION_KEY = "aliceBlueSession";
import { Alert } from "@/components/ui/alert";
import Typewriter from "typewriter-effect";
import { AnimatePresence } from 'framer-motion';

interface HeroSectionProps {
  marketplace: Marketplace;
  onTabClick: (tab: TabType) => void;
  activeTab?: TabType;
  recommendations?: Recommendation[];
  tabData?: TabData;
}

// Running Light Border Wrapper for recommendation cards (small size)
function RunningLightBorderWrapper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition((prev) => (prev + 1) % 100);
    }, 30);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative p-[1px] rounded-lg overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600" />
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, 
            transparent 0%, 
            transparent ${position}%, 
            white ${position}%, 
            white ${position + 10}%, 
            transparent ${position + 10}%, 
            transparent 100%)`,
          mixBlendMode: 'overlay',
        }}
      />
      <div className="absolute inset-[1px] bg-white rounded-lg z-0" />
      <div className="relative z-10 bg-white rounded-lg h-full">
        {children}
      </div>
    </div>
  );
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
const titles = [
  {
    title: "Expert Trading Recommendations",
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

export default function HeroSection({
  marketplace,
  onTabClick,
  activeTab = "portfolio",
  recommendations = [],
  tabData = {}, 
}: HeroSectionProps) {
  const [currentTitleIndex, setCurrentTitleIndex] = useState(0);
  const firstTwoRecommendations = recommendations.slice(0, 6);
  const current = titles[currentTitleIndex];
  const [eventType, setEventType] = useState<'upcoming' | 'past'>('past');

  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [showBuyOrderModal, setShowBuyOrderModal] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);

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
  const [isVisible, setIsVisible] = useState(true);
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
  }, []);
  


  const handleBuySellClick = useCallback((recommendation: Recommendation) => {
    if (hasAliceBlueSession()) {
      setSelectedRecommendation(recommendation);
      setShowBuyOrderModal(true);
    } else {
      setShowBrokerModal(true);
    }
  }, [hasAliceBlueSession]);


  
  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-w-0 overflow-x-hidden">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-5 max-w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Recommendations */} 
          <div className="min-w-0">
            {/* Hero Banner */}
{/* Hero Banner with Background Image - Fixed Size, Clean */}

<div className="relative overflow-hidden rounded-2xl text-white mb-5 shadow-xl w-full h-[310px]">
  
  <div className="absolute inset-0 z-0">
    <motion.img
      key={currentTitleIndex}
      src={current.image}
      alt="Market background"
      className="w-full h-full object-cover"
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
    />
    
    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30"></div>
  </div>

  
  <div className="relative z-10 w-full h-full flex flex-col justify-center px-8">
    <motion.div
      key={`badge-${currentTitleIndex}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Badge className="mb-4 bg-white/20 backdrop-blur-sm text-white border-none w-fit">
        <ShieldCheck className="h-3 w-3 mr-1" />
        SEBI Registered Platform
      </Badge>
    </motion.div>

    <div className="mb-4 overflow-hidden">
      <motion.div
        key={`title-${currentTitleIndex}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-4xl font-bold mb-4 drop-shadow-lg">
          {current.highlight && (
            <span className="inline-block animate-pulse [animation-duration:2s] mr-2">✨</span>
          )}
          {current.title}
        </h2>
        <p className="text-white/90 mb-6 text-lg whitespace-pre-line drop-shadow-md">
          {current.subtitle}
        </p>
      </motion.div>
    </div>

    <motion.div
      key={`buttons-${currentTitleIndex}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="flex flex-wrap gap-4"
    >
      <Button
        className="bg-white text-gray-900 hover:bg-gray-100 shadow-lg px-6 py-3 font-semibold border-0"
        onClick={() => onTabClick("recommendations")}
      >
        Login to Trade
      </Button>
      <Button
        variant="outline"
        className="text-white border-white/30 bg-black/20 hover:bg-black/30 px-6 py-3 backdrop-blur-sm"
      >
        Explore Now
      </Button>
    </motion.div>
  </div>
</div>
            

            {/* Navigation Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-2">
              {[
                { 
                  icon: Users, 
                  label: "Experts", 
                  tab: "ra",
                  color: "emerald", 
                  bg: "from-emerald-500/10 to-emerald-400/5", 
                  border: "border-blue-200/50", 
                  text: "text-black-700" 
                },
                { 
                  icon: TrendingUp, 
                  label: "Recommendations", 
                  tab: "recommendations",
                  color: "emerald", 
                  bg: "from-emerald-500/10 to-emerald-400/5", 
                  border: "border-emerald-200/50", 
                  text: "text-black-700" 
                },

                { 
                  icon: Briefcase, 
                  label: "Portfolio", 
                  tab: "portfolio",
                  color: "emerald", 
                  bg: "from-emerald-500/10 to-emerald-400/5", 
                  border: "border-purple-200/50", 
                  text: "text-black-700" 
                },
                { 
                  icon: Layers, 
                  label: "Plans", 
                  tab: "services",
                  color: "emerald", 
                  bg: "from-emerald-500/10 to-emerald-400/5",
                  text: "text-black-700" 
                },
                { 
                  icon: FileText, 
                  label: "Articles", 
                  tab: "articles",
                  color: "emerald", 
                  bg: "from-emerald-500/10 to-emerald-400/5", 
                  border: "border-indigo-200/50", 
                  text: "text-black-700" 
                },
                { 
                  icon: CalendarDays, 
                  label: "Events", 
                  tab: "events",
                  color: "emerald", 
                  bg: "from-emerald-500/10 to-emerald-400/5", 
                  border: "border-pink-200/50", 
                  text: "text-black-700" 
                },
                { 
                  icon: GraduationCap, 
                  label: "LMS", 
                  tab: "lms",
                  color: "emerald", 
                  bg: "from-emerald-500/10 to-emerald-400/5", 
                  border: "border-teal-200/50", 
                  text: "text-black-700" 
                },

                // { 
                //   icon: Rocket, 
                //   label: "Algo", 
                //   tab: "algo_strategies",
                //   color: "emerald", 
                //   bg: "from-emerald-500/10 to-emerald-400/5", 
                //   border: "border-cyan-200/50", 
                //   text: "text-black-700" 
                // },
                
              ].map((item, index) => {
                const Icon = item.icon;
                
                return (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => onTabClick(item.tab as TabType)}
                    className={`
                      flex-col h-auto py-1.5 sm:py-2 min-w-0
                      bg-gradient-to-br ${item.bg} backdrop-blur-sm
                      border ${item.border}
                      hover:shadow-lg hover:scale-105
                      transition-all duration-300
                      ${activeTab === item.tab ? 'ring-2 ring-blue-500 ring-opacity-50 scale-105' : ''}
                    `}
                  >
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.text} mb-1 sm:mb-2 ${activeTab === item.tab ? 'animate-pulse' : ''}`} />
                    <span className={`text-[10px] sm:text-xs font-medium ${item.text} truncate`}>
                      {item.label}
                    </span>
                  </Button>
                );
              })}
            </div>

            {/* Live Recommendations Section */}
            <div className="space-y-3 sm:space-y-5 mt-3 sm:mt-5">
              {/* Section Header - WITH LIVE NOW animation */}
              <div className="relative overflow-hidden bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm">
                {/* Live pulse animation background */}
                <div className="absolute inset-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-pulse [animation-duration:2s]" />
                </div>
                
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg flex items-center gap-2">
                      <span className="relative">
                        Live Recommendations
                        <span className="absolute -right-2 -top-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                        </span>
                      </span>
                    </h3>
                    
                  </div>
                  <div className="gap-3 flex  flex-col">
 <div className="text-sm  bg-white/80 backdrop-blur-sm cursor-pointer  text-blue-700 px-3 py-1 rounded-md border border-gray-200">
                    View All <span className="font-bold text-blue-700">{recommendations.length}</span> recommendations
                  </div>
                  {/* <div className="flex justify-end cursor-pointer items-start font-semibold underline text-blue-600">
                    View All
                  </div> */}
                  </div>
                 
                  
                </div>
              </div>

              {/* Recommendations Grid - WITH RunningLightBorderWrapper */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {firstTwoRecommendations.map((item, index) => (
                  <div key={item._id} className="relative">
                    <RunningLightBorderWrapper>
                      <RecommendationCardMini recommendation={item} index={index} onBuySellClick={handleBuySellClick} />
                    </RunningLightBorderWrapper>
                    
                    {/* HOT indicator for first item with animation */}
                    
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
        <div className="space-y-4 sm:space-y-6 min-w-0">
  {/* Latest Articles Card */}
  <div className="relative">
    <NeonGlowBorderWrapper>
      <LatestArticlesCard
        tabData={tabData}
        onTabClick={onTabClick}
      />
    </NeonGlowBorderWrapper>
  </div>

  {/* Events & Webinars Card */}
  <div className="relative min-w-0">
    <PulsingBorderWrapper>
      <Card className="border-0 shadow-none overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 sm:p-6">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-black-600 flex-shrink-0" />
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 truncate">
              Events & Webinars
            </CardTitle>
          </div>
          
          {/* Toggle Buttons - Below Title */}
         <div className="flex items-center gap-2 mt-2 sm:mt-3 flex-wrap">
  <button
    onClick={() => setEventType('upcoming')}
    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
      eventType === 'upcoming'
        ? 'bg-blue-700 text-white shadow-sm border-2 border-transparent'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-green-600'
    }`}
  >
    Upcoming
  </button>
  <button
    onClick={() => setEventType('past')}
    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
      eventType === 'past'
        ? 'bg-blue-600 text-white shadow-sm border-2 border-transparent'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-rose-600'
    }`}
  >
    Past
  </button>
</div>
        </CardHeader>
        
        <CardContent className="space-y-2 p-3 sm:p-6 pt-0">
          {/* Section Header */}
          
          
          {/* Events List */}
          <div className="space-y-3 sm:space-y-6">
            {eventType === 'upcoming' ? (
              /* 3 Upcoming Events */
              <>
                {/* Event 1 */}
                <div className="p-3 hover:bg-slate-50 rounded-lg transition-colors border border-green-200 bg-green-50/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                        <CalendarDays className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 text-sm">Market Outlook 2026</h5>
                      <p className="text-xs text-gray-600">Webinar with industry experts</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs bg-white border-green-300 text-green-700">
                          <Clock4 className="h-3 w-3 mr-1" />
                          Jun 25, 3:00 PM
                        </Badge>
                        <Badge className="text-xs bg-green-100 text-green-700 border-0">
                          FREE
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                
                {/* Event 3 - New */}
                <div className="p-3 hover:bg-slate-50 rounded-lg transition-colors border border-purple-200 bg-purple-50/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 text-sm">Derivatives Strategy Session</h5>
                      <p className="text-xs text-gray-600">Advanced options strategies</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs bg-white border-purple-300 text-purple-700">
                          <Clock4 className="h-3 w-3 mr-1" />
                          Mar 15, 2:00 PM
                        </Badge>
                        <Badge className="text-xs bg-purple-100 text-purple-700 border-0">
                          PREMIUM
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* 3 Past Events */
              <>
                {/* Past Event 1 */}
                <div className="p-3 hover:bg-slate-50 rounded-lg transition-colors border border-gray-200">
                  <div className="flex items-start gap-3 opacity-70">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 text-sm">Options Trading Masterclass</h5>
                      <p className="text-xs text-gray-600">Completed on Feb 18, 2024</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs bg-gray-50 border-gray-300 text-gray-600">
                          <Clock4 className="h-3 w-3 mr-1" />
                          Recording Available
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Past Event 2 */}
                {/* <div className="p-3 hover:bg-slate-50 rounded-lg transition-colors border border-gray-200">
                  <div className="flex items-start gap-3 opacity-70">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 text-sm">Fundamental Analysis Summit</h5>
                      <p className="text-xs text-gray-600">Completed on Feb 10, 2024</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs bg-gray-50 border-gray-300 text-gray-600">
                          <FileText className="h-3 w-3 mr-1" />
                          Slides Available
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div> */}

                {/* Past Event 3 - New */}
                <div className="p-3 hover:bg-slate-50 rounded-lg transition-colors border border-gray-200">
                  <div className="flex items-start gap-3 opacity-70">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        <CalendarDays className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 text-sm">Quarterly Earnings Webinar</h5>
                      <p className="text-xs text-gray-600">Completed on Jan 28, 2024</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs bg-gray-50 border-gray-300 text-gray-600">
                          <Clock4 className="h-3 w-3 mr-1" />
                          Recording Available
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* View All Events Button */}
          <motion.div
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(147, 51, 234, 0.3)",
                "0 0 0 8px rgba(147, 51, 234, 0)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "loop",
            }}
            className="relative w-full mt-4"
          >
            <Button
              variant="outline"
              className="w-full relative overflow-hidden border-purple-600 text-purple-700 hover:bg-purple-50 font-medium text-sm"
              onClick={() => onTabClick("events")}
            >
              <motion.div
                className="absolute inset-0 bg-purple-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.2, 0] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  repeatType: "loop",
                }}
              />
              <span className="relative z-10 flex items-center justify-center gap-2">
                <CalendarDays className="h-4 w-4 animate-pulse" />
                View All {eventType === 'upcoming' ? 'Upcoming' : 'Past'} Events
              </span>
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </PulsingBorderWrapper>
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

      <BrokerSelectModal
        isOpen={showBrokerModal}
        onClose={() => setShowBrokerModal(false)}
      />
      {selectedRecommendation && (
        <BuyOrderModal
          isOpen={showBuyOrderModal}
          onClose={() => {
            setShowBuyOrderModal(false);
            setSelectedRecommendation(null);
          }}
          recommendation={selectedRecommendation}
        />
      )}
    </div>
  );
}


// Mini Recommendation Card Component - WITH P&L DISPLAY
function RecommendationCardMini({ recommendation, index, onBuySellClick }: { recommendation: Recommendation; index: number; onBuySellClick?: (recommendation: Recommendation) => void }) {
  const isBuy = recommendation.entryType?.toLowerCase() === "buy";
  const currentPrice = recommendation.ltp || recommendation.entryPrice || 0;
  const entryPrice = recommendation.entryPrice || 0;
  const percentageChange = entryPrice > 0
    ? (((currentPrice - entryPrice) / entryPrice) * 100).toFixed(2)
    : "0";

  const scriptName = recommendation.scriptname || "N/A";
  const exchange = recommendation.exchange || "NSE";
  const authorName = recommendation.authorData?.name || "Unknown Analyst";
  const authorType = recommendation.authorData?.type || "Research Analyst";


  // Simpler helper function
// Compact version
const formatValidityDate = (dateString :any) => {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleString('en-IN', { 
      day: '2-digit', 
      month: 'short',
      // hour: '2-digit', 
      // minute: '2-digit',
      hour12: true 
    }).replace(',', '');
    
  } catch (error) {
    return dateString;
  }
};

  const authorInitials = authorName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const lotsize = Number(recommendation.lotsize) || 1;
  
  // Calculate or use existing P&L
  const pnl = recommendation.pnl || 0;
  const pnlPercentage = recommendation.pnlpercentage || 0;
  
  // Calculate potential return
  const potentialReturn = recommendation.target && entryPrice > 0
    ? (((recommendation.target - entryPrice) / entryPrice) * 100).toFixed(2)
    : "0.00";

  const getPnLColor = (value: number) => {
    if (value > 0) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (value < 0) return "text-red-600 bg-red-50 border-red-200";
    return "text-slate-600 bg-slate-50 border-slate-200";
  };

  const getPnLIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-3 w-3" />;
    if (value < 0) return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  

  return (
  <motion.div
    whileHover={{ y: -4 }}
    transition={{ duration: 0.2 }}
    className="h-full"
  >
    <div className="bg-white rounded-xl p-3 sm:p-5 hover:shadow-lg transition-all duration-300 border border-slate-200 h-full flex flex-col min-w-0">

      {/* ---------------- ROW 1: Header + LTP + P&L ---------------- */}
      <div className="grid grid-cols-12 items-center gap-2 mb-3 sm:mb-4">
        {/* Left: Script Info */}
        <div className="col-span-12 sm:col-span-6 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {scriptName}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[10px] sm:text-xs mt-1 sm:mt-1.5 flex-wrap">
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">{exchange}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">Lot: {lotsize}</span>
          </div>
        </div>

        {/* Center: LTP */}
        <div className="col-span-6 sm:col-span-3 text-center">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            LTP
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {currentPrice.toFixed(2)}
          </div>
        </div>

        {/* Right: P&L */}
        <div className="col-span-6 sm:col-span-3 flex justify-end">
          <div className={`text-right px-2 sm:px-3 py-1 rounded-lg min-w-0 ${getPnLColor(pnl)}`}>
            <div className="text-sm sm:text-[18px] font-bold truncate">
              {pnl > 0 ? "+" : ""}{pnl.toFixed(2)}
            </div>
            <div className="text-[9px] sm:text-[10px] font-medium opacity-90">
              ({pnlPercentage > 0 ? "+" : ""}{pnlPercentage.toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- ROW 2: Entry/Target/SL/Validity ---------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-slate-100 pt-3 sm:pt-4 mb-2">
        <div className="text-center min-w-0">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">
            Entry
          </div>
          <div className="font-semibold text-slate-900 bg-slate-50 py-1 px-1.5 sm:px-2 rounded-md text-xs sm:text-sm truncate">
            {entryPrice.toFixed(2)}
          </div>
        </div>

        <div className="text-center min-w-0">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">
            Target
          </div>
          <div className="font-semibold text-emerald-700 bg-emerald-50 py-1 px-1.5 sm:px-2 rounded-md text-xs sm:text-sm truncate">
            {recommendation.target?.toFixed(2) || "0.00"}
          </div>
        </div>

        <div className="text-center min-w-0">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">
            Stop Loss
          </div>
          <div className="font-semibold text-rose-700 bg-rose-50 py-1 px-1.5 sm:px-2 rounded-md text-xs sm:text-sm truncate">
            {recommendation.stoploss?.toFixed(2) || "0.00"}
          </div>
        </div>

        {recommendation.validity && (
          <div className="text-center min-w-0 col-span-2 sm:col-span-1">
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Validity</span>
            </div>
            <div className="font-medium text-slate-700 bg-slate-50 py-1 px-1.5 sm:px-2 rounded-md text-xs sm:text-sm">
              {formatValidityDate(recommendation.validity)}
            </div>
          </div>
        )}
      </div>

      {/* ---------------- ROW 3: Author + Trade Button ---------------- */}
     <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 sm:pt-4 mt-auto">
  {/* Author Section */}
  <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
    <div className="relative flex-shrink-0">
      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm ring-2 ring-white">
        {recommendation.authorData?.authorImage ? (
          <img
            src={recommendation.authorData.authorImage}
            alt={authorName}
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover"
          />
        ) : (
          <span className="text-white font-semibold text-xs sm:text-sm">
            {authorInitials}
          </span>
        )}
      </div>
      {/* Verified Badge */}
      
    </div>
    
    <div className="min-w-0 overflow-hidden">
      <div className="flex items-center gap-1 sm:gap-1.5">
        <div className="text-xs sm:text-sm font-semibold text-slate-900 truncate leading-tight">
          {authorName}
        </div>
        {/* Alternative: Inline verified badge */}
        {recommendation.authorData && (
          <svg 
            className="w-4 h-4 text-blue-500 flex-shrink-0" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
              clipRule="evenodd" 
            />
          </svg>
        )}
      </div>
      <div className="text-[10px] sm:text-xs text-slate-500 truncate flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${isBuy ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
        {authorType}
      </div>
    </div>
  </div>

  <Button
  size="sm"
  onClick={() => onBuySellClick?.(recommendation)}
  className={`h-7 sm:h-8 px-3 sm:px-5 text-xs sm:text-sm font-semibold shadow-sm relative overflow-hidden animate-pulse-fast flex-shrink-0 ${
    isBuy
      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
      : "bg-red-500 hover:bg-red-900 text-white"
  }`}
>
  {isBuy ? "Buy" : "Sell"}
</Button>
</div>

    </div>
  </motion.div>
);
}


