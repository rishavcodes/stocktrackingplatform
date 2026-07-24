"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Download,
  CreditCard,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  ExternalLink,
  TrendingUp,
  BarChart2,
  RefreshCw,
  XCircle,
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
  Legend,
} from "recharts";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type TradeboxPlan = {
  _id: string;
  orderdBy?: { name: string; id: string; email: string };
  purchasedBy?: string;
  email?: string;
  plan: string; // "Prepaid" | "Postpaid"
  planName?: string;
  serviceName?: string;
  amount: number;
  GST?: number;
  gst?: number;
  total: number;
  duration: number;
  startDate?: string;
  endDate?: string;
  isExpired: boolean;
  status: string;
  invoiceLink?: string;
  createdAt: string;
  // Prepaid-specific
  freshOnboardingCharge?: number;
  renewalCharge?: number;
  customerLimit?: number;
  // Postpaid-specific
  oneTimesetupFee?: number;
  pricingType?: string;
};

type SortKey = "createdAt" | "name" | "planName" | "plan" | "total" | "status" | "duration";
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
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active:    { label: "Active",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  approved:  { label: "Approved",  cls: "bg-blue-50 text-blue-700 border-blue-200" },
  pending:   { label: "Pending",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
  processed: { label: "Processed", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  rejected:  { label: "Rejected",  cls: "bg-red-50 text-red-700 border-red-200" },
  inactive:  { label: "Inactive",  cls: "bg-gray-100 text-gray-600 border-gray-200" },
  expired:   { label: "Expired",   cls: "bg-orange-50 text-orange-700 border-orange-200" },
};

function getEffectiveStatus(plan: TradeboxPlan): string {
  if (plan.isExpired) return "expired";
  return plan.status?.toLowerCase() || "unknown";
}

const PLAN_COLORS: Record<string, string> = {
  Prepaid:  "#10b981",
  Postpaid: "#6366f1",
};

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
// Main Component
// ─────────────────────────────────────────────────────────────

export default function TradeboxPlansTab({
  plans,
  isLoading,
}: {
  plans: TradeboxPlan[];
  isLoading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [planTypeFilter, setPlanTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ── Derived filter options ──
  const planTypes = useMemo(() => {
    const types = new Set(plans.map((p) => p.plan).filter(Boolean));
    return ["All", ...Array.from(types).sort()];
  }, [plans]);

  const statuses = useMemo(() => {
    const s = new Set(plans.map((p) => getEffectiveStatus(p)));
    return ["All", ...Array.from(s).sort()];
  }, [plans]);

  // ── Filter + sort ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...plans]
      .filter((p) => {
        const name = p.orderdBy?.name ?? p.purchasedBy ?? "";
        const email = p.orderdBy?.email ?? p.email ?? "";
        const planName = p.serviceName ?? p.planName ?? "";
        const matchSearch =
          !q ||
          name.toLowerCase().includes(q) ||
          email.toLowerCase().includes(q) ||
          planName.toLowerCase().includes(q);
        const matchType =
          planTypeFilter === "All" || p.plan === planTypeFilter;
        const matchStatus =
          statusFilter === "All" || getEffectiveStatus(p) === statusFilter;
        const planDate = new Date(p.createdAt);
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(new Date(toDate).setHours(23, 59, 59, 999)) : null;
        const matchDate = (!from || planDate >= from) && (!to || planDate <= to);
        return matchSearch && matchType && matchStatus && matchDate;
      })
      .sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortKey) {
          case "name":
            aVal = a.orderdBy?.name ?? a.purchasedBy ?? "";
            bVal = b.orderdBy?.name ?? b.purchasedBy ?? "";
            break;
          case "planName":
            aVal = a.serviceName ?? a.planName ?? "";
            bVal = b.serviceName ?? b.planName ?? "";
            break;
          case "plan": aVal = a.plan; bVal = b.plan; break;
          case "total": aVal = a.total; bVal = b.total; break;
          case "duration": aVal = a.duration; bVal = b.duration; break;
          case "status":
            aVal = getEffectiveStatus(a);
            bVal = getEffectiveStatus(b);
            break;
          default:
            aVal = new Date(a.createdAt).getTime();
            bVal = new Date(b.createdAt).getTime();
        }
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        }
        return sortDir === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
  }, [plans, search, planTypeFilter, statusFilter, fromDate, toDate, sortKey, sortDir]);

  // ── Analytics ──
  const totalRevenue = useMemo(
    () => plans.reduce((s, p) => s + (Number(p.total) || 0), 0),
    [plans]
  );
  const activePlans = useMemo(() => plans.filter((p) => !p.isExpired && p.status === "active").length, [plans]);
  const expiredPlans = useMemo(() => plans.filter((p) => p.isExpired).length, [plans]);
  const pendingPlans = useMemo(() => plans.filter((p) => p.status === "pending").length, [plans]);
  const prepaidCount = useMemo(() => plans.filter((p) => p.plan === "Prepaid").length, [plans]);
  const postpaidCount = useMemo(() => plans.filter((p) => p.plan === "Postpaid").length, [plans]);

  // Revenue by plan type (bar chart)
  const revenueByType = useMemo(() => {
    const map: Record<string, number> = {};
    plans.forEach((p) => {
      map[p.plan] = (map[p.plan] || 0) + (Number(p.total) || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [plans]);

  // Status distribution (pie chart)
  const statusDist = useMemo(() => {
    const map: Record<string, number> = {};
    plans.forEach((p) => {
      const s = getEffectiveStatus(p);
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [plans]);

  const PIE_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444", "#94a3b8", "#f97316"];

  // ── Sort toggle ──
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ── Export ──
  const handleExport = () => {
    const rows = filtered.map((p) => ({
      "Subscriber": p.orderdBy?.name ?? p.purchasedBy ?? "—",
      "Email": p.orderdBy?.email ?? p.email ?? "—",
      "Plan Name": p.serviceName ?? p.planName ?? "—",
      "Plan Type": p.plan,
      "Amount (excl. GST)": p.amount,
      "GST": p.GST ?? p.gst ?? 0,
      "Total": p.total,
      "Duration (days)": p.duration,
      "Start Date": fmt(p.startDate),
      "End Date": fmt(p.endDate),
      "Status": getEffectiveStatus(p),
      "Expired": p.isExpired ? "Yes" : "No",
      "Customer Limit": p.customerLimit ?? "—",
      "Fresh Onboarding Charge": p.freshOnboardingCharge ?? "—",
      "Renewal Charge": p.renewalCharge ?? "—",
      "One-time Setup Fee": p.oneTimesetupFee ?? "—",
      "Pricing Type": p.pricingType ?? "—",
      "Invoice": p.invoiceLink ?? "—",
      "Subscribed On": fmt(p.createdAt),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tradebox Plans");
    XLSX.writeFile(wb, `Tradebox_Plans_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // ── Sortable header ──
  function SortableHeader({ label, field }: { label: string; field: SortKey }) {
    return (
      <th
        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap"
        onClick={() => toggleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <ArrowUpDown className={`w-3 h-3 ${sortKey === field ? "text-emerald-600" : "text-gray-300"}`} />
        </span>
      </th>
    );
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading Tradebox plans…</p>
      </div>
    );
  }

  if (!plans.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <CreditCard className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700">No plans found</h3>
          <p className="text-sm text-gray-400 mt-1">Tradebox subscription plans will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard label="Total Plans" value={plans.length.toLocaleString()} icon={CreditCard} color="bg-indigo-50 text-indigo-600" />
        <KpiCard
          label="Total Revenue"
          value={`₹${(totalRevenue / 100000).toFixed(1)}L`}
          sub={fmtCurrency(totalRevenue)}
          icon={DollarSign}
          color="bg-emerald-50 text-emerald-600"
        />
        <KpiCard label="Active" value={activePlans.toLocaleString()} sub="currently active" icon={CheckCircle2} color="bg-green-50 text-green-600" />
        <KpiCard label="Expired" value={expiredPlans.toLocaleString()} sub="plans expired" icon={XCircle} color="bg-orange-50 text-orange-600" />
        <KpiCard label="Pending" value={pendingPlans.toLocaleString()} sub="awaiting approval" icon={Clock} color="bg-amber-50 text-amber-600" />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue by Plan Type */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-700">Revenue by Plan Type</h3>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={revenueByType} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
              />
              <Tooltip
                formatter={(v: any) => [fmtCurrency(v), "Revenue"]}
                contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {revenueByType.map((entry, idx) => (
                  <Cell key={idx} fill={PLAN_COLORS[entry.name] ?? "#94a3b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Type vs Status Donut */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-gray-700">Status Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={statusDist}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
              >
                {statusDist.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: any, name: any) => [v, name]}
                contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb" }}
              />
              <Legend
                formatter={(value) => <span className="text-xs text-gray-600 capitalize">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Plan Type + Prepaid/Postpaid info ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Prepaid Plans</p>
            <p className="text-2xl font-bold text-gray-900">{prepaidCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Postpaid Plans</p>
            <p className="text-2xl font-bold text-gray-900">{postpaidCount}</p>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or plan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range */}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:border-emerald-400 outline-none"
            title="From date"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:border-emerald-400 outline-none"
            title="To date"
          />
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(""); setToDate(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
            >
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

      {/* ── Plan Type Chips ── */}
      <div className="flex flex-wrap gap-2">
        {planTypes.map((t) => {
          const count = t === "All" ? plans.length : plans.filter((p) => p.plan === t).length;
          return (
            <button
              key={t}
              onClick={() => setPlanTypeFilter(t)}
              className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all ${
                planTypeFilter === t
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-700"
              }`}
            >
              {t} <span className={`ml-1 text-xs ${planTypeFilter === t ? "text-indigo-200" : "text-gray-400"}`}>{count}</span>
            </button>
          );
        })}
        <span className="w-px h-6 bg-gray-200 self-center mx-1" />
        {statuses.map((s) => {
          const meta = s === "All" ? null : STATUS_META[s];
          const count = s === "All" ? plans.length : plans.filter((p) => getEffectiveStatus(p) === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all capitalize ${
                statusFilter === s
                  ? meta
                    ? `${meta.cls} border-current font-semibold`
                    : "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s === "All" ? "All Status" : meta?.label ?? s} <span className="ml-0.5 text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── No Results ── */}
      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-sm text-gray-500">No plans match your current filters</p>
          <button
            onClick={() => { setSearch(""); setPlanTypeFilter("All"); setStatusFilter("All"); setFromDate(""); setToDate(""); }}
            className="mt-2 text-xs text-emerald-600 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* ── Desktop Table ── */}
      {filtered.length > 0 && (
        <div className="hidden md:block border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortableHeader label="Date" field="createdAt" />
                  <SortableHeader label="Provider" field="name" />
                  <SortableHeader label="Plan" field="planName" />
                  {/* <SortableHeader label="Type" field="plan" /> */}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">GST</th>
                  <SortableHeader label="Total" field="total" />
                  {/* <SortableHeader label="Duration" field="duration" /> */}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Period</th>
                  <SortableHeader label="Status" field="status" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => {
                  const status = getEffectiveStatus(p);
                  const meta = STATUS_META[status] ?? STATUS_META.inactive;
                  const gstAmt = p.GST ?? p.gst ?? 0;
                  const planName = p.serviceName ?? p.planName ?? p.plan ?? "—";
                  const buyerName = p.orderdBy?.name ?? p.purchasedBy ?? "—";
                  const buyerEmail = p.orderdBy?.email ?? p.email ?? "";
                  return (
                    <tr key={p._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-gray-500">{fmt(p.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[180px]">
                        <div className="font-medium text-sm text-gray-900 truncate">{buyerName}</div>
                        <div className="text-xs text-gray-400 truncate">{buyerEmail}</div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-700 whitespace-nowrap">{planName}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-700 whitespace-nowrap">{fmtCurrency(p.amount)}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">{fmtCurrency(gstAmt)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{fmtCurrency(p.total)}</span>
                      </td>
                      {/* <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                        {p.duration ? `${p.duration}d` : "—"}
                      </td> */}
                      <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                        {p.startDate || p.endDate
                          ? `${fmt(p.startDate)} – ${fmt(p.endDate)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border ${meta.cls}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {p.invoiceLink ? (
                          <a
                            href={p.invoiceLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> View
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
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
          {filtered.map((p) => {
            const status = getEffectiveStatus(p);
            const meta = STATUS_META[status] ?? STATUS_META.inactive;
            const gstAmt = p.GST ?? p.gst ?? 0;
            const planName = p.serviceName ?? p.planName ?? p.plan ?? "—";
            const buyerName = p.orderdBy?.name ?? p.purchasedBy ?? "—";
            const buyerEmail = p.orderdBy?.email ?? p.email ?? "";
            return (
              <div
                key={p._id}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-800 truncate">{buyerName}</h3>
                    <p className="text-xs text-gray-500 truncate">{buyerEmail}</p>
                  </div>
                  <span className={`ml-3 inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border flex-shrink-0 ${meta.cls}`}>
                    {meta.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-3">
                  <div>
                    <span className="text-gray-400 block">Plan</span>
                    <span className="text-gray-800 font-medium">{planName}</span>
                  </div>
                  {/* <div>
                    <span className="text-gray-400 block">Type</span>
                    <span
                      className="font-semibold"
                      style={{ color: PLAN_COLORS[p.plan] ?? "#6b7280" }}
                    >
                      {p.plan}
                    </span>
                  </div> */}
                  <div>
                    <span className="text-gray-400 block">Amount</span>
                    <span className="text-gray-800 font-medium">{fmtCurrency(p.amount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">GST</span>
                    <span className="text-gray-800 font-medium">{fmtCurrency(gstAmt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Total</span>
                    <span className="text-gray-900 font-bold">{fmtCurrency(p.total)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Duration</span>
                    <span className="text-gray-800 font-medium">{p.duration ? `${p.duration} days` : "—"}</span>
                  </div>
                  {(p.startDate || p.endDate) && (
                    <div className="col-span-2">
                      <span className="text-gray-400 block">Period</span>
                      <span className="text-gray-700">{fmt(p.startDate)} – {fmt(p.endDate)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{fmt(p.createdAt)}</span>
                  {p.invoiceLink ? (
                    <a
                      href={p.invoiceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> Invoice
                    </a>
                  ) : (
                    <span className="text-xs text-gray-300">No invoice</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
