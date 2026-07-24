"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer, ServicePageFund, ServicePageNormal } from "@/components";
import { OurServicesType } from "@/lib/types";
import { Session } from "inspector";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Download,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  Share2,
  Bookmark,
  Phone,
  Mail,
  Building2,
  DollarSign,
  Wallet,
  Percent,
  PiggyBank,
  BarChart3,
  TrendingDown,
  Crown,
  Users,
  IndianRupeeIcon,
  Shield,
  Zap,
  Target,
  Sparkles,
  PieChartIcon,
  MenuIcon,
  FileWarning,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { is } from "date-fns/locale";
import { pdf } from "@react-pdf/renderer";
import PortfolioPDF from "./PortfolioPDF";
import { toast } from "@/hooks/use-toast";

interface IScript {
  slNo: number;
  exchangeType: string;
  segmentType: string;
  scriptName: {
    name: string;
    token: string;
  };
  cmp: number;
  buyRate: number;
  target: number;
  quantity: number;
  weightage: number;
  value: number;
  lastUpdated: string;
  profitLoss: number;
}

export interface IClosedPosition {
  _id: string;
  scriptName: {
    name: string;
    token: string;
  };

  exchangeType: string;
  segmentType: string;
  cmp: number;
  quantity: number;
  value: number;
  investedValue: number;
  weightage: number;
  profitLoss: number;
  profitLossPercentage: number;
  closedAt: string;
  remarks?: string;
  slNo: number;
  entryDate: Date | string;
  exitDate: Date | string;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
}

export interface IRebalanceHistoryEntry {
  date: string | Date;
  added: { name: string; quantity: number }[];
  removed: { name: string; quantity: number }[];
  changed: { name: string; from: number; to: number }[];
  closed: { name: string }[];
}


export interface IPortfolio {
  _id: string;
  portfolioName: string;
  name: string;
  address: string;
  contact: string;
  email: string;
  sebiRegNo: string;
  bseRegNo: string;
  theme: string;
  methodology: string;
  benchmarkIndex: string;
  investmentHorizon: number;
  reviewFrequency: number;
  minInvestmentAmount: number;
  feeValidity: string;
  fees: number;
  riskLevel: number;
  launchDate: Date;
  rationale: string;
  disclosure: string;
  scripts: IScript[];
  closedPositions?: IClosedPosition[];
  rebalanceHistory?: IRebalanceHistoryEntry[];
  pnl?: {
    total: number;
    realized: number;
    unrealized: number;
  };
  returnPercentage: number;

  riskMetrics: {
    standardDeviation: string;
    sharpeRatio: string;
    maximumDrawdown: string;
  };
  performance: {
    totalCurrentValue: number;
    totalInitialValue: number;
    totalProfitLoss: number;
    totalProfitLossPercentage: number;
  };

  sername: number;
  seraddress: string;
  createdAt: Date | undefined;
  rebalanceCount: number;
  updatedAt: Date;
  authorData: {
    name: string;
    email: string;
  };
}

interface PerformanceMetrics {
  periodicReturns: {
    oneMonth: number;
    threeMonth: number;
    sixMonth: number;
    oneYear: number;
  };
  benchmarkReturns: {
    oneMonth: number;
    threeMonth: number;
    sixMonth: number;
    oneYear: number;
  };
  cumulativeGrowth: Array<{
    date: string;
    portfolio: number;
    benchmark: number;
  }>;
}

interface CustomerViewProps {
  portfolio: IPortfolio;
  performance: Performance;
}

