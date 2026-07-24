"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import * as XLSX from "xlsx";
import {
  Search,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Briefcase,
  CheckCircle2,
  Users,
  Layers,
} from "lucide-react";

type ServiceItem = {
  _id: string;
  title: string;
  authorData: {
    id?: string;
    name: string;
    email?: string;
    type?: string;
  };
  serviceType: string;
  segment: string;
  description: string;
  validity: number;
  price?: number;
  pricingPlans?: { validity: number; price: number }[];
  approvalStatus: boolean;
  activated: boolean;
  isFreeTrial: boolean;
  bannerURL: string;
  keyFeatures: string[];
  bonusFeatures: string[];
  subscribedBy?: string[];
  createdAt: string;
  purchaseType?: "ONE_TIME" | "RENEWABLE";
  leadsCount?: number;
  totalSales?: number;
};

type SortKey =
  | "createdAt"
  | "title"
  | "author"
  | "startingPrice"
  | "tiers"
  | "subscribers"
  | "leads"
  | "sales";
type SortDir = "asc" | "desc";

// Lowest price across tiers (falls back to top-level price). Returns null if
// neither is set so callers can render an em-dash instead of "₹0".
function startingPrice(s: ServiceItem): number | null {
  const tierMin =
    s.pricingPlans && s.pricingPlans.length > 0
      ? Math.min(...s.pricingPlans.map((p) => p.price))
      : null;
  if (tierMin !== null && Number.isFinite(tierMin)) return tierMin;
  if (typeof s.price === "number") return s.price;
  return null;
}

function tierCount(s: ServiceItem): number {
  return s.pricingPlans?.length ?? (typeof s.price === "number" ? 1 : 0);
}

function formatPrice(v: number | null): string {
  if (v === null) return "—";
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}

function fmt(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}


function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const fetcher = ([url, token]: [string, string]) =>
  fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());

