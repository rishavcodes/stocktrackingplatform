"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Download,
  ShoppingCart,
  DollarSign,
  CheckCircle2,
  ArrowUpDown,
  ExternalLink,
  TrendingUp,
  BarChart2,
  XCircle,
  RefreshCw,
  Shield,
  MessageSquare,
  FileCheck,
  Users,
  Tag,
  RotateCcw,
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
import RegenerateInvoiceModal from "./RegenerateInvoiceModal";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ServiceSale = {
  _id: string;
  orderId?: string;
  paymentId?: string;
  subscribedToId?: string;
  serviceName?: string;
  orderdBy?: { name: string; id: string; email: string };
  purchasedBy?: string;
  soldBy?: { name: string; id: string };
  soldByName?: string;
  subtotal?: number;
  amount?: number;
  gst?: number;
  total?: number;
  paymentMethod?: string;
  isExpired?: boolean;
  validity?: string;
  type?: string; // "service" | "portfolio"
  signedDocumentUrl?: string;
  paymentProof?: string | null;
  verifiedByRa?: boolean;
  kycDetails?: {
    panNumber?: string;
    dob?: string;
    kycDate?: string;
  } | null;
  startDate?: string;
  endDate?: string;
  telegramInviteLink?: string;
  telegramInviteLinks?: { serviceId?: string; serviceName?: string; link?: string }[];
  isRenewal?: boolean;
  isRenewed?: boolean;
  coupon?: string | null;
  discountAmount?: number;
  paymentStatus?: string;
  telegramRemoved?: boolean;
  invoiceLink?: string;
  createdAt: string;
};

type WalletTransaction = {
  _id: string;
  serviceProviderId?: string;
  orderId?: string;
  paymentId?: string;
  amount?: number;
  type?: string;
  remarks?: string;
  createdAt: string;
};

type SortKey = "createdAt" | "buyer" | "provider" | "serviceName" | "total" | "status" | "paymentStatus" | "paymentMethod";
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

// Stored `subtotal` is the post-discount (GST base) amount; the invoice shows the
// pre-discount price. Reconstruct it the same way generateInvoicePDF does
// (subtotal + discountAmount) so the dashboard matches the invoice PDF.
function displaySubtotal(s: ServiceSale): number {
  const base = Number(s.subtotal ?? s.amount ?? 0);
  return base + Number(s.discountAmount ?? 0);
}

