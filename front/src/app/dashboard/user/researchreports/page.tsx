"use client";

import fetcher from "@/lib/data/setup";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  Search,
  FileText,
  Share2,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ShareCard } from "@/components";

export default function UserArticlesPage() {
  const { data: session } = useSession();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [raFilter, setRaFilter] = useState("all");

  // Fetch billing to get unique SP IDs
  const { data: billingData } = useSWR<{
    success: boolean;
    data: { orders: any[] };
  }>(
    session?.user?.id
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/user-billing?userId=${session.user.id}`
      : null,
    fetcher
  );

  const orders = useMemo(() => billingData?.data?.orders ?? [], [billingData?.data?.orders]);

  // Unique SPs from orders
  const uniqueSPs = useMemo(() => {
    const map = new Map<string, string>();
    for (const order of orders) {
      if (order.soldBy?.id && order.soldBy?.name) {
        map.set(order.soldBy.id, order.soldBy.name);
      }
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [orders]);

  // Fetch articles from all subscribed RAs
  useEffect(() => {
    if (uniqueSPs.length === 0) {
      if (billingData) setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          uniqueSPs.map(async (sp) => {
            try {
              const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allarticles/previous?id=${sp.id}`
              );
              if (!res.ok) return [];
              const json = await res.json();
              // Attach RA info to each article
              return (json.data || []).map((a: any) => ({
                ...a,
                _raId: sp.id,
                _raName: sp.name,
              }));
            } catch {
              return [];
            }
          })
        );
        const all = results.flat().sort(
          (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setArticles(all);
      } catch {
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueSPs.length, billingData]);

  // Filtered articles
  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !a.title?.toLowerCase().includes(q) &&
          !a._raName?.toLowerCase().includes(q)
        ) return false;
      }
      if (raFilter !== "all" && a._raId !== raFilter) return false;
      return true;
    });
  }, [articles, search, raFilter]);

  const hasFilters = search.trim() !== "" || raFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setRaFilter("all");
  };

  // Per-card share dropdown — keyed by article _id so only one is open.
  const [shareOpenId, setShareOpenId] = useState<string>("");
  const shareCardRef = useRef<HTMLDivElement>(null);
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        shareCardRef.current &&
        !shareCardRef.current.contains(event.target as Node)
      ) {
        setShareOpenId("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-10">
      <div className="bg-white dark:bg-black rounded-xl border shadow-sm p-3 sm:p-5 md:p-6">
        {!loading && articles.length > 0 && (
          <div className="mb-4 md:mb-6 flex flex-col gap-3 md:gap-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="relative w-full sm:max-w-md sm:flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by title or RA name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filtered.length}</span> of {articles.length} report{articles.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border border-gray-200 dark:border-gray-700 overflow-hidden p-5">
                <div className="flex flex-col md:flex-row gap-5">
                  <div className="md:w-48 w-full h-40 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-1/2 animate-pulse" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-full animate-pulse" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center px-4">
            <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📝</div>
            <h3 className="text-base sm:text-lg font-semibold">No research reports yet</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Once your subscribed RAs publish research reports, they&apos;ll appear here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center border border-dashed rounded-xl px-4">
            <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 dark:text-gray-600 mb-3 sm:mb-4" />
            <p className="text-sm text-muted-foreground mb-3">No research reports match your filters.</p>
            <button type="button" onClick={clearFilters} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {filtered.map((article) => {
              const rawDate = article?.schedule || article?.createdAt;
              const parsed = rawDate ? new Date(rawDate) : null;
              const isValid = parsed && !Number.isNaN(parsed.getTime());
              const dateString = isValid
                ? parsed!.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                  })
                : "—";
              // 12-hour time so the post timestamp on the card matches how
              // most users glance at it (e.g. "4:32 PM" instead of 16:32).
              const timeString = isValid
                ? parsed!.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })
                : "";

              const cats: string[] = Array.isArray(article?.category)
                ? article.category
                : [];

              const contentPreview =
                typeof article?.content === "string" && article.content.trim()
                  ? `${article.content.split(" ").slice(0, 14).join(" ")}…`
                  : article?.hasArticlePDF
                    ? "PDF research report"
                    : "—";

              return (
                <div
                  key={article._id}
                  className="flex flex-col md:flex-row gap-5 p-5 bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-800"
                >
                  {/* Image */}
                  <div className="md:w-48 w-full">
                    <Link href={`/view/researchreport/page/${article._id}`}>
                      <Avatar className="w-full h-40 rounded-lg border">
                        <AvatarImage
                          src={article.image}
                          alt={article.title}
                          className="object-cover"
                        />
                        <AvatarFallback className="flex items-center justify-center">
                          <FileText className="w-8 h-8 text-gray-400" />
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-2 min-w-0">
                        <Link href={`/view/researchreport/page/${article._id}`}>
                          <h2 className="text-xl font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2">
                            {article.title}
                          </h2>
                        </Link>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4" />
                            {dateString}
                            {timeString && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                · {timeString}
                              </span>
                            )}
                          </span>
                          {article._raName && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                              {article._raName}
                            </span>
                          )}
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                          {contentPreview}
                        </p>
                      </div>

                      {/* Share-only — user can't edit/delete RA's reports. */}
                      <div className="relative shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onMouseEnter={() => setShareOpenId(article._id)}
                          onMouseLeave={() => setShareOpenId("")}
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <AnimatePresence>
                          {article._id === shareOpenId && (
                            <div
                              ref={shareCardRef}
                              className="absolute top-8 right-0 z-10"
                            >
                              <ShareCard
                                title={article.title}
                                separator="Read more at:"
                                url={`https://${hostname}/view/researchreport/page/${article._id}`}
                                hashtags={article.category}
                              />
                            </div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800 mt-auto">
                      <div className="flex gap-2 flex-wrap">
                        {cats.slice(0, 4).map((tag: string) => (
                          <span
                            key={tag}
                            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {article.hasArticlePDF ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            window.open(`/view/researchreport/pdf/${article._id}`)
                          }
                        >
                          View PDF <ArrowUpRight className="w-4 h-4 ml-1" />
                        </Button>
                      ) : (
                        <Link
                          href={`/view/researchreport/page/${article._id}`}
                          className="text-blue-600 dark:text-blue-400 text-sm hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                        >
                          Read Full →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