export default function AllServicesPage() {
  const router = useRouter();
  const session = useSession();
  const token = session.data?.backendToken ?? "";

  const { data, isLoading } = useSWR(
    token ? [`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/allservices`, token] : null,
    fetcher
  );
  // Stabilise the reference so downstream useMemo deps don't re-run every render.
  const services: ServiceItem[] = useMemo(
    () => (data?.data as ServiceItem[]) ?? [],
    [data]
  );

  const [search, setSearch] = useState("");
  // Date range filter on Start Date. Empty string = unbounded on that side.
  // Stored as YYYY-MM-DD strings (native <input type="date"> shape).
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    // `dateFrom` is inclusive at start-of-day; `dateTo` inclusive at end-of-day.
    // Parsing as +00:00 keeps the math consistent regardless of viewer TZ.
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    return [...services]
      .filter((s) => {
        if (q) {
          const matchSearch =
            s.title.toLowerCase().includes(q) ||
            (s.authorData?.name ?? "").toLowerCase().includes(q) ||
            (s.segment ?? "").toLowerCase().includes(q);
          if (!matchSearch) return false;
        }
        if (fromMs !== null || toMs !== null) {
          const t = new Date(s.createdAt).getTime();
          if (isNaN(t)) return false;
          if (fromMs !== null && t < fromMs) return false;
          if (toMs !== null && t > toMs) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortKey) {
          case "title": aVal = a.title; bVal = b.title; break;
          case "author": aVal = a.authorData?.name ?? ""; bVal = b.authorData?.name ?? ""; break;
          case "startingPrice": aVal = startingPrice(a) ?? 0; bVal = startingPrice(b) ?? 0; break;
          case "tiers": aVal = tierCount(a); bVal = tierCount(b); break;
          case "subscribers": aVal = a.subscribedBy?.length ?? 0; bVal = b.subscribedBy?.length ?? 0; break;
          case "leads": aVal = a.leadsCount ?? 0; bVal = b.leadsCount ?? 0; break;
          case "sales": aVal = a.totalSales ?? 0; bVal = b.totalSales ?? 0; break;
          default:
            aVal = new Date(a.createdAt).getTime();
            bVal = new Date(b.createdAt).getTime();
        }
        if (typeof aVal === "number" && typeof bVal === "number")
          return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        return sortDir === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
  }, [services, search, dateFrom, dateTo, sortKey, sortDir]);

  const totalSubscribers = useMemo(
    () => services.reduce((sum, s) => sum + (s.subscribedBy?.length ?? 0), 0),
    [services]
  );
  const uniqueSegments = useMemo(() => new Set(services.map((s) => s.segment).filter(Boolean)).size, [services]);
  const uniqueAuthors = useMemo(() => new Set(services.map((s) => s.authorData?.id).filter(Boolean)).size, [services]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else { setSortKey(key); setSortDir("asc"); }
    },
    [sortKey]
  );

  const handleExport = useCallback(() => {
    const rows = filtered.map((s) => ({
      "Start Date": fmt(s.createdAt),
      Title: s.title,
      Expert: s.authorData?.name ?? "—",
      "Starting Price": formatPrice(startingPrice(s)),
      "Validity (no of tiers)": tierCount(s),
      Subscribers: s.subscribedBy?.length ?? 0,
      Leads: s.leadsCount ?? 0,
      "Total Sales": s.totalSales ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Services");
    XLSX.writeFile(wb, `Services_${new Date().toISOString().split("T")[0]}.xlsx`);
  }, [filtered]);

  function SortableHeader({ label, field }: { label: string; field: SortKey }) {
    const isActive = sortKey === field;
    const Icon = isActive ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th
        className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors whitespace-nowrap ${
          isActive ? "text-indigo-700" : "text-gray-500 hover:text-gray-700"
        }`}
        onClick={() => toggleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <Icon className={`w-3 h-3 ${isActive ? "text-indigo-600" : "text-gray-300"}`} />
        </span>
      </th>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading services…</p>
      </div>
    );
  }

  if (!services.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <Briefcase className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700">No services found</h3>
          <p className="text-sm text-gray-400 mt-1">Services will appear here once created</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Briefcase className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Services</h1>
          <p className="text-sm text-gray-500">Overview of all services across segments</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total Services" value={services.length} icon={Briefcase} color="bg-indigo-50 text-indigo-600" />
        <KpiCard label="Subscribers" value={totalSubscribers.toLocaleString()} icon={Users} color="bg-blue-50 text-blue-600" />
        <KpiCard label="Segments" value={uniqueSegments} icon={Layers} color="bg-violet-50 text-violet-600" />
        <KpiCard label="Providers" value={uniqueAuthors} sub="unique authors" icon={Users} color="bg-rose-50 text-rose-600" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, author, or segment…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={dateTo || undefined}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
            />
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || undefined}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="text-xs text-gray-500 hover:text-gray-700 underline whitespace-nowrap"
                title="Clear date filter"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* No Results */}
      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-sm text-gray-500">No services match your search</p>
          <button
            onClick={() => setSearch("")}
            className="mt-2 text-xs text-indigo-600 hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Desktop Table */}
      {filtered.length > 0 && (
        <div className="hidden md:block border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortableHeader label="Start Date" field="createdAt" />
                  <SortableHeader label="Title" field="title" />
                  <SortableHeader label="Expert" field="author" />
                  <SortableHeader label="Starting Price" field="startingPrice" />
                  <SortableHeader label="Validity (Tiers)" field="tiers" />
                  <SortableHeader label="Subscribers" field="subscribers" />
                  <SortableHeader label="Leads" field="leads" />
                  <SortableHeader label="Total Sales" field="sales" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s) => {
                  const subs = s.subscribedBy?.length ?? 0;
                  const sp = startingPrice(s);
                  const tiers = tierCount(s);
                  return (
                    <tr
                      key={s._id}
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/admin/services/allservices/${s._id}`)}
                    >
                      {/* Start Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600">
                        {fmt(s.createdAt)}
                      </td>
                      {/* Title */}
                      <td className="px-4 py-3.5 max-w-[260px]">
                        <div className="font-medium text-sm text-gray-900 truncate">{s.title}</div>
                        <div className="text-xs text-gray-400 truncate">{s.serviceType ?? ""}</div>
                      </td>
                      {/* Expert */}
                      <td className="px-4 py-3.5 max-w-[160px]">
                        <span className="text-sm text-gray-700 truncate block">{s.authorData?.name ?? "—"}</span>
                      </td>
                      {/* Starting Price */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{formatPrice(sp)}</span>
                      </td>
                      {/* Validity (Tiers) */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {tiers > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-lg">
                            <Layers className="w-3 h-3" />
                            {tiers} tier{tiers !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      {/* Subscribers */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-sm font-medium text-gray-900">{subs}</span>
                        </div>
                      </td>
                      {/* Leads */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">{s.leadsCount ?? 0}</span>
                      </td>
                      {/* Total Sales */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-sm font-semibold text-emerald-700">
                          ₹{Math.round(s.totalSales ?? 0).toLocaleString("en-IN")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile Cards */}
      {filtered.length > 0 && (
        <div className="md:hidden space-y-3">
          {filtered.map((s) => {
            const subs = s.subscribedBy?.length ?? 0;
            const sp = startingPrice(s);
            const tiers = tierCount(s);
            return (
              <div
                key={s._id}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm cursor-pointer"
                onClick={() => router.push(`/dashboard/admin/services/allservices/${s._id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-800 truncate">{s.title}</h3>
                    <p className="text-xs text-gray-400 truncate">{s.authorData?.name ?? "—"}</p>
                  </div>
                  <span className="text-xs text-gray-400 ml-3 flex-shrink-0 whitespace-nowrap">
                    {fmt(s.createdAt)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-gray-400 block">Starting</span>
                    <span className="text-gray-800 font-medium">{formatPrice(sp)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Tiers</span>
                    <span className="text-gray-800 font-medium">{tiers || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Subscribers</span>
                    <span className="text-gray-800 font-medium">{subs}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Leads</span>
                    <span className="text-gray-800 font-medium">{s.leadsCount ?? 0}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400 block">Total Sales</span>
                    <span className="text-emerald-700 font-semibold">
                      ₹{Math.round(s.totalSales ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
