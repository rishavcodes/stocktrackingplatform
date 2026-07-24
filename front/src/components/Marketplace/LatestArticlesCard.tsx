"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { TabType } from "./types";

interface LatestArticlesCardProps {
  tabData: { [key in TabType]?: { data: any[]; loading: boolean } };
  onTabClick?: (tab: TabType) => void;
  marketplaceSlug?: string;
}

const categoryColors: Record<string, string> = {
  analysis: "bg-blue-50 text-blue-700",
  investing: "bg-emerald-50 text-emerald-700",
  ipo: "bg-amber-50 text-amber-700",
  market: "bg-purple-50 text-purple-700",
  technical: "bg-rose-50 text-rose-700",
  banking: "bg-indigo-50 text-indigo-700",
  general: "bg-gray-50 text-gray-700",
  technology: "bg-cyan-50 text-cyan-700",
};

export default function LatestArticlesCard({ tabData, onTabClick, marketplaceSlug }: LatestArticlesCardProps) {
  const articles = tabData.articles?.data || [];
  const total = articles.length;
  const [current, setCurrent] = useState(0);

  const pageCount = Math.ceil(total / 2);

  useEffect(() => {
    if (pageCount <= 1) return;
    const t = setInterval(() => setCurrent((p) => (p + 1) % pageCount), 5000);
    return () => clearInterval(t);
  }, [pageCount]);

  const pair = articles.slice(current * 2, current * 2 + 2);

  return (
    <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden">
      <CardHeader className="pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-bold text-slate-900">Research Reports</CardTitle>
          </div>
          {/* {pageCount > 1 && (
            <span className="text-[10px] text-slate-400 font-medium tabular-nums">{current + 1} / {pageCount}</span>
          )} */}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3">
        {/* Two cards with vertical slide transition */}
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait">
            {pair.length > 0 ? (
              <motion.div
                key={current}
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -40, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="space-y-3"
              >
                {pair.map((article: any) => (
                  <Link key={article._id} href={`/view/researchreport/page/${article._id}`} className="block group">
                    <div className="flex gap-2.5 p-2 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                      {/* Thumbnail */}
                      <div className="relative h-16 w-20 rounded-md overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0">
                        {article.image ? (
                          <img src={article.image} alt={article.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <FileText className="h-4 w-4 text-white/50" />
                          </div>
                        )}
                        <div className="absolute bottom-1 left-1">
                          <Badge className={`text-[8px] px-1 py-0 font-medium border-0 leading-tight ${categoryColors[(article.category?.[0] || "general").toLowerCase()] || "bg-gray-50 text-gray-700"}`}>
                            {article.category?.[0] || "General"}
                          </Badge>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <h4 className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
                          {article.title || "Untitled Article"}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="h-4 w-4 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {article.authorData?.authorImage ? (
                              <img src={article.authorData.authorImage} alt={article.authorData?.name} className="h-4 w-4 rounded-full object-cover" />
                            ) : (
                              <span className="text-slate-500 font-semibold text-[7px]">{(article.authorData?.name || "A").charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 truncate">{article.authorData?.name || "Unknown"}</span>
                          <span className="text-[10px] text-slate-300">&bull;</span>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {new Date(article.schedule || article.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                          <span className="text-[10px] font-semibold text-blue-600 ml-auto flex-shrink-0">Read &rarr;</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </motion.div>
            ) : (
              <div className="py-6 text-center">
                <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-xs font-medium">No articles available</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* View All */}
        <div className="mt-3">
          {marketplaceSlug ? (
            <Link href={`/marketplace/${marketplaceSlug}/articles`}>
              <Button variant="outline" className="w-full h-8 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50">
                View All Articles
              </Button>
            </Link>
          ) : (
            <Button variant="outline" className="w-full h-8 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => onTabClick?.("articles")}>
              View All Articles
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
