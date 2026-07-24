"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { authFetch } from "@/lib/authFetch";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  IndianRupee,
  Users,
  TrendingUp,
  Target,
  FileText,
  Calendar,
  GraduationCap,
  Package,
  Briefcase,
  Layers,
  PieChart as PieChartIcon,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// ── Types ────────────────────────────────────────────────────────────────────

type MonthlySale = { month: string; orders: number; revenue: number };
type ExchangeStat = { exchange: string; count: number };
type LeadStatus = { status: string; count: number };
type Provider = {
  _id: string;
  name: string;
  profileUrl: string;
  category: string;
  verified: boolean;
  recommendations: number;
  activeRecs: number;
  services: number;
  subscribers: number;
  courses: number;
  portfolios: number;
};
type MarketplaceBreakdown = {
  _id: string;
  name: string;
  slug: string;
  raCount: number;
  recommendations: number;
  services: number;
  portfolios: number;
};
type AnalyticsData = {
  overview: {
    totalMarketplaces: number;
    totalRAs: number;
    totalRecommendations: number;
    activeRecommendations: number;
    closedRecommendations: number;
    totalServices: number;
    totalPortfolios: number;
    totalCourses: number;
    totalEvents: number;
    totalPackages: number;
    totalArticles: number;
  };
  revenue: {
    totalCommission: number;
    totalServiceSales: number;
    totalCourseSales: number;
    totalSubscribers: number;
    monthlySales: MonthlySale[];
  };
  recommendationStats: {
    total: number;
    open: number;
    closed: number;
    avgPnlPercentage: number;
    profitable: number;
    stoplossHit: number;
    timedOut: number;
    byExchange: ExchangeStat[];
  };
  providers: Provider[];
  leads: {
    total: number;
    converted: number;
    abandoned: number;
    conversionRate: number;
    byStatus: LeadStatus[];
  };
  content: {
    articles: number;
    events: number;
    upcomingEvents: number;
    eventRegistrations: number;
    courses: number;
    courseEnrollments: number;
  };
  marketplaces: MarketplaceBreakdown[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const PIE_COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#6366f1"];
const EXCHANGE_COLORS: Record<string, string> = {
  NSE: "#3b82f6",
  BSE: "#8b5cf6",
  NFO: "#f59e0b",
  BFO: "#f97316",
  MCX: "#ef4444",
};

function formatINR(n: number) {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(mo, 10) - 1]} ${y.slice(2)}`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BrokerAnalyticsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.backendToken) return;
    authFetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/broker/analytics`,
      { headers: { Authorization: `Bearer ${session.backendToken}` } }
    )
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session?.backendToken]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        Failed to load analytics data.
      </div>
    );
  }

  const { overview, revenue, recommendationStats, providers, leads, content, marketplaces } = data;

  const recResultData = [
    { name: "Target Hit", value: recommendationStats.profitable, color: "#22c55e" },
    { name: "Stoploss Hit", value: recommendationStats.stoplossHit, color: "#ef4444" },
    { name: "Timed Out", value: recommendationStats.timedOut, color: "#f59e0b" },
    { name: "Other", value: Math.max(0, recommendationStats.closed - recommendationStats.profitable - recommendationStats.stoplossHit - recommendationStats.timedOut), color: "#6366f1" },
  ].filter((d) => d.value > 0);

  const monthlySalesChart = revenue.monthlySales.map((m) => ({
    ...m,
    label: monthLabel(m.month),
  }));

  return (
    <div className="pb-20 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="m-5 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Marketplace Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {overview.totalMarketplaces} marketplace{overview.totalMarketplaces !== 1 ? "s" : ""} &middot; {overview.totalRAs} expert{overview.totalRAs !== 1 ? "s" : ""}
          </p>
        </div>

        {/* ── Summary Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={IndianRupee}
            title="Total Commission"
            value={`₹${formatINR(revenue.totalCommission)}`}
            sub={`${revenue.totalServiceSales} service sales`}
            color="text-emerald-600"
            bg="bg-emerald-50 dark:bg-emerald-900/20"
          />
          <SummaryCard
            icon={Users}
            title="Subscribers"
            value={revenue.totalSubscribers.toLocaleString()}
            sub={`${revenue.totalCourseSales} course sales`}
            color="text-blue-600"
            bg="bg-blue-50 dark:bg-blue-900/20"
          />
          <SummaryCard
            icon={TrendingUp}
            title="Active Recommendations"
            value={recommendationStats.open.toLocaleString()}
            sub={`${recommendationStats.total} total`}
            color="text-purple-600"
            bg="bg-purple-50 dark:bg-purple-900/20"
          />
          <SummaryCard
            icon={Target}
            title="Lead Conversion"
            value={`${leads.conversionRate}%`}
            sub={`${leads.converted} of ${leads.total} leads`}
            color="text-orange-600"
            bg="bg-orange-50 dark:bg-orange-900/20"
          />
        </div>

        {/* ── Charts Row ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Sales */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                Monthly Sales & Commission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySalesChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: 12 }}
                      formatter={(value: any, name: any) => [
                        name === "revenue" ? `₹${Number(value).toLocaleString("en-IN")}` : value,
                        name === "revenue" ? "Commission" : "Orders",
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar name="Orders" dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar name="Commission (₹)" dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recommendation Results Pie */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-purple-500" />
                Recommendation Results
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Avg PnL: <span className={`font-bold ${recommendationStats.avgPnlPercentage >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {recommendationStats.avgPnlPercentage >= 0 ? "+" : ""}{recommendationStats.avgPnlPercentage}%
                </span>
                &nbsp;&middot;&nbsp; {recommendationStats.open} open &middot; {recommendationStats.closed} closed
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[260px] w-full">
                {recResultData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={recResultData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {recResultData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    No closed recommendations yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Recommendations by Exchange ───────────────────── */}
        {recommendationStats.byExchange.length > 0 && (
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-orange-500" />
                Recommendations by Exchange
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recommendationStats.byExchange} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="exchange" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: 12 }} />
                    <Bar dataKey="count" name="Recommendations" radius={[4, 4, 0, 0]} barSize={40}>
                      {recommendationStats.byExchange.map((entry, index) => (
                        <Cell key={index} fill={EXCHANGE_COLORS[entry.exchange] || "#6366f1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Content Overview Cards ────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Content Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MiniStat icon={FileText} label="Articles" value={content.articles} color="text-blue-500" />
            <MiniStat icon={Calendar} label="Events" value={content.events} sub={`${content.upcomingEvents} upcoming`} color="text-pink-500" />
            <MiniStat icon={Users} label="Event Registrations" value={content.eventRegistrations} color="text-rose-500" />
            <MiniStat icon={GraduationCap} label="Courses" value={content.courses} sub={`${content.courseEnrollments} enrolled`} color="text-indigo-500" />
            <MiniStat icon={Layers} label="Services" value={overview.totalServices} color="text-orange-500" />
            <MiniStat icon={Package} label="Packages" value={overview.totalPackages} color="text-teal-500" />
          </div>
        </div>

        {/* ── Service Provider Leaderboard ──────────────────── */}
        {providers.length > 0 && (
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Service Provider Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
                      <th className="text-left py-3 px-2 font-medium">Provider</th>
                      <th className="text-center py-3 px-2 font-medium">Recs</th>
                      <th className="text-center py-3 px-2 font-medium">Active</th>
                      <th className="text-center py-3 px-2 font-medium">Plans</th>
                      <th className="text-center py-3 px-2 font-medium">Subscribers</th>
                      <th className="text-center py-3 px-2 font-medium">Courses</th>
                      <th className="text-center py-3 px-2 font-medium">Portfolios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers
                      .sort((a, b) => b.recommendations - a.recommendations)
                      .map((p) => (
                        <tr key={p._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={p.profileUrl} alt={p.name} />
                                <AvatarFallback className="text-xs bg-gray-100">
                                  {p.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-800 dark:text-white truncate flex items-center gap-1">
                                  {p.name}
                                  {p.verified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                                </div>
                                <div className="text-[11px] text-gray-400">{p.category}</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-center py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">{p.recommendations}</td>
                          <td className="text-center py-3 px-2">
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                              {p.activeRecs}
                            </span>
                          </td>
                          <td className="text-center py-3 px-2 text-gray-600 dark:text-gray-400">{p.services}</td>
                          <td className="text-center py-3 px-2 text-gray-600 dark:text-gray-400">{p.subscribers}</td>
                          <td className="text-center py-3 px-2 text-gray-600 dark:text-gray-400">{p.courses}</td>
                          <td className="text-center py-3 px-2 text-gray-600 dark:text-gray-400">{p.portfolios}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Lead Funnel ──────────────────────────────────── */}
        {leads.total > 0 && (
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-500" />
                Lead Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leads.byStatus
                  .sort((a, b) => b.count - a.count)
                  .map((l) => {
                    const pct = leads.total > 0 ? (l.count / leads.total) * 100 : 0;
                    return (
                      <div key={l.status} className="flex items-center gap-3">
                        <div className="w-32 text-xs text-gray-600 dark:text-gray-400 capitalize truncate">
                          {l.status.replace(/_/g, " ")}
                        </div>
                        <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="w-16 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                          {l.count} ({pct.toFixed(0)}%)
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Marketplace Breakdown ────────────────────────── */}
        {marketplaces.length > 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Marketplace Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketplaces.map((mp) => (
                <Card key={mp._id} className="rounded-xl shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 truncate">
                      {mp.name}
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">{mp.raCount}</div>
                        <div className="text-[10px] text-gray-500">Experts</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-lg font-bold text-green-600">{mp.recommendations}</div>
                        <div className="text-[10px] text-gray-500">Recs</div>
                      </div>
                      <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div className="text-lg font-bold text-orange-600">{mp.services}</div>
                        <div className="text-[10px] text-gray-500">Plans</div>
                      </div>
                      <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-lg font-bold text-purple-600">{mp.portfolios}</div>
                        <div className="text-[10px] text-gray-500">Portfolios</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  title,
  value,
  sub,
  color,
  bg,
}: {
  icon: any;
  title: string;
  value: string;
  sub: string;
  color: string;
  bg: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center gap-4">
          <div className={`w-11 h-11 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white">{value}</p>
            <p className="text-[11px] text-gray-400 truncate">{sub}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  sub?: string;
  color: string;
}) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-3 text-center">
        <Icon className={`w-5 h-5 ${color} mx-auto mb-1.5`} />
        <div className="text-xl font-bold text-gray-800 dark:text-white">{value}</div>
        <div className="text-[11px] text-gray-500">{label}</div>
        {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
