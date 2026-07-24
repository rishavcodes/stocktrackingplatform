// components/Marketplace/CardComponents.tsx
"use client";

import { 
  Users, FileText, BadgeCheck, MapPinIcon, 
  Briefcase, BarChart3, TrendingUp, TrendingDown,
  CalendarDays, Layers, Rocket, GraduationCap,
  Star, Trophy, Eye, CheckCircle, Globe2,
  MailIcon, Clock4, Award, PieChart,
  Building2, ShieldCheck, Heart, Target,
  Sparkles, Zap, Clock,
  Tag, BarChart2, ArrowUpRight, ArrowDownRight,
  Percent, Calendar, UserCheck, Users2, 
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RA, Recommendation, Portfolio, Service, Article, Event, Course, Marketplace } from "./types";
import { buildProductUrl } from "@/lib/customDomain";
import { normalizePortfolioPricing } from "@/lib/portfolioPricing";

// Helper function for consistent gradient backgrounds
const GradientBackground = () => (
  <motion.div 
    className="absolute inset-0 bg-gradient-to-br from-[#01a6b6]/3 via-transparent to-[#018b99]/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
  />
);

// Helper function for consistent stats display
interface StatItem {
  icon: any;
  value: number | string;
  label: string;
  bg: string;
  border: string;
  color: string;
}

const StatBlock = ({ stat, index }: { stat: StatItem; index: number }) => (
  <motion.div
    key={index}
    whileHover={{ scale: 1.03 }}
    className={`p-2 bg-gradient-to-br ${stat.bg} rounded-lg border ${stat.border} text-center`}
  >
    <div className="flex items-center justify-center gap-1.5 mb-0.5">
      <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
      <div className="text-base font-bold text-gray-900">{stat.value}</div>
    </div>
    <div className="text-xs text-gray-600">{stat.label}</div>
  </motion.div>
);



