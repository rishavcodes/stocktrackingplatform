"use client";

import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Download,
  DollarSign,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  BarChart2,
  RefreshCw,
  Users,
  Activity,
  ArrowDownUp,
  CheckCircle2,
  Hash,
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

type RATransaction = {
  _id: string;
  serviceProviderId?: string;
  providerName?: string;
  orderId?: string;
  paymentId?: string;
  amount?: number;
  type?: string;
  remarks?: string;
  createdAt: string;
};

type SortKey = "createdAt" | "providerName" | "type" | "amount" | "paymentId";
type SortDir = "asc" | "desc";
type AmountFilter = "all" | "credit" | "debit";

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

const PIE_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444", "#0891b2", "#8b5cf6", "#94a3b8"];

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

export default function RATransactionsTab({
  data,
  isLoading,
}: {
  data: RATransaction[];
  isLoading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [amountFilter, setAmountFilter] = useState<AmountFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ── Derived filter options ──
  const transactionTypes = useMemo(() => {
    const t = new Set(data.map((d) => d.type).filter(Boolean) as string[]);
    return ["All", ...Array.from(t).sort()];
  }, [data]);

  // ── Filter + Sort ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...data]
      .filter((t) => {
        const provider = t.providerName ?? "";
        const payId = t.paymentId ?? "";
        const remarks = t.remarks ?? "";
        const matchSearch =
          !q ||
          provider.toLowerCase().includes(q) ||
          payId.toLowerCase().includes(q) ||
          remarks.toLowerCase().includes(q);
        const matchType = typeFilter === "All" || t.type === typeFilter;
        const matchAmount =
          amountFilter === "all" ||
          (amountFilter === "credit" && (t.amount ?? 0) > 0) ||
          (amountFilter === "debit" && (t.amount ?? 0) < 0);
        const txDate = new Date(t.createdAt);
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(new Date(toDate).setHours(23, 59, 59, 999)) : null;
        const matchDate = (!from || txDate >= from) && (!to || txDate <= to);
        return matchSearch && matchType && matchAmount && matchDate;
      })
      .sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortKey) {
          case "providerName":
            aVal = a.providerName ?? "";
            bVal = b.providerName ?? "";
            break;
          case "type":
            aVal = a.type ?? "";
            bVal = b.type ?? "";
            break;
          case "amount":
            aVal = Number(a.amount) || 0;
            bVal = Number(b.amount) || 0;
            break;
          case "paymentId":
            aVal = a.paymentId ?? "";
            bVal = b.paymentId ?? "";
            break;
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
  }, [data, search, typeFilter, amountFilter, fromDate, toDate, sortKey, sortDir]);

  // ── Analytics ──
  const totalCredits = useMemo(
    () => data.filter((t) => (t.amount ?? 0) > 0).reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [data]
  );
  const totalDebits = useMemo(
    () => data.filter((t) => (t.amount ?? 0) < 0).reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0),
    [data]
  );
  const netAmount = useMemo(() => totalCredits - totalDebits, [totalCredits, totalDebits]);
  const uniqueProviders = useMemo(
    () => new Set(data.map((t) => t.serviceProviderId).filter(Boolean)).size,
    [data]
  );
  const avgTransaction = useMemo(() => {
    const positives = data.filter((t) => (t.amount ?? 0) > 0);
    if (!positives.length) return 0;
    return positives.reduce((s, t) => s + (Number(t.amount) || 0), 0) / positives.length;
  }, [data]);

  // Top providers by volume
  const topProviders = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((t) => {
      const name = t.providerName ?? "Unknown";
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name: name.trim().split(" ")[0], value }));
  }, [data]);

  // Transaction type distribution
  const typeDist = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((t) => {
      const tp = t.type ?? "unknown";
      map[tp] = (map[tp] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [data]);

  // Revenue by type
  const revenueByType = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((t) => {
      const tp = t.type ?? "unknown";
      map[tp] = (map[tp] || 0) + (Number(t.amount) || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [data]);

  // ── Sort toggle ──
  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  // ── Export ──
  const handleExport = useCallback(() => {
    const rows = filtered.map((t) => ({
      Date: fmt(t.createdAt),
      "Service Provider": t.providerName ?? "—",
      "Provider ID": t.serviceProviderId ?? "—",
      "Transaction Type": t.type ?? "—",
      Amount: Number(t.amount ?? 0).toFixed(2),
      "Payment ID": t.paymentId ?? "—",
      Remarks: t.remarks ?? "—",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RA Transactions");
    XLSX.writeFile(wb, `RA_Transactions_${new Date().toISOString().split("T")[0]}.xlsx`);
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
          <ArrowUpDown className={`w-3 h-3 ${sortKey === field ? "text-blue-600" : "text-gray-300"}`} />
        </span>
      </th>
    );
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading RA transactions…</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
          <BarChart2 className="w-8 h-8 text-blue-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700">No transactions found</h3>
          <p className="text-sm text-gray-400 mt-1">RA wallet transactions will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label="Total Transactions"
          value={data.length.toLocaleString()}
          icon={Activity}
          color="bg-blue-50 text-blue-600"
        />
        <KpiCard
          label="Total Credits"
          value={`₹${(totalCredits / 100000).toFixed(1)}L`}
          sub={fmtCurrency(totalCredits)}
          icon={TrendingUp}
          color="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          label="Total Debits"
          value={`₹${(totalDebits / 100000).toFixed(1)}L`}
          sub={fmtCurrency(totalDebits)}
          icon={TrendingDown}
          color="bg-red-50 text-red-600"
        />
        <KpiCard
          label="Net Amount"
          value={fmtCurrency(netAmount)}
          sub={netAmount >= 0 ? "positive" : "negative"}
          icon={DollarSign}
          color="bg-violet-50 text-violet-600"
        />
        <KpiCard
          label="Unique Providers"
          value={uniqueProviders.toLocaleString()}
          sub="active RAs"
          icon={Users}
          color="bg-indigo-50 text-indigo-600"
        />
        <KpiCard
          label="Avg Credit"
          value={fmtCurrency(avgTransaction)}
          sub="per transaction"
          icon={ArrowDownUp}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-700">Top Providers by Volume</h3>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={topProviders} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: any) => [v, "Transactions"]}
                contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-700">Transaction Types</h3>
          </div>
          <div className="flex items-center gap-4 flex-1 min-h-0">
            <div className="w-[130px] h-[130px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={58}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {typeDist.map((_, idx) => (
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
              {typeDist.map((entry, idx) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-xs text-gray-600 capitalize truncate">{entry.name}</span>
                  <span className="text-xs text-gray-400 font-medium ml-auto">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Amount by Type strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {revenueByType.map((item) => {
          const isGreen = /^(manual[\s-]*topup|topup)$/i.test(item.name.trim());
          return (
            <div key={item.name} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isGreen ? "#d1fae5" : "#fee2e2" }}
              >
                <Hash className="w-5 h-5" style={{ color: isGreen ? "#059669" : "#dc2626" }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{item.name}</p>
                <p className="text-xl font-bold text-gray-900">
                  {fmtCurrency(Math.abs(item.value))}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by provider, payment ID, or remarks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:border-blue-400 outline-none"
            title="From date"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:border-blue-400 outline-none"
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
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
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

      {/* ── Filter Chips Row ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {transactionTypes.map((t) => {
          const count = t === "All" ? data.length : data.filter((d) => d.type === t).length;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all capitalize ${
                typeFilter === t
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700"
              }`}
            >
              {t}
              <span className={`ml-1 text-xs ${typeFilter === t ? "text-blue-200" : "text-gray-400"}`}>{count}</span>
            </button>
          );
        })}

        <span className="w-px h-5 bg-gray-200 mx-1 self-center" />

        {/* {(
          [
            { key: "all", label: "All Amounts" },
            { key: "credit", label: "Credits Only" },
            { key: "debit", label: "Debits Only" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setAmountFilter(opt.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              amountFilter === opt.key
                ? opt.key === "credit"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : opt.key === "debit"
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))} */}
      </div>

      {/* ── No Results ── */}
      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-sm text-gray-500">No transactions match your current filters</p>
          <button
            onClick={() => {
              setSearch("");
              setTypeFilter("All");
              setAmountFilter("all");
              setFromDate("");
              setToDate("");
            }}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* ── Desktop Table ── */}
      {filtered.length > 0 && (
        <div className="hidden md:block border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortableHeader label="Date" field="createdAt" />
                  <SortableHeader label="Service Provider" field="providerName" />
                  <SortableHeader label="Type" field="type" />
                  <SortableHeader label="Amount" field="amount" />
                  <SortableHeader label="Payment ID" field="paymentId" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => {
                  const amt = Number(t.amount) || 0;
                  const isGreenType = /^(manual[\s-]*topup|topup)$/i.test((t.type ?? "").trim());
                  return (
                    <tr key={t._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-gray-500">{fmt(t.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <div className="font-medium text-sm text-gray-900 truncate">{t.providerName ?? "—"}</div>
                        <div className="text-xs text-gray-400 truncate">{t.serviceProviderId ?? ""}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                          {t.type ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${isGreenType ? "text-emerald-600" : "text-red-600"}`}>
                          {isGreenType ? "+" : "-"}
                          {fmtCurrency(Math.abs(amt))}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[180px]">
                        <span className="text-xs text-gray-600 truncate block">{t.paymentId ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <span className="text-xs text-gray-500 truncate block">{t.remarks ?? "—"}</span>
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
          {filtered.map((t) => {
            const amt = Number(t.amount) || 0;
            const isGreenType = /^(manual[\s-]*topup|topup)$/i.test((t.type ?? "").trim());
            return (
              <div key={t._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-800 truncate">{t.providerName ?? "—"}</h3>
                    <p className="text-xs text-gray-400 truncate">{t.serviceProviderId ?? ""}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                    <span className={`text-sm font-bold ${isGreenType ? "text-emerald-600" : "text-red-600"}`}>
                      {isGreenType ? "+" : "-"}
                      {fmtCurrency(Math.abs(amt))}
                    </span>
                    <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 capitalize">
                      {t.type ?? "—"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-3">
                  <div>
                    <span className="text-gray-400 block">Payment ID</span>
                    <span className="text-gray-800 font-medium truncate block">{t.paymentId ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Date</span>
                    <span className="text-gray-800 font-medium">{fmt(t.createdAt)}</span>
                  </div>
                  {t.remarks && (
                    <div className="col-span-2">
                      <span className="text-gray-400 block">Remarks</span>
                      <span className="text-gray-700 truncate block">{t.remarks}</span>
                    </div>
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
