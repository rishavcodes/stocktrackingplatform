import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Calendar, IndianRupee, Target, Clock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortfolioCardProps {
  portfolioId: string;
  bannerURL: string;
  authorData: {
    id: string;
    name: string;
    authorImage: string;
    type: string;
  };
  portfolioName: string;
  theme: string;
  methodology: string;
  benchmarkIndex: string;
  investmentHorizon: number;
  minInvestmentAmount: number;
  fees: number;
  riskLevel: number;
  riskMetrics?: {
    standardDeviation?: string;
    sharpeRatio?: string;
    maximumDrawdown?: string;
  };
  performanceHistory: Array<{
    month: string;
    value: number;
    returns?: number;
    profitLoss?: number;
  }>;
  subscribedBy: string[];
  rebalanceCount: number;
  launchDate: string;
  Commercials?: {
    yearlyCharge?: number;
    deductionPerSale?: number;
    startDate?: Date;
    endDate?: Date;
    approvedByAdmin?: boolean;
  };
}

export default function PortfolioCard({
  bannerURL,
  authorData,
  portfolioName,
  theme,
  methodology,
  benchmarkIndex,
  investmentHorizon,
  minInvestmentAmount,
  fees,
  riskLevel,
  riskMetrics,
  performanceHistory,
  subscribedBy,
  rebalanceCount,
  launchDate,
  Commercials,
}: PortfolioCardProps) {
  
  const getRiskColor = (level: number) => {
    switch(level) {
      case 1: return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case 2: return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case 3: return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case 4: return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case 5: return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getRiskLabel = (level: number) => {
    switch(level) {
      case 1: return "Low";
      case 2: return "Medium";
      case 3: return "High";
      case 4: return "Very High";
      case 5: return "Aggressive";
      default: return "Unknown";
    }
  };

  const latestPerformance = performanceHistory[performanceHistory.length - 1];
  const totalReturns = performanceHistory.reduce((acc, curr) => acc + (curr.returns || 0), 0);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col">
      <CardHeader className="p-0">
        <img
          src={bannerURL || "/placeholder-portfolio.jpg"}
          alt={portfolioName}
          className="w-full h-40 object-cover"
        />
      </CardHeader>
      
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg leading-tight line-clamp-2 flex-1 mr-2">
            {portfolioName}
          </h3>
          <Badge className={cn("px-2 py-1 text-xs font-semibold", getRiskColor(riskLevel))}>
            {getRiskLabel(riskLevel)}
          </Badge>
        </div>

        {/* Theme and Methodology */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {theme} • {methodology}
        </p>

        {/* Benchmark and Investment Info */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <div>
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Target size={12} />
              <span>Benchmark</span>
            </div>
            <span className="font-medium">{benchmarkIndex}</span>
          </div>
          <div>
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Clock size={12} />
              <span>Horizon</span>
            </div>
            <span className="font-medium">{investmentHorizon} yrs</span>
          </div>
        </div>

        {/* Performance Metrics */}
        {riskMetrics && (
          <div className="flex justify-between items-center py-2 border-y border-gray-100 dark:border-gray-800 mb-3 text-xs">
            <div className="text-center">
              <div className="text-gray-500 dark:text-gray-400">Sharpe</div>
              <div className="font-semibold">{riskMetrics.sharpeRatio || 'N/A'}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500 dark:text-gray-400">Std Dev</div>
              <div className="font-semibold">{riskMetrics.standardDeviation || 'N/A'}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500 dark:text-gray-400">Max DD</div>
              <div className="font-semibold">{riskMetrics.maximumDrawdown || 'N/A'}</div>
            </div>
          </div>
        )}

        {/* Fees and Minimum Investment */}
        <div className="flex justify-between items-center mb-4 text-sm">
          <div>
            <div className="text-gray-500 dark:text-gray-400">Min Investment</div>
            <div className="font-semibold flex items-center gap-1">
              <IndianRupee size={12} />
              {minInvestmentAmount.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-gray-500 dark:text-gray-400">Fees</div>
            <div className="font-semibold">{fees}%</div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            <Users size={12} />
            <span>{subscribedBy.length} subscribers</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            <span>{rebalanceCount} rebalances</span>
          </div>
        </div>

        {/* Author Info and CTA */}
        <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <img
              src={authorData.authorImage}
              alt={authorData.name}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-sm font-medium">{authorData.name}</span>
          </div>
          
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}