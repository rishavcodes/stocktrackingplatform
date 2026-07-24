"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { useDataEvents } from "@/lib/data/Home/EventDataHome";
import {
  Search,
  Download,
  ArrowUpDown,
  CalendarDays,
  Users,
  DollarSign,
  Tag,
  BarChart2,
  TrendingUp,
  CheckCircle2,
  MapPin,
  Globe,
  Ticket,
  Plus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type EventItem = {
  _id: string;
  title: string;
  category: string[];
  schedule: string;
  authorData: {
    id: string;
    name: string;
    type: string;
    authorImage: string;
  };
  registeredUsers?: any[];
  NoOfRegistration?: number;
  registrationCount?: number;
  eventType: string;
  eventCostType: string;
  price: number;
  language: string;
  location?: string;
  link?: string;
  description: string;
  image: string;
  approvalStatus: boolean;
  targetAudience?: "user" | "provider";
  createdAt: string;
  updatedAt?: string;
  type: string;
};

type SortKey = "schedule" | "title" | "author" | "registrations" | "price" | "createdAt";
type SortDir = "asc" | "desc";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmt(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtCurrency(n?: number): string {
  if (n == null || isNaN(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#0891b2", "#8b5cf6", "#94a3b8", "#f97316"];

function getRegCount(e: EventItem): number {
  return e.registrationCount ?? e.registeredUsers?.length ?? 0;
}

// ─────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export default function EventsPage() {
  const router = useRouter();
  const { events: rawEvents, isLoading } = useDataEvents();
  const events: EventItem[] = rawEvents ?? [];

  const [search, setSearch] = useState("");
  const [costFilter, setCostFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("schedule");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ── Derived filter options ──
  const costTypes = useMemo(() => {
    const s = new Set(events.map((e) => e.eventCostType).filter(Boolean));
    return ["All", ...Array.from(s).sort()];
  }, [events]);

  const categories = useMemo(() => {
    const s = new Set(events.flatMap((e) => e.category ?? []).filter(Boolean));
    return ["All", ...Array.from(s).sort()];
  }, [events]);

  // ── Filter + Sort ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...events]
      .filter((e) => {
        const matchSearch =
          !q ||
          e.title.toLowerCase().includes(q) ||
          (e.authorData?.name ?? "").toLowerCase().includes(q) ||
          (e.location ?? "").toLowerCase().includes(q);
        const matchCost = costFilter === "All" || e.eventCostType === costFilter;
        const matchCat = categoryFilter === "All" || (e.category ?? []).includes(categoryFilter);
        const eDate = new Date(e.schedule || e.createdAt);
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(new Date(toDate).setHours(23, 59, 59, 999)) : null;
        const matchDate = (!from || eDate >= from) && (!to || eDate <= to);
        return matchSearch && matchCost && matchCat && matchDate;
      })
      .sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortKey) {
          case "title": aVal = a.title; bVal = b.title; break;
          case "author": aVal = a.authorData?.name ?? ""; bVal = b.authorData?.name ?? ""; break;
          case "registrations":
            aVal = getRegCount(a);
            bVal = getRegCount(b);
            break;
          case "price": aVal = a.price ?? 0; bVal = b.price ?? 0; break;
          case "createdAt":
            aVal = new Date(a.createdAt).getTime();
            bVal = new Date(b.createdAt).getTime();
            break;
          default:
            aVal = new Date(a.schedule || a.createdAt).getTime();
            bVal = new Date(b.schedule || b.createdAt).getTime();
        }
        if (typeof aVal === "number" && typeof bVal === "number")
          return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        return sortDir === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
  }, [events, search, costFilter, categoryFilter, fromDate, toDate, sortKey, sortDir]);

  // ── Analytics ──
  const totalRegistrations = useMemo(
    () => events.reduce((s, e) => s + getRegCount(e), 0),
    [events]
  );
  const paidEvents = useMemo(() => events.filter((e) => e.eventCostType === "Paid"), [events]);
  const freeEvents = useMemo(() => events.filter((e) => e.eventCostType !== "Paid"), [events]);
  const totalRevenue = useMemo(
    () => paidEvents.reduce((s, e) => s + (e.price ?? 0) * getRegCount(e), 0),
    [paidEvents]
  );
  const uniqueAuthors = useMemo(() => new Set(events.map((e) => e.authorData?.id).filter(Boolean)).size, [events]);

  const upcomingCount = useMemo(
    () => events.filter((e) => new Date(e.schedule) > new Date()).length,
    [events]
  );

  // Top authors by event count
  const topAuthors = useMemo(() => {
    const map: Record<string, number> = {};
    events.forEach((e) => {
      const name = e.authorData?.name ?? "Unknown";
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name: name.trim().split(" ")[0], value }));
  }, [events]);

  // Category distribution
  const categoryDist = useMemo(() => {
    const map: Record<string, number> = {};
    events.forEach((e) => {
      (e.category ?? []).forEach((c) => { map[c] = (map[c] || 0) + 1; });
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [events]);

  // ── Sort toggle ──
  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else { setSortKey(key); setSortDir("asc"); }
    },
    [sortKey]
  );

  // ── Export ──
  const handleExport = useCallback(() => {
    const rows = filtered.map((e) => ({
      Title: e.title,
      Author: e.authorData?.name ?? "—",
      "Event Date": fmt(e.schedule),
      Categories: (e.category ?? []).join(", "),
      Type: e.eventCostType ?? "—",
      Price: e.price ?? 0,
      Registrations: getRegCount(e),
      Location: e.location ?? "—",
      Language: e.language ?? "—",
      "Target Audience": e.targetAudience ?? "—",
      "Created At": fmt(e.createdAt),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Events");
    XLSX.writeFile(wb, `Events_${new Date().toISOString().split("T")[0]}.xlsx`);
  }, [filtered]);

  // ── Sortable header ──
  function SortableHeader({ label, field }: { label: string; field: SortKey }) {
    return (
      <th
        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap"
        onClick={() => toggleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <ArrowUpDown className={`w-3 h-3 ${sortKey === field ? "text-indigo-600" : "text-gray-300"}`} />
        </span>
      </th>
    );
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading events…</p>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <CalendarDays className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700">No events found</h3>
          <p className="text-sm text-gray-400 mt-1">Events will appear here once created</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 ml-10">
            All events, registrations & analytics
          </p>
        </div>
        <Link
          href="/dashboard/admin/events/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </Link>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label="Total Events"
          value={events.length.toLocaleString()}
          icon={CalendarDays}
          color="bg-indigo-50 text-indigo-600"
        />
        <KpiCard
          label="Total Registrations"
          value={totalRegistrations.toLocaleString()}
          icon={Users}
          color="bg-blue-50 text-blue-600"
        />
        <KpiCard
          label="Upcoming"
          value={upcomingCount.toLocaleString()}
          sub="scheduled ahead"
          icon={TrendingUp}
          color="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          label="Paid Events"
          value={paidEvents.length.toLocaleString()}
          sub={`${freeEvents.length} free`}
          icon={Ticket}
          color="bg-violet-50 text-violet-600"
        />
        <KpiCard
          label="Est. Revenue"
          value={fmtCurrency(totalRevenue)}
          icon={DollarSign}
          color="bg-amber-50 text-amber-600"
        />
        <KpiCard
          label="Authors"
          value={uniqueAuthors.toLocaleString()}
          sub="unique creators"
          icon={Users}
          color="bg-rose-50 text-rose-600"
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-700">Top Authors by Events</h3>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={topAuthors} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                formatter={(v: any) => [v, "Events"]}
                contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-700">Categories</h3>
          </div>
          <div className="flex items-center gap-4 flex-1 min-h-0">
            <div className="w-[130px] h-[130px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={58}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryDist.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any, name: any) => [v, name]}
                    contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[140px]">
              {categoryDist.map((entry, idx) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  <span className="text-xs text-gray-600 truncate">{entry.name}</span>
                  <span className="text-xs text-gray-400 font-medium ml-auto">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, author, or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:border-indigo-400 outline-none"
            title="From date"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:border-indigo-400 outline-none"
            title="To date"
          />
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(""); setToDate(""); }} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
              Clear
            </button>
          )}
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

      {/* ── Filter Chips ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {costTypes.map((ct) => {
          const count = ct === "All" ? events.length : events.filter((e) => e.eventCostType === ct).length;
          return (
            <button
              key={ct}
              onClick={() => setCostFilter(ct)}
              className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all capitalize ${
                costFilter === ct
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-700"
              }`}
            >
              {ct}
              <span className={`ml-1 text-xs ${costFilter === ct ? "text-indigo-200" : "text-gray-400"}`}>{count}</span>
            </button>
          );
        })}

        <span className="w-px h-5 bg-gray-200 mx-1 self-center" />

        {categories.slice(0, 8).map((cat) => {
          const count = cat === "All" ? events.length : events.filter((e) => (e.category ?? []).includes(cat)).length;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                categoryFilter === cat
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {cat}
              <span className="ml-0.5 text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── No Results ── */}
      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-sm text-gray-500">No events match your current filters</p>
          <button
            onClick={() => { setSearch(""); setCostFilter("All"); setCategoryFilter("All"); setFromDate(""); setToDate(""); }}
            className="mt-2 text-xs text-indigo-600 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* ── Desktop Table ── */}
      {filtered.length > 0 && (
        <div className="hidden md:block border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortableHeader label="Event Date" field="schedule" />
                  <SortableHeader label="Title" field="title" />
                  <SortableHeader label="Author" field="author" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Categories</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Type</th>
                  <SortableHeader label="Price" field="price" />
                  <SortableHeader label="Registrations" field="registrations" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((e) => {
                  const isPaid = e.eventCostType === "Paid";
                  const regs = getRegCount(e);
                  const isUpcoming = new Date(e.schedule) > new Date();
                  return (
                    <tr
                      key={e._id}
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/admin/events/allevents/${e._id}`)}
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-xs text-gray-900 font-medium">{fmt(e.schedule)}</div>
                        <span className={`mt-0.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          isUpcoming
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : "bg-gray-50 text-gray-500 border border-gray-200"
                        }`}>
                          {isUpcoming ? "Upcoming" : "Past"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[220px]">
                        <div className="font-medium text-sm text-gray-900 truncate">{e.title}</div>
                        <div className="text-xs text-gray-400 truncate">{e.language ?? ""}</div>
                      </td>
                      <td className="px-4 py-3.5 max-w-[150px]">
                        <span className="text-sm text-gray-700 truncate block">{e.authorData?.name ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {(e.category ?? []).slice(0, 2).map((c) => (
                            <span key={c} className="inline-block px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {c}
                            </span>
                          ))}
                          {(e.category ?? []).length > 2 && (
                            <span className="text-[10px] text-gray-400">+{e.category.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                          isPaid
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          {e.eventCostType ?? "Free"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {isPaid ? fmtCurrency(e.price) : "Free"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-sm font-medium text-gray-900">{regs}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 max-w-[140px]">
                        {e.location ? (
                          <div className="flex items-center gap-1 text-xs text-gray-600 truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{e.location}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Globe className="w-3 h-3" />
                            Online
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Mobile Cards ── */}
      {filtered.length > 0 && (
        <div className="md:hidden space-y-3">
          {filtered.map((e) => {
            const isPaid = e.eventCostType === "Paid";
            const regs = getRegCount(e);
            const isUpcoming = new Date(e.schedule) > new Date();
            return (
              <div
                key={e._id}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm cursor-pointer"
                onClick={() => router.push(`/dashboard/admin/events/allevents/${e._id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-800 truncate">{e.title}</h3>
                    <p className="text-xs text-gray-400 truncate">{e.authorData?.name ?? "—"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                    <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-semibold ${
                      isPaid ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {isPaid ? fmtCurrency(e.price) : "Free"}
                    </span>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      isUpcoming ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-500"
                    }`}>
                      {isUpcoming ? "Upcoming" : "Past"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-3">
                  <div>
                    <span className="text-gray-400 block">Date</span>
                    <span className="text-gray-800 font-medium">{fmt(e.schedule)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Registrations</span>
                    <span className="text-gray-800 font-medium">{regs}</span>
                  </div>
                  {e.location && (
                    <div className="col-span-2">
                      <span className="text-gray-400 block">Location</span>
                      <span className="text-gray-700 truncate block">{e.location}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  {(e.category ?? []).slice(0, 3).map((c) => (
                    <span key={c} className="inline-block px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-700">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
