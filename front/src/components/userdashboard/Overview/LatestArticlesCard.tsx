"use client";

import { useState, useRef } from "react";
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock4, Pause, Play, User, Calendar } from "lucide-react";
import { TabType } from "./types";

interface LatestArticlesCardProps {
  tabData: { [key in TabType]?: { data: any[]; loading: boolean; } };
  onTabClick: (tab: TabType) => void;
}

export default function LatestArticlesCard({ tabData, onTabClick }: LatestArticlesCardProps) {
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  
  // Get articles from API only
  const articles = tabData.articles?.data || [];
  
  // Duplicate articles for seamless scrolling
  const duplicatedArticles = articles.length > 0 ? [...articles, ...articles, ...articles] : [];

  // Helper function to format time ago
  const getTimeAgo = (dateString: string) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  // Calculate animation duration based on number of articles
  const animationDuration = articles.length * 8;

  // Category colors mapping
  const categoryColors: Record<string, string> = {
    "analysis": "bg-blue-50 text-blue-700 border-blue-200",
    "investing": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "ipo": "bg-amber-50 text-amber-700 border-amber-200",
    "market": "bg-purple-50 text-purple-700 border-purple-200",
    "technical": "bg-rose-50 text-rose-700 border-rose-200",
    "banking": "bg-indigo-50 text-indigo-700 border-indigo-200",
    "general": "bg-gray-50 text-gray-700 border-gray-200",
    "technology": "bg-cyan-50 text-cyan-700 border-cyan-200",
  };

  return (
    <Card className="border border-gray-200 shadow-lg px-[-2] hover:shadow-xl transition-all duration-300 overflow-hidden bg-white">
      <CardHeader className=" border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-700" />
            <CardTitle className="text-base font-bold text-blue-800">Research Reports</CardTitle>
          </div>
          
         
        </div>
      </CardHeader>

      <CardContent className="relative">
        <div className="relative h-[320px] w-full overflow-hidden rounded-lg">
          {/* Gradient overlays */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />

          {/* Scrolling container */}
          <div className="relative h-full overflow-hidden">
            {articles.length > 0 ? (
              <motion.div
                className="flex flex-col gap-3"
                animate={isAutoPlaying ? {
                  y: [0, -160 * articles.length],
                } : {}}
                transition={{
                  y: {
                    repeat: isAutoPlaying ? Infinity : 0,
                    repeatType: "loop",
                    duration: isAutoPlaying ? animationDuration : 0,
                    ease: "linear",
                  },
                }}
              >
                {duplicatedArticles.map((article, index) => {
                  const articleImage = article.image || "";
                  const articleTitle = article.title || "Untitled Article";
                  const articleCategory = article.category?.[0] || "General";
                  const authorName = article.authorData?.name || "Unknown Author";
                  const publishDate = article.schedule || article.createdAt || "";
                  const timeAgo = getTimeAgo(publishDate);
                  const categoryColor = categoryColors[articleCategory.toLowerCase()] || "bg-gray-50 text-gray-700 border-gray-200";

                  return (
                    <motion.div
                      key={`${article._id || index}-${index}`}
                      className="group hover:shadow-md transition-all duration-300 border border-gray-200 hover:border-blue-300 bg-white rounded-lg p-3 cursor-pointer hover:bg-blue-50/30"
                      whileHover={{ scale: 1.005 }}
                      onClick={() => console.log("View article:", article._id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Article Image/Icon */}
                        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 overflow-hidden relative shadow-sm">
                          {articleImage ? (
                            <img
                              src={articleImage}
                              alt={articleTitle}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <>
                              <FileText className="h-5 w-5 text-white z-10" />
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/40 to-indigo-500/40" />
                            </>
                          )}
                        </div>

                        {/* Article Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm mb-1.5 line-clamp-2 group-hover:text-blue-700 transition-colors leading-tight">
                            {articleTitle}
                          </h4>

                          <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="truncate max-w-[80px]">{authorName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock4 className="h-3 w-3" />
                              <span>{timeAgo}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <Badge 
                              variant="outline" 
                              className={`text-xs px-2 py-0.5 ${categoryColor} font-medium`}
                            >
                              {articleCategory}
                            </Badge>
                            <motion.div
                              whileHover={{ x: 2 }}
                              className="text-blue-600 text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Read more
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              // Loading or empty state
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm font-medium">No articles available</p>
                  <p className="text-gray-400 text-xs mt-1">Check back soon for updates</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* View All Button */}
        <div className="">
          <Button
            className="w-full font-medium text-white transition-all bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 h-9 text-sm shadow-sm"
            onClick={() => onTabClick("articles")}
          >
            <span className="flex items-center justify-center gap-2">
              <FileText className="h-4 w-4" />
              View All 
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}