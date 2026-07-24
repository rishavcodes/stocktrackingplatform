"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";
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
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Download,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  BarChart3,
  Trash2,
} from "lucide-react";

type LeadUser = { id: string; name: string; email: string; number: string };

type Lead = {
  _id: string;
  type: "service" | "portfolio";
  status: string;
  serviceId: string;
  serviceName: string;
  providerId: string;
  providerName: string;
  user: LeadUser;
  createdAt: string;
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  initiated:           { label: "Initiated",        color: "bg-gray-100 text-gray-600" },
  logged_in:           { label: "Logged In",         color: "bg-blue-100 text-blue-700" },
  added_to_cart:       { label: "Added to Cart",     color: "bg-indigo-100 text-indigo-700" },
  esign_started:       { label: "eSign Started",     color: "bg-amber-100 text-amber-700" },
  esign_completed:     { label: "eSign Done",        color: "bg-yellow-100 text-yellow-700" },
  checkout_started:    { label: "Checkout",          color: "bg-orange-100 text-orange-700" },
  payment_success:     { label: "Payment Success",   color: "bg-emerald-100 text-emerald-700" },
  payment_failed:      { label: "Payment Failed",    color: "bg-red-100 text-red-700" },
  converted:           { label: "Converted",         color: "bg-green-100 text-green-700" },
  abandoned:           { label: "Abandoned",         color: "bg-rose-100 text-rose-700" },
};

const PIE_COLORS = ["#6366f1", "#10b981"];

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(d: string) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function KPICard({ label, value, sub, icon: Icon, bg, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; bg: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-indigo-600 font-bold">{payload[0].value} leads</p>
    </div>
  );
};

type SortKey = "user" | "providerName" | "serviceName" | "type" | "status" | "createdAt";
type SortDir = "asc" | "desc";

