"use client";
import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  Phone,
  Mail,
  Building2,
  Star,
  Users,
  Target,
  Shield,
  Zap,
  BarChart,
  PieChart,
  Check,
  MapPin,
  X,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AuthModal from "@/components/Modal/AuthModal";
import CartModal from "@/components/Modal/CartModal";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/rootReducer";
import { addToCart, clearCart } from "@/store/slices/cartSlice";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import PortfolioPricingSection from "@/components/Portfolio/PortfolioPricingSection";
import { useEnforceSubdomainOwnership } from "@/hooks/useEnforceSubdomainOwnership";
import { useCanonicalUrl } from "@/hooks/useCanonicalUrl";

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
  bannerURL: string;

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

  serviceProviderData: {
    profileImage: string;
    number: number;
    address1: string;
    address2: string;
    city: string;
    state: string;
    description: string;
    regNumber: string;
    disclaimer: string;
  }
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
type SPType = {
  gst?: boolean;
  number?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
};

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");
  const [data, setData] = useState<IPortfolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullContent, setShowFullContent] = useState(false);
  const [spData, setSpData] = useState<SPType | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isTncModalOpen, setIsTncModalOpen] = useState(false);

  const { data: session } = useSession();
  const { toast } = useToast();

  // Extract marketplace slug from URL query params
  const marketplaceSlug = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("marketplace") || undefined
    : undefined;
  

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
    if (session?.user) {
      setIsLoggedIn(true);
    }
    if (id) {
      fetchPortfolioData(id);
    }
  }, [id]);

  /* ---------------- FETCH SP DATA ---------------- */

  const fetchSpData = async (spId: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/spdetails?id=${spId}`
      );

      if (!res.ok) throw new Error("Failed to fetch SP data");

      const response = await res.json();
      setSpData(response.data);

    } catch (error) {
      console.error("SP fetch error:", error);
      toast({
        title: "Error",
        description: "Unable to fetch service provider details",
        variant: "destructive",
      });
    }
  };

  /* 🔥 FIXED EFFECT */
  useEffect(() => {
    if (!data?.authorData?.id) return;

    fetchSpData(data.authorData.id);
  }, [data?.authorData?.id]);

  useEnforceSubdomainOwnership(data?.authorData?.id);
  useCanonicalUrl();


  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.portfolioName,
          text: `Check out this investment portfolio: ${data?.portfolioName}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied!",
        description: "Portfolio link copied to clipboard",
      });
    }
  };

  const toggleContent = () => {
    setShowFullContent(!showFullContent);
  };

  const holdingPeriod = data?.createdAt ? calculateHoldingPeriod(data.createdAt) : "N/A";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Skeleton */}
          <div className="animate-pulse mb-8">
            <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded-xl w-3/4 mb-4"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
          </div>

          {/* Content Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-300 dark:bg-gray-700 rounded-2xl h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header Section */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 mb-8 overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col lg:flex-row gap-8 justify-between">
              {/* Portfolio Info */}
              <div className="w-full">
                <div className="flex flex-col sm:flex-row gap-4 items-start justify-between mb-6">
                  <div className="flex gap-x-4">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                      {data?.portfolioName}
                    </h1>
                    <div className="flex flex-wrap gap-3 mb-6">
                      <div className="bg-blue-100 dark:bg-blue-900/30 px-5 py-2 rounded-full text-blue-700 dark:text-blue-300 font-medium">
                        {data?.theme}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 mb-8"></div>

                {/* Key Metrics */}

              </div>

            </div>


            <div className="flex flex-col lg:flex-row gap-8 justify-between">
              <div className="lg:w-7/12">
                <img
                  src={data?.bannerURL}
                  alt="Service banner"
                  className="w-full h-auto rounded-2xl shadow-md object-cover"
                />
              </div>
              {/* Pricing & Action Section */}
              <div className="lg:w-5/12">
                <PortfolioPricingSection
                  data={data}
                  spData={spData}
                  isLoggedIn={isLoggedIn}
                  setIsTncModalOpen={setIsTncModalOpen}
                  marketplaceSlug={marketplaceSlug}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Strategy and Details */}
        <div className="grid grid-cols-1 gap-8 mb-8">
          {/* Investment Strategy */}
          <Card className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Check className="w-6 h-6 text-blue-500" />
                Key Metrix
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">₹{data.minInvestmentAmount.toLocaleString()}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Min Investment</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{data.riskLevel}%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Risk Level - {data.riskLevel < 30 ? "Low Risk" : data.riskLevel < 60 ? "Moderate Risk" : "High Risk"}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{data.rebalanceCount || 0}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Rebalances</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{holdingPeriod}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Track Record</div>
                </div>
              </div>
            </CardContent>
          </Card>


          <Card className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Target className="w-6 h-6 text-blue-500" />
                Investment Strategy & Philosophy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Methodology
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {data.methodology}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-purple-500" />
                  Investment Rationale
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {data.rationale || "No rationale provided."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Portfolio Features */}
          <Card className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Zap className="w-6 h-6 text-yellow-500" />
                Portfolio Features & Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                {[
                  {
                    icon: Calendar,
                    label: "Investment Horizon",
                    value: `${data.investmentHorizon} months`,
                    color: "text-blue-500",
                  },
                  {
                    icon: Clock,
                    label: "Review Frequency",
                    value: `${data.reviewFrequency} months`,
                    color: "text-green-500",
                  },
                  {
                    icon: TrendingUp,
                    label: "Benchmark Index",
                    value: data.benchmarkIndex,
                    color: "text-purple-500",
                  },
                  {
                    icon: Shield,
                    label: "Risk Level",
                    value: `${data.riskLevel}% - ${data.riskLevel < 30 ? "Low Risk" : data.riskLevel < 60 ? "Moderate Risk" : "High Risk"}`,
                    color: data.riskLevel < 30 ? "text-green-500" : data.riskLevel < 60 ? "text-yellow-500" : "text-red-500",
                  },
                ].map((feature, index) => (
                  <div
                    key={feature.label}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <feature.icon className={`w-5 h-5 ${feature.color}`} />
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {feature.label}
                      </span>
                    </div>
                    <span className="text-gray-900 dark:text-white font-semibold">
                      {feature.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Metrics & Performance */}
        <div className="grid grid-cols-1 gap-8 mb-8">
          <Card className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-500" />
                Risk Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.riskMetrics && Object.entries(data.riskMetrics).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* <Card className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <LineChart className="w-5 h-5 text-green-500" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.performance && Object.entries(data.performance).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className={`font-semibold ${key.includes('Profit')
                    ? value >= 0 ? 'text-green-600' : 'text-red-600'
                    : 'text-gray-900 dark:text-white'
                    }`}>
                    {typeof value === 'number' ? (
                      key.includes('Percentage') ? `${value.toFixed(2)}%` : `₹${value.toLocaleString()}`
                    ) : value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card> */}
        </div>

        <div className="grid grid-cols-1 gap-8 mb-8">
          <Card className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Users className="w-6 h-6 text-purple-500" />
                Expert Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Profile Image and Basic Info */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <Avatar className="w-48 h-48 rounded-2xl border-4 border-white dark:border-gray-800 shadow-lg">
                      <AvatarImage
                        src={data.serviceProviderData.profileImage}
                        alt={data.authorData.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-4xl font-bold">
                        {data.authorData.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {data.serviceProviderData.regNumber && (
                      <div className="absolute -bottom-3 left-0 right-0 mx-auto w-max bg-yellow-500 text-black py-1 px-3 rounded-full text-xs font-bold shadow-md">
                        SEBI: {data.serviceProviderData.regNumber}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expert Information */}
                <div className="flex-grow space-y-6">
                  {/* Name and Title */}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {data.authorData.name}
                    </h3>
                    <p className="text-lg text-purple-600 dark:text-purple-400 font-semibold mb-1">
                      Research Analyst
                    </p>
                  </div>

                  {/* About the Provider */}
                  {data.serviceProviderData.description && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        About
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed pl-7 whitespace-pre-line">
                        {data.serviceProviderData.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Disclosure Section */}
        <Card className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              Disclosure & Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800/50">
              <p className="text-amber-800 dark:text-amber-200 leading-relaxed">
                {data.disclosure || "Standard investment disclosures apply. Past performance is not indicative of future results. Investments in securities market are subject to market risks. Read all the related documents carefully before investing."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Terms and Conditions Modal */}
        {isTncModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Terms and Conditions
                </h2>
                <button
                  type="button"
                  onClick={() => setIsTncModalOpen(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                {data?.tncFileURL ? (
                  <iframe
                    src={data.tncFileURL}
                    title="Terms and Conditions"
                    className="w-full h-full min-h-[70vh] rounded-xl"
                  />
                ) : (
                  <div className="flex items-center justify-center min-h-[70vh] p-8 text-gray-500 dark:text-gray-400">
                    No terms and conditions provided.
                  </div>
                )}
              </div>
              <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                {data?.tncFileURL && (
                  <a
                    href={data.tncFileURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Open in new tab
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setIsTncModalOpen(false)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                >
                  I Understand
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}