"use client";

import { useEffect, useState } from "react";
import { useParams,useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Filter, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Article, Marketplace } from "@/components/Marketplace/types";
import { ArticleCard } from "@/components/Marketplace/CardComponents";
import MarketplaceNavbar from "@/components/Marketplace/MarketplaceNavbar";
import { Card, CardContent } from "@/components/ui/card";

export default function AllArticlesPage() {
  const params = useParams();
  const marketplaceId = params.slug as string;

  const [marketplace, setMarketplace] = useState<Marketplace | null>(null);
  const [list, setList] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    const fetchMarketplace = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}`);
        if (!res.ok) return;
        const result = await res.json();
        if (result.success) setMarketplace(result.data);
      } catch {
        // ignore
      }
    };
    if (marketplaceId) fetchMarketplace();
  }, [marketplaceId]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}?type=articles&page=1&limit=100`
        );
        if (!res.ok) throw new Error("Failed to fetch");
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          setList(result.data);
        }
      } catch {
        setList([]);
      } finally {
        setLoading(false);
      }
    };
    if (marketplaceId) fetchData();
  }, [marketplaceId]);

  const categories = Array.from(
    new Set(list.flatMap((a) => (Array.isArray(a.category) ? a.category : a.category ? [a.category] : [])))
  ).filter(Boolean) as string[];

  const filtered = list.filter((a) => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const title = (a.title || "").toLowerCase();
      const author = (a.authorData?.name || "").toLowerCase();
      if (!title.includes(q) && !author.includes(q)) return false;
    }
    if (categoryFilter !== "all") {
      const cats = Array.isArray(a.category) ? a.category : a.category ? [a.category] : [];
      if (!cats.includes(categoryFilter)) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
  };
  const hasActiveFilters = searchQuery || categoryFilter !== "all";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <MarketplaceNavbar marketplace={marketplace} />
      <div className="container mx-auto px-3 sm:px-4 pt-[76px] pb-4 sm:pb-6 max-w-full">
        

        <Card className="mb-6 border border-gray-200 shadow-sm">
          <CardContent className="p-4">
           <div className="flex items-center gap-2 mb-4">
                         {/* <Button
                                 variant="ghost"
                                 size="icon"
                                 onClick={() => router.back()}
                                 className="hover:bg-gray-100 rounded-full"
                               >
                                 <ArrowLeft className="h-5 w-5 text-gray-600" />
                               </Button> */}
                       
                              
                       </div>
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 uppercase">Category</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                  >
                    <option value="all">All</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-600">
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border border-gray-200 overflow-hidden">
                <div className="p-4 space-y-3 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-8 bg-gray-100 rounded" />
                    <div className="h-8 bg-gray-100 rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 border border-gray-200 text-center">
            <p className="text-gray-500">No articles match your filters.</p>
            <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear filters</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((a) => (
              <ArticleCard key={a._id} article={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
