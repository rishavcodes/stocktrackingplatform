// app/marketplace/[id]/components/ConsolidatedContentSections.tsx
"use client";

import { Users, TrendingUp, Briefcase, Layers, FileText, CalendarDays, Rocket, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";

// Import from the current directory or create local types
interface TabData {
  [key: string]: {
    data: any[];
    loading: boolean;
    pagination?: any;
  };
}

interface ConsolidatedContentSectionsProps {
  marketplaceSlug: string;
  tabData: TabData;
}

const RACard = ({ ra }: { ra: any }) => (
  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
    <div className="font-medium text-sm">{ra.name || "N/A"}</div>
  </div>
);

const RecommendationCard = ({ recommendation }: { recommendation: any }) => (
  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
    <div className="font-medium text-sm">{recommendation.scriptname || "N/A"}</div>
  </div>
);

const PortfolioCard = ({ portfolio }: { portfolio: any }) => (
  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
    <div className="font-medium text-sm">{portfolio.portfolioName || "N/A"}</div>
  </div>
);

const ServiceCard = ({ service }: { service: any }) => (
  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
    <div className="font-medium text-sm">{service.title || "N/A"}</div>
  </div>
);

const ArticleCard = ({ article }: { article: any }) => (
  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
    <div className="font-medium text-sm">{article.title || "N/A"}</div>
  </div>
);

const EventCard = ({ event }: { event: any }) => (
  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
    <div className="font-medium text-sm">{event.title || "N/A"}</div>
  </div>
);

export default function ConsolidatedContentSections({ 
  marketplaceSlug, 
  tabData 
}: ConsolidatedContentSectionsProps) {
  
  const sections = [
    {
      id: "ra",
      title: "Research Analysts",
      subtitle: "SEBI registered experts",
      icon: <Users className="w-5 h-5 text-blue-600" />,
      data: tabData.ra?.data || [],
      loading: tabData.ra?.loading || false,
      emptyMessage: "No research analysts found in this marketplace.",
      renderItem: (ra: any) => <RACard key={ra._id} ra={ra} />,
      viewAllLink: `/marketplace/${marketplaceSlug}/experts`
    },
    {
      id: "recommendations",
      title: "Live Recommendations",
      subtitle: "Real-time trading ideas",
      icon: <TrendingUp className="w-5 h-5 text-green-600" />,
      data: tabData.recommendations?.data || [],
      loading: tabData.recommendations?.loading || false,
      emptyMessage: "No recommendations available yet.",
      renderItem: (rec: any) => <RecommendationCard key={rec._id} recommendation={rec} />,
      viewAllLink: `/marketplace/${marketplaceSlug}?tab=recommendations`
    },
    {
      id: "portfolio",
      title: "Model Portfolios",
      subtitle: "Curated investment strategies",
      icon: <Briefcase className="w-5 h-5 text-purple-600" />,
      data: tabData.portfolio?.data || [],
      loading: tabData.portfolio?.loading || false,
      emptyMessage: "No portfolios available yet.",
      renderItem: (portfolio: any) => <PortfolioCard key={portfolio._id} portfolio={portfolio} />,
      viewAllLink: `/marketplace/${marketplaceSlug}?tab=portfolio`
    },
    {
      id: "services",
      title: "Professional Plans",
      subtitle: "Expert advisory plans",
      icon: <Layers className="w-5 h-5 text-orange-600" />,
      data: tabData.services?.data || [],
      loading: tabData.services?.loading || false,
      emptyMessage: "No services available yet.",
      renderItem: (service: any) => <ServiceCard key={service._id} service={service} />,
      viewAllLink: `/marketplace/${marketplaceSlug}?tab=services`
    },
    {
      id: "articles",
      title: "Articles & Insights",
      subtitle: "Latest market analysis",
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      data: tabData.articles?.data || [],
      loading: tabData.articles?.loading || false,
      emptyMessage: "No articles published yet.",
      renderItem: (article: any) => <ArticleCard key={article._id} article={article} />,
      viewAllLink: `/marketplace/${marketplaceSlug}?tab=articles`
    },
    {
      id: "events",
      title: "Events & Webinars",
      subtitle: "Upcoming learning sessions",
      icon: <CalendarDays className="w-5 h-5 text-pink-600" />,
      data: tabData.events?.data || [],
      loading: tabData.events?.loading || false,
      emptyMessage: "No upcoming events.",
      renderItem: (event: any) => <EventCard key={event._id} event={event} />,
      viewAllLink: `/marketplace/${marketplaceSlug}?tab=events`
    }
  ];

  const comingSoonSections = [
    {
      id: "algo_strategies",
      title: "Algorithmic Strategies",
      subtitle: "Advanced trading algorithms (Coming Soon)",
      icon: <Rocket className="w-5 h-5 text-indigo-600" />,
      emptyMessage: "Advanced algorithmic trading strategies will be available soon."
    },
    {
      id: "lms",
      title: "Learning Management System",
      subtitle: "Comprehensive courses (Coming Soon)",
      icon: <GraduationCap className="w-5 h-5 text-teal-600" />,
      emptyMessage: "Comprehensive courses and learning materials coming soon."
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Main Content Grid - Original Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          {/* RAs Section */}
          <ContentSection
            section={sections[0]}
            showCount={3}
          />

          {/* Portfolio Section */}
          <ContentSection
            section={sections[2]}
            showCount={3}
          />

          {/* Articles Section */}
          <ContentSection
            section={sections[4]}
            showCount={3}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Recommendations Section */}
          <ContentSection
            section={sections[1]}
            showCount={3}
          />

          {/* Services Section */}
          <ContentSection
            section={sections[3]}
            showCount={3}
          />

          {/* Events Section */}
          <ContentSection
            section={sections[5]}
            showCount={3}
          />
        </div>
      </div>

      {/* Coming Soon Sections */}
      <div className="mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {comingSoonSections.map((section) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  {section.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{section.title}</h3>
                  <p className="text-sm text-gray-600">{section.subtitle}</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4">{section.emptyMessage}</p>
              <div className="flex justify-end">
                <Button variant="outline" className="text-gray-500" disabled>
                  Coming Soon
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper Component for each content section
function ContentSection({ section, showCount = 3 }: any) {
  const displayedData = section.data.slice(0, showCount);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Section Header */}
      <div className="border-b border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gray-50 rounded-lg">
              {section.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{section.title}</h3>
              <p className="text-sm text-gray-600">{section.subtitle}</p>
            </div>
          </div>
          <Link href={section.viewAllLink}>
            <Button variant="ghost" size="sm" className="text-[#01a6b6] hover:text-[#018b99]">
              View All
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {section.loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : displayedData.length > 0 ? (
          <div className="space-y-3">
            {displayedData.map((item: any) => section.renderItem(item))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500">{section.emptyMessage}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}