// Sample data for sector allocation
const sectorAllocation = [
  { name: "Technology", value: 30 },
  { name: "Finance", value: 25 },
  { name: "Healthcare", value: 20 },
  { name: "Energy", value: 15 },
  { name: "Others", value: 10 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

type OurServicesTypeWithIndex = {
  [key: string]: string | number | undefined;
};

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const getId = async () => {
      const { id } = await params;
      setId(id);
    };
    getId();
  }, [params]);

  const [data, setData] = useState<IPortfolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  interface FactSheetDetailsProps {
    portfolio: IPortfolio;
  }

  const fetchPortfolioData = async (id: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/portfolio/get-portfolio-by-id?id=${id}`
      );

      if (res.status === 200) {
        const response = await res.json();
        setData(response.data);
        console.log("Fetched portfolio data:", response.data);
      } else {
        setError("Failed to fetch data");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const [remarksDialog, setRemarksDialog] = useState<{
    open: boolean;
    remarks: string;
  }>({ open: false, remarks: "" });
  const [methodologyExpanded, setMethodologyExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const calculateHoldingPeriod = (createdAt: Date): string => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months !== 1 ? "s" : ""}`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years !== 1 ? "s" : ""}`;
    }
  };

  useEffect(() => {
    if (id) {
      fetchPortfolioData(id as string);
    }
  }, [id]);

  const holdingPeriod = calculateHoldingPeriod(data?.createdAt!);
  console.log("plan data", data);
  if (!data) {
    return <div>Loading...</div>;
  }

  // Calculate holding period in days for table
  const calculateHoldingPeriodDays = (createdAt: Date): number => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.floor(diffTime / (1000 * 3600 * 24));
  };

  //const holdingPeriod = calculateHoldingPeriod(data.createdAt);
  // Hardcoded performance metrics
  const performanceMetrics: PerformanceMetrics = {
    periodicReturns: {
      oneMonth: 2.5,
      threeMonth: 7.8,
      sixMonth: 15.2,
      oneYear: 25.5,
    },
    benchmarkReturns: {
      oneMonth: 2.0,
      threeMonth: 6.5,
      sixMonth: 12.8,
      oneYear: 22.0,
    },
    cumulativeGrowth: [
      { date: "Jan 2023", portfolio: 100, benchmark: 100 },
      { date: "Feb 2023", portfolio: 105, benchmark: 102 },
      { date: "Mar 2023", portfolio: 110, benchmark: 104 },
      { date: "Apr 2023", portfolio: 115, benchmark: 106 },
      { date: "May 2023", portfolio: 120, benchmark: 108 },
      { date: "Jun 2023", portfolio: 125, benchmark: 110 },
      { date: "Jul 2023", portfolio: 130, benchmark: 112 },
      { date: "Aug 2023", portfolio: 135, benchmark: 114 },
      { date: "Sep 2023", portfolio: 140, benchmark: 116 },
      { date: "Oct 2023", portfolio: 145, benchmark: 118 },
      { date: "Nov 2023", portfolio: 150, benchmark: 120 },
      { date: "Dec 2023", portfolio: 155, benchmark: 122 },
    ],
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  // Helper function to generate portfolio allocation data
  const getPortfolioAllocationData = () => {
    const allocationData = data?.scripts.map((script) => ({
      name: script.scriptName.name,
      value: script.value,
    }));

    // Add uninvested amount to allocation data
    const totalInvested = data?.scripts.reduce(
      (acc, script) => acc + script.value,
      0
    );
    const uninvestedAmount = data.minInvestmentAmount - totalInvested;

    if (uninvestedAmount > 0) {
      allocationData?.push({
        name: "Uninvested",
        value: uninvestedAmount,
      });
    }
    return allocationData;
  };

  // Generate the factsheet PDF on click and trigger a download. Done
  // imperatively (instead of <PDFDownloadLink>) so generation only runs on
  // click and any error surfaces as a toast instead of failing silently.
  const handleDownload = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      const blob = await pdf(<PortfolioPDF portfolio={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${data.portfolioName}-Portfolio.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Factsheet PDF generation failed:", error);
      toast({
        title: "Download failed",
        description: "Could not generate the factsheet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 dark:text-white overflow-hidden">
      {/* <div className="min-h-screen text-black dark:text-white overflow-hidden max-w-7xl mx-auto"> */}
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl animate-bounce delay-500"></div>
        <div className="absolute top-1/4 right-1/4 w-40 h-40 bg-orange-500/5 rounded-full blur-2xl animate-ping"></div>
      </div>

      {/* Header Section */}
      <div className="relative pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="bg-gradient-to-r from-white/90 to-blue-50/90 dark:from-slate-900/95 dark:via-slate-800/95 dark:to-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-8 mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-4 flex-1">
                {/* <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Crown className="w-5 h-5 text-blue-500" />
                  </div>
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 px-3 py-1 text-xs font-medium">
                    Premium Portfolio
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  >
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Live Performance
                  </Badge>
                </div> */}

                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
                  {data.portfolioName}
                </h1>

                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
                  {data.theme} • Managed by {data.authorData?.name || "Expert Analyst"}
                </p>

                <div className="flex flex-wrap gap-4 mt-4">
                  {/* <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/60 rounded-xl px-4 py-2 border border-slate-200/50 dark:border-slate-700/50">
                    <IndianRupeeIcon className="w-4 h-4 text-cyan-500" />
                    <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                      {data.fees?.toLocaleString()}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Fee
                    </span>
                  </div> */}
                  <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/60 rounded-xl px-4 py-2 border border-slate-200/50 dark:border-slate-700/50">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-black-600 dark:black-emerald-400">
                      {data.feeValidity || "-"}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Validity
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/60 rounded-xl px-4 py-2 border border-slate-200/50 dark:border-slate-700/50">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span className="font-semibold text-black-600 dark:text-black-400">
                      {data.rebalanceCount || 0}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Rebalances
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/60 rounded-xl px-4 py-2 border border-slate-200/50 dark:border-slate-700/50">
                    <IndianRupeeIcon className="w-4 h-4 text-cyan-500" />
                    <span className="font-semibold text-black-600 dark:text-black-400">
                      {data.minInvestmentAmount || 0}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Min Investments
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl px-6 py-3 transform hover:scale-105 duration-300"
                >
                  <div className="flex items-center">
                    <Download className="w-4 h-4 mr-2" />
                    <span>
                      {downloading ? "Generating..." : "Download Factsheet"}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>


          <div className="space-y-8">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "Invested Value",
                  value: `${data.performance.totalInitialValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  subtitle: "Total amount invested",
                  icon: Wallet,
                  color: "from-blue-500 to-cyan-500",
                  delay: "0s",
                },
                {
                  title: "Current Value",
                  value: `${data.performance.totalCurrentValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  subtitle: "Market value",
                  icon: Wallet,
                  color: "from-emerald-500 to-green-500",
                  delay: "0.1s",
                },
                {
                  title: "Return %",
                  value: `${data.performance.totalProfitLossPercentage.toFixed(2)}%`,
                  subtitle: "Total return percentage",
                  icon:
                    data.performance.totalProfitLossPercentage < 0
                      ? TrendingDown
                      : TrendingUp,
                  color: "from-purple-500 to-pink-500",
                  delay: "0.2s",
                },
                {
                  title: "Profit/Loss",
                  value: `${data.performance.totalProfitLoss.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  subtitle: "Total gain/loss",
                  icon:
                    data.performance.totalProfitLoss < 0
                      ? TrendingDown
                      : TrendingUp,
                  color: "from-orange-500 to-red-500",
                  delay: "0.3s",
                },
              ].map((metric, index) => (
                <Card
                  key={metric.title}
                  className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-500 animate-fade-in"
                  style={{ animationDelay: metric.delay }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${metric.color}`}>
                        <metric.icon className="w-6 h-6 text-white" />
                      </div>
                      <Badge
                        className={`bg-gradient-to-r ${metric.color} text-white border-0`}
                      >
                        {metric.title}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {metric.value}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {metric.subtitle}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Strategy & Performance */}
            <div className="grid grid-cols-1 gap-8">
              <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-lg">
                <CardHeader className="border-b border-slate-200/50 dark:border-slate-700/50">
                  <CardTitle className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                    <Zap className="w-5 h-5" />
                    Investment Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-slate-50/50 dark:bg-slate-700/30 rounded-xl">
                        <Target className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 dark:text-slate-400">Methodology</p>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {(() => {
                            const text = data.methodology ?? "";
                            const words = text.trim().split(/\s+/).filter(Boolean);
                            const isLong = words.length > 10;
                            const displayText = isLong && !methodologyExpanded
                              ? words.slice(0, 10).join(" ") + "..."
                              : text;
                            return (
                              <>
                                {displayText}
                                {isLong && (
                                  <button
                                    type="button"
                                    onClick={() => setMethodologyExpanded((e) => !e)}
                                    className="ml-1.5 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                                  >
                                    {methodologyExpanded ? "See less" : "See more"}
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-slate-50/50 dark:bg-slate-700/30 rounded-xl">
                        <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 dark:text-slate-400">Horizon</p>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {data.investmentHorizon} months
                        </p>
                      </div>
                      <div className="text-center p-4 bg-slate-50/50 dark:bg-slate-700/30 rounded-xl">
                        <Clock className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 dark:text-slate-400">Review</p>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {data.reviewFrequency} months
                        </p>
                      </div>
                      <div className="text-center p-4 bg-slate-50/50 dark:bg-slate-700/30 rounded-xl">
                        <MenuIcon className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 dark:text-slate-400">Benchmark Idx</p>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {data.benchmarkIndex}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-slate-50/50 dark:bg-slate-700/30 rounded-xl">
                        <FileWarning className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 dark:text-slate-400">Risk Level</p>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {data.riskLevel}% - {data.riskLevel < 30 ? "Low Risk" : data.riskLevel < 60 ? "Moderate Risk" : "High Risk"}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-slate-50/50 dark:bg-slate-700/30 rounded-xl">
                        <PiggyBank className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 dark:text-slate-400">Uninvested</p>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          ₹
                          {(
                            data.minInvestmentAmount -
                            data.performance.totalInitialValue
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-8">
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  <PieChartIcon className="w-5 h-5" />
                  Current Holdings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-xl">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200/50 dark:border-slate-700/50">
                        <th className="text-left py-4 px-4 text-slate-600 dark:text-slate-400 font-semibold">Script</th>
                        <th className="text-right py-4 px-4 text-slate-600 dark:text-slate-400 font-semibold">Qty</th>
                        <th className="text-right py-4 px-4 text-slate-600 dark:text-slate-400 font-semibold">Entry Price</th>
                        <th className="text-right py-4 px-4 text-slate-600 dark:text-slate-400 font-semibold">CMP</th>
                        <th className="text-right py-4 px-4 text-slate-600 dark:text-slate-400 font-semibold">Value</th>
                        <th className="text-right py-4 px-4 text-slate-600 dark:text-slate-400 font-semibold">P/L</th>
                        <th className="text-right py-4 px-4 text-slate-600 dark:text-slate-400 font-semibold">Potential left</th>
                        <th className="text-right py-4 px-4 text-slate-600 dark:text-slate-400 font-semibold">Weightage</th>

                      </tr>
                    </thead>
                    <tbody>
                      {data.scripts.map((script, index) => (
                        <tr
                          key={script.slNo}
                          className="border-b border-slate-100/50 dark:border-slate-700/30 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors duration-200"
                        >
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {script.scriptName.name}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {script.exchangeType} • {script.segmentType}
                              </p>
                            </div>
                          </td>
                          <td className="text-right py-4 px-4 font-medium text-slate-900 dark:text-white">
                            {script.quantity}
                          </td>
                          <td className="text-right py-4 px-4 font-medium text-slate-900 dark:text-white">
                            {script.buyRate.toLocaleString()}
                          </td>
                          <td className="text-right py-4 px-4 font-medium text-slate-900 dark:text-white">
                            {script.cmp.toLocaleString()}
                          </td>
                          <td className="text-right py-4 px-4 font-medium text-slate-900 dark:text-white">
                            {script.value.toLocaleString()}
                          </td>
                          <td className="text-right py-4 px-4 font-medium text-slate-900 dark:text-white">
                            {script.profitLoss >= 0 ? <span className="text-emerald-400">{script.profitLoss.toLocaleString()}</span> : <span className="text-red-400">{script.profitLoss.toLocaleString()}</span>}
                          </td>
                          <td className="text-right py-4 px-4 font-medium text-slate-900 dark:text-white">
                            {(() => {
                              const target = Number(script.target) || 0;
                              const cmp = Number(script.cmp) || 0;
                              const buyRate = Number(script.buyRate) || 0;

                              // Case 1: Target is set → show "potential left to target"
                              if (target && (cmp || buyRate)) {
                                const reference = cmp || buyRate;
                                const pct = ((target - reference) / reference) * 100;
                                const isPositive = pct >= 0;
                                return (
                                  <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
                                    {isPositive ? "+" : ""}
                                    {pct.toFixed(2)}%
                                  </span>
                                );
                              }

                              // Case 2: No target → fall back to current return % from buy price
                              if (cmp && buyRate) {
                                const pct = ((cmp - buyRate) / buyRate) * 100;
                                const isPositive = pct >= 0;
                                return (
                                  <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
                                    {isPositive ? "+" : ""}
                                    {pct.toFixed(2)}%
                                  </span>
                                );
                              }

                              return <span className="text-slate-400">-</span>;
                            })()}
                          </td>
                          <td className="text-right py-4 px-4">
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-0">
                              {script.weightage}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>



          <div className="space-y-8">
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  <PieChartIcon className="w-5 h-5" />
                  Previous Rebalances
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">No. of Rebalances:</span>
                  <span className="text-lg font-medium text-white bg-blue-500/10 px-3 py-1 rounded-lg">
                    {data.rebalanceCount}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-xl">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200/50 dark:border-slate-700/50">
                        <th className="text-left py-4 px-4 text-slate-600 dark:text-slate-400 font-semibold">Date</th>
                        <th className="text-left py-4 px-4 text-slate-600 dark:text-slate-400 font-semibold">Added</th>
                        <th className="text-left py-4 px-4 text-slate-600 dark:text-slate-400 font-semibold">Removed</th>
                        <th className="text-left py-4 px-4 text-slate-600 dark:text-slate-400 font-semibold">Closed</th>
                        <th className="text-left py-4 px-4 text-slate-600 dark:text-slate-400 font-semibold">Qty changed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.rebalanceHistory && data.rebalanceHistory.length > 0 ? (
                        data.rebalanceHistory.map((rb, index) => (
                          <tr
                            key={index}
                            className="border-b border-slate-100/50 dark:border-slate-700/30 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors duration-200"
                          >
                            <td className="py-4 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                              {rb.date ? format(new Date(rb.date), "dd MMM yyyy") : "—"}
                            </td>
                            <td className="py-4 px-4 text-emerald-500">
                              {rb.added?.length
                                ? rb.added.map((a) => a.name).join(", ")
                                : "—"}
                            </td>
                            <td className="py-4 px-4 text-red-400">
                              {rb.removed?.length
                                ? rb.removed.map((r) => r.name).join(", ")
                                : "—"}
                            </td>
                            <td className="py-4 px-4 text-slate-700 dark:text-slate-300">
                              {rb.closed?.length
                                ? rb.closed.map((c) => c.name).join(", ")
                                : "—"}
                            </td>
                            <td className="py-4 px-4 text-slate-700 dark:text-slate-300">
                              {rb.changed?.length
                                ? rb.changed
                                    .map((c) => `${c.name} (${c.from}→${c.to})`)
                                    .join(", ")
                                : "—"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center py-10 text-slate-500 dark:text-slate-400"
                          >
                            No rebalances yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  Investment Rationale
                </CardTitle>
              </CardHeader>
               <CardContent>
                {data.rationale ?? "-"}
               </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  Disclosure
                </CardTitle>
              </CardHeader>
               <CardContent>
                {data.disclosure ?? "-"}
               </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  Research Analyst (RA) Profile
                </CardTitle>
              </CardHeader>
               <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    <span className="font-semibold dark:text-slate-200">Name:</span>
                    <span>
                      {data?.authorData?.name || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-blue-400" />
                    <span className="font-semibold dark:text-slate-200">
                      Email:
                    </span>
                    <span>
                      {data?.authorData?.email || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-blue-400" />
                    <span className="font-semibold dark:text-slate-200">
                      Contact:
                    </span>
                    <span>{data?.sername || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    <span className="font-semibold dark:text-slate-200">
                      Address:
                    </span>
                    <span>
                      {data?.seraddress || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-yellow-400 text-black px-2 py-1 rounded">
                      SEBI Reg. No: {data?.sebiRegNo ?? "N/A"}
                    </Badge>
                  </div>
                </div>
               </CardContent>
            </Card>
          </div>


        </div>
      </div>

      {/* Main Content */}
      <div
        className="relative max-w-7xl mx-auto p-6 rounded-lg lg:p-8 space-y-8"
        id="portfolio-content"
      >

        {/* Performance Charts Section */}
        {/* <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <Card className="bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 border-slate-700/50 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold bg-gradient-to-r dark:from-blue-400 dark:to-cyan-400 bg-clip-text dark:text-transparent">
                      Portfolio Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={performanceMetrics.cumulativeGrowth}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#374151"
                          />
                          <XAxis dataKey="date" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(17, 24, 39, 0.9)",
                              border: "1px solid #374151",
                              borderRadius: "8px",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="portfolio"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={{ fill: "#3B82F6" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card> */}

        {/* <Card className="bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 border-slate-700/50 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold bg-gradient-to-r dark:from-purple-400 dark:to-pink-400 bg-clip-text dark:text-transparent">
                      Sector Allocation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sectorAllocation}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) =>
                              `${name} ${(percent! * 100).toFixed(0)}%`
                            }
                          >
                            {sectorAllocation.map((_entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(17, 24, 39, 0.9)",
                              border: "1px solid #374151",
                              borderRadius: "8px",
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card> */}
        {/* </div> */}

        {/* Performance Summary Section */}
        {/* <Card className="bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 border-slate-700/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text dark:text-transparent">
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-4 px-6 text-slate-400 font-medium">
                        Period
                      </th>
                      <th className="text-right py-4 px-6 text-slate-400 font-medium">
                        Portfolio Return
                      </th>
                      <th className="text-right py-4 px-6 text-slate-400 font-medium">
                        Benchmark Return
                      </th>
                      <th className="text-right py-4 px-6 text-slate-400 font-medium">
                        Outperformance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        period: "1 Month",
                        portfolio:
                          performanceMetrics.periodicReturns.oneMonth,
                        benchmark:
                          performanceMetrics.benchmarkReturns.oneMonth,
                      },
                      {
                        period: "3 Months",
                        portfolio:
                          performanceMetrics.periodicReturns.threeMonth,
                        benchmark:
                          performanceMetrics.benchmarkReturns.threeMonth,
                      },
                      {
                        period: "6 Months",
                        portfolio:
                          performanceMetrics.periodicReturns.sixMonth,
                        benchmark:
                          performanceMetrics.benchmarkReturns.sixMonth,
                      },
                      {
                        period: "1 Year",
                        portfolio:
                          performanceMetrics.periodicReturns.oneYear,
                        benchmark:
                          performanceMetrics.benchmarkReturns.oneYear,
                      },
                    ].map((row) => (
                      <tr
                        key={row.period}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-4 px-6 text-slate-300">
                          {row.period}
                        </td>
                        <td
                          className={`py-4 px-6 text-right font-medium ${row.portfolio >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                            }`}
                        >
                          {row.portfolio.toFixed(2)}%
                        </td>
                        <td
                          className={`py-4 px-6 text-right font-medium ${row.benchmark >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                            }`}
                        >
                          {row.benchmark.toFixed(2)}%
                        </td>
                        <td
                          className={`py-4 px-6 text-right font-medium ${row.portfolio - row.benchmark >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                            }`}
                        >
                          {(row.portfolio - row.benchmark).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceMetrics.cumulativeGrowth}>
                    <defs>
                      <linearGradient
                        id="portfolioGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10B981"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10B981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="benchmarkGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3B82F6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3B82F6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#374151"
                    />
                    <XAxis dataKey="date" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(17, 24, 39, 0.9)",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="portfolio"
                      stroke="#10B981"
                      fillOpacity={1}
                      fill="url(#portfolioGradient)"
                      name="Portfolio"
                    />
                    <Area
                      type="monotone"
                      dataKey="benchmark"
                      stroke="#3B82F6"
                      fillOpacity={1}
                      fill="url(#benchmarkGradient)"
                      name="Benchmark"
                    />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>

      
      {/* </div> */}
    </div>
  );
}
