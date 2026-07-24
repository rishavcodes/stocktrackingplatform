"use client";

import fetcher from "@/lib/data/setup";
import { OurServicesType } from "@/lib/types";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, List, Grid3X3, Eye, RefreshCw, AlertTriangle, BadgeCheck, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

function effectivePurchaseType(s: OurServicesType): "ONE_TIME" | "RENEWABLE" {
  if (s.purchaseType) return s.purchaseType;
  const p = s.pricingPlans?.[0];
  return p?.purchaseType ?? "RENEWABLE";
}

// Pure helper — extracted so the `filtered` useMemo can call it during render
// without hitting a TDZ ("Cannot access before initialization") error.
function getOrderStatus(order: any) {
  if (!order) return { label: "Active", color: "bg-green-100 text-green-700", icon: null as any };
  if (order.isExpired) return { label: "Expired", color: "bg-red-100 text-red-700", icon: null as any };
  const endDate = order.endDate ? new Date(order.endDate) : null;
  if (endDate) {
    const now = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) return { label: "Expired", color: "bg-red-100 text-red-700", icon: null as any };
    if (daysLeft <= 5) return { label: "Expiring", color: "bg-amber-100 text-amber-700", icon: AlertTriangle };
    return { label: "Active", color: "bg-green-100 text-green-700", icon: null as any };
  }
  return { label: "Active", color: "bg-green-100 text-green-700", icon: null as any };
}

// Orders are keyed by `order.subscribedToId`. A service included in a package has
// no order of its own — the order belongs to the package — so when the backend
// tags a service with `sourcePackageId`, resolve its order from the package id.
// Directly-bought services resolve from their own _id.
function resolveOrder(orderByServiceId: Map<string, any>, s: any) {
  return orderByServiceId.get(
    s?.sourcePackageId ?? (s?._id?.toString?.() || s?._id)
  );
}

