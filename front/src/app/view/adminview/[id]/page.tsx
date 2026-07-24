"use client";
import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  Building2,
  Mail,
  Phone,
  PencilIcon,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Edit2,
  ArrowUpDown,
  
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

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
  quantity: number;
  weightage: number;
  value: number;
  initialValue: number;
  currentValue: number;
  profitLoss: number;
  lastUpdated: string;
}

interface IClosedPosition {
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
}

export interface IPortfolio {
  _id: string;
  portfolioName: string;
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
  tncFileURL: string;
  closedPositions?: IClosedPosition[];

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
    id: string;
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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

type SortField = keyof IClosedPosition | "profitLossPercentage";
type SortDirection = "asc" | "desc";
type SortValue = string | number | Date;

type OurServicesTypeWithIndex = {
  [key: string]: string | number | undefined;
};

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");
  const [data, setData] = useState<IPortfolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("closedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const router = useRouter();

  useEffect(() => {
    const getId = async () => {
      const { id } = await params;
      setId(id);
    };
    getId();
  }, [params]);

  const fetchPortfolioData = async (id: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/portfolio/get-portfolio-by-id?id=${id}`
      );

      if (res.status === 200) {
        const response = await res.json();
        setData(response.data);
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
      fetchPortfolioData(id);
    }
  }, [id]);

  // Prepare data for charts
  const allocationData = data?.scripts?.map((script) => ({
    name: script.scriptName.name,
    value: script.value,
  })) || [];

  // Add uninvested amount to allocation data
  if (data) {
    allocationData.push({
      name: "Uninvested",
      value: data.minInvestmentAmount - data.scripts.reduce((acc, script) => acc + script.value, 0),
    });
  }

  // Calculate P/L metrics
  const plMetrics = {
    totalPL: data?.performance?.totalProfitLoss || 0,
    plPercentage: data?.performance?.totalProfitLossPercentage || 0,
    totalProfit: (data?.performance?.totalProfitLoss || 0) > 0 ? (data?.performance?.totalProfitLoss || 0) : 0,
    totalLoss: (data?.performance?.totalProfitLoss || 0) < 0 ? (data?.performance?.totalProfitLoss || 0) : 0,
    profitCount: data?.scripts?.filter((script) => script.profitLoss > 0).length || 0,
    lossCount: data?.scripts?.filter((script) => script.profitLoss < 0).length || 0,
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return <ArrowUpDown className="w-4 h-4 ml-1" />;
    return sortDirection === "asc" ? (
      <ArrowUpRight className="w-4 h-4 ml-1" />
    ) : (
      <ArrowDownRight className="w-4 h-4 ml-1" />
    );
  };

  const holdingPeriod = data?.createdAt ? calculateHoldingPeriod(data.createdAt) : "N/A";
  
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!data) {
    return <div>Error loading data</div>;
  }

  return (
    <div className="flex flex-col gap-3 justify-start bg-whiteShade dark:bg-blackShade">
      <div className="min-h-screen text-black dark:text-white overflow-hidden max-w-7xl mx-auto">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl animate-bounce"></div>
        </div>

        {/* Header Section */}
        <div className="relative border-b rounded-lg border-slate-800/50 dark:bg-gradient-to-r dark:from-slate-900/95 dark:via-slate-800/95 dark:to-slate-900/95 dark:backdrop-blur-xl">
          <div className="absolute inset-0 dark:bg-gradient-to-r dark:from-blue-600/5 dark:via-transparent dark:to-purple-600/5"></div>
          <div className="relative max-w-7xl mx-auto p-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-4 animate-fade-in">
                <div className="flex flex-col items-start gap-4">
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text dark:dark:text-transparent">
                    {data.portfolioName}
                  </h1>

                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 px-4 py-2 text-sm font-medium animate-scale-in">
                    {data.theme}
                  </div>

                  {/* Fees & Validity */}
                  <div className="flex flex-row gap-4 mt-2">
                    <div className="flex items-center gap-2 dark:bg-slate-800/60 rounded-lg px-3 py-2 dark:border dark:border-slate-700/50">
                      <span className="text-lg font-bold text-cyan-400">₹</span>
                      <span className="text-base font-semibold text-cyan-300">
                        {data.fees.toLocaleString()}{" "}
                        <span className="text-xs font-medium text-slate-400">
                          Fee
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 dark:bg-slate-800/60 rounded-lg px-3 py-2 dark:border dark:border-slate-700/50">
                      <span className="text-base font-semibold text-emerald-300">
                        {data.feeValidity || "-"}
                        <span className="text-xs font-medium text-slate-400 ml-1">
                          Validity
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

             <div className="flex flex-wrap gap-3 animate-slide-in-right">
  <Button
    onClick={() => {
      router.push(`/dashboard/serviceprovider/portfolio/editportfolio/${data._id}`);
    }}
    variant="outline"
    className="text-white cursor-pointer border-gray-700 hover:bg-black/30 bg-black transition-all duration-300 hover:text-white hover:scale-105 hover:shadow-lg hover:shadow-gray-800/50"
  >
    <PencilIcon className="w-4 h-4 mr-2" />
    Edit Portfolio
  </Button>

  {/* <Button
    onClick={() => {
      router.push(`/factsheet/${data._id}`);
    }}
    variant="outline"
    className="text-white cursor-pointer border-gray-700 hover:bg-black/30 bg-black transition-all duration-300 hover:text-white hover:scale-105 hover:shadow-lg hover:shadow-gray-800/50"
  >
    <FileText className="w-4 h-4 mr-2" />
    View Fact Sheet
  </Button> */}
</div>

            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div
          className="relative max-w-7xl mx-auto p-6 rounded-lg lg:p-8 space-y-8"
          id="portfolio-content"
        >
          {/* Performance Overview */}
          <Card className="bg-black/50 backdrop-blur-sm border-gray-800 shadow-xl shadow-gray-900/20 hover:shadow-gray-900/30 transition-all duration-300">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="transform hover:scale-105 transition-transform duration-300">
                  <p className="text-gray-400 text-sm mb-1">Current Portfolio Value</p>
                  <p className="text-2xl font-semibold text-white">₹{data.performance.totalCurrentValue.toLocaleString()}</p>
                </div>
                <div className="transform hover:scale-105 transition-transform duration-300">
                  <p className="text-gray-400 text-sm mb-1">Total Invested Value</p>
                  <p className="text-2xl font-semibold text-white">
                    ₹{data.scripts.reduce((acc, script) => acc + script.value, 0).toLocaleString()}
                  </p>
                </div>
                <div className="transform hover:scale-105 transition-transform duration-300">
                  <p className="text-gray-400 text-sm mb-1">Total Invested Value Percentage</p>
                  <p className="text-2xl font-semibold text-white">
                    {(
                      (data.scripts.reduce((acc, script) => acc + script.value, 0) / data.minInvestmentAmount) *
                      100
                    ).toFixed(2)}
                    %
                  </p>
                </div>
                <div className="transform hover:scale-105 transition-transform duration-300">
                  <p className="text-gray-400 text-sm mb-1">Uninvested Amount</p>
                  <p className="text-2xl font-semibold text-white">
                    ₹
                    {(
                      data.minInvestmentAmount - data.scripts.reduce((acc, script) => acc + script.value, 0)
                    ).toLocaleString()}
                  </p>
                </div>
                <div className="transform hover:scale-105 transition-transform duration-300">
                  <p className="text-gray-400 text-sm mb-1">Profit/Loss</p>
                  <div className="flex items-center">
                    <p
                      className={`text-2xl font-semibold ${data.performance.totalProfitLoss >= 0 ? "text-green-500" : "text-red-500"}`}
                    >
                      ₹{Math.abs(data.performance.totalProfitLoss).toLocaleString()}
                    </p>
                    {data.performance.totalProfitLoss >= 0 ? (
                      <ArrowUpRight className="w-5 h-5 text-green-500 ml-1 animate-bounce" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-red-500 ml-1 animate-bounce" />
                    )}
                  </div>
                </div>
                <div className="transform hover:scale-105 transition-transform duration-300">
                  <p className="text-gray-400 text-sm mb-1">Return</p>
                  <p
                    className={`text-2xl font-semibold ${data.performance.totalProfitLossPercentage >= 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    {data.performance.totalProfitLossPercentage}%
                  </p>
                </div>
                <div className="transform hover:scale-105 transition-transform duration-300">
                  <p className="text-gray-400 text-sm mb-1">Min Investment</p>
                  <p className="text-2xl font-semibold text-white">₹{data.minInvestmentAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Portfolio Information Cards */}
          {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 border-slate-700/50 backdrop-blur-xl hover:shadow-2xl hover:shadow-blue-500/10 transform hover:scale-105 transition-all duration-500 animate-fade-in h-full flex flex-col">
              <CardContent className="px-6 flex-grow flex flex-col justify-center">
                <div className="space-y-3">
                  <p className="text-sm text-slate-400 font-medium">
                    Minimum Investment
                  </p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text dark:text-transparent">
                    ₹{data.minInvestmentAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">Required to start</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 border-slate-700/50 backdrop-blur-xl hover:shadow-2xl hover:shadow-emerald-500/10 transform hover:scale-105 transition-all duration-500 animate-fade-in h-full flex flex-col"
              style={{ animationDelay: "0.1s" }}
            >
              <CardContent className="px-6 flex-grow flex flex-col justify-center">
                <div className="flex justify-between items-center">
                  
                  <div className="space-y-2 text-center">
                    <p className="text-sm text-slate-400 font-medium">
                      Launch Date
                    </p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {new Date(data.launchDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-slate-500">
                      Portfolio inception
                    </p>
                  </div>

                  
                  <div className="space-y-2 text-center">
                    <p className="text-sm text-slate-400 font-medium">
                      Holding Period
                    </p>
                    <p className="text-2xl font-bold text-blue-400">
                      {holdingPeriod}
                    </p>
                    <p className="text-xs text-slate-500">
                      Time since creation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 border-slate-700/50 backdrop-blur-xl hover:shadow-2xl hover:shadow-yellow-500/10 transform hover:scale-105 transition-all duration-500 animate-fade-in h-full flex flex-col"
              style={{ animationDelay: "0.2s" }}
            >
              <CardContent className="px-6 flex-grow flex flex-col justify-center">
                <div className="space-y-3">
                  <p className="text-sm text-slate-400 font-medium">
                    Risk Level
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <Progress
                        value={data.riskLevel}
                        className="h-3 bg-slate-800 flex-1 mr-3"
                        indicatorColor={
                          data.riskLevel < 30
                            ? "bg-emerald-400"
                            : data.riskLevel < 60
                            ? "bg-yellow-400"
                            : "bg-red-400"
                        }
                      />
                      <span className="text-sm font-medium text-slate-300">
                        {data.riskLevel}%
                      </span>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        data.riskLevel < 30
                          ? "text-emerald-400"
                          : data.riskLevel < 60
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {data.riskLevel < 30
                        ? "Low Risk"
                        : data.riskLevel < 60
                        ? "Moderate Risk"
                        : "High Risk"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 border-slate-700/50 backdrop-blur-xl hover:shadow-2xl hover:shadow-purple-500/10 transform hover:scale-105 transition-all duration-500 animate-fade-in h-full flex flex-col"
              style={{ animationDelay: "0.3s" }}
            >
              <CardContent className="px-6 flex-grow flex flex-col justify-center">
                <div className="space-y-3">
                  <p className="text-sm text-slate-400 font-medium">
                    Rebalance History
                  </p>
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text dark:text-transparent">
                        {data.rebalanceCount || 0}
                      </p>
                      <p className="text-xs text-slate-500">Total Rebalances</p>
                    </div>
                    <div className="flex justify-around space-x-2">
                      <div className="text-center">
                        <p className="text-xs text-slate-400">Last Rebalance</p>
                        <p className="text-sm font-semibold text-purple-300">
                          {new Date(
                            Date.now() - 15 * 24 * 60 * 60 * 1000
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-400">Next Rebalance</p>
                        <p className="text-sm font-semibold text-pink-300">
                          {new Date(
                            Date.now() + 15 * 24 * 60 * 60 * 1000
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div> */}

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Portfolio Allocation Chart */}
            <Card className="bg-black/50 backdrop-blur-sm border-gray-800 shadow-xl shadow-gray-900/20 hover:shadow-gray-900/30 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white bg-gradient-to-r from-white to-gray-400 bg-clip-text">
                  Portfolio Allocation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} (${(percent! * 100).toFixed(1)}%)`}
                      >
                        {allocationData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`₹${(Number(value) ?? 0).toLocaleString()}`, "Value"]}
                        contentStyle={{
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          border: "1px solid #333",
                          borderRadius: "4px",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* P/L Metrics Card */}
            <Card className="bg-black/50 backdrop-blur-sm border-gray-800 shadow-xl shadow-gray-900/20 hover:shadow-gray-900/30 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white bg-gradient-to-r from-white to-gray-400 bg-clip-text">
                  Profit/Loss Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Total P/L */}
                  <div className="space-y-2">
                    <p className="text-gray-400 text-sm">Total Profit/Loss</p>
                    <div className="flex items-center">
                      <p className={`text-2xl font-semibold ${plMetrics.totalPL >= 0 ? "text-green-500" : "text-red-500"}`}>
                        ₹{Math.abs(plMetrics.totalPL).toLocaleString()}
                      </p>
                      {plMetrics.totalPL >= 0 ? (
                        <ArrowUpRight className="w-5 h-5 text-green-500 ml-1" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-red-500 ml-1" />
                      )}
                    </div>
                    <p className={`text-sm ${plMetrics.plPercentage >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {plMetrics.plPercentage.toFixed(2)}%
                    </p>
                  </div>

                  {/* Profit vs Loss Distribution */}
                  <div className="space-y-2">
                    <p className="text-gray-400 text-sm">Profit vs Loss Distribution</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-500/10 p-4 rounded-lg">
                        <p className="text-green-500 font-medium">Profit</p>
                        <p className="text-2xl font-semibold text-green-500">₹{plMetrics.totalProfit.toLocaleString()}</p>
                        <p className="text-sm text-green-500/70">
                          {plMetrics.profitCount} {plMetrics.profitCount === 1 ? "Position" : "Positions"}
                        </p>
                      </div>
                      <div className="bg-red-500/10 p-4 rounded-lg">
                        <p className="text-red-500 font-medium">Loss</p>
                        <p className="text-2xl font-semibold text-red-500">₹{Math.abs(plMetrics.totalLoss).toLocaleString()}</p>
                        <p className="text-sm text-red-500/70">
                          {plMetrics.lossCount} {plMetrics.lossCount === 1 ? "Position" : "Positions"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Win Rate */}
                  <div className="space-y-2">
                    <p className="text-gray-400 text-sm">Win Rate</p>
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <p className="text-2xl font-semibold text-white">
                        {isNaN((plMetrics.profitCount / (plMetrics.profitCount + plMetrics.lossCount)) * 100)
                          ? 0
                          : ((plMetrics.profitCount / (plMetrics.profitCount + plMetrics.lossCount)) * 100).toFixed(1)}
                        %
                      </p>
                      <p className="text-sm text-gray-400">
                        {plMetrics.profitCount} out of {plMetrics.profitCount + plMetrics.lossCount} positions are
                        profitable
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scripts Table */}
          <Card className="bg-black/50 backdrop-blur-sm border-gray-800 shadow-xl shadow-gray-900/20 hover:shadow-gray-900/30 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white bg-gradient-to-r from-white to-gray-400 bg-clip-text">
                Portfolio Holdings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">SL No.</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Script</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Exchange</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Buy Rate</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">CMP</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Qty</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Initial Value</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Current Value</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Weightage</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">P/L</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Holding Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.scripts.map((script, index) => (
                      <tr
                        key={script.slNo}
                        className="border-b border-gray-800 hover:bg-gray-900/50 transition-all duration-300 animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <td className="py-3 px-4 text-white font-medium">{index + 1}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-white font-medium">{script.scriptName.name}</p>
                            <p className="text-gray-400 text-sm">{script.segmentType}</p>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 text-white">{script.exchangeType}</td>
                        <td className="text-right py-3 px-4 text-white">₹{script.buyRate.toLocaleString()}</td>
                        <td className="text-right py-3 px-4 text-white">₹{script.cmp?.toLocaleString()}</td>
                        <td className="text-right py-3 px-4 text-white">{script.quantity}</td>
                        <td className="text-right py-3 px-4 text-white">₹{script.initialValue.toLocaleString()}</td>
                        <td className="text-right py-3 px-4 text-white">₹{script.currentValue.toLocaleString()}</td>
                        <td className="text-right py-3 px-4 text-white">{script.weightage}%</td>
                        <td className="text-right py-3 px-4">
                          <div className="flex items-center justify-end">
                            <p className={script.profitLoss >= 0 ? "text-green-500" : "text-red-500"}>
                              ₹{Math.abs(script.profitLoss).toLocaleString()}
                            </p>
                            {script.profitLoss >= 0 ? (
                              <ArrowUpRight className="w-4 h-4 text-green-500 ml-1 animate-pulse" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-red-500 ml-1 animate-pulse" />
                            )}
                          </div>
                        </td>
                        <td className="text-right py-3 px-4">{holdingPeriod}</td>
                      </tr>
                    ))}
                    {/* Uninvested Balance Row */}
                    <tr className="border-b border-gray-800 bg-blue-900/30">
                      <td className="py-3 px-4 text-white font-medium">{data.scripts.length + 1}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-white font-medium">Uninvested Balance</p>
                          <p className="text-gray-400 text-sm">Cash</p>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-white">-</td>
                      <td className="text-right py-3 px-4 text-white">-</td>
                      <td className="text-right py-3 px-4 text-white">-</td>
                      <td className="text-right py-3 px-4 text-white">-</td>
                      <td className="text-right py-3 px-4 text-white">
                        ₹
                        {(
                          data.minInvestmentAmount - data.scripts.reduce((sum, script) => sum + script.value, 0)
                        ).toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-4 text-white">-</td>
                      <td className="text-right py-3 px-4 text-white">
                        {(100 - data.scripts.reduce((sum, script) => sum + script.weightage, 0)).toFixed(2)}%
                      </td>
                      <td className="text-right py-3 px-4 text-white">-</td>
                      <td className="text-right py-3 px-4 text-white">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Portfolio Strategy and Details */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <Card
              className="bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 border-slate-700/50 backdrop-blur-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              <CardHeader className="border-b border-slate-700/50 pb-6">
                <div className="space-y-2">
                  <CardTitle className="text-xl font-bold bg-gradient-to-r dark:from-purple-400 dark:to-pink-400 bg-clip-text dark:text-transparent">
                    Investment Strategy & Philosophy
                  </CardTitle>
                  <p className="text-slate-400 text-sm">
                    Comprehensive approach and methodology
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold dark:text-slate-200 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                      Methodology
                    </h3>
                    <div className="dark:bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
                      <p className="text-slate-300 leading-relaxed">
                        {data.methodology}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 border-slate-700/50 backdrop-blur-xl hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 animate-fade-in"
              style={{ animationDelay: "0.4s" }}
            >
              <CardHeader className="border-b border-slate-700/50 pb-6">
                <div className="space-y-2">
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text dark:text-transparent">
                    Portfolio Features & Risk Analysis
                  </CardTitle>
                  <p className="text-slate-400 text-sm">
                    Key characteristics and risk assessment
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold dark:text-slate-200">
                      Portfolio Features
                    </h3>
                    <div className="grid gap-4">
                      {[
                        {
                          icon: Calendar,
                          label: "Investment Horizon",
                          value: `${data.investmentHorizon} months`,
                          color: "text-blue-400",
                        },
                        {
                          icon: Clock,
                          label: "Review Frequency",
                          value: `${data.reviewFrequency} months`,
                          color: "text-emerald-400",
                        },
                        {
                          icon: TrendingUp,
                          label: "Benchmark Index",
                          value: data.benchmarkIndex,
                          color: "text-purple-400",
                        },
                      ].map((feature, index) => (
                        <div
                          key={feature.label}
                          className="flex items-center justify-between p-4 bg-gradient-to-r dark:from-slate-900/90 dark:to-slate-800/90 rounded-xl backdrop-blur-sm hover:from-slate-700/40 hover:to-slate-600/40 transition-all duration-300 transform hover:scale-102"
                          style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                        >
                          <div className="flex items-center gap-3">
                            <feature.icon
                              className={`w-5 h-5 ${feature.color}`}
                            />
                            <span className="text-slate-300 font-medium">
                              {feature.label}
                            </span>
                          </div>
                          <span className="text-white font-semibold">
                            {feature.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* New card at the bottom of main content (above the footer) */}
          <Card className="bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 border-slate-700/50 backdrop-blur-xl mt-8">
            <CardHeader>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text dark:text-transparent">
                Investment Rationale & Disclosure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold dark:text-slate-200 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    Investment Rationale
                  </h3>
                  <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm">
                    <p className="text-slate-300 leading-relaxed">
                      {data.rationale ?? "-"}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold dark:text-slate-200 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    Disclosure
                  </h3>
                  <div className="bg-slate-800/50 rounded-xl p-4 backdrop-blur-sm border-l-4 border-yellow-400">
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {data.disclosure ?? "-"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer with Disclosures */}
        <footer className="relative border-t rounded-lg border-slate-800/50 bg-gradient-to-r dark:from-slate-900/90 dark:to-slate-800/90 to-slate-900/95 backdrop-blur-xl mt-12">
          <div className="max-w-7xl mx-auto p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Mandatory Disclosures */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white">
                  Mandatory Disclosures
                </h3>
                <div className="space-y-4 text-slate-300">
                  <div className="dark:bg-slate-800/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-yellow-400 mb-2">
                      Risk Disclaimers
                    </h4>
                    <p className="text-sm">
                      Investments in securities market are subject to market
                      risks. Read all the related documents carefully before
                      investing.
                    </p>
                  </div>
                  <div className="dark:bg-slate-800/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-yellow-400 mb-2">
                      Performance Disclaimer
                    </h4>
                    <p className="text-sm">
                      Past performance is not indicative of future results. The
                      performance shown is historical and may not be sustained
                      in the future.
                    </p>
                  </div>
                  <div className="dark:bg-slate-800/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-yellow-400 mb-2">
                      SEBI Risk Statements
                    </h4>
                    <p className="text-sm">
                      This portfolio is managed by a SEBI registered Research
                      Analyst. All investments are subject to market risks.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>

        {/* RA Profile Card at the very bottom */}
        <Card className="bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 border-slate-700/50 backdrop-blur-xl mt-8 max-w-3xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold bg-gradient-to-r dark:from-blue-400 dark:to-purple-400 bg-clip-text dark:text-transparent">
              Research Analyst (RA) Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-blue-400" />
                <span className="font-semibold dark:text-slate-200">Name:</span>
                <span className="text-slate-300">
                  {data?.authorData?.name || "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-400" />
                <span className="font-semibold dark:text-slate-200">
                  Email:
                </span>
                <span className="text-slate-300">
                  {data?.authorData?.email || "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-blue-400" />
                <span className="font-semibold dark:text-slate-200">
                  Contact:
                </span>
                <span className="text-slate-300">{data?.sername || "N/A"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-blue-400" />
                <span className="font-semibold dark:text-slate-200">
                  Address:
                </span>
                <span className="text-slate-300">
                  {data?.seraddress || "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-yellow-400 text-black px-2 py-1 rounded">
                  SEBI Reg. No: INH000012345
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}