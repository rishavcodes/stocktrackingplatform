"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search as SearchIcon } from "lucide-react";
import MarketplaceNavbar from "@/components/Marketplace/MarketplaceNavbar";
import { Marketplace, RA, Recommendation, Portfolio, Service, Article, Event } from "@/components/Marketplace/types";
import { RACard, RecommendationCard, PortfolioCard, ServiceCard, ArticleCard, EventCard } from "@/components/Marketplace/CardComponents";
import { Card } from "@/components/ui/card";

export default function MarketplaceSearchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const marketplaceId = params.slug as string;
  const query = (searchParams.get("q") || "").trim();

  const [marketplace, setMarketplace] = useState<Marketplace | null>(null);
  const [loading, setLoading] = useState(true);
  const [raList, setRaList] = useState<RA[]>([]);
  const [recList, setRecList] = useState<Recommendation[]>([]);
  const [portfolioList, setPortfolioList] = useState<Portfolio[]>([]);
  const [serviceList, setServiceList] = useState<Service[]>([]);
  const [articleList, setArticleList] = useState<Article[]>([]);
  const [eventList, setEventList] = useState<Event[]>([]);

  useEffect(() => {
    if (!marketplaceId) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const base = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}`;

        const [marketplaceRes, raRes, recRes, portfolioRes, serviceRes, articleRes, eventRes] =
          await Promise.all([
            fetch(base),
            fetch(`${base}?type=ra&page=1&limit=100`),
            fetch(`${base}?type=recommendations&page=1&limit=100`),
            fetch(`${base}?type=portfolio&page=1&limit=100`),
            fetch(`${base}?type=services&page=1&limit=100`),
            fetch(`${base}?type=articles&page=1&limit=100`),
            fetch(`${base}?type=events&page=1&limit=100`),
          ]);

        if (marketplaceRes.ok) {
          const m = await marketplaceRes.json();
          if (m.success) setMarketplace(m.data);
        }

        if (raRes.ok) {
          const r = await raRes.json();
          if (r.success && Array.isArray(r.data)) setRaList(r.data);
        }
        if (recRes.ok) {
          const r = await recRes.json();
          if (r.success && Array.isArray(r.data)) setRecList(r.data);
        }
        if (portfolioRes.ok) {
          const r = await portfolioRes.json();
          if (r.success && Array.isArray(r.data)) setPortfolioList(r.data);
        }
        if (serviceRes.ok) {
          const r = await serviceRes.json();
          if (r.success && Array.isArray(r.data)) setServiceList(r.data);
        }
        if (articleRes.ok) {
          const r = await articleRes.json();
          if (r.success && Array.isArray(r.data)) setArticleList(r.data);
        }
        if (eventRes.ok) {
          const r = await eventRes.json();
          if (r.success && Array.isArray(r.data)) setEventList(r.data);
        }
      } catch {
        // ignore errors, keep lists empty
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [marketplaceId]);

  const q = query.toLowerCase();
  const hasQuery = q.length > 0;

  const filterRA = (ra: RA) => {
    if (!hasQuery) return false;
    const name = (ra.name || ra.RegName || ra.companyName || "").toLowerCase();
    const location = [ra.city, ra.state].filter(Boolean).join(" ").toLowerCase();
    const category = (ra.category || "").toLowerCase();
    const type = (ra.type || "").toLowerCase();
    return [name, location, category, type].some((v) => v.includes(q));
  };

  const filterRec = (r: Recommendation) => {
    if (!hasQuery) return false;
    const script = (r.scriptname || "").toLowerCase();
    const exchange = (r.exchange || "").toLowerCase();
    const author = (r.authorData?.name || "").toLowerCase();
    const entryType = (r.entryType || "").toLowerCase();
    return [script, exchange, author, entryType].some((v) => v.includes(q));
  };

  const filterPortfolio = (p: Portfolio) => {
    if (!hasQuery) return false;
    const name = (p.portfolioName || "").toLowerCase();
    const theme = (p.theme || "").toLowerCase();
    const author = (p.authorData?.name || "").toLowerCase();
    return [name, theme, author].some((v) => v.includes(q));
  };

  const filterService = (s: Service) => {
    if (!hasQuery) return false;
    const title = (s.title || "").toLowerCase();
    const author = (s.authorData?.name || "").toLowerCase();
    const serviceType = (s.serviceType || "").toLowerCase();
    const segment = (s.segment || "").toLowerCase();
    return [title, author, serviceType, segment].some((v) => v.includes(q));
  };

  const filterArticle = (a: Article) => {
    if (!hasQuery) return false;
    const title = (a.title || "").toLowerCase();
    const author = (a.authorData?.name || "").toLowerCase();
    const cats = Array.isArray(a.category) ? a.category : a.category ? [a.category] : [];
    const catStr = cats.join(" ").toLowerCase();
    return [title, author, catStr].some((v) => v.includes(q));
  };

  const filterEvent = (e: Event) => {
    if (!hasQuery) return false;
    const title = (e.title || "").toLowerCase();
    const author = (e.authorData?.name || "").toLowerCase();
    const eventType = (e.eventType || "").toLowerCase();
    const location = (e.location || "").toLowerCase();
    const cats = Array.isArray(e.category) ? e.category : e.category ? [e.category] : [];
    const catStr = cats.join(" ").toLowerCase();
    return [title, author, eventType, location, catStr].some((v) => v.includes(q));
  };

  const raResults = raList.filter(filterRA);
  const recResults = recList.filter(filterRec);
  const portfolioResults = portfolioList.filter(filterPortfolio);
  const serviceResults = serviceList.filter(filterService);
  const articleResults = articleList.filter(filterArticle);
  const eventResults = eventList.filter(filterEvent);

  const hasAnyResults =
    raResults.length ||
    recResults.length ||
    portfolioResults.length ||
    serviceResults.length ||
    articleResults.length ||
    eventResults.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <MarketplaceNavbar marketplace={marketplace} />

      <div className="container mx-auto px-3 sm:px-4 pt-[76px] pb-4 sm:pb-6 max-w-full">
        <div className="mb-4 sm:mb-6">
          <Link
            href={`/marketplace/${marketplaceId}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to marketplace
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <SearchIcon className="h-6 w-6 text-blue-600" />
            Search results
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {hasQuery ? (
              <>
                Showing results for <span className="font-semibold">&quot;{query}&quot;</span>
              </>
            ) : (
              "Type in the search bar above to find Trading Ideas, analysts, portfolios and more."
            )}
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((section) => (
              <Card key={section} className="p-4 border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : !hasQuery ? (
          <Card className="p-8 border border-gray-200 text-center text-gray-500">
            Start typing in the search bar to see results.
          </Card>
        ) : !hasAnyResults ? (
          <Card className="p-8 border border-gray-200 text-center text-gray-500">
            No results found for &quot;{query}&quot;.
          </Card>
        ) : (
          <div className="space-y-8">
            {raResults.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Research Analysts ({raResults.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {raResults.map((ra) => (
                    <RACard key={ra._id} ra={ra} marketplaceId={marketplaceId} />
                  ))}
                </div>
              </section>
            )}

            {recResults.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Trading Ideas ({recResults.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recResults.map((rec) => (
                    <RecommendationCard key={rec._id} recommendation={rec} marketplaceId={marketplaceId} />
                  ))}
                </div>
              </section>
            )}

            {portfolioResults.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Model Portfolios ({portfolioResults.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {portfolioResults.map((p) => (
                    <PortfolioCard key={p._id} portfolio={p} />
                  ))}
                </div>
              </section>
            )}

            {serviceResults.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Professional Plans ({serviceResults.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {serviceResults.map((s) => (
                    <ServiceCard key={s._id} service={s} />
                  ))}
                </div>
              </section>
            )}

            {articleResults.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Articles & Insights ({articleResults.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articleResults.map((a) => (
                    <ArticleCard key={a._id} article={a} />
                  ))}
                </div>
              </section>
            )}

            {eventResults.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Events & Webinars ({eventResults.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {eventResults.map((e) => (
                    <EventCard key={e._id} event={e} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