export function ExpertCardMini({ ra, marketplaceId }: { ra: RA; marketplaceId?: string }) {
  const displayName = ra.RegName || ra.name || ra.companyName || "Expert";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
  const category = ra.category || "Research Analyst";
  const location = [ra.city, ra.state].filter(Boolean).join(", ");

  const recStats = ra.stats?.recommendationStats;
  const totalRecs = recStats?.total ?? 0;
  const openRecs = recStats?.open ?? 0;
  const closedRecs = recStats?.close ?? 0;
  const returnPct = recStats?.returnPercentage ?? 0;
  const subscribers = ra.stats?.Subscribers?.length ?? 0;
  const experience = ra.stats?.contentStats?.experience ?? 0;

  const profileHref = marketplaceId
    ? `/marketplace/${marketplaceId}/experts/${ra._id}`
    : `/marketplace/serviceprovider/${ra._id}`;

  return (
    <div className="h-full">
      <Card className="group hover:shadow-lg transition-all duration-300 border border-slate-200 overflow-hidden h-full bg-white flex flex-col rounded-xl">
        <div className="p-4 flex-1 flex flex-col gap-3">
          {/* Profile header */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-slate-100">
              {ra.profileUrl ? (
                <img src={ra.profileUrl} alt={displayName} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <span className="text-slate-600 font-bold text-sm">{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900 truncate">{displayName}</h3>
                {ra.verified && (
                  <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">
                  {category}
                </span>
                {location && (
                  <span className="text-[10px] text-slate-400 truncate">{location}</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="text-center py-1.5 bg-emerald-50 rounded-lg">
              <div className="text-sm font-bold text-emerald-700">{totalRecs}</div>
              <div className="text-[9px] font-medium text-emerald-600 uppercase">Calls</div>
            </div>
            <div className="text-center py-1.5 bg-blue-50 rounded-lg">
              <div className="text-sm font-bold text-blue-700">{subscribers}</div>
              <div className="text-[9px] font-medium text-blue-600 uppercase">Subscribers</div>
            </div>
            <div className="text-center py-1.5 bg-amber-50 rounded-lg">
              <div className="text-sm font-bold text-amber-700">
                {returnPct > 0 ? `${returnPct.toFixed(0)}%` : `${experience}y`}
              </div>
              <div className="text-[9px] font-medium text-amber-600 uppercase">
                {returnPct > 0 ? "Returns" : "Exp"}
              </div>
            </div>
          </div>

          {/* Secondary stats row */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span><span className="font-semibold text-slate-700">{openRecs}</span> active calls</span>
            <span><span className="font-semibold text-slate-700">{closedRecs}</span> closed</span>
            {ra.regNumber && <span className="text-slate-400">{ra.regNumber}</span>}
          </div>

          {/* View Profile */}
          <div className="pt-2 border-t border-slate-100 mt-auto">
            <Link href={profileHref} className="block">
              <Button
                size="sm"
                className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg"
              >
                View Profile
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function ExpertCard({ ra, marketplaceId }: { ra: RA; marketplaceId?: string }) {
  const displayName = ra.RegName || ra.name || ra.companyName || "Expert";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
  const category = ra.category || "Research Analyst";
  const about = ra.AboutMe || ra.description || "";

  const totalRecs = ra.stats?.recommendationStats?.total ?? 0;
  // Prefer serviceStats.totalSubscribers (computed by cron), fallback to Subscribers array length
  const subscribers =
    ra.stats?.serviceStats?.totalSubscribers ??
    ra.stats?.Subscribers?.length ??
    0;
  // Plans come from serviceStats.totalPlans (correct source)
  const totalPlans = ra.stats?.serviceStats?.totalPlans ?? 0;
  const totalPortfolios = ra.stats?.modelPortfolioStates?.totalPortfolios ?? 0;

  const profileHref = marketplaceId
    ? `/marketplace/${marketplaceId}/experts/${ra._id}`
    : `/marketplace/serviceprovider/${ra._id}`;

  return (
    <Link href={profileHref} className="h-full block group">
      <div className="relative h-full bg-white flex flex-col rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden cursor-pointer">
        {/* Subtle top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-blue-400 to-slate-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="p-5 flex flex-col h-full">
          {/* Top: Avatar + Name/Category in flex row */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm">
                {ra.profileUrl ? (
                  <img src={ra.profileUrl} alt={displayName} className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <span className="text-slate-600 font-bold text-xl">{initials}</span>
                )}
              </div>
              {ra.verified && (
                <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-sm">
                  <BadgeCheck className="w-4 h-4 text-blue-500" fill="currentColor" stroke="white" strokeWidth={2.5} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors leading-tight">
                {displayName}
              </h3>
              <div className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                  {category}
                </span>
              </div>
              {ra.regNumber && (
                <p className="text-[10px] text-slate-400 font-mono mt-1.5 truncate">
                  SEBI REG NO: {ra.regNumber}
                </p>
              )}
            </div>
          </div>

          {/* About */}
          {about && (
            <div className="mt-4 pl-3 border-l-2 border-slate-100">
              <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">About</h4>
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                {about}
              </p>
            </div>
          )}

          {/* Stats — 4 stats in one line, in a subtle stat bar */}
          <div className="grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-dashed border-slate-200">
            <div className="text-center">
              <div className="text-lg font-bold text-slate-900 leading-none">{totalRecs}</div>
              <div className="text-[9px] font-medium text-slate-500 uppercase tracking-wide mt-1.5">Ideas</div>
            </div>
            <div className="text-center border-l border-slate-100">
              <div className="text-lg font-bold text-slate-900 leading-none">{subscribers}</div>
              <div className="text-[9px] font-medium text-slate-500 uppercase tracking-wide mt-1.5">Subs</div>
            </div>
            <div className="text-center border-l border-slate-100">
              <div className="text-lg font-bold text-slate-900 leading-none">{totalPlans}</div>
              <div className="text-[9px] font-medium text-slate-500 uppercase tracking-wide mt-1.5">Plans</div>
            </div>
            <div className="text-center border-l border-slate-100">
              <div className="text-lg font-bold text-slate-900 leading-none">{totalPortfolios}</div>
              <div className="text-[9px] font-medium text-slate-500 uppercase tracking-wide mt-1.5">Portfolios</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function RACard({ ra, marketplace, marketplaceId }: { ra: RA; marketplace?: Marketplace; marketplaceId?: string }) {
  const displayName = ra.name || ra.RegName || ra.companyName || "N/A";
  const description = ra.AboutMe || ra.description;
  const truncatedDescription = description
    ? description.length > 100 ? description.substring(0, 100) + "..." : description
    : "No description available";

  const stats = ra.stats?.contentStats || { articles: 0, events: 0, services: 0 };
  const recommendationStats = ra.stats?.recommendationStats || { total: 0, returnPercentage: 0 };
  const articles = stats.articles ?? 0;
  const services = stats.services ?? 0;
  const returnPercentage = recommendationStats.returnPercentage ?? 0;
  const totalTrades = recommendationStats.total ?? 0;
  const totalCourses = ra.stats?.courseStates?.totalCourses ?? 0;
  const totalModelPortfolios = ra.stats?.modelPortfolioStates?.totalPortfolios ?? 0;
  const isPositiveReturn = returnPercentage >= 0;
  const locationStr = [ra.city, ra.state].filter(Boolean).join(", ") || null;
  const profileHref = marketplaceId || marketplace?.slug
    ? `/marketplace/${marketplaceId || marketplace?.slug}/experts/${ra._id}`
    : `/marketplace/serviceprovider/${ra._id}`;

  return (
    <div className="h-full">
      <Card className="group hover:shadow-xl transition-all duration-300 border border-slate-200 overflow-hidden h-full bg-white flex flex-col rounded-2xl">
        <div className="p-5 flex flex-col gap-3 flex-1">
          {/* Header: avatar + name + badges */}
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              {ra.profileUrl ? (
                <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 shadow-sm ring-2 ring-white">
                  <img src={ra.profileUrl} alt={displayName} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#01a6b6] to-[#018b99] flex items-center justify-center shadow-sm">
                  <Users className="w-5 h-5 text-white" />
                </div>
              )}
              {ra.verified && (
                <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5 ring-2 ring-white">
                  <BadgeCheck className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-[#01a6b6] transition-colors">
                {displayName}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[11px] font-medium">
                  {ra.category || "RA"}
                </span>
                <span className="text-slate-300 text-[10px]">•</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[11px] font-medium">
                  {ra.type || "Individual"}
                </span>
              </div>
            </div>
          </div>

          {/* Reg number + location */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <BadgeCheck className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              <span className="font-mono truncate max-w-[100px]">{ra.regNumber || "—"}</span>
            </div>
            {locationStr && (
              <div className="flex items-center gap-1">
                <MapPinIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="truncate max-w-[120px]">{locationStr}</span>
              </div>
            )}
          </div>

          {/* About */}
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
            {truncatedDescription}
          </p>

          {/* Performance & Content */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              Performance & Content
            </span>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Trades</div>
                <div className="text-sm font-bold text-slate-800">{totalTrades}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Return</div>
                <div className={`text-sm font-bold ${isPositiveReturn ? "text-emerald-600" : "text-red-600"}`}>
                  {returnPercentage >= 0 ? "+" : ""}{returnPercentage.toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Articles</div>
                <div className="text-sm font-bold text-slate-800">{articles}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Courses</div>
                <div className="text-sm font-bold text-slate-800">{totalCourses}</div>
              </div>
            </div>
          </div>

          {/* Footer: View Profile */}
          <div className="pt-3 mt-auto border-t border-slate-100 flex justify-end">
            <Link href={profileHref}>
              <Button
                size="sm"
                className="h-9 px-4 bg-gradient-to-r from-[#01a6b6] to-[#018b99] hover:from-[#018b99] hover:to-[#01a6b6] text-white font-semibold text-xs rounded-xl transition-all duration-200"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                View Profile
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

// StatPill component for the grid
function StatPill({ icon: Icon, value, label, accent }: { icon: any; value: number; label: string; accent: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        padding: "10px 14px",
        background: "rgba(255,255,255,0.06)",
        borderRadius: "10px",
        border: `1px solid ${accent}33`,
        minWidth: "72px",
        transition: "background 0.2s, border-color 0.2s",
        cursor: "default",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = `${accent}18`;
        e.currentTarget.style.borderColor = `${accent}66`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        e.currentTarget.style.borderColor = `${accent}33`;
      }}
    >
      <Icon size={14} color={accent} strokeWidth={2} />
      <span style={{ fontSize: "15px", fontWeight: "700", color: "#f0ece4", fontFamily: "'DM Serif Display', serif", lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: "10px", fontWeight: "500", color: "#8a8278", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
    </div>
  );
}


// RecommendationCard Component (matching design)
export function RecommendationCard({ recommendation, onBuySellClick, marketplaceId }: { recommendation: Recommendation; onBuySellClick?: (rec: Recommendation) => void; marketplaceId?: string }) {
  const formatPNL = (pnl: string | number): string => {
    if (typeof pnl === 'string') {
      if (pnl.includes('%')) return pnl;
      const num = parseFloat(pnl);
      return isNaN(num) ? '0.00%' : `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
    }
    return `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%`;
  };

  const pnlValue = formatPNL(recommendation.pnl || 0);
  const isPositivePNL = pnlValue.startsWith('+') || parseFloat(pnlValue) > 0;
  const isBuy = recommendation.entryType === "Buy";
  const validityDate = new Date(recommendation.validity);
  const now = new Date();
  const diffInDays = Math.floor((validityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const dayMonth = validityDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card className="group hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-[#01a6b6]/50 overflow-hidden h-full bg-white relative">
        <GradientBackground />
        
        {/* Header */}
        <div className="relative px-4 border-b border-gray-100">
          <CardHeader className="p-0">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative flex-shrink-0"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#01a6b6] to-[#018b99] flex items-center justify-center shadow-md">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-bold text-gray-900 truncate group-hover:text-[#01a6b6] transition-colors">
                  {recommendation.scriptname}
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${isBuy
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                  }`}>
                    {recommendation.entryType}
                  </span>
                  <span className="text-gray-400 text-xs">•</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {recommendation.exchange}
                  </span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </div>

        <CardContent className="space-y-3 relative z-10">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                
                <span className="text-xs font-semibold text-gray-700">Entry Price</span>
              </div>
              <div className="text-xs text-gray-600 pl-5 font-semibold">
                ₹{recommendation.entryPrice.toLocaleString()}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-semibold text-gray-700">P&L</span>
              </div>
              <div className={`text-xs pl-5 font-semibold ${isPositivePNL ? 'text-emerald-600' : 'text-rose-600'}`}>
                {pnlValue}
              </div>
            </div>
          </div>

          {/* Targets Grid */}
          <div className="pt-2 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-700 mb-2 block">Targets</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { 
                  icon: ArrowUpRight, 
                  value: `₹${recommendation.target.toLocaleString()}`, 
                  label: "Target", 
                  bg: "from-emerald-50 to-green-50",
                  border: "border-emerald-200",
                  color: "text-emerald-600"
                },
                { 
                  icon: ArrowDownRight, 
                  value: `₹${recommendation.stoploss.toLocaleString()}`, 
                  label: "Stop Loss", 
                  bg: "from-rose-50 to-red-50",
                  border: "border-rose-200",
                  color: "text-rose-600"
                }
              ].map((stat, index) => (
                <StatBlock key={index} stat={stat} index={index} />
              ))}
            </div>
          </div>

          {/* Validity & Author */}
          <div className="pt-2 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-gray-200/50">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${diffInDays < 0 ? 'text-rose-600' : diffInDays <= 1 ? 'text-amber-600' : 'text-gray-900'}`}>
                      {dayMonth}
                    </div>
                    <div className="text-xs text-gray-600">Validity</div>
                  </div>
                </div>
              </div>
          
              <div className="p-2 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-gray-200/50">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 truncate">
                      {recommendation.authorData.name}
                    </div>
                    <div className="text-xs text-gray-600">Author</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2">
            <Link href={marketplaceId ? `/marketplace/${marketplaceId}/recommendations` : "/marketplace/recommendations"} className="flex-1">
              <Button className="w-full bg-gradient-to-r from-[#01a6b6] to-[#018b99] hover:from-[#018b99] hover:to-[#01a6b6] text-white font-semibold py-3 text-sm rounded-lg transition-all duration-300 relative overflow-hidden group">
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: "loop",
                  }}
                />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <BarChart2 className="w-4 h-4" />
                  View Details
                </span>
              </Button>
            </Link>
            {onBuySellClick && (
              <Button
                onClick={() => onBuySellClick(recommendation)}
                className={`flex-1 font-semibold py-3 text-sm rounded-lg transition-all duration-300 ${
                  recommendation.entryType === "Sell"
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {recommendation.entryType === "Sell" ? "Sell" : "Buy"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function PortfolioCard({ portfolio, marketplaceSlug }: { portfolio: Portfolio; marketplaceSlug?: string }) {
  const riskLevel = portfolio.riskLevel || 5;
  const riskLabel = riskLevel <= 3 ? "Low" : riskLevel <= 7 ? "Medium" : "High";
  const stockCount = Array.isArray(portfolio.scripts) ? portfolio.scripts.length : 0;
  const subscriberCount = portfolio.subscribedBy?.length || 0;
  const horizon = portfolio.investmentHorizon || 0;
  // Pricing: cheapest of the portfolio's plans (works for both new pricingPlans
  // docs and legacy fees/feeValidity docs).
  const { minPrice, cheapestPlan } = normalizePortfolioPricing(portfolio);
  const feeValidity = cheapestPlan?.validity ?? 0;
  const lowestPrice = minPrice;
  const hasMultiplePlans = (portfolio.pricingPlans?.length ?? 0) > 1;
  const perDay = feeValidity > 0 && lowestPrice > 0 ? Math.round(lowestPrice / feeValidity) : 0;
  const minInvestment = Number(portfolio.minInvestmentAmount) || 0;

  // Format Indian currency with thousand separators
  const formatINR = (n: number) => n.toLocaleString("en-IN");

  return (
    <div className="h-full">
      <div className="group hover:shadow-lg transition-all duration-300 border border-slate-200 overflow-hidden h-full bg-white flex flex-col rounded-xl">
        {/* Banner (clean — no overlay text) */}
        <div className="flex-shrink-0 relative">
          {portfolio.bannerURL ? (
            <div className="h-40 overflow-hidden bg-slate-100">
              <img
                src={portfolio.bannerURL}
                alt={portfolio.portfolioName}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            </div>
          ) : (
            <div className="h-24 w-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <PieChart className="w-7 h-7 text-white/30" />
            </div>
          )}
        </div>

        <div className="p-4 flex-1 flex flex-col gap-3">
          {/* Title + theme/benchmark badges */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">{portfolio.portfolioName}</h3>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                {portfolio.theme}
              </span>
              {portfolio.benchmarkIndex && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                  {portfolio.benchmarkIndex}
                </span>
              )}
            </div>
          </div>

          {/* Key Metrics - clean inline */}
          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span><span className="font-semibold text-slate-700">{stockCount}</span> Stocks</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span><span className="font-semibold text-slate-700">{subscriberCount}</span> Subscribers</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${riskLevel <= 3 ? "bg-emerald-400" : riskLevel <= 7 ? "bg-amber-400" : "bg-red-400"}`} />
              <span><span className="font-semibold text-slate-700">{riskLabel}</span> Risk</span>
            </div>
          </div>

          {/* Extra info */}
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            {horizon > 0 && <span>{horizon} months horizon</span>}
            {portfolio.rebalanceCount && Number(portfolio.rebalanceCount) > 0 && (
              <>
                <span className="text-slate-300">&middot;</span>
                <span>{portfolio.rebalanceCount} rebalances</span>
              </>
            )}
            {portfolio.reviewFrequency && Number(portfolio.reviewFrequency) > 0 && (
              <>
                <span className="text-slate-300">&middot;</span>
                <span>Review every {portfolio.reviewFrequency}mo</span>
              </>
            )}
          </div>

          {/* Pricing block — product-style price layout */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-end justify-between gap-3">
              {/* Left: Subscription fee, large product-style */}
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                  {hasMultiplePlans ? "Starting From" : "Subscription Fee"}
                </div>
                {lowestPrice === 0 ? (
                  <div className="text-2xl font-extrabold text-emerald-600 leading-none">Free</div>
                ) : (
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-sm font-semibold text-slate-700 mr-0.5">₹</span>
                    <span className="text-2xl font-extrabold text-slate-900 leading-none tracking-tight">
                      {formatINR(lowestPrice)}
                    </span>
                    {feeValidity > 0 && (
                      <span className="text-xs text-slate-400 ml-1">/ {feeValidity} days</span>
                    )}
                  </div>
                )}
                {perDay > 0 && (
                  <div className="text-[10px] font-medium text-emerald-600 mt-1">
                    ≈ ₹{perDay}/day
                  </div>
                )}
              </div>

              {/* Right: Min investment */}
              {minInvestment > 0 && (
                <div className="text-right flex-shrink-0">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                    Min Investment
                  </div>
                  <div className="flex items-baseline justify-end gap-0.5">
                    <span className="text-[11px] font-semibold text-slate-600 mr-0.5">₹</span>
                    <span className="text-base font-bold text-slate-800 leading-none">
                      {formatINR(minInvestment)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Author + View */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden ring-1 ring-slate-100">
                {portfolio.authorData?.authorImage ? (
                  <img src={portfolio.authorData.authorImage} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="text-slate-500 font-semibold text-xs">
                    {portfolio.authorData?.name?.charAt(0) || "P"}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate leading-tight">
                  {portfolio.authorData?.name || "Portfolio Manager"}
                </div>
                <div className="text-[10px] text-slate-400 truncate leading-tight">Portfolio Manager</div>
              </div>
            </div>
            <Link href={buildProductUrl("portfolio", portfolio._id, portfolio.authorData, { marketplace: marketplaceSlug })} className="flex-shrink-0">
              <Button
                size="sm"
                className="h-8 px-4 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg"
              >
                View Portfolio
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
// ServiceCard Component
export function ServiceCard({ service, marketplaceSlug }: { service: Service; marketplaceSlug?: string }) {
  const getPricingPlans = (): { validity?: number; price?: number }[] => {
    if (!service.pricingPlans) return [];
    if (Array.isArray(service.pricingPlans)) return service.pricingPlans;
    try {
      return JSON.parse(service.pricingPlans as string) || [];
    } catch {
      return [];
    }
  };

  const pricingPlans = getPricingPlans();

  const cheapestPlan = pricingPlans.length > 0
    ? pricingPlans.reduce((min, p) => ((p.price ?? Infinity) < (min.price ?? Infinity) ? p : min), pricingPlans[0])
    : null;

  const lowestPrice = service.price === 0 ? 0
    : cheapestPlan ? (cheapestPlan.price ?? service.price ?? 0)
    : service.price ?? 0;
  const lowestValidity = cheapestPlan?.validity ?? service.validity ?? 0;
  const perDay = lowestValidity > 0 && lowestPrice > 0 ? Math.round(lowestPrice / lowestValidity) : 0;
  const isFree = lowestPrice === 0;

  const authorType = service.authorData?.type || "Research Analyst";

  // Provider commitment: e.g. "5 calls/day", "20 calls/week"
  const callsQuota = service.callsQuota ?? null;
  const callsPeriod = (service.callsPeriod || "").toLowerCase();
  const periodLabel =
    callsPeriod === "day"
      ? "day"
      : callsPeriod === "week"
        ? "week"
        : callsPeriod === "month"
          ? "month"
          : null;
  const hasCommitment = callsQuota !== null && callsQuota > 0 && periodLabel;

  // Total subscribers (prefer NoOfClients, fall back to subscribedBy length)
  const totalSubscribers =
    service.NoOfClients ?? service.subscribedBy?.length ?? 0;

  return (
    <div className="h-full">
      <div className="group hover:shadow-lg transition-all duration-300 border border-slate-200 overflow-hidden h-full bg-white flex flex-col rounded-xl">
        {/* Banner (clean — no overlay) */}
        <div className="flex-shrink-0 relative">
          {service.bannerURL ? (
            <div className="h-40 overflow-hidden bg-slate-100">
              <img
                src={service.bannerURL}
                alt=""
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            </div>
          ) : (
            <div className="h-24 w-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <Layers className="w-7 h-7 text-white/30" />
            </div>
          )}
        </div>

        <div className="p-4 flex-1 flex flex-col gap-3">
          {/* Title + type/segment badges */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">{service.title}</h3>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                {service.serviceType === "normal" ? "Service" : "Fund"}
              </span>
              {service.segment && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                  {service.segment}
                </span>
              )}
            </div>
          </div>

          {/* Provider commitment + subscribers */}
          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
            {hasCommitment && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>
                  <span className="font-semibold text-slate-700">{callsQuota}</span>{" "}
                  {callsQuota === 1 ? "call" : "calls"} / {periodLabel}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>
                <span className="font-semibold text-slate-700">{totalSubscribers}</span>{" "}
                {totalSubscribers === 1 ? "Subscriber" : "Subscribers"}
              </span>
            </div>
          </div>

          {/* Price line */}
          <div className="flex items-baseline gap-2 pt-1 border-t border-slate-100">
            <span className="text-lg font-bold text-slate-900">
              {isFree ? "Free" : `₹${lowestPrice.toLocaleString("en-IN")}`}
            </span>
            {!isFree && lowestValidity > 0 && (
              <span className="text-xs text-slate-400">
                / {lowestValidity} days
              </span>
            )}
            {perDay > 0 && (
              <span className="text-[11px] font-medium text-emerald-600 ml-auto">
                ₹{perDay}/day
              </span>
            )}
          </div>

          {/* Author + Buy Now */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden ring-1 ring-slate-100">
                {service.authorData?.authorImage ? (
                  <img src={service.authorData.authorImage} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="text-slate-500 font-semibold text-xs">
                    {service.authorData?.name?.charAt(0) || "S"}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate leading-tight">
                  {service.authorData?.name || "Provider"}
                </div>
                <div className="text-[10px] text-slate-400 truncate leading-tight">
                  {authorType}
                </div>
              </div>
            </div>
            <Link href={buildProductUrl("services", service._id, service.authorData, { marketplace: marketplaceSlug })} className="flex-shrink-0">
              <Button
                size="sm"
                className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg"
              >
                View Plan
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ArticleCard Component (matching design)
export function ArticleCard({ article }: { article: Article }) {
  // Format date helper
  const formatDate = (dateString: any) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  // Format schedule time
  const formatScheduleTime = (dateString: any) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return dateString;
    }
  };

  const scheduleDate = formatDate(article.schedule);
  const scheduleTime = formatScheduleTime(article.schedule);
  const hasImage = !!article.image;
  const categoryCount = article.category?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card className="group hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-[#01a6b6]/50 overflow-hidden h-full bg-white relative flex flex-col">
        
        {/* Banner Image */}
        <div className="relative w-full h-36 overflow-hidden bg-gradient-to-br from-[#01a6b6]/10 to-[#018b99]/10">
          {hasImage ? (
            <>
              <img 
                src={article.image} 
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#01a6b6] to-[#018b99]">
              <FileText className="w-12 h-12 text-white opacity-50" />
            </div>
          )}
          
          
          
         
          
          {/* Article Title Overlay */}
          <div className="absolute bottom-3 left-3 right-3 z-10">
            <h3 className="text-lg font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate">
              {article.title}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-white/95 drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]">
                {scheduleDate}
              </span>
              <span className="text-xs text-white/95 drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]">•</span>
              <span className="text-xs text-white/95 drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]">
                {scheduleTime}
              </span>
            </div>
          </div>
        </div>

        <CardContent className="p-4 flex-1 flex flex-col gap-3">
          
          {/* Row 1: Content Preview */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-[#01a6b6] flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-1">Preview</div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {article.content || "No content available"}
                </p>
              </div>
            </div>
          </div>

          {/* Row 2: Categories & Metadata */}
          <div className="space-y-2">
            {/* Categories Chips */}
            {article.category && article.category.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                <div className="flex flex-wrap gap-1">
                  {article.category.slice(0, 3).map((cat: string, idx: number) => (
                    <span 
                      key={idx} 
                      className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[10px] font-medium"
                    >
                      #{cat}
                    </span>
                  ))}
                  {article.category.length > 3 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-[10px] font-medium">
                      +{article.category.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Article Metadata */}
            <div className="flex flex-wrap gap-3">
              {article.hasArticlePDF && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  <span>PDF Available</span>
                </div>
              )}
              {article.articleLink && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Globe2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>External Link</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Author & Action Buttons */}
          <div className="flex items-center justify-between pt-1 mt-1 border-t border-gray-100">
            {/* Author with Verified Badge */}
            <div className="flex items-center gap-2">
              <div className="relative flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
                  {article.authorData?.authorImage ? (
                    <img 
                      src={article.authorData.authorImage} 
                      alt={article.authorData?.name || 'Author'}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-xs">
                      {article.authorData?.name?.charAt(0) || 'A'}
                    </span>
                  )}
                </div>
                {(article.authorData as any)?.isVerified && (
                  <div className="absolute -bottom-0.5 -right-0.5 bg-blue-600 rounded-full p-0.5 ring-2 ring-white">
                    <BadgeCheck className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 leading-tight flex items-center gap-1">
                  {article.authorData?.name || 'Author'}
                  {(article.authorData as any)?.isVerified && (
                    <BadgeCheck className="w-3 h-3 text-blue-500" />
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(article.createdAt)}
                </div>
              </div>
            </div>
            
            {/* Action Buttons - Read & Execute */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Read Button */}
              <Link href={buildProductUrl("article", article._id, article.authorData)}>
                <Button 
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 border-gray-200 hover:border-[#01a6b6] hover:bg-[#01a6b6]/5 text-gray-700 hover:text-[#01a6b6] text-xs"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" />
                  Read
                </Button>
              </Link>
              
              
            </div>
          </div>

        </CardContent>
      </Card>
    </motion.div>
  );
}

// EventCard Component (matching ServiceCard design)
export function EventCard({ event }: { event: Event }) {
  const eventDate = new Date(event.schedule);
  const dateString = eventDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const timeString = eventDate.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  });
  const hasImage = !!event.image;
  const isPastEvent = eventDate.getTime() < Date.now();
  const formatDate = (dateString: any) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card className="group hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-[#01a6b6]/50 overflow-hidden h-full bg-white relative flex flex-col">
        
        {/* Banner Image */}
        <div className="relative w-full h-36 overflow-hidden bg-gradient-to-br from-[#01a6b6]/10 to-[#018b99]/10">
          {hasImage ? (
            <>
              <img 
                src={event.image} 
                alt={event.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#01a6b6] to-[#018b99]">
              <CalendarDays className="w-12 h-12 text-white opacity-50" />
            </div>
          )}
          
          {/* Event Type Badge - Top Right */}
          <div className="absolute top-3 right-3 z-10">
            <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm text-[#01a6b6] rounded-full text-xs font-semibold shadow-lg border border-white/50">
              {event.eventType || "Event"}
            </span>
          </div>
          
          {/* Free Badge - Conditional */}
          {event.price === 0 && (
            <div className="absolute top-3 right-24 z-10">
              <span className="px-2.5 py-1 bg-emerald-500/90 backdrop-blur-sm text-white rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                FREE
              </span>
            </div>
          )}
          
          {/* Event Title Overlay */}
          <div className="absolute bottom-3 left-3 right-3 z-10">
            <h3 className="text-lg font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate">
              {event.title}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-white/95 drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]">
                {event.location || "Online"}
              </span>
            </div>
          </div>
        </div>

        <CardContent className="p-4 flex-1 flex flex-col gap-3">
          
          {/* Row 1: Price & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-lg p-2.5">
              <div className="text-[11px] text-emerald-600 font-medium uppercase tracking-wider mb-0.5">
                Price
              </div>
              <div className="text-base font-bold text-emerald-700">
                {event.price === 0 ? 'Free' : `₹${event.price.toLocaleString()}`}
              </div>
            </div>
            
            <div className="bg-amber-50 rounded-lg p-2.5">
              <div className="text-[11px] text-amber-600 font-medium uppercase tracking-wider mb-0.5">
                Date
              </div>
              <div className="text-base font-bold text-amber-700">
                {dateString}
              </div>
            </div>
          </div>

          {/* Row 2: Time & Registrations */}
          <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-2.5">
            <div className="text-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Time</div>
              <div className="text-sm font-bold text-gray-900">{timeString}</div>
            </div>
            <div className="text-center border-l border-gray-200">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Registrations</div>
              <div className="text-sm font-bold text-gray-900">{event.NoOfRegistration || 0}</div>
            </div>
          </div>

          {/* Description - Single Line with Icon */}
          <div className="flex items-start gap-1.5 text-xs text-gray-600">
            <FileText className="w-3.5 h-3.5 text-[#01a6b6] flex-shrink-0 mt-0.5" />
            <p className="line-clamp-1">
              {event.description?.substring(0, 60) || "No description available"}
              {event.description?.length > 60 && "..."}
            </p>
          </div>

          {/* Category Chips */}
          {event.category && event.category.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {event.category.slice(0, 3).map((cat: string, idx: number) => (
                <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-medium">
                  {cat}
                </span>
              ))}
              {event.category.length > 3 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-[10px] font-medium">
                  +{event.category.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Row 3: Author & Action Button */}
          <div className="flex items-center justify-between pt-1 mt-1 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="relative flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
                  {(event.authorData as any)?.authorImage ? (
                    <img 
                      src={(event.authorData as any).authorImage} 
                      alt={event.authorData?.name || 'Host'}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-xs">
                      {event.authorData?.name?.charAt(0) || 'H'}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 leading-tight">
                  {event.authorData?.name || 'Event Host'}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(event.createdAt)}
                </div>
              </div>
            </div>
            
            {isPastEvent ? (
              <span className="h-8 px-4 inline-flex items-center rounded-md bg-gray-100 text-gray-500 text-xs font-semibold">
                Event Ended
              </span>
            ) : (
              <Link href={buildProductUrl("events", event._id, event.authorData)}>
                <Button 
                  size="sm"
                  className="h-8 px-4 bg-gradient-to-r from-[#01a6b6] to-[#018b99] hover:from-[#018b99] hover:to-[#01a6b6] text-white font-semibold text-xs shadow-md"
                >
                  <CalendarDays className="w-3.5 h-3.5 mr-1" />
                  Register
                </Button>
              </Link>
            )}
          </div>

        </CardContent>
      </Card>
    </motion.div>
  );
}

// CourseCard for LMS / courses in marketplace
export function CourseCard({ course }: { course: Course }) {
  const levelLabel = (course.level || "beginner").charAt(0).toUpperCase() + (course.level || "beginner").slice(1);
  const instructorName = course.instructorSnapshot?.name || "Instructor";
  const lang = course.language ? course.language.charAt(0).toUpperCase() + course.language.slice(1) : null;
  const featureCount = course.keyFeatures?.length || 0;

  return (
    <div className="h-full">
      <div className="group hover:shadow-lg transition-all duration-300 border border-slate-200 overflow-hidden h-full bg-white flex flex-col rounded-xl">
        {/* Thumbnail with badges */}
        <div className="flex-shrink-0 relative">
          {course.thumbnailUrl ? (
            <div className="h-40 overflow-hidden bg-slate-100">
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          ) : (
            <div className="h-24 w-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white/30" />
            </div>
          )}
          <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5">
            <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-slate-700 rounded text-[10px] font-semibold shadow-sm">
              {levelLabel}
            </span>
            {course.segment && (
              <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-slate-600 rounded text-[10px] font-medium shadow-sm">
                {course.segment}
              </span>
            )}
            {lang && (
              <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-slate-600 rounded text-[10px] font-medium shadow-sm">
                {lang}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-3">
          {/* Title + subtitle */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">{course.title}</h3>
            {course.subtitle && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{course.subtitle}</p>
            )}
          </div>

          {/* Course info - inline */}
          {/* <div className="flex items-center gap-3 text-[11px] text-slate-400">
            {featureCount > 0 && <span>{featureCount} key features</span>}
            {course.description && (
              <>
                {featureCount > 0 && <span className="text-slate-300">&middot;</span>}
                <span className="line-clamp-1">{course.description.length > 60 ? course.description.slice(0, 60) + "..." : course.description}</span>
              </>
            )}
          </div> */}

          {/* Price line */}
          <div className="flex items-baseline gap-2 pt-1 border-t border-slate-100">
            <span className="text-lg font-bold text-slate-900">
              {course.price === 0 ? "Free" : `₹${Number(course.price).toLocaleString("en-IN")}`}
            </span>
            {course.price > 0 && (
              <span className="text-xs text-slate-400">one-time</span>
            )}
          </div>

          {/* Instructor + View */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden ring-1 ring-slate-100">
                {course.instructorSnapshot?.profileUrl ? (
                  <img src={course.instructorSnapshot.profileUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="text-slate-500 font-semibold text-xs">
                    {instructorName.charAt(0) || "I"}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate leading-tight">
                  {instructorName}
                </div>
                <div className="text-[10px] text-slate-400 truncate leading-tight">Instructor</div>
              </div>
            </div>
            <Link href={buildProductUrl("courses", course._id, course.instructorSnapshot)} className="flex-shrink-0">
              <Button
                size="sm"
                className="h-8 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg"
              >
                View Course
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}