export default function Services() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<string>("all");
  const [serviceType, setServiceType] = useState<string>("all");
  const [purchaseType, setPurchaseType] = useState<string>("all");
  const [sort, setSort] = useState<"recent" | "title">("recent");
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [statusFilter, setStatusFilter] = useState<"all" | "active">("all");
  const [raPopup, setRaPopup] = useState<{ open: boolean; data: any; loading: boolean }>({ open: false, data: null, loading: false });
  const [planPopup, setPlanPopup] = useState<{
    open: boolean;
    service: any;
    order: any;
    recommendations: any[];
    loading: boolean;
  }>({ open: false, service: null, order: null, recommendations: [], loading: false });
  const popupRef = useRef<HTMLDivElement>(null);
  const planPopupRef = useRef<HTMLDivElement>(null);

  // Close popups on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (raPopup.open && popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setRaPopup({ open: false, data: null, loading: false });
      }
      if (planPopup.open && planPopupRef.current && !planPopupRef.current.contains(e.target as Node)) {
        setPlanPopup({ open: false, service: null, order: null, recommendations: [], loading: false });
      }
    };
    if (raPopup.open || planPopup.open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [raPopup.open, planPopup.open]);

  const handleRaClick = useCallback(async (spId: string) => {
    setRaPopup({ open: true, data: null, loading: true });
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/spdetails?id=${spId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setRaPopup({ open: true, data: json.data, loading: false });
      } else {
        setRaPopup({ open: false, data: null, loading: false });
      }
    } catch {
      setRaPopup({ open: false, data: null, loading: false });
    }
  }, []);

  const handlePlanClick = useCallback(async (service: any, order: any) => {
    setPlanPopup({ open: true, service, order, recommendations: [], loading: true });
    try {
      const spId = service?.authorData?.id;
      const planId = service?._id;
      if (!spId || !planId) {
        setPlanPopup({ open: true, service, order, recommendations: [], loading: false });
        return;
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scorecard/getmyrecommendations?id=${spId}&planId=${planId}`
      );
      const json = await res.json();
      const recs = Array.isArray(json?.data) ? json.data : [];
      setPlanPopup({ open: true, service, order, recommendations: recs, loading: false });
    } catch {
      setPlanPopup({ open: true, service, order, recommendations: [], loading: false });
    }
  }, []);

  const { data, isLoading } = useSWR<{ data: OurServicesType[] }>(
    session?.user?.id
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/subscribedservices?id=${session.user.id}&role=${session.user.role}`
      : null,
    fetcher
  );

  const { data: billingData } = useSWR<{
    success: boolean;
    data: {
      orders: any[];
    };
  }>(
    session?.user?.id
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/user-billing?userId=${session.user.id}`
      : null,
    fetcher
  );

  const raw = useMemo(() => data?.data ?? [], [data?.data]);
  const orders = useMemo(() => billingData?.data?.orders ?? [], [billingData?.data?.orders]);

  // Map serviceId -> latest order (most recent by createdAt)
  const orderByServiceId = useMemo(() => {
    const map = new Map<string, any>();
    for (const order of orders) {
      const sid = order.subscribedToId;
      if (!sid) continue;
      const existing = map.get(sid);
      if (!existing || new Date(order.createdAt) > new Date(existing.createdAt)) {
        map.set(sid, order);
      }
    }
    return map;
  }, [orders]);

  const segmentOptions = useMemo(() => {
    const set = new Set<string>();
    raw.forEach((s) => {
      if (s.segment?.trim()) set.add(s.segment.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [raw]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = raw.filter((s) => {
      if (q) {
        const inTitle = s.title?.toLowerCase().includes(q);
        const inDesc = s.description?.toLowerCase().includes(q);
        if (!inTitle && !inDesc) return false;
      }
      if (segment !== "all" && (s.segment?.trim() || "") !== segment) {
        return false;
      }
      if (serviceType !== "all") {
        const st = (s.serviceType || "").toLowerCase();
        if (st !== serviceType) return false;
      }
      if (purchaseType !== "all") {
        if (effectivePurchaseType(s) !== purchaseType) return false;
      }
      // Status filter — keep this in sync with getOrderStatus so the badge
      // on the card and the filter agree on what counts as "Active".
      if (statusFilter === "active") {
        const order = resolveOrder(orderByServiceId, s);
        if (getOrderStatus(order).label !== "Active") return false;
      }
      return true;
    });

    if (sort === "title") {
      list = [...list].sort((a, b) =>
        (a.title || "").localeCompare(b.title || "", undefined, {
          sensitivity: "base",
        })
      );
    } else {
      list = [...list].sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        return tb - ta;
      });
    }
    return list;
  }, [raw, search, segment, serviceType, purchaseType, sort, statusFilter, orderByServiceId]);

  const hasFilters =
    search.trim() !== "" ||
    segment !== "all" ||
    serviceType !== "all" ||
    purchaseType !== "all";

  const clearFilters = () => {
    setSearch("");
    setSegment("all");
    setServiceType("all");
    setPurchaseType("all");
    setSort("recent");
  };


  const getValidityInfo = (order: any) => {
    if (!order?.endDate) return { validTill: "—", daysRemaining: null };
    const endDate = new Date(order.endDate);
    const now = new Date();
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      validTill: endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      daysRemaining: daysLeft > 0 ? daysLeft : 0,
    };
  };

  // Hero strip counts — based on the full subscribed list, not the filtered one
  const summary = useMemo(() => {
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;
    for (const s of raw) {
      const order = resolveOrder(orderByServiceId, s);
      const label = getOrderStatus(order).label;
      if (label === "Active") active++;
      else if (label === "Expiring") expiringSoon++;
      else if (label === "Expired") expired++;
    }
    return { total: raw.length, active, expiringSoon, expired };
  }, [raw, orderByServiceId]);

  // Force cards-only on mobile — list rows with 12-col grids never look right on a phone.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { 
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const effectiveViewMode = isMobile ? "cards" : viewMode;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4">
      {/* ===================== HERO STRIP ===================== */}
      {!isLoading && raw.length > 0 && (
        <div className="mb-4 sm:mb-5 rounded-2xl mt-3 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 p-[1px] shadow-sm">
          <div className="rounded-[15px] bg-white dark:bg-gray-900  px-4 sm:px-5 py-1 sm:py-2">
            
            <div className="grid grid-cols-4 gap-2 pt-4  dark:border-gray-800">
              {[
                { label: "Total", value: summary.total, color: "text-gray-900 dark:text-white" },
                { label: "Active", value: summary.active, color: "text-emerald-600" },
                { label: "Expiring", value: summary.expiringSoon, color: "text-amber-600" },
                { label: "Expired", value: summary.expired, color: "text-rose-600" },
              ].map((s) => (
                <div key={s.label} className="text-center sm:text-left">
                  <p className={`text-lg sm:text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-black rounded-xl border shadow-sm p-3 sm:p-5 md:p-6">
        {!isLoading && raw.length > 0 && (
          <div className="mb-4 md:mb-6 flex flex-col gap-3 md:gap-4">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="...."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {/* View Toggle — desktop only; mobile is always cards */}
              <div className="hidden md:flex items-center border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-2 ${viewMode === "list" ? "bg-gray-900 text-white dark:bg-white dark:text-black" : "bg-white text-gray-500 dark:bg-black dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`p-2 ${viewMode === "cards" ? "bg-gray-900 text-white dark:bg-white dark:text-black" : "bg-white text-gray-500 dark:bg-black dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* <div className="flex flex-wrap gap-3 items-end">
              <div className="min-w-[140px] flex-1 sm:flex-initial sm:w-[180px]">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Segment
                </label>
                <Select value={segment} onValueChange={setSegment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All segments</SelectItem>
                    {segmentOptions.map((seg) => (
                      <SelectItem key={seg} value={seg}>
                        {seg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[140px] flex-1 sm:flex-initial sm:w-[180px]">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Type
                </label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="normal">Plan</SelectItem>
                    <SelectItem value="fund">Fund</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[140px] flex-1 sm:flex-initial sm:w-[180px]">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Purchase
                </label>
                <Select value={purchaseType} onValueChange={setPurchaseType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Purchase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="ONE_TIME">One-time</SelectItem>
                    <SelectItem value="RENEWABLE">Renewable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[140px] flex-1 sm:flex-initial sm:w-[180px]">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Sort
                </label>
                <Select
                  value={sort}
                  onValueChange={(v) => setSort(v as "recent" | "title")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Newest first</SelectItem>
                    <SelectItem value="title">Title (A–Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline px-1 h-10 self-end"
                >
                  Clear filters
                </button>
              )}
            </div> */}
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {filtered.length}
              </span>{" "}
              of {raw.length} service{raw.length === 1 ? "" : "s"}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3 sm:gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-44 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : raw.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🧩</div>
            <h3 className="text-lg font-semibold">No services subscribed</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">
              You haven&apos;t subscribed to any services yet. Once you do, they&apos;ll
              appear here.
            </p>
          </div>
        ) : effectiveViewMode === "cards" && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-xl">
            <p className="text-muted-foreground mb-3">
              No services match your filters.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : effectiveViewMode === "cards" ? (
          <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3 sm:gap-4 md:gap-6">
            {filtered.map((service: any) => {
              const order = resolveOrder(orderByServiceId, service);
              const status = getOrderStatus(order);
              const validity = getValidityInfo(order);

              return (
                <div
                  key={service._id}
                  className="bg-white dark:bg-[#161616] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md hover:shadow-xl transition-all overflow-hidden"
                >
                  {/* Banner */}
                  <div className="relative h-[150px] w-full overflow-hidden bg-gray-200 dark:bg-gray-800">
                    {service.bannerURL && (
                      <img
                        src={service.bannerURL}
                        alt={service.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <span className="absolute top-3 right-3 bg-white/95 dark:bg-gray-900/90 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                      {service.segment?.toUpperCase() || "—"}
                    </span>
                    {/* Status badge on banner */}
                    <span
                      className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${status.color}`}
                    >
                      {status.label === "Expiring" && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                      )}
                      {status.icon && status.label !== "Expiring" && (
                        <status.icon className="w-3 h-3" />
                      )}
                      {status.label}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    <h2 className="text-lg font-semibold line-clamp-2 dark:text-white">
                      {service.title}
                    </h2>
                    {service.sourcePackageId && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        Included in {service.sourcePackageTitle}
                      </span>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {service.description}
                    </p>

                    {/* Author */}
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8">
                        {service.authorData?.authorImage ? (
                          <AvatarImage src={service.authorData.authorImage} />
                        ) : null}
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                          {service.authorData?.name?.charAt(0) || "S"}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium dark:text-white">
                        {service.authorData?.name}
                      </p>
                    </div>
                  </div>

                  {/* Footer: Validity + Actions */}
                  <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{validity.validTill}</p>
                      {validity.daysRemaining !== null && (
                        <p className="text-xs text-gray-500">{validity.daysRemaining} day{validity.daysRemaining !== 1 ? "s" : ""} left</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {(status.label === "Expiring" || status.label === "Expired") && (
                        <Link
                          href={`/view/services/${service._id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Renew
                        </Link>
                      )}
                      <Link
                        href={`/view/services/${service._id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="space-y-0 border rounded-xl overflow-hidden">
            {/* Table Header - hidden on mobile */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-900 border-b text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide items-center">
              <div className="col-span-2">RA Info</div>
              <div className="col-span-3">Plan Details</div>
              <div className="col-span-2">Validity</div>
              <div className="col-span-2 flex items-center justify-end mr-5 gap-2">
                <span>{statusFilter === "active" ? "Active" : "Status"}</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === "all" ? "active" : "all")}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    statusFilter === "active" ? "bg-green-600" : "bg-blue-500 dark:bg-gray-600"
                  }`}
                  title={statusFilter === "active" ? "Showing only active — click to show all" : "Showing all — click to show only active"}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-green-300 transition-transform ${
                      statusFilter === "active" ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <div className="col-span-3 text-center">Actions</div>
            </div>

            {/* Empty state inside list view — keeps the header (with the
                status toggle) visible so the user can switch back. */}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No services match your filters.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}

            {filtered.map((service: any) => {
              const order = resolveOrder(orderByServiceId, service);
              const status = getOrderStatus(order);
              const validity = getValidityInfo(order);

              return (
                <div
                  key={service._id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-3 sm:px-5 py-3 md:py-4 border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors items-center"
                >
                  {/* RA Info */}
                  <div
                    className="col-span-1 md:col-span-2 flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => service.authorData?.id && handleRaClick(service.authorData.id)}
                  >
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      {service.authorData?.authorImage ? (
                        <AvatarImage src={service.authorData.authorImage} />
                      ) : null}
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                        {service.authorData?.name?.charAt(0) || "S"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 line-clamp-2 leading-tight hover:underline">
                      {service.authorData?.name || "—"}
                    </p>
                  </div>

                  {/* Plan Details */}
                  <div className="col-span-1 md:col-span-3 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {service.title}
                    </p>
                    {service.sourcePackageId && (
                      <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        Included in {service.sourcePackageTitle}
                      </span>
                    )}
                    {service.segment && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {service.segment}
                      </p>
                    )}
                  </div>

                  {/* Validity */}
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      {validity.validTill}
                    </p>
                    {validity.daysRemaining !== null && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {validity.daysRemaining} day{validity.daysRemaining !== 1 ? "s" : ""} left
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="col-span-1 md:col-span-2 flex md:justify-end md:pr-12">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.icon && <status.icon className="w-3 h-3" />}
                      {status.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 md:col-span-3 flex items-center justify-end gap-2">
                    {(status.label === "Expiring" || status.label === "Expired") && (
                      <Link
                        href={`/view/services/${service._id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Renew
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => handlePlanClick(service, order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium rounded-lg transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RA Popup */}
      {raPopup.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div ref={popupRef} className="w-[380px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
            {raPopup.loading ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center shadow-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-3 text-sm text-gray-500">Loading...</p>
              </div>
            ) : raPopup.data && (() => {
              const ra = raPopup.data;
              const displayName = ra.RegName || ra.name || ra.companyName || "Expert";
              const category = ra.category || "Service Provider";
              const location = [ra.city, ra.state].filter(Boolean).join(", ");
              const about = ra.AboutMe || ra.description || "";
              const verified = ra.verified || false;
              const stats = ra.stats || {};
              const totalRecs = stats?.recommendationStats?.total || 0;
              const openRecs = stats?.recommendationStats?.open || 0;
              const closedRecs = stats?.recommendationStats?.close || 0;
              const subscribers = stats?.Subscribers?.length || stats?.serviceStats?.totalSubscribers || 0;
              const totalPlans = stats?.serviceStats?.totalPlans || 0;
              const totalPortfolios = stats?.modelPortfolioStates?.totalPortfolios || 0;

              return (
                <div className="bg-white dark:bg-[#161616] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
                  {/* Header */}
                  <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 h-16">
                    <div className="absolute -bottom-6 left-5">
                      <Avatar className="w-12 h-12 ring-2 ring-white dark:ring-gray-900">
                        {ra.profileUrl ? <AvatarImage src={ra.profileUrl} /> : null}
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-lg font-bold">
                          {displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRaPopup({ open: false, data: null, loading: false })}
                      className="absolute top-3 right-3 p-1 bg-white/80 dark:bg-gray-800/80 rounded-full hover:bg-white dark:hover:bg-gray-700 transition"
                    >
                      <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                    <Link
                      href={`/dashboard/user/experts/${ra._id}`}
                      className="absolute top-3 right-12 h-7 px-3 bg-white/90 hover:bg-white text-slate-700 font-semibold text-[10px] rounded-full shadow-sm border border-white/50 backdrop-blur-sm inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      View Profile
                    </Link>
                  </div>

                  <div className="px-5 pb-5 pt-10 flex flex-col gap-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{displayName}</h3>
                        {verified && <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="px-2 py-0.5 bg-[#01a6b6]/10 text-[#01a6b6] rounded-full text-[10px] font-semibold">{category}</span>
                        {location && (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-[10px] font-medium">{location}</span>
                        )}
                      </div>
                    </div>

                    {about && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-0.5">About</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{about}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-x-4 gap-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-md font-bold text-slate-900 dark:text-white">{totalRecs}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Recommendations</div>
                      </div>
                      <div>
                        <div className="text-md font-bold text-emerald-600">{openRecs}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Active</div>
                      </div>
                      <div>
                        <div className="text-md font-bold text-slate-600 dark:text-slate-300">{closedRecs}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Closed</div>
                      </div>
                      <div>
                        <div className="text-md font-bold text-blue-600">{subscribers}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Subscribers</div>
                      </div>
                      <div>
                        <div className="text-md font-bold text-purple-600">{totalPlans}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Plans</div>
                      </div>
                      <div>
                        <div className="text-md font-bold text-amber-600">{totalPortfolios}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Portfolios</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Plan Popup */}
      {planPopup.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div ref={planPopupRef} className="w-[440px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
            {planPopup.loading ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center shadow-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-3 text-sm text-gray-500">Loading plan details...</p>
              </div>
            ) : planPopup.service && (() => {
              const svc = planPopup.service;
              const ord = planPopup.order;
              const recs = planPopup.recommendations;
              const totalRec = recs.length;
              const activeRec = recs.filter((r: any) => (r?.status || "").toLowerCase() === "open").length;
              const closedRec = recs.filter((r: any) => (r?.status || "").toLowerCase() === "closed").length;

              const fmt = (d: any) => {
                if (!d) return "—";
                try {
                  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                } catch {
                  return "—";
                }
              };

              const startDate = ord?.startDate || ord?.createdAt;
              const endDate = ord?.endDate;

              return (
                <div className="bg-white dark:bg-[#161616] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
                  {/* Header */}
                  <div className="relative bg-gradient-to-br from-indigo-100 to-blue-200 dark:from-slate-800 dark:to-slate-900 h-20 px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setPlanPopup({ open: false, service: null, order: null, recommendations: [], loading: false })}
                      className="absolute top-3 right-3 p-1 bg-white/80 dark:bg-gray-800/80 rounded-full hover:bg-white dark:hover:bg-gray-700 transition"
                    >
                      <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </button>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white pr-10 line-clamp-2">
                      {svc.title}
                    </h2>
                    {svc.segment && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-white/70 dark:bg-gray-800/70 text-[10px] font-semibold text-slate-700 dark:text-slate-200 rounded-full">
                        {svc.segment}
                      </span>
                    )}
                  </div>

                  <div className="p-5 flex flex-col gap-4">
                    {/* Author */}
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-9 h-9">
                        {svc.authorData?.authorImage ? (
                          <AvatarImage src={svc.authorData.authorImage} />
                        ) : null}
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                          {svc.authorData?.name?.charAt(0) || "S"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {svc.authorData?.name || "—"}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Service Provider</p>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">Start Date</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{fmt(startDate)}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">End Date</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{fmt(endDate)}</p>
                      </div>
                    </div>

                    {/* Recommendation Stats */}
                    <div>
                      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                        Recommendation Stats
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{totalRec}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Total</div>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{activeRec}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Active</div>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                          <div className="text-xl font-bold text-slate-700 dark:text-slate-300">{closedRec}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Closed</div>
                        </div>
                      </div>
                    </div>

                    {/* Action button */}
                    <Link
                      href={`/view/services/${svc._id}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Full Plan Page
                    </Link>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