export default function ContactLeadsPage() {
  const session = useSession();
  const [data, setData] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    const token = session.data?.user?.backendToken || (session.data as any)?.backendToken;
    if (!token) return;

    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/contactleads`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => { if (res?.data) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session.data]);

  // ── KPIs ──
  const total = data.length;
  const converted = useMemo(() => data.filter((l) => l.status === "converted" || l.status === "payment_success").length, [data]);
  const abandoned = useMemo(() => data.filter((l) => l.status === "abandoned" || l.status === "payment_failed").length, [data]);
  const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : "0.0";

  // ── Status breakdown ──
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((l) => { counts[l.status] = (counts[l.status] || 0) + 1; });
    return Object.entries(counts)
      .map(([status, count]) => ({ name: STATUS_META[status]?.label ?? status, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  // ── Type pie ──
  const typePie = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((l) => {
      const t = l.type === "portfolio" ? "Portfolio" : "Service";
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data]);

  // ── Top 5 RAs by lead count ──
  // Group on providerId (id), not name, so two SPs with the same name don't
  // collide. Falls back to "Unknown" when providerName is missing on the
  // record so the chart still renders rather than dropping the row.
  const topRAs = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    data.forEach((l) => {
      const id = l.providerId || "unknown";
      if (!counts[id]) counts[id] = { name: l.providerName || "Unknown", count: 0 };
      counts[id].count += 1;
    });
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [data]);

  // ── Monthly leads trend (last 12 months) ──
  // sortKey pins each bucket to the first day of its month so chronological
  // sort survives the toLocaleDateString round-trip.
  const monthlyLeads = useMemo(() => {
    const buckets: Record<string, { month: string; sortKey: number; count: number }> = {};
    data.forEach((l) => {
      if (!l.createdAt) return;
      const d = new Date(l.createdAt);
      if (isNaN(d.getTime())) return;
      const month = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      const sortKey = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      if (!buckets[month]) buckets[month] = { month, sortKey, count: 0 };
      buckets[month].count += 1;
    });
    return Object.values(buckets)
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-12)
      .map(({ month, count }) => ({ month, count }));
  }, [data]);

  // ── Status filter options ──
  const allStatuses = useMemo(
    () => ["All", ...Array.from(new Set(data.map((l) => l.status))).sort()],
    [data]
  );

  // ── Filtered + sorted ──
  const processed = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = data.filter((l) => {
      const matchSearch =
        l.user?.name?.toLowerCase().includes(q) ||
        l.user?.email?.toLowerCase().includes(q) ||
        l.providerName?.toLowerCase().includes(q) ||
        l.serviceName?.toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || l.status === statusFilter;
      const matchType = typeFilter === "All" || l.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
    return [...filtered].sort((a, b) => {
      let av = "", bv = "";
      if (sortKey === "user") { av = a.user?.name ?? ""; bv = b.user?.name ?? ""; }
      else if (sortKey === "createdAt") { av = a.createdAt ?? ""; bv = b.createdAt ?? ""; }
      else { av = (a as any)[sortKey] ?? ""; bv = (b as any)[sortKey] ?? ""; }
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [data, search, statusFilter, typeFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const handleDelete = async (leadId: string) => {
    if (!window.confirm("Delete this lead? This cannot be undone.")) return;
    const token =
      session.data?.user?.backendToken || (session.data as any)?.backendToken;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/contactleads/${leadId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        alert(json?.message ?? "Failed to delete lead");
        return;
      }
      // Optimistically drop the row so the table updates without a refetch.
      setData((prev) => prev.filter((l) => String(l._id) !== leadId));
    } catch {
      alert("Failed to delete lead");
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(processed.map((l) => ({
      "User Name": l.user?.name,
      "User Email": l.user?.email,
      "User Phone": l.user?.number,
      Provider: l.providerName,
      "Service / Portfolio": l.serviceName,
      Type: l.type,
      Status: STATUS_META[l.status]?.label ?? l.status,
      Date: formatDate(l.createdAt),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `Contact_Leads_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 text-indigo-500" />
      : <ArrowDown className="w-3 h-3 text-indigo-500" />;
  };

  const Th = ({ label, field, align = "left" }: { label: string; field: SortKey; align?: "left" | "right" }) => (
    <th
      className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 whitespace-nowrap text-${align}`}
      onClick={() => toggleSort(field)}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end w-full" : ""}`}>
        {label} <SortIcon field={field} />
      </span>
    </th>
  );

  if (loading || session.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading leads…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            Contact Leads
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">User funnel activity across all service providers</p>
        </div>
        <button
          onClick={exportToExcel}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Leads" value={total.toLocaleString()} icon={Users} bg="bg-indigo-50" color="text-indigo-600" />
        <KPICard
          label="Converted"
          value={converted.toLocaleString()}
          sub={`${conversionRate}% conversion rate`}
          icon={CheckCircle2}
          bg="bg-emerald-50" color="text-emerald-600"
        />
        <KPICard
          label="Abandoned / Failed"
          value={abandoned.toLocaleString()}
          sub={`${total > 0 ? ((abandoned / total) * 100).toFixed(1) : 0}% of total`}
          icon={XCircle}
          bg="bg-red-50" color="text-red-500"
        />
        <KPICard
          label="Active (In Funnel)"
          value={(total - converted - abandoned).toLocaleString()}
          sub="not yet converted or lost"
          icon={BarChart3}
          bg="bg-amber-50" color="text-amber-600"
        />
      </div>

      {/* ── Charts ── */}
      {data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Funnel stage bar */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Leads by Funnel Stage</h3>
            <p className="text-xs text-gray-400 mb-4">How many leads are at each stage</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusBreakdown} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Type pie */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Lead Type</h3>
            <p className="text-xs text-gray-400 mb-2">Service vs Portfolio</p>
            <div className="flex-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={typePie} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={4} dataKey="value">
                    {typePie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [(v as number).toLocaleString(), name as string]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {typePie.map((t, i) => (
                <div key={t.name} className="text-center p-2.5 rounded-xl" style={{ background: `${PIE_COLORS[i]}18` }}>
                  <p className="text-base font-bold" style={{ color: PIE_COLORS[i] }}>{t.value}</p>
                  <p className="text-xs text-gray-500">{t.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Monthly Leads + Top 5 RAs ── */}
      {(monthlyLeads.length > 0 || topRAs.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Monthly Leads Trend */}
          {monthlyLeads.length > 0 && (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Monthly Leads</h3>
              <p className="text-xs text-gray-400 mb-4">New leads per month (last 12 months)</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyLeads} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#leadsGradient)"
                    dot={{ r: 3, fill: "#6366f1" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top 5 RAs by lead count */}
          {topRAs.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Top 5 RAs</h3>
              <p className="text-xs text-gray-400 mb-4">By number of leads</p>
              <div className="space-y-3 flex-1">
                {topRAs.map((ra, i) => {
                  const max = topRAs[0]?.count || 1;
                  const pct = (ra.count / max) * 100;
                  const rankColors = [
                    "bg-amber-100 text-amber-700",
                    "bg-gray-100 text-gray-600",
                    "bg-orange-100 text-orange-700",
                    "bg-indigo-50 text-indigo-600",
                    "bg-indigo-50 text-indigo-600",
                  ];
                  return (
                    <div key={ra.name + i} className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${rankColors[i]}`}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 truncate pr-2">
                            {ra.name}
                          </span>
                          <span className="text-xs font-bold text-gray-900 flex-shrink-0">
                            {ra.count}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">All Leads</h3>
              <p className="text-xs text-gray-400">{processed.length} of {total} lead{total !== 1 ? "s" : ""}</p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search user, provider or service…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
          </div>
          {/* Filter chips */}
          <div className="flex flex-wrap gap-2">
            {["All", "service", "portfolio"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all ${
                  typeFilter === t
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                }`}
              >
                {t === "All" ? "All Types" : t === "service" ? "Services" : "Portfolios"}
              </button>
            ))}
            <div className="w-px h-6 bg-gray-200 self-center mx-1" />
            {allStatuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all ${
                  statusFilter === s
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {s === "All" ? "All Statuses" : STATUS_META[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>

        {processed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <TrendingUp className="w-10 h-10 text-gray-200" />
            <p className="text-sm text-gray-400">No leads found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <Th label="Date" field="createdAt" />
                  <Th label="Customer Name" field="user" />
                  <Th label="RA" field="providerName" />
                  <Th label="Plan / Portfolio" field="serviceName" />
                  <Th label="Type" field="type" />
                  <Th label="Status" field="status" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {processed.map((lead) => {
                  const statusMeta = STATUS_META[lead.status] ?? { label: lead.status, color: "bg-gray-100 text-gray-600" };
                  const initials = lead.user?.name?.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

                  return (
                    <tr key={lead._id.toString()} className="hover:bg-gray-50/60 transition-colors">
                      {/* Date */}
                      <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                        {formatDateTime(lead.createdAt)}
                      </td>
                      {/* Customer Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-indigo-600">{initials}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate max-w-[130px]">{lead.user?.name || "—"}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[130px]">{lead.user?.email || "—"}</p>
                          </div>
                        </div>
                      </td>
                      {/* RA (Provider) */}
                      <td className="px-4 py-3.5 text-sm text-gray-700 truncate max-w-[140px]">
                        {lead.providerName || <span className="text-gray-300">—</span>}
                      </td>
                      {/* Plan / Portfolio */}
                      <td className="px-4 py-3.5 text-sm text-gray-600 truncate max-w-[160px]">
                        {lead.serviceName || <span className="text-gray-300">—</span>}
                      </td>
                      {/* Type */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          lead.type === "portfolio" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {lead.type === "portfolio" ? "Portfolio" : "Service"}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      {/* Action — delete the lead */}
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleDelete(String(lead._id))}
                          title="Delete lead"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
