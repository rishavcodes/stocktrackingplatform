// components/Marketplace/MarketplaceNavbar.tsx
"use client";

import { ArrowLeft, Building2, Search, Bell, LogIn, Menu, CheckCircle, X, Trash2, Clock, User2, Volume2, VolumeX, Wallet, Loader2 } from "lucide-react";
import { isNotificationSoundMuted, setNotificationSoundMuted } from "@/lib/notificationSound";
import Image from "next/image";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, KeyboardEvent, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Marketplace } from "./types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RACard, RecommendationCard, PortfolioCard, ServiceCard, ArticleCard, EventCard } from "./CardComponents";
import { RA, Recommendation, Portfolio, Service, Article, Event } from "./types";
import { Card } from "@/components/ui/card";
import { getBrokerSession } from "@/lib/brokerSession";

const BIGUL_BROKER_IDS = ["69450e88dd04c11f024287f9", "6969f526003f2f39ec1ee669"];

const NAV_TABS: { label: string; route: string }[] = [
  { label: "Trading Ideas", route: "recommendations" },
  { label: "Experts", route: "experts" },
  { label: "Portfolio", route: "portfolio" },
  { label: "Plans", route: "services" },
  { label: "Articles", route: "articles" },
  { label: "Events", route: "events" },
  { label: "Courses", route: "lms" },
];

interface MarketplaceNavbarProps {
  marketplace?: Marketplace | null;
  marketplaceId?: string;
}

