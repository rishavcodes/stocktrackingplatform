// components/Marketplace/ContentTabs.tsx
"use client";

import { useState } from "react";
import { 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Eye, 
  EyeOff, 
  FileText, 
  Sparkles, 
  Rocket, 
  GraduationCap,
  Building2,
  Users,
  Globe2,
  MailIcon,
  CalendarDays,
  Clock4,
  Briefcase,
  Layers,
  TrendingUp,
  CheckCircle,
  ShieldCheck,
  PieChart,
  Target,
  BarChart3
} from "lucide-react";
import Link from "next/link";
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { TabType, TabData, Marketplace, RA, Recommendation, Portfolio, Service, Article, Event } from "./types";

// Import other components if they exist, otherwise define them here
import { RACard } from "./CardComponents";
import { RecommendationCard } from "./CardComponents";
import { PortfolioCard } from "./CardComponents";
import { ServiceCard } from "./CardComponents";
import { ArticleCard } from "./CardComponents";
import { EventCard } from "./CardComponents";

// AboutTab Component
function AboutTab({ marketplace }: { marketplace: Marketplace }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="hover:shadow-lg transition-shadow border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#01a6b6]">
            <Building2 className="w-5 h-5" />
            Marketplace Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">
              Name
            </label>
            <p className="text-lg font-semibold text-gray-900">{marketplace.name}</p>
          </div>
          {marketplace.description && (
            <div>
              <label className="text-sm font-medium text-gray-500">
                Description
              </label>
              <p className="text-gray-700">
                {marketplace.description}
              </p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-500">
              Slug
            </label>
            <div className="flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-gray-400" />
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                /{marketplace.slug}
              </code>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Active Research Analysts
            </label>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#01a6b6]" />
              <span className="text-2xl font-bold text-[#01a6b6]">
                {marketplace.activeRaIds?.length || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#01a6b6]">
            <Users className="w-5 h-5" />
            Broker Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">
              Broker Name
            </label>
            <p className="text-lg font-semibold text-gray-900">
              {marketplace.brokerSnapshot.name}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Email
            </label>
            <div className="flex items-center gap-2">
              <MailIcon className="w-4 h-4 text-gray-400" />
              <a
                href={`mailto:${marketplace.brokerSnapshot.email}`}
                className="text-[#01a6b6] hover:underline font-medium"
              >
                {marketplace.brokerSnapshot.email}
              </a>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Created At
            </label>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-gray-400" />
              <span className="font-medium">
                {new Date(marketplace.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Last Updated
            </label>
            <div className="flex items-center gap-2">
              <Clock4 className="w-4 h-4 text-gray-400" />
              <span className="font-medium">
                {new Date(marketplace.updatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ContentTab Component
function ContentTab({
  title,
  data,
  loading,
  pagination,
  onPageChange,
  renderItem,
  emptyMessage,
}: {
  title: string;
  data: any[];
  loading: boolean;
  pagination?: any;
  onPageChange: (page: number) => void;
  renderItem: (item: any) => React.ReactNode;
  emptyMessage: string;
}) {
  const [showAll, setShowAll] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border border-gray-200">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-12 border border-gray-200">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      </Card>
    );
  }

  const displayData = showAll ? data : data.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayData.map(renderItem)}
      </div>

      <div className="flex justify-center">
        {data.length > 6 && (
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            className="border-[#01a6b6] text-[#01a6b6] hover:bg-[#e6f7f9]"
          >
            {showAll ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Show Less
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                See All {data.length} Items
              </>
            )}
          </Button>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && showAll && (
        <PaginationComponent pagination={pagination} onPageChange={onPageChange} />
      )}
    </div>
  );
}

// ComingSoonTab Component
function ComingSoonTab({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-12 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-dashed">
      <div className="text-center space-y-4 max-w-md mx-auto">
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
          {icon}
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {title}
          </h3>
          <p className="text-gray-600">{description}</p>
        </div>
        <Badge variant="secondary" className="text-sm px-4 py-2">
          <Sparkles className="w-4 h-4 mr-2" />
          Coming Soon
        </Badge>
      </div>
    </Card>
  );
}

// PaginationComponent
function PaginationComponent({
  pagination,
  onPageChange,
}: {
  pagination: any;
  onPageChange: (page: number) => void;
}) {
  const { currentPage, totalPages, hasPrevPage, hasNextPage } = pagination;

  const renderPageNumbers = () => {
    const items = [];

    if (currentPage > 2) {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink onClick={() => onPageChange(1)}>1</PaginationLink>
        </PaginationItem>,
      );
    }

    if (currentPage > 3) {
      items.push(<PaginationEllipsis key="ellipsis-start" />);
    }

    for (
      let i = Math.max(1, currentPage - 1);
      i <= Math.min(totalPages, currentPage + 1);
      i++
    ) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => onPageChange(i)}
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    if (currentPage < totalPages - 2) {
      items.push(<PaginationEllipsis key="ellipsis-end" />);
    }

    if (currentPage < totalPages - 1) {
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => onPageChange(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    return items;
  };

  return (
    <div className="flex justify-center">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => hasPrevPage && onPageChange(currentPage - 1)}
              className={
                !hasPrevPage
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>

          {renderPageNumbers()}

          <PaginationItem>
            <PaginationNext
              onClick={() => hasNextPage && onPageChange(currentPage + 1)}
              className={
                !hasNextPage
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

// Main ContentTabs Component
interface ContentTabsProps {
  activeTab: TabType;
  tabData: TabData;
  tabPages: { [key in TabType]?: number };
  handlePageChange: (tab: TabType, page: number) => void;
  articlesTabRef: React.RefObject<HTMLDivElement>;
  eventsTabRef: React.RefObject<HTMLDivElement>;
  marketplace?: Marketplace;
}

export function ContentTabs({
  activeTab,
  tabData,
  tabPages,
  handlePageChange,
  articlesTabRef,
  eventsTabRef,
  marketplace,
}: ContentTabsProps) {
  return (
    <>
      {/* About Tab */}
      <TabsContent value="about" className="mt-4">
        {marketplace && <AboutTab marketplace={marketplace} />}
      </TabsContent>

      {/* RAs Tab */}
      <TabsContent value="ra" className="mt-4">
        <ContentTab
          title="Research Analysts"
          data={tabData.ra?.data || []}
          loading={tabData.ra?.loading || false}
          pagination={tabData.ra?.pagination}
          onPageChange={(page: number) => handlePageChange("ra", page)}
          renderItem={(ra: RA) => <RACard key={ra._id} ra={ra} marketplaceId={marketplace?.slug} />}
          emptyMessage="No research analysts found in this marketplace."
        />
      </TabsContent>

      {/* Recommendations Tab */}
      <TabsContent value="recommendations" className="mt-4">
        <ContentTab
          title="Trading Ideas"
          data={tabData.recommendations?.data || []}
          loading={tabData.recommendations?.loading || false}
          pagination={tabData.recommendations?.pagination}
          onPageChange={(page: number) => handlePageChange("recommendations", page)}
          renderItem={(rec: Recommendation) => (
            <RecommendationCard key={rec._id} recommendation={rec} marketplaceId={marketplace?.slug} />
          )}
          emptyMessage="No Trading Ideas available yet."
        />
      </TabsContent>

      {/* Portfolio Tab */}
      <TabsContent value="portfolio" className="mt-4">
        <ContentTab
          title="Model Portfolios"
          data={tabData.portfolio?.data || []}
          loading={tabData.portfolio?.loading || false}
          pagination={tabData.portfolio?.pagination}
          onPageChange={(page: number) => handlePageChange("portfolio", page)}
          renderItem={(portfolio: Portfolio) => (
            <PortfolioCard key={portfolio._id} portfolio={portfolio} />
          )}
          emptyMessage="No portfolios available yet."
        />
      </TabsContent>

      {/* Services Tab */}
      <TabsContent value="services" className="mt-4">
        <ContentTab
          title="Professional Plans"
          data={tabData.services?.data || []}
          loading={tabData.services?.loading || false}
          pagination={tabData.services?.pagination}
          onPageChange={(page: number) => handlePageChange("services", page)}
          renderItem={(service: Service) => (
            <ServiceCard key={service._id} service={service} />
          )}
          emptyMessage="No services available yet."
        />
      </TabsContent>

      {/* Articles Tab */}
      <TabsContent value="articles" className="mt-4" ref={articlesTabRef}>
        <ContentTab
          title="Articles & Insights"
          data={tabData.articles?.data || []}
          loading={tabData.articles?.loading || false}
          pagination={tabData.articles?.pagination}
          onPageChange={(page: number) => handlePageChange("articles", page)}
          renderItem={(article: Article) => (
            <ArticleCard key={article._id} article={article} />
          )}
          emptyMessage="No articles published yet."
        />
      </TabsContent>

      {/* Events Tab */}
      <TabsContent value="events" className="mt-4" ref={eventsTabRef}>
        <ContentTab
          title="Events & Webinars"
          data={tabData.events?.data || []}
          loading={tabData.events?.loading || false}
          pagination={tabData.events?.pagination}
          onPageChange={(page: number) => handlePageChange("events", page)}
          renderItem={(event: Event) => (
            <EventCard key={event._id} event={event} />
          )}
          emptyMessage="No upcoming events."
        />
      </TabsContent>

      {/* Coming Soon Tabs */}
      <TabsContent value="algo_strategies" className="mt-4">
        <ComingSoonTab
          title="Algorithmic Strategies"
          description="Advanced algorithmic trading strategies will be available soon."
          icon={<Rocket className="w-16 h-16" />}
        />
      </TabsContent>

      <TabsContent value="lms" className="mt-4">
        <ComingSoonTab
          title="Learning Management System"
          description="Comprehensive courses and learning materials coming soon."
          icon={<GraduationCap className="w-16 h-16" />}
        />
      </TabsContent>
    </>
  );
}

// Also export individual components if needed elsewhere
export { AboutTab, ContentTab, ComingSoonTab, PaginationComponent };