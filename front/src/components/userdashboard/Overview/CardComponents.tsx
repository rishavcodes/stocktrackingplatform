// app/marketplace/[id]/components/CardComponents.tsx
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
  Percent, Calendar, UserCheck, Users2
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RA, Recommendation, Portfolio, Service, Article, Event } from "./types";
import { buildProductUrl } from "@/lib/customDomain";

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

// RACard Component (optimized as requested)
export function RACard({ ra }: { ra: RA }) {
  const displayName = ra.name || ra.RegName || ra.companyName || "N/A";
  const description = ra.AboutMe || ra.description;
  const truncatedDescription = description
    ? description.length > 80
      ? description.substring(0, 80) + '...'
      : description
    : "No description available";

  const stats = ra.stats?.contentStats || { 
    articles: 0, 
    events: 0, 
    services: 0 
  };
  
  const recommendationStats = ra.stats?.recommendationStats || { 
    total: 0, 
    open: 0, 
    close: 0, 
    returnPercentage: 0, 
    returnRatio: 0 
  };
  
  const articles = stats.articles ?? 0;
  const events = stats.events ?? 0;
  const services = stats.services ?? 0;
  const location = [ra.city, ra.state].filter(Boolean).join(", ") || "N/A";
  const returnPercentage = recommendationStats.returnPercentage ?? 0;
  const totalTrades = recommendationStats.total ?? 0;
  const totalCourses = ra.stats?.courseStates?.totalCourses ?? 0;
  const totalModelPortfolios = ra.stats?.modelPortfolioStates?.totalPortfolios ?? 0;

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
                {ra.profileUrl ? (
                  <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-md">
                    <img 
                      src={ra.profileUrl} 
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#01a6b6] to-[#018b99] flex items-center justify-center shadow-md">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                )}
                {ra.verified && (
                  <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-0.5">
                    <BadgeCheck className="w-3 h-3 text-white" />
                  </div>
                )}
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-bold text-gray-900 truncate group-hover:text-[#01a6b6] transition-colors">
                  {displayName}
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                    {ra.category || "RA"}
                  </span>
                  <span className="text-gray-400 text-xs">•</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {ra.type || "Individual"}
                  </span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </div>

        <CardContent className="space-y-3 relative z-10">
          {/* Description */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-gray-700">
              <FileText className="w-3.5 h-3.5 text-[#01a6b6]" />
              <span className="text-xs font-semibold">About</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed pl-5 line-clamp-2">
              {truncatedDescription}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <MapPinIcon className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-semibold text-gray-700">Location</span>
              </div>
              <div className="text-xs text-gray-600 pl-5 truncate">
                {location}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-gray-700">Reg No.</span>
              </div>
              <div className="text-xs text-gray-600 font-mono pl-5 truncate">
                {ra.regNumber || "N/A"}
              </div>
            </div>
          </div>

          {/* Activity Stats */}
          <div className="pt-2 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-700 mb-2 block">Activity</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { 
                  icon: FileText, 
                  value: articles, 
                  label: "Articles", 
                  bg: "from-blue-50 to-cyan-50",
                  border: "border-blue-200",
                  color: "text-blue-600"
                },
                { 
                  icon: GraduationCap, 
                  value: totalCourses, 
                  label: "Courses", 
                  bg: "from-purple-50 to-violet-50",
                  border: "border-purple-200",
                  color: "text-purple-600"
                }
              ].map((stat, index) => (
                <StatBlock key={index} stat={stat} index={index} />
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { 
                  icon: Briefcase, 
                  value: services, 
                  label: "Services", 
                  bg: "from-amber-50 to-orange-50",
                  border: "border-amber-200",
                  color: "text-amber-600"
                },
                { 
                  icon: PieChart, 
                  value: totalModelPortfolios, 
                  label: "Portfolios", 
                  bg: "from-emerald-50 to-green-50",
                  border: "border-emerald-200",
                  color: "text-emerald-600"
                }
              ].map((stat, index) => (
                <StatBlock key={index} stat={stat} index={index} />
              ))}
            </div>
          </div>

         

          {/* Action Button */}
          <div className="pt-2">
            <Link href={`/view/serviceprovider/${ra._id}`}>
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
                  <Eye className="w-4 h-4" />
                  View Profile
                </span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// RecommendationCard Component (matching design)
export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
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

          {/* Action Button */}
          <div className="pt-2">
            <Link href={`/view/recommendation/${recommendation._id}`}>
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
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function PortfolioCard({ portfolio }: { portfolio: Portfolio }) {
  const riskLevel = portfolio.riskLevel || 5;
  const riskColor = riskLevel <= 3 ? 'emerald' : riskLevel <= 7 ? 'amber' : 'rose';
  // console.log("this is the bestonejgdhdhcv " ,portfolio)
  // Format date helper
  const formatDate = (dateString:any) => {
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
    {portfolio.bannerURL ? (
      <>
        <img 
          src={portfolio.bannerURL} 
          alt={portfolio.portfolioName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Fix 1: Lighter gradient - current one might be too dark */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </>
    ) : (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#01a6b6] to-[#018b99]">
        <PieChart className="w-12 h-12 text-white opacity-50" />
      </div>
    )}
    
    {/* Theme Badge */}
    <div className="absolute top-3 right-3 z-10">
      <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm text-[#01a6b6] rounded-full text-xs font-semibold shadow-lg border border-white/50">
        {portfolio.theme}
      </span>
    </div>
    
    {/* Portfolio Name Overlay */}
    <div className="absolute bottom-3 left-3 right-3 z-10">
      <h3 className="text-lg font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate">
        {portfolio.portfolioName}
      </h3>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-xs text-white/95 drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]">
          {portfolio.benchmarkIndex}
        </span>
      </div>
    </div>
  </div>

  <CardContent className="p-4 flex-1 flex flex-col gap-3">
    {/* Row 1: Investment & Fees */}
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-emerald-50 rounded-lg p-2.5">
        <div className="text-[11px] text-emerald-600 font-medium uppercase tracking-wider mb-0.5">
          Min Investment
        </div>
        <div className="text-base font-bold text-emerald-700">
          ₹{(portfolio.minInvestmentAmount / 1000).toFixed(0)}k
        </div>
        {portfolio.feeValidity && (
          <div className="text-[10px] text-emerald-600 mt-0.5">
            Valid: {portfolio.feeValidity}
          </div>
        )}
      </div>
      
      <div className="bg-amber-50 rounded-lg p-2.5">
        <div className="text-[11px] text-amber-600 font-medium uppercase tracking-wider mb-0.5">
          Fees
        </div>
        <div className="text-base font-bold text-amber-700">
          {portfolio.fees === 0 ? 'Free' : `₹${portfolio.fees.toLocaleString()}`}
        </div>
        {portfolio.Commercials?.endDate && (
          <div className="text-[10px] text-amber-600 mt-0.5">
            Till {formatDate(portfolio.Commercials.endDate)}
          </div>
        )}
      </div>
    </div>

    {/* Row 2: Key Metrics */}
    <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-lg p-2.5">
      <div className="text-center">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Stocks</div>
        <div className="text-sm font-bold text-gray-900">{portfolio.scripts?.length || 0}</div>
      </div>
      <div className="text-center border-x border-gray-200">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Rebalance</div>
        <div className="text-sm font-bold text-gray-900">{portfolio.rebalanceCount || 0}</div>
      </div>
      <div className="text-center">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Horizon</div>
        {/* Fix 2: Added fallback */}
        <div className="text-sm font-bold text-gray-900">{portfolio.investmentHorizon || 0}m</div>
      </div>
    </div>

    {/* Strategy - Single Line with Icon */}
    <div className="flex items-start gap-1.5 text-xs text-gray-600">
      <FileText className="w-3.5 h-3.5 text-[#01a6b6] flex-shrink-0 mt-0.5" />
      <p className="line-clamp-1">
        {portfolio.methodology?.substring(0, 60) || "No strategy description"}
        {portfolio.methodology?.length > 60 && "..."}
      </p>
    </div>

    {/* Row 3: Author & Action Buttons */}
    <div className="flex items-center justify-between pt-1">
      {/* Author with Verified Badge */}
      <div className="flex items-center gap-2">
        <div className="relative flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
            {portfolio.authorData?.authorImage ? (
              <img 
                src={portfolio.authorData.authorImage} 
                alt={portfolio.authorData?.name || 'Author'}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-semibold text-xs">
                {portfolio.authorData?.name?.charAt(0) || 'P'}
              </span>
            )}
          </div>
          {portfolio.authorData?.isVerified && (
            <div className="absolute -bottom-0.5 -right-0.5 bg-blue-600 rounded-full p-0.5 ring-2 ring-white">
              <BadgeCheck className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900 leading-tight flex items-center gap-1">
            {portfolio.authorData?.name || 'Portfolio Manager'}
            {portfolio.authorData?.isVerified && (
              <BadgeCheck className="w-3 h-3 text-blue-500" />
            )}
          </div>
          <div className="text-xs text-gray-500">
            {formatDate(portfolio.launchDate)}
          </div>
        </div>
      </div>
      
      {/* Action Buttons - Fix 3: Add flex-shrink-0 to prevent wrapping */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* View Button */}
        <Link href={buildProductUrl("portfolio", portfolio._id, portfolio.authorData)}>
          <Button 
            size="sm"
            variant="outline"
            className="h-8 px-3 border-gray-200 hover:border-[#01a6b6] hover:bg-[#01a6b6]/5 text-gray-700 hover:text-[#01a6b6] text-xs"
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            View
          </Button>
        </Link>
        
        {/* Execute Button */}
        <Button 
          size="sm"
          // onClick={() => handleExecutePortfolio(portfolio._id)}
          className="h-8 px-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold text-xs shadow-md"
        >
          <Zap className="w-3.5 h-3.5 mr-1" />
          Execute
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
    </motion.div>
  );
}
// ServiceCard Component (matching design)
export function ServiceCard({ service }: { service: Service }) {
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

  // Parse pricing plans - handle both string and array
  const getPricingPlans = () => {
    if (!service.pricingPlans) return [];
    if (Array.isArray(service.pricingPlans)) return service.pricingPlans;
    try {
      return JSON.parse(service.pricingPlans);
    } catch {
      return [];
    }
  };

  // Parse key features - handle both string and array
  const getKeyFeatures = () => {
    if (!service.keyFeatures) return [];
    if (Array.isArray(service.keyFeatures)) return service.keyFeatures;
    try {
      return JSON.parse(service.keyFeatures);
    } catch {
      if (typeof service.keyFeatures === 'string' && service.keyFeatures.includes(',')) {
        return service.keyFeatures.split(',').map(f => f.trim());
      }
      return [];
    }
  };

  const pricingPlans = getPricingPlans();
  const keyFeatures = getKeyFeatures();
  
  // Get price from pricingPlans array
  const getPrice = () => {
    if (service.price === 0) return 0;
    if (pricingPlans && pricingPlans.length > 0) {
      return pricingPlans[0].price || 0;
    }
    return service.price || 0;
  };

  // Get validity from pricingPlans array
  const getValidity = () => {
    if (service.validity) return service.validity;
    if (pricingPlans && pricingPlans.length > 0) {
      return pricingPlans[0].validity || 30;
    }
    return 30;
  };

  const price = getPrice();
  const validity = getValidity();
  const isFree = price === 0;
  const freeTrialDays = service.freeTrailDays ? parseInt(service.freeTrailDays as string) || 0 : 0;

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
          {service.bannerURL ? (
            <>
              <img 
                src={service.bannerURL} 
                alt={service.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#01a6b6] to-[#018b99]">
              <Layers className="w-12 h-12 text-white opacity-50" />
            </div>
          )}
          
          {/* Service Type Badge - Top Right */}
          <div className="absolute top-3 right-3 z-10">
            <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm text-[#01a6b6] rounded-full text-xs font-semibold shadow-lg border border-white/50">
              {service.serviceType === "normal" ? "Service" : service.serviceType}
            </span>
          </div>
          
          {/* Free Badge - Conditional */}
          {isFree && (
            <div className="absolute top-3 right-24 z-10">
              <span className="px-2.5 py-1 bg-emerald-500/90 backdrop-blur-sm text-white rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                FREE
              </span>
            </div>
          )}
          
          {/* Service Title Overlay */}
          <div className="absolute bottom-3 left-3 right-3 z-10">
            <h3 className="text-lg font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate">
              {service.title}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-white/95 drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)]">
                {service.segment}
              </span>
            </div>
          </div>
        </div>

        <CardContent className="p-4 flex-1 flex flex-col gap-3">
          
          {/* Row 1: Price & Validity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-lg p-2.5">
              <div className="text-[11px] text-emerald-600 font-medium uppercase tracking-wider mb-0.5">
                Price
              </div>
              <div className="text-base font-bold text-emerald-700">
                {isFree ? 'Free' : `₹${(price / 1000).toFixed(0)}k`}
              </div>
              {freeTrialDays > 0 && (
                <div className="text-[10px] text-emerald-600 mt-0.5">
                  {freeTrialDays} days trial
                </div>
              )}
            </div>
            
            <div className="bg-amber-50 rounded-lg p-2.5">
              <div className="text-[11px] text-amber-600 font-medium uppercase tracking-wider mb-0.5">
                Validity
              </div>
              <div className="text-base font-bold text-amber-700">
                {validity} days
              </div>
              {service.isFreeTrial && (
                <div className="text-[10px] text-amber-600 mt-0.5">
                  Free trial available
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Key Metrics - Plans & Features */}
          <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-2.5">
            <div className="text-center">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Plans</div>
              <div className="text-sm font-bold text-gray-900">{pricingPlans.length || 1}</div>
            </div>
            <div className="text-center border-l border-gray-200">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Features</div>
              <div className="text-sm font-bold text-gray-900">{keyFeatures.length || 0}</div>
            </div>
          </div>

          {/* Description - Single Line with Icon */}
          <div className="flex items-start gap-1.5 text-xs text-gray-600">
            <FileText className="w-3.5 h-3.5 text-[#01a6b6] flex-shrink-0 mt-0.5" />
            <p className="line-clamp-1">
              {service.description?.substring(0, 60) || "No description available"}
              {service.description?.length > 60 && "..."}
            </p>
          </div>

          {/* Key Features Chips */}
          {keyFeatures.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {keyFeatures.slice(0, 3).map((feature: string, idx: number) => (
                <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-medium">
                  {feature}
                </span>
              ))}
              {keyFeatures.length > 3 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-[10px] font-medium">
                  +{keyFeatures.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Row 3: Author & Action Buttons */}
          <div className="flex items-center justify-between pt-1 mt-1 border-t border-gray-100">
            {/* Author with Verified Badge */}
            <div className="flex items-center gap-2">
              <div className="relative flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm">
                  {service.authorData?.authorImage ? (
                    <img 
                      src={service.authorData.authorImage} 
                      alt={service.authorData?.name || 'Author'}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-xs">
                      {service.authorData?.name?.charAt(0) || 'S'}
                    </span>
                  )}
                </div>
                {service.authorData?.isVerified && (
                  <div className="absolute -bottom-0.5 -right-0.5 bg-blue-600 rounded-full p-0.5 ring-2 ring-white">
                    <BadgeCheck className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 leading-tight flex items-center gap-1">
                  {service.authorData?.name || 'Service Provider'}
                  {service.authorData?.isVerified && (
                    <BadgeCheck className="w-3 h-3 text-blue-500" />
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(service.createdAt)}
                </div>
              </div>
            </div>
            
            {/* Action Buttons - View & Execute */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* View Button */}
              <Link href={buildProductUrl("services", service._id, service.authorData)}>
                <Button 
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 border-gray-200 hover:border-[#01a6b6] hover:bg-[#01a6b6]/5 text-gray-700 hover:text-[#01a6b6] text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  View
                </Button>
              </Link>
              
              {/* Execute Button */}
              <Button 
                size="sm"
                // onClick={() => handleExecuteService(service._id)}
                className="h-8 px-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold text-xs shadow-md"
              >
                <Zap className="w-3.5 h-3.5 mr-1" />
                Execute
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>
    </motion.div>
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
          
          {/* Eye Button - Top Left */}
          <Link href={buildProductUrl("article", article._id, article.authorData)} className="absolute top-3 left-3 z-10">
            <Button 
              size="icon" 
              className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg border border-white/50"
            >
              <Eye className="w-4 h-4 text-gray-700" />
            </Button>
          </Link>
          
          {/* Article Badge - Top Right */}
          <div className="absolute top-3 right-3 z-10">
            <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm text-[#01a6b6] rounded-full text-xs font-semibold shadow-lg border border-white/50 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Article
            </span>
          </div>
          
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
              
              {/* Execute Button */}
              <Button 
                size="sm"
                // onClick={() => handleExecuteArticle(article._id)}
                className="h-8 px-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold text-xs shadow-md"
              >
                <Zap className="w-3.5 h-3.5 mr-1" />
                Execute
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>
    </motion.div>
  );
}

// EventCard Component (matching design)
export function EventCard({ event }: { event: Event }) {
  const eventDate = new Date(event.schedule);
  const dateString = eventDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
  const timeString = eventDate.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
console.log("this is the event one",event)
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
                  <CalendarDays className="w-6 h-6 text-white" />
                </div>
                {event.price === 0 && (
                  <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                )}
              </motion.div>
              
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-bold text-gray-900 truncate group-hover:text-[#01a6b6] transition-colors">
                  {event.title}
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                    {event.eventType}
                  </span>
                  <span className="text-gray-400 text-xs">•</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {event.location || "Online"}
                  </span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </div>

        <CardContent className="space-y-3 relative z-10">
          {/* Description */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-gray-700">
              <FileText className="w-3.5 h-3.5 text-[#01a6b6]" />
              <span className="text-xs font-semibold">Description</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed pl-5 line-clamp-2">
              {event.description.substring(0, 80)}...
            </p>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-gray-700">Date</span>
              </div>
              <div className="text-xs text-gray-600 pl-5 font-semibold">
                {dateString}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-semibold text-gray-700">Time</span>
              </div>
              <div className="text-xs text-gray-600 pl-5 font-semibold">
                {timeString}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="pt-2 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-700 mb-2 block">Details</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { 
                  icon: Users2, 
                  value: event.price === 0 ? 'Free' : `₹${event.price.toLocaleString()}`, 
                  label: "Price", 
                  bg: "from-emerald-50 to-green-50",
                  border: "border-emerald-200",
                  color: "text-emerald-600"
                },
                { 
                  icon: Users2, 
                  value: event.NoOfRegistration || 0, 
                  label: "Registrations", 
                  bg: "from-blue-50 to-cyan-50",
                  border: "border-blue-200",
                  color: "text-blue-600"
                }
              ].map((stat, index) => (
                <StatBlock key={index} stat={stat} index={index} />
              ))}
            </div>
          </div>

          {/* Author Info */}
          <div className="pt-2 border-t border-gray-100">
            <div className="p-2 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-gray-200/50">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 truncate">
                    {event.authorData.name}
                  </div>
                  <div className="text-xs text-gray-600">Event Host</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Link href={buildProductUrl("events", event._id, event.authorData)}>
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
                  <CalendarDays className="w-4 h-4" />
                  Register Now
                </span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}