export default function MarketplaceNavbar({ marketplace: marketplaceProp, marketplaceId: marketplaceIdProp }: MarketplaceNavbarProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const brokerSession = getBrokerSession(session);
  const [scrolled, setScrolled] = useState(false);
  const params = useParams();
  const searchParams = useSearchParams();
  // On marketplace page: params.slug = marketplace slug. On SP page: params.id = SP id, marketplaceId from ?marketplaceId=xxx
  const marketplaceId = marketplaceIdProp || searchParams.get("marketplaceId") || (params?.slug as string) || "";
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [raList, setRaList] = useState<RA[]>([]);
  const [recList, setRecList] = useState<Recommendation[]>([]);
  const [portfolioList, setPortfolioList] = useState<Portfolio[]>([]);
  const [serviceList, setServiceList] = useState<Service[]>([]);
  const [articleList, setArticleList] = useState<Article[]>([]);
  const [eventList, setEventList] = useState<Event[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [fetchedMarketplace, setFetchedMarketplace] = useState<Marketplace | null>(null);
  const [soundMuted, setSoundMuted] = useState(false);

  type MarketItem = { symbol: string; price: number; change: number; changePercent: number; lastUpdate: string | null };
  type LiveMarketData = { nifty: MarketItem; sensex: MarketItem; dow: MarketItem; gold: MarketItem };
  const [liveMarket, setLiveMarket] = useState<LiveMarketData | null>(null);

  useEffect(() => {
    const fetchLive = () => {
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/market-data/live`, { cache: "no-store" })
        .then((res) => res.json())
        .then((json) => {
          if (json?.success && json?.data) {
            setLiveMarket(json.data);
          }
        })
        .catch(() => {});
    };
    fetchLive();
    const t = setInterval(fetchLive, 15000);
    return () => clearInterval(t);
  }, []);

  // Use passed marketplace, or fetch when marketplaceId exists (e.g. on SP page)
  const marketplace = marketplaceProp ?? fetchedMarketplace;

  useEffect(() => {
    if (marketplaceProp || !marketplaceId) return;
    const fetchMarketplace = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}`);
        if (res.ok) {
          const result = await res.json();
          if (result.success) setFetchedMarketplace(result.data);
        }
      } catch {
        // ignore
      }
    };
    fetchMarketplace();
  }, [marketplaceId, marketplaceProp]);

  const handleSearch = () => {
    setSearchOpen(true);
  };
  const pathname = usePathname();
  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Cmd/Ctrl + K opens modal search
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const mod = isMac ? (e as any).metaKey : (e as any).ctrlKey;
      if (mod && (e as any).key?.toLowerCase?.() === "k") {
        (e as any).preventDefault?.();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown as any);
    return () => window.removeEventListener("keydown", onKeyDown as any);
  }, []);

  useEffect(() => {
    if (!searchOpen || !marketplaceId) return;
    // Fetch once on open; filter client-side for instant UX
    const fetchAll = async () => {
      setSearchLoading(true);
      try {
        const base = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}`;
        const [raRes, recRes, portfolioRes, serviceRes, articleRes, eventRes] = await Promise.all([
          fetch(`${base}?type=ra&page=1&limit=100`),
          fetch(`${base}?type=recommendations&page=1&limit=100`),
          fetch(`${base}?type=portfolio&page=1&limit=100`),
          fetch(`${base}?type=services&page=1&limit=100`),
          fetch(`${base}?type=articles&page=1&limit=100`),
          fetch(`${base}?type=events&page=1&limit=100`),
        ]);

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
        // ignore
      } finally {
        setSearchLoading(false);
      }
    };

    // If we already fetched once, don't refetch every open
    if (
      raList.length ||
      recList.length ||
      portfolioList.length ||
      serviceList.length ||
      articleList.length ||
      eventList.length
    ) {
      return;
    }

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen, marketplaceId]);

  const q = searchQuery.trim().toLowerCase();
  const hasQuery = q.length > 0;

  const raResults = useMemo(() => {
    if (!hasQuery) return [];
    return raList.filter((ra) => {
      const name = (ra.name || ra.RegName || ra.companyName || "").toLowerCase();
      const location = [ra.city, ra.state].filter(Boolean).join(" ").toLowerCase();
      const category = (ra.category || "").toLowerCase();
      const type = (ra.type || "").toLowerCase();
      return [name, location, category, type].some((v) => v.includes(q));
    });
  }, [hasQuery, q, raList]);

  const recResults = useMemo(() => {
    if (!hasQuery) return [];
    return recList.filter((r) => {
      const script = (r.scriptname || "").toLowerCase();
      const exchange = (r.exchange || "").toLowerCase();
      const author = (r.authorData?.name || "").toLowerCase();
      const entryType = (r.entryType || "").toLowerCase();
      return [script, exchange, author, entryType].some((v) => v.includes(q));
    });
  }, [hasQuery, q, recList]);

  const portfolioResults = useMemo(() => {
    if (!hasQuery) return [];
    return portfolioList.filter((p) => {
      const name = (p.portfolioName || "").toLowerCase();
      const theme = (p.theme || "").toLowerCase();
      const author = (p.authorData?.name || "").toLowerCase();
      return [name, theme, author].some((v) => v.includes(q));
    });
  }, [hasQuery, q, portfolioList]);

  const serviceResults = useMemo(() => {
    if (!hasQuery) return [];
    return serviceList.filter((s) => {
      const title = (s.title || "").toLowerCase();
      const author = (s.authorData?.name || "").toLowerCase();
      const serviceType = (s.serviceType || "").toLowerCase();
      const segment = (s.segment || "").toLowerCase();
      return [title, author, serviceType, segment].some((v) => v.includes(q));
    });
  }, [hasQuery, q, serviceList]);

  const articleResults = useMemo(() => {
    if (!hasQuery) return [];
    return articleList.filter((a) => {
      const title = (a.title || "").toLowerCase();
      const author = (a.authorData?.name || "").toLowerCase();
      const cats = Array.isArray(a.category) ? a.category : a.category ? [a.category] : [];
      const catStr = cats.join(" ").toLowerCase();
      return [title, author, catStr].some((v) => v.includes(q));
    });
  }, [hasQuery, q, articleList]);

  const eventResults = useMemo(() => {
    if (!hasQuery) return [];
    return eventList.filter((e) => {
      const title = (e.title || "").toLowerCase();
      const author = (e.authorData?.name || "").toLowerCase();
      const eventType = (e.eventType || "").toLowerCase();
      const location = (e.location || "").toLowerCase();
      const cats = Array.isArray(e.category) ? e.category : e.category ? [e.category] : [];
      const catStr = cats.join(" ").toLowerCase();
      return [title, author, eventType, location, catStr].some((v) => v.includes(q));
    });
  }, [hasQuery, q, eventList]);
  
  // Read notification sound preference from localStorage
  useEffect(() => {
    setSoundMuted(isNotificationSoundMuted());
  }, []);

  const toggleNotificationSound = () => {
    const next = !soundMuted;
    setNotificationSoundMuted(next);
    setSoundMuted(next);
  };

  // Client code from session or localStorage (getBrokerSession reads both)
  useEffect(() => {
    setClientId(brokerSession?.clientCode ?? null);
  }, [brokerSession?.clientCode]);

  // Margin state
  const [marginOpen, setMarginOpen] = useState(false);
  const [marginData, setMarginData] = useState<{ available: number; used: number; total: number } | null>(null);
  const [marginLoading, setMarginLoading] = useState(false);

  useEffect(() => {
    if (!marginOpen || !brokerSession?.accessToken || !brokerSession?.clientCode) return;
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!baseUrl) return;

    let cancelled = false;
    setMarginLoading(true);

    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/bigul/orders/user-limits`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${brokerSession.accessToken}` },
          body: JSON.stringify({
            source: "B2B",
            clientCode: brokerSession.clientCode,
            seg: "CASH",
            exch: "NSE",
            prod: "MIS",
          }),
        });
        const result = await res.json();
        if (!cancelled && result.success && result.data) {
          const avl = parseFloat(result.data.avlMrgn ?? result.data.availableMargin ?? "0");
          const used = parseFloat(result.data.usedMrgn ?? result.data.usedMargin ?? "0");
          const total = avl + used;
          setMarginData({
            available: isNaN(avl) ? 0 : avl,
            used: isNaN(used) ? 0 : used,
            total: isNaN(total) ? 0 : total,
          });
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setMarginLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [marginOpen, brokerSession?.accessToken, brokerSession?.clientCode]);

  const redirectToLoginPage = () => {
    const currentUrl =
      pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    router.push(
      `/auth/user/signin?callbackUrl=${encodeURIComponent(currentUrl)}`
    );
  };

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (!notificationOpen) return;
    
    const userId = session?.user?.id;
    const userRole = session?.user?.role === "serviceprovider" ? "provider" : "user";
    if (!userId) {
      setNotificationLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      setNotificationLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/allnotifications?id=${userId}&role=${userRole}`
        );
        const data = await res.json();

        if (data.success && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        } else {
          setNotifications([]);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        setNotifications([]);
      } finally {
        setNotificationLoading(false);
      }
    };

    fetchNotifications();
  }, [notificationOpen, session?.user?.id, session?.user?.role]);

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/deletenotification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notificationId }),
        }
      );
      
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return notificationDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: notificationDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const slug = (params?.slug as string) || "";
  const showTabs = !!slug;
  const isBigulMarketplace =
    !!marketplace?.createdByBrokerId &&
    BIGUL_BROKER_IDS.includes(marketplace.createdByBrokerId);
  // Check if we're inside an expert profile (e.g. /marketplace/[slug]/experts/[id]/articles)
  // so navbar tabs don't falsely highlight based on nested sub-routes
  const isExpertProfilePage = pathname.includes(`/marketplace/${slug}/experts/`) && pathname.split("/").length > 5;

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled
          ? "bg-white border-b shadow-lg backdrop-blur-lg bg-white/95"
          : "bg-white border-b"
        }`}
    >
      <div className="w-full px-3 sm:px-4">
        <div
          className={`flex items-center gap-2 ${
            isBigulMarketplace ? "min-h-10 " : "h-14"
          }`}
        >
          
          {/* Brand - compact, clicks to landing page */}
          <div
            className="flex items-center flex-shrink-0 cursor-pointer"
            onClick={() => router.push(`/marketplace/${slug}`)}
          >
            {isBigulMarketplace ? (
              <Image
                src="/bigul.png"
                alt="Trade Select"
                width={420}
                height={80}
                className="block h-12 sm:h-16 w-auto max-w-none object-contain flex-shrink-0"
                priority
              />
            ) : (
              <>
                <div className="relative h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0">
                  {marketplace?.brokerSnapshot.profileUrl ? (
                    <Image
                      src={marketplace.brokerSnapshot.profileUrl}
                      alt={marketplace.brokerSnapshot.name || "Broker"}
                      width={32}
                      height={32}
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <Building2 className="h-5 w-5 text-white" />
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
                </div>
                <h1 className="text-sm font-bold text-gray-900 tracking-tight truncate max-w-[140px] hidden sm:block">
                  {marketplace?.name || "Marketplace"}
                </h1>
              </>
            )}
          </div>

          {/* Tabs - navigate to dedicated sub-pages */}
          {showTabs && (
            <div className="hidden lg:flex items-center flex-1 min-w-0 mx-2">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                {NAV_TABS.map((item) => {
                  const href = `/marketplace/${slug}/${item.route}`;
                  const isActive = !isExpertProfilePage && pathname === `/marketplace/${slug}/${item.route}`;
                  return (
                    <button
                      key={item.route}
                      type="button"
                      onClick={() => router.push(href)}
                      className={`whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 flex-shrink-0 ${
                        isActive
                          ? "bg-[#01a6b6] text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Spacer when no tabs */}
          {!showTabs && <div className="flex-1" />}

          {/* Actions - search + compact icons */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
            {/* Search - compact, before action icons */}
            <div className="hidden md:flex max-w-[200px] flex-shrink-0 mr-1">
              <div className="relative w-full group">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 group-focus-within:text-[#01a6b6] transition-colors" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => setSearchOpen(true)}
                  className="pl-8 pr-2 border-gray-200 bg-gray-50 hover:bg-gray-100 focus:bg-white focus:border-[#01a6b6] focus:ring-1 focus:ring-[#01a6b6] transition-all rounded-lg h-8 text-xs"
                />
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleNotificationSound}
              className={`hidden md:inline-flex h-8 w-8 rounded-lg ${soundMuted ? "text-gray-400 hover:text-gray-600" : "text-gray-600 hover:text-[#01a6b6] hover:bg-[#e6f7f9]"}`}
              title={soundMuted ? "Enable Trading Idea sound" : "Mute Trading Idea sound"}
            >
              {soundMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>

            {/* Margin Popover */}
            {brokerSession?.clientCode && (
              <Popover open={marginOpen} onOpenChange={setMarginOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden md:inline-flex h-8 w-8 text-gray-600 hover:text-[#01a6b6] hover:bg-[#e6f7f9] rounded-lg"
                    title="Available Margin"
                  >
                    <Wallet className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0 shadow-lg border border-gray-200 rounded-xl" align="end" sideOffset={8}>
                  <div className="p-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Margin Summary</h4>
                    {marginLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                      </div>
                    ) : marginData ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Available</span>
                          <span className="text-sm font-bold text-emerald-600">
                            {"\u20B9"}{marginData.available.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">Used</span>
                          <span className="text-sm font-semibold text-slate-700">
                            {"\u20B9"}{marginData.used.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${marginData.total > 0 ? (marginData.available / marginData.total) * 100 : 0}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-xs text-slate-500">Total</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {"\u20B9"}{marginData.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-3">Unable to load margin</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
              <PopoverTrigger asChild>
                <Button
                  ref={notificationButtonRef}
                  variant="ghost"
                  size="icon"
                  className="hidden md:inline-flex h-8 w-8 text-gray-600 hover:text-[#01a6b6] hover:bg-[#e6f7f9] rounded-lg relative"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-96 max-h-[500px] p-0 shadow-lg border border-gray-200 rounded-xl"
                align="end"
                sideOffset={8}
              >
                <div className="flex flex-col h-full">
                  <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Notifications {unreadCount > 0 && `(${unreadCount})`}
                      </h3>
                      {notifications.length > 0 && (
                        <button onClick={() => setNotificationOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[450px]">
                    {notificationLoading ? (
                      <div className="p-8 text-center">
                        <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                          <div className="h-4 w-4 border-2 border-[#01a6b6] border-t-transparent rounded-full animate-spin" />
                          Loading notifications...
                        </div>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
                          <Bell className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-1">No notifications</p>
                        <p className="text-xs text-gray-500">You&apos;re all caught up!</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                          <div key={notification._id} className="group relative px-4 py-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex-shrink-0">
                                <div className="h-2 w-2 rounded-full bg-[#01a6b6]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 leading-snug">{notification.message}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatTimeAgo(notification.createdAt)}</span>
                                  </div>
                                  {notification.sentBy?.name && (
                                    <>
                                      <span className="text-gray-300">&bull;</span>
                                      <span className="text-xs text-gray-500">{notification.sentBy.name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteNotification(notification._id); }}
                                className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                title="Delete notification"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 px-4 py-2 rounded-b-xl">
                      <button onClick={() => setNotificationOpen(false)} className="text-xs text-[#01a6b6] hover:text-[#018b99] font-medium">
                        View all notifications &rarr;
                      </button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#e6f7f9] text-[#01a6b6]">
                    <User2 className="h-4 w-4" />
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-xl border border-gray-200 bg-white/95 shadow-lg py-1"
              >
                <DropdownMenuLabel className="px-3 pt-1.5 pb-0.5 text-[11px] font-medium text-gray-500">
                  Client ID
                </DropdownMenuLabel>
                <div className="px-3 pb-2 text-sm font-semibold text-gray-900 truncate">
                  {clientId ?? "N/A"}
                </div>
                <DropdownMenuSeparator />
                {clientId ? (
                  <DropdownMenuItem className="cursor-pointer px-3 py-2 text-sm flex items-center justify-between" onClick={() => router.push("/dashboard/user/myprofile")}>
                    <span>Dashboard</span>
                    <span className="rounded-full bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 font-medium">Logged in</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem className="cursor-pointer px-3 py-2 text-sm" onClick={redirectToLoginPage}>
                    <span>Login</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="cursor-pointer px-3 py-2 text-sm" onClick={() => router.push(marketplaceId && clientId ? `/marketplace/${marketplaceId}/orders/${clientId}` : "/dashboard/user/orders")}>
                  Orders
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer px-3 py-2 text-sm" onClick={() => router.push("/dashboard/user/portfolio")}>
                  Portfolio
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile: search icon */}
            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 rounded-lg" onClick={() => setSearchOpen(true)}>
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleNotificationSound}
              className={`md:hidden h-8 w-8 rounded-lg ${soundMuted ? "text-gray-400" : "text-gray-600 hover:text-[#01a6b6]"}`}
              title={soundMuted ? "Enable Trading Idea sound" : "Mute Trading Idea sound"}
            >
              {soundMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile / Tablet: horizontal scrollable tabs below main row */}
        {showTabs && (
          <div className="lg:hidden flex items-center gap-1 overflow-x-auto scrollbar-hide pb-2 -mt-1">
            {NAV_TABS.map((item) => {
              const href = `/marketplace/${slug}/${item.route}`;
              const isActive = !isExpertProfilePage && pathname === `/marketplace/${slug}/${item.route}`;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => router.push(href)}
                  className={`whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 flex-shrink-0 ${
                    isActive
                      ? "bg-[#01a6b6] text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Live market ticker strip */}
      {liveMarket && (
        <div className="w-full bg-[#0f1117] overflow-hidden h-7 border-t border-gray-800">
          <div className="flex animate-ticker whitespace-nowrap h-full items-center">
            {[liveMarket.nifty, liveMarket.sensex, liveMarket.dow, liveMarket.gold,
              liveMarket.nifty, liveMarket.sensex, liveMarket.dow, liveMarket.gold,
              liveMarket.nifty, liveMarket.sensex, liveMarket.dow, liveMarket.gold,
            ].map((item, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 mx-5 text-[11px]">
                <span className="text-gray-400 font-medium tracking-wide">{item.symbol}</span>
                <span className="text-white font-semibold">
                  {item.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`font-semibold ${item.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}
                </span>
                <span className={`${item.change >= 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
                  ({item.changePercent >= 0 ? "+" : ""}{item.changePercent.toFixed(2)}%)
                </span>
                <span className="text-gray-700 ml-3">|</span>
              </span>
            ))}
          </div>

          <style jsx>{`
            @keyframes ticker {
              0% { transform: translateX(0); }
              100% { transform: translateX(-33.333%); }
            }
            .animate-ticker {
              animation: ticker 25s linear infinite;
              width: max-content;
            }
            .animate-ticker:hover {
              animation-play-state: paused;
            }
            @media (prefers-reduced-motion: reduce) {
              .animate-ticker { animation: none; }
            }
          `}</style>
        </div>
      )}

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[85vh] overflow-y-auto p-0 sm:rounded-2xl border border-gray-200/80 bg-gradient-to-b from-slate-50 to-white shadow-2xl">
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search anything in this marketplace (e.g. tata, nifty, paytm)..."
                  className="pl-10 pr-10 border-gray-200 bg-gray-50 focus:bg-white rounded-xl h-10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                className="hidden sm:inline-flex"
                onClick={() => {
                  const qq = searchQuery.trim();
                  if (!qq || !marketplaceId) return;
                  setSearchOpen(false);
                  router.push(`/marketplace/${marketplaceId}/search?q=${encodeURIComponent(qq)}`);
                }}
              >
                Open full page
              </Button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-gray-500">
              <p className="truncate">
                {searchLoading
                  ? "Loading marketplace data..."
                  : hasQuery
                  ? `Results for “${searchQuery.trim()}”`
                  : "Start typing a stock, analyst, or theme to see instant results."}
              </p>
              <div className="hidden sm:flex items-center gap-2">
                <span className="rounded-full border border-dashed border-gray-300 px-2 py-0.5 bg-gray-50 text-[10px] font-medium text-gray-500">
                  Press ⌘+K / Ctrl+K to open
                </span>
                <span className="rounded-full border border-dashed border-gray-300 px-2 py-0.5 bg-gray-50 text-[10px] font-medium text-gray-500">
                  Esc to close
                </span>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-5 space-y-8">
            {!hasQuery ? (
              <Card className="p-6 border border-dashed border-gray-200 bg-white/60 text-center text-gray-600">
                <div className="flex flex-col items-center gap-2">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e6f7f9] text-[#01a6b6]">
                    <Search className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">
                    Smart search across this entire marketplace
                  </p>
                  <p className="text-xs text-gray-500 max-w-xl">
                    Type a keyword like <span className="font-semibold text-gray-700">tata</span> or{" "}
                    <span className="font-semibold text-gray-700">nifty</span> to instantly see matching
                    recommendations, analysts, portfolios, services, articles, and events.
                  </p>
                </div>
              </Card>
            ) : (
              <>
                {raResults.length === 0 &&
                  recResults.length === 0 &&
                  portfolioResults.length === 0 &&
                  serviceResults.length === 0 &&
                  articleResults.length === 0 &&
                  eventResults.length === 0 && (
                    <Card className="p-6 border border-dashed border-gray-200 bg-white/60 text-center text-gray-600">
                      <p className="text-sm font-semibold mb-1">
                        No results found for “{searchQuery.trim()}”.
                      </p>
                      <p className="text-xs text-gray-500">
                        Try a different keyword or{" "}
                        <button
                          type="button"
                          className="underline underline-offset-2 text-[#01a6b6] hover:text-[#018b99]"
                          onClick={() => {
                            if (!marketplaceId) return;
                            setSearchOpen(false);
                            router.push(`/marketplace/${marketplaceId}/search`);
                          }}
                        >
                          open the full search page
                        </button>
                        .
                      </p>
                    </Card>
                  )}

                {raResults.length > 0 && (
                  <section>
                    <h3 className="text-base font-semibold text-gray-900 mb-3">Research Analysts ({raResults.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {raResults.map((ra) => (
                        <RACard key={ra._id} ra={ra} marketplaceId={marketplaceId} />
                      ))}
                    </div>
                  </section>
                )}

                {recResults.length > 0 && (
                  <section>
                    <h3 className="text-base font-semibold text-gray-900 mb-3">Trading Ideas ({recResults.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {recResults.map((rec) => (
                        <RecommendationCard key={rec._id} recommendation={rec} marketplaceId={marketplaceId} />
                      ))}
                    </div>
                  </section>
                )}

                {portfolioResults.length > 0 && (
                  <section>
                    <h3 className="text-base font-semibold text-gray-900 mb-3">Model Portfolios ({portfolioResults.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {portfolioResults.map((p) => (
                        <PortfolioCard key={p._id} portfolio={p} />
                      ))}
                    </div>
                  </section>
                )}

                {serviceResults.length > 0 && (
                  <section>
                    <h3 className="text-base font-semibold text-gray-900 mb-3">Professional Plans ({serviceResults.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {serviceResults.map((s) => (
                        <ServiceCard key={s._id} service={s} />
                      ))}
                    </div>
                  </section>
                )}

                {articleResults.length > 0 && (
                  <section>
                    <h3 className="text-base font-semibold text-gray-900 mb-3">Articles & Insights ({articleResults.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {articleResults.map((a) => (
                        <ArticleCard key={a._id} article={a} />
                      ))}
                    </div>
                  </section>
                )}

                {eventResults.length > 0 && (
                  <section>
                    <h3 className="text-base font-semibold text-gray-900 mb-3">Events & Webinars ({eventResults.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {eventResults.map((e) => (
                        <EventCard key={e._id} event={e} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  );
}