const PAYMENT_STATUS_META: Record<string, { label: string; cls: string }> = {
  verified:  { label: "Verified",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending:   { label: "Pending",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
  rejected:  { label: "Rejected",  cls: "bg-red-50 text-red-700 border-red-200" },
  failed:    { label: "Failed",    cls: "bg-red-50 text-red-700 border-red-200" },
};

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  service:   { label: "Service",   color: "#6366f1", bg: "#e0e7ff" },
  portfolio: { label: "Portfolio", color: "#0891b2", bg: "#cffafe" },
};

const PIE_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444", "#94a3b8", "#0891b2"];

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

export default function ServicesSoldTab({
  sales,
  isLoading,
  walletTransactions = [],
  token,
  onInvoiceRegenerated,
}: {
  sales: ServiceSale[];
  isLoading: boolean;
  walletTransactions?: WalletTransaction[];
  token?: string;
  onInvoiceRegenerated?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");
  const [raVerifiedFilter, setRaVerifiedFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openTgPopoverId, setOpenTgPopoverId] = useState<string | null>(null);
  const tgPopoverRef = useRef<HTMLDivElement | null>(null);
  const [regenSale, setRegenSale] = useState<ServiceSale | null>(null);

  const copyTelegram = useCallback((id: string, link: string) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
    });
  }, []);

  useEffect(() => {
    if (!openTgPopoverId) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (tgPopoverRef.current && !tgPopoverRef.current.contains(e.target as Node)) {
        setOpenTgPopoverId(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenTgPopoverId(null);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openTgPopoverId]);

  // ── Derived filter options ──
  const types = useMemo(() => {
    const t = new Set(sales.map((s) => s.type).filter(Boolean) as string[]);
    return ["All", ...Array.from(t).sort()];
  }, [sales]);

  const paymentStatuses = useMemo(() => {
    const s = new Set(sales.map((s) => s.paymentStatus).filter(Boolean) as string[]);
    return ["All", ...Array.from(s).sort()];
  }, [sales]);

  const walletTxByOrderId = useMemo(() => {
    const map = new Map<string, WalletTransaction[]>();
    walletTransactions.forEach((tx) => {
      if (!tx.orderId) return;
      const key = String(tx.orderId);
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    });
    map.forEach((list) => list.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    }));
    return map;
  }, [walletTransactions]);

  const getWalletTxForSale = useCallback((sale: ServiceSale) => {
    const keys = [sale._id, sale.orderId].filter(Boolean).map(String);
    for (const key of keys) {
      const list = walletTxByOrderId.get(key);
      if (list?.length) return list;
    }
    return undefined;
  }, [walletTxByOrderId]);

  // ── Filter + sort ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...sales]
      .filter((s) => {
        const buyer = s.orderdBy?.name ?? s.purchasedBy ?? "";
        const email = s.orderdBy?.email ?? "";
        const provider = s.soldBy?.name ?? s.soldByName ?? "";
        const serviceName = s.serviceName ?? "";
        const matchSearch =
          !q ||
          buyer.toLowerCase().includes(q) ||
          email.toLowerCase().includes(q) ||
          provider.toLowerCase().includes(q) ||
          serviceName.toLowerCase().includes(q);
        const matchType = typeFilter === "All" || s.type === typeFilter;
        const matchPayment = paymentStatusFilter === "All" || s.paymentStatus === paymentStatusFilter;
        const matchRa =
          raVerifiedFilter === "All" ||
          (raVerifiedFilter === "verified" && s.verifiedByRa) ||
          (raVerifiedFilter === "not_verified" && !s.verifiedByRa);
        const saleDate = new Date(s.createdAt);
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(new Date(toDate).setHours(23, 59, 59, 999)) : null;
        const matchDate = (!from || saleDate >= from) && (!to || saleDate <= to);
        return matchSearch && matchType && matchPayment && matchRa && matchDate;
      })
      .sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortKey) {
          case "buyer":
            aVal = a.orderdBy?.name ?? a.purchasedBy ?? "";
            bVal = b.orderdBy?.name ?? b.purchasedBy ?? "";
            break;
          case "provider":
            aVal = a.soldBy?.name ?? a.soldByName ?? "";
            bVal = b.soldBy?.name ?? b.soldByName ?? "";
            break;
          case "serviceName": aVal = a.serviceName ?? ""; bVal = b.serviceName ?? ""; break;
          case "total":
            aVal = Number(a.total) || 0;
            bVal = Number(b.total) || 0;
            break;
          case "paymentStatus": aVal = a.paymentStatus ?? ""; bVal = b.paymentStatus ?? ""; break;
          case "paymentMethod": aVal = a.paymentMethod ?? ""; bVal = b.paymentMethod ?? ""; break;
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
  }, [sales, search, typeFilter, paymentStatusFilter, raVerifiedFilter, fromDate, toDate, sortKey, sortDir]);

  // ── Analytics ──
  const totalRevenue = useMemo(
    () => sales.reduce((s, p) => s + (Number(p.total) || 0), 0),
    [sales]
  );
  const activeSales = useMemo(() => sales.filter((s) => !s.isExpired).length, [sales]);
  const raVerified  = useMemo(() => sales.filter((s) => s.verifiedByRa).length, [sales]);
  const kycDone     = useMemo(() => sales.filter((s) => !!s.kycDetails).length, [sales]);
  const renewals    = useMemo(() => sales.filter((s) => s.isRenewal).length, [sales]);
  const withDiscount = useMemo(() => sales.filter((s) => (s.discountAmount ?? 0) > 0).length, [sales]);

  // Revenue by type
  const revenueByType = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach((s) => {
      const t = s.type ?? "unknown";
      map[t] = (map[t] || 0) + (Number(s.total) || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [sales]);

  // Sales by provider (top 8)
  const salesByProvider = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach((s) => {
      const name = s.soldBy?.name ?? s.soldByName ?? "Unknown";
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name: name.trim().split(" ")[0], value }));
  }, [sales]);

  // Payment status distribution
  const paymentDist = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach((s) => {
      const ps = s.paymentStatus ?? "unknown";
      map[ps] = (map[ps] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [sales]);

  // ── Sort toggle ──
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  // ── Export ──
  const handleExport = () => {
    const rows = filtered.map((s) => ({
      "Date":             fmt(s.createdAt),
      "Buyer":            s.orderdBy?.name ?? s.purchasedBy ?? "—",
      "Buyer Email":      s.orderdBy?.email ?? "—",
      "Service Provider": s.soldBy?.name ?? s.soldByName ?? "—",
      "Service Name":     s.serviceName ?? "—",
      "Type":             s.type ?? "—",
      "Subtotal":         displaySubtotal(s),
      "GST":              s.gst ?? 0,
      "Total":            s.total ?? 0,
      "Wallet Deduction": (() => {
        const tx = getWalletTxForSale(s)?.[0];
        return tx?.amount ?? "—";
      })(),
      "Wallet Tx Type": (() => {
        const tx = getWalletTxForSale(s)?.[0];
        return tx?.type ?? "—";
      })(),
      "Wallet Tx Date": (() => {
        const tx = getWalletTxForSale(s)?.[0];
        return tx ? fmt(tx.createdAt) : "—";
      })(),
      "Discount":         s.discountAmount ?? 0,
      "Coupon":           s.coupon ?? "—",
      "Payment Method":   s.paymentMethod ?? "—",
      "Payment Status":   s.paymentStatus ?? "—",
      "Start Date":       fmt(s.startDate),
      "End Date":         fmt(s.endDate),
      "Expired":          s.isExpired ? "Yes" : "No",
      "RA Verified":      s.verifiedByRa ? "Yes" : "No",
      "KYC Done":         s.kycDetails ? "Yes" : "No",
      "KYC PAN":          s.kycDetails?.panNumber ?? "—",
      "KYC DOB":          s.kycDetails?.dob ?? "—",
      "Is Renewal":       s.isRenewal ? "Yes" : "No",
      "Telegram Removed": s.telegramRemoved ? "Yes" : "No",
      "Signed Doc":       s.signedDocumentUrl ?? "—",
      "Invoice":          s.invoiceLink ?? "—",
      "Telegram Link":
        s.telegramInviteLinks?.length
          ? s.telegramInviteLinks
              .map((t) => `${t.serviceName ?? "—"}: ${t.link ?? "—"}`)
              .join(" | ")
          : (s.telegramInviteLink ?? "—"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Services Sold");
    XLSX.writeFile(wb, `Services_Sold_${new Date().toISOString().split("T")[0]}.xlsx`);
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
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading services sold…</p>
      </div>
    );
  }

  if (!sales.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
          <ShoppingCart className="w-8 h-8 text-violet-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700">No sales found</h3>
          <p className="text-sm text-gray-400 mt-1">Service sales will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label="Total Sales"
          value={sales.length.toLocaleString()}
          icon={ShoppingCart}
          color="bg-violet-50 text-violet-600"
        />
        <KpiCard
          label="Total Revenue"
          value={`₹${(totalRevenue / 100000).toFixed(1)}L`}
          sub={fmtCurrency(totalRevenue)}
          icon={DollarSign}
          color="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          label="Active"
          value={activeSales.toLocaleString()}
          sub="not expired"
          icon={CheckCircle2}
          color="bg-green-50 text-green-600"
        />
        <KpiCard
          label="RA Verified"
          value={raVerified.toLocaleString()}
          sub={`${Math.round((raVerified / (sales.length || 1)) * 100)}% of total`}
          icon={Shield}
          color="bg-blue-50 text-blue-600"
        />
        <KpiCard
          label="KYC Done"
          value={kycDone.toLocaleString()}
          sub={`${Math.round((kycDone / (sales.length || 1)) * 100)}% of total`}
          icon={FileCheck}
          color="bg-indigo-50 text-indigo-600"
        />
        <KpiCard
          label="Renewals"
          value={renewals.toLocaleString()}
          sub={`${withDiscount} with discount`}
          icon={RotateCcw}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Providers by Sales */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-gray-700">Top Providers by Sales</h3>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={salesByProvider} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: any) => [v, "Sales"]}
                contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Status Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-700">Payment Status</h3>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={paymentDist}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
              >
                {paymentDist.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: any, name: any) => [v, name]}
                contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb" }}
              />
              <Legend formatter={(value) => <span className="text-xs text-gray-600 capitalize">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Revenue by Type strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {revenueByType.map((item) => {
          const meta = TYPE_META[item.name] ?? { label: item.name, color: "#6b7280", bg: "#f3f4f6" };
          return (
            <div key={item.name} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                <Tag className="w-5 h-5" style={{ color: meta.color }} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{meta.label} Revenue</p>
                <p className="text-xl font-bold text-gray-900">{fmtCurrency(item.value)}</p>
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
            placeholder="Search by buyer, provider, or service…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:border-violet-400 outline-none"
            title="From date"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:border-violet-400 outline-none"
            title="To date"
          />
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(""); setToDate(""); }} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
              Clear
            </button>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 px-3 py-1.5 rounded-full">
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
        {/* Type */}
        {types.map((t) => {
          const count = t === "All" ? sales.length : sales.filter((s) => s.type === t).length;
          const meta = t !== "All" ? TYPE_META[t] : null;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all capitalize ${
                typeFilter === t
                  ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-700"
              }`}
            >
              {meta?.label ?? t}
              <span className={`ml-1 text-xs ${typeFilter === t ? "text-violet-200" : "text-gray-400"}`}>{count}</span>
            </button>
          );
        })}

        <span className="w-px h-5 bg-gray-200 mx-1 self-center" />

        {/* Payment Status */}
        {paymentStatuses.map((ps) => {
          const meta = PAYMENT_STATUS_META[ps];
          const count = ps === "All" ? sales.length : sales.filter((s) => s.paymentStatus === ps).length;
          return (
            <button
              key={ps}
              onClick={() => setPaymentStatusFilter(ps)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all capitalize ${
                paymentStatusFilter === ps
                  ? meta
                    ? `${meta.cls} border-current font-semibold`
                    : "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {ps === "All" ? "All Payments" : meta?.label ?? ps}
              <span className="ml-0.5 text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}

        <span className="w-px h-5 bg-gray-200 mx-1 self-center" />

        {/* RA Verified */}
        {[
          { key: "All", label: "All RA" },
          { key: "verified", label: "RA Verified" },
          { key: "not_verified", label: "Not Verified" },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setRaVerifiedFilter(opt.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              raVerifiedFilter === opt.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── No Results ── */}
      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-sm text-gray-500">No sales match your current filters</p>
          <button
            onClick={() => { setSearch(""); setTypeFilter("All"); setPaymentStatusFilter("All"); setRaVerifiedFilter("All"); setFromDate(""); setToDate(""); }}
            className="mt-2 text-xs text-violet-600 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* ── Desktop Table ── */}
      {filtered.length > 0 && (
        <div className="hidden md:block border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortableHeader label="Date" field="createdAt" />
                  <SortableHeader label="Buyer" field="buyer" />
                  <SortableHeader label="Provider" field="provider" />
                  <SortableHeader label="Service" field="serviceName" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Subtotal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">GST</th>
                  <SortableHeader label="Total" field="total" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Wallet Deduction</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Period</th>
                  <SortableHeader label="Pay Method" field="paymentMethod" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Verified</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">KYC</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s) => {
                  const payMeta = PAYMENT_STATUS_META[s.paymentStatus ?? ""] ?? { label: s.paymentStatus ?? "—", cls: "bg-gray-50 text-gray-600 border-gray-200" };
                  const typeMeta = TYPE_META[s.type ?? ""] ?? { label: s.type ?? "—", color: "#6b7280", bg: "#f3f4f6" };
                  const buyer = s.orderdBy?.name ?? s.purchasedBy ?? "—";
                  const buyerEmail = s.orderdBy?.email ?? "";
                  const provider = s.soldBy?.name ?? s.soldByName ?? "—";
                  const subtotal = displaySubtotal(s);
                  const walletTxList = getWalletTxForSale(s);
                  const walletTx = walletTxList?.[0];
                  return (
                    <tr key={s._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-gray-500">{fmt(s.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[160px]">
                        <div className="font-medium text-sm text-gray-900 truncate">{buyer}</div>
                        <div className="text-xs text-gray-400 truncate">{buyerEmail}</div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-700 max-w-[140px] truncate whitespace-nowrap">{provider}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-700 max-w-[160px] truncate whitespace-nowrap">{s.serviceName ?? "—"}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ background: typeMeta.bg, color: typeMeta.color }}>
                          {typeMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">{fmtCurrency(subtotal)}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">{fmtCurrency(s.gst)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{fmtCurrency(s.total)}</span>
                        {(s.discountAmount ?? 0) > 0 && (
                          <div className="text-[10px] text-emerald-600">-{fmtCurrency(s.discountAmount)} off</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {walletTx ? (
                          <div className="text-xs text-gray-700">
                            <div className="font-semibold text-gray-900">{fmtCurrency(walletTx.amount)}</div>
                            <div className="text-[10px] text-gray-500">{walletTx.type ?? "—"}</div>
                            <div className="text-[10px] text-gray-400">{fmt(walletTx.createdAt)}</div>
                            {walletTxList && walletTxList.length > 1 && (
                              <div className="mt-0.5 text-[10px] text-gray-400">+{walletTxList.length - 1} more</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-xs text-gray-500">
                          {s.startDate || s.endDate ? `${fmt(s.startDate)} – ${fmt(s.endDate)}` : "—"}
                        </div>
                        {s.isExpired ? (
                          <span className="mt-0.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200">
                            Expired
                          </span>
                        ) : (
                          <span className="mt-0.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-sm text-gray-700 capitalize">{s.paymentMethod ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {s.verifiedByRa ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-700">
                            <Shield className="w-3.5 h-3.5" /> Yes
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {s.kycDetails ? (
                          <div className="text-xs text-gray-700">
                            <div className="font-medium">{s.kycDetails.panNumber ?? "—"}</div>
                            <div className="text-gray-400">{s.kycDetails.dob ?? ""}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {s.invoiceLink && (
                            <a href={s.invoiceLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                              <ExternalLink className="w-3 h-3" /> Invoice
                            </a>
                          )}
                          {token && (
                            <button
                              onClick={() => setRegenSale(s)}
                              className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline"
                              title="Edit details and regenerate invoice"
                            >
                              <RotateCcw className="w-3 h-3" /> Regenerate
                            </button>
                          )}
                          {s.signedDocumentUrl && (
                            <a href={s.signedDocumentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                              <FileCheck className="w-3 h-3" /> Doc
                            </a>
                          )}
                          {(() => {
                            const tgLinks = (s.telegramInviteLinks ?? []).filter((t) => !!t?.link);
                            if (tgLinks.length > 0) {
                              const isOpen = openTgPopoverId === s._id;
                              return (
                                <div className="relative" ref={isOpen ? tgPopoverRef : undefined}>
                                  <button
                                    onClick={() => setOpenTgPopoverId((prev) => (prev === s._id ? null : s._id))}
                                    className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 transition-colors"
                                    title="View Telegram invite links for each plan"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                    TG ({tgLinks.length}) ▾
                                  </button>
                                  {isOpen && (
                                    <div className="absolute right-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-md min-w-[240px] max-w-[320px] p-2 whitespace-normal">
                                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-2 pb-1">
                                        Package plans
                                      </div>
                                      <ul className="space-y-1">
                                        {tgLinks.map((t, idx) => {
                                          const copyId = `${s._id}:${idx}`;
                                          return (
                                            <li key={copyId} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50">
                                              <span className="text-xs text-gray-700 truncate" title={t.serviceName ?? ""}>
                                                {t.serviceName ?? "—"}
                                              </span>
                                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <a
                                                  href={t.link!}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-[11px] text-sky-600 hover:underline"
                                                >
                                                  Open
                                                </a>
                                                <button
                                                  onClick={() => copyTelegram(copyId, t.link!)}
                                                  className="text-[11px] text-violet-600 hover:underline"
                                                >
                                                  {copiedId === copyId ? "Copied!" : "Copy"}
                                                </button>
                                              </div>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            if (s.telegramInviteLink) {
                              return (
                                <button
                                  onClick={() => copyTelegram(s._id, s.telegramInviteLink!)}
                                  className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 transition-colors"
                                  title="Copy Telegram invite link"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  {copiedId === s._id ? "Copied!" : "TG"}
                                </button>
                              );
                            }
                            return null;
                          })()}
                        </div>
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
          {filtered.map((s) => {
            const payMeta = PAYMENT_STATUS_META[s.paymentStatus ?? ""] ?? { label: s.paymentStatus ?? "—", cls: "bg-gray-50 text-gray-600 border-gray-200" };
            const typeMeta = TYPE_META[s.type ?? ""] ?? { label: s.type ?? "—", color: "#6b7280", bg: "#f3f4f6" };
            const buyer = s.orderdBy?.name ?? s.purchasedBy ?? "—";
            const buyerEmail = s.orderdBy?.email ?? "";
            const provider = s.soldBy?.name ?? s.soldByName ?? "—";
            const subtotal = displaySubtotal(s);
            const walletTxList = getWalletTxForSale(s);
            const walletTx = walletTxList?.[0];
            return (
              <div key={s._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-800 truncate">{buyer}</h3>
                    <p className="text-xs text-gray-500 truncate">{buyerEmail}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border ${payMeta.cls}`}>
                      {payMeta.label}
                    </span>
                    <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ background: typeMeta.bg, color: typeMeta.color }}>
                      {typeMeta.label}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-3">
                  <div>
                    <span className="text-gray-400 block">Provider</span>
                    <span className="text-gray-800 font-medium truncate">{provider}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Service</span>
                    <span className="text-gray-800 font-medium truncate">{s.serviceName ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Subtotal</span>
                    <span className="text-gray-800 font-medium">{fmtCurrency(subtotal)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">GST</span>
                    <span className="text-gray-800 font-medium">{fmtCurrency(s.gst)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Total</span>
                    <span className="text-gray-900 font-bold">{fmtCurrency(s.total)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Wallet Deduction</span>
                    <span className="text-gray-800 font-medium">
                      {walletTx ? fmtCurrency(walletTx.amount) : "—"}
                    </span>
                    {walletTx?.type && (
                      <span className="block text-[10px] text-gray-500">{walletTx.type}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-400 block">RA Verified</span>
                    <span className={s.verifiedByRa ? "text-blue-700 font-medium" : "text-gray-400"}>{s.verifiedByRa ? "Yes" : "No"}</span>
                  </div>
                  {(s.startDate || s.endDate) && (
                    <div className="col-span-2">
                      <span className="text-gray-400 block">Period</span>
                      <span className="text-gray-700">{fmt(s.startDate)} – {fmt(s.endDate)}</span>
                    </div>
                  )}
                  {s.kycDetails && (
                    <div className="col-span-2">
                      <span className="text-gray-400 block">KYC</span>
                      <span className="text-gray-700">{s.kycDetails.panNumber ?? "—"} · {s.kycDetails.dob ?? ""}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-gray-400">{fmt(s.createdAt)}</span>
                  <div className="flex items-center gap-3">
                    {s.invoiceLink && (
                      <a href={s.invoiceLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600">
                        <ExternalLink className="w-3 h-3" /> Invoice
                      </a>
                    )}
                    {token && (
                      <button
                        onClick={() => setRegenSale(s)}
                        className="inline-flex items-center gap-1 text-xs text-violet-600"
                        title="Edit details and regenerate invoice"
                      >
                        <RotateCcw className="w-3 h-3" /> Regenerate
                      </button>
                    )}
                    {s.signedDocumentUrl && (
                      <a href={s.signedDocumentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600">
                        <FileCheck className="w-3 h-3" /> Doc
                      </a>
                    )}
                    {(() => {
                      const tgLinks = (s.telegramInviteLinks ?? []).filter((t) => !!t?.link);
                      if (tgLinks.length > 0) {
                        return (
                          <div className="w-full flex flex-col gap-1">
                            {tgLinks.map((t, idx) => (
                              <a
                                key={`${s._id}:${idx}`}
                                href={t.link!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-sky-600"
                              >
                                <MessageSquare className="w-3 h-3" /> {t.serviceName ?? "Telegram"}
                              </a>
                            ))}
                          </div>
                        );
                      }
                      if (s.telegramInviteLink) {
                        return (
                          <a href={s.telegramInviteLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-600">
                            <MessageSquare className="w-3 h-3" /> Telegram
                          </a>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {token && (
        <RegenerateInvoiceModal
          sale={regenSale}
          token={token}
          onClose={() => setRegenSale(null)}
          onSuccess={() => onInvoiceRegenerated?.()}
        />
      )}
    </div>
  );
}
