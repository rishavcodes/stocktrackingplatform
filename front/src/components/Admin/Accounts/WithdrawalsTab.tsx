"use client";

import { useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import useSWR, { mutate as globalMutate } from "swr";
import * as XLSX from "xlsx";
import {
  Search,
  Download,
  DollarSign,
  ArrowUpDown,
  TrendingUp,
  BarChart2,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowDownToLine,
  Users,
  Activity,
  Eye,
  CheckCircle,
  X,
  ExternalLink,
  Loader2,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import fetcher from "@/lib/data/setup";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type Withdrawal = {
  _id: string;
  name: string;
  email: string;
  amount: number;
  spId: string;
  processedStatus: "pending" | "approved" | "processed" | "rejected";
  referenceNo?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
};

type PaymentDetailsResponse = {
  success: boolean;
  message?: string;
  data?: {
    type: string;
    paymentDetails?: {
      _id?: string;
      __v?: number;
      bankName?: string;
      beneficiaryName?: string;
      accNumber?: string;
      ifsc?: string;
      upi?: string;
      qrCode?: string;
    };
  };
};

type SortKey = "createdAt" | "name" | "email" | "amount" | "processedStatus";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "pending" | "approved" | "processed" | "rejected";

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

const STATUS_META: Record<string, { label: string; cls: string; dotCls: string }> = {
  pending:   { label: "Pending",   cls: "bg-amber-50 text-amber-700 border-amber-200",     dotCls: "bg-amber-500" },
  approved:  { label: "Approved",  cls: "bg-blue-50 text-blue-700 border-blue-200",         dotCls: "bg-blue-500" },
  processed: { label: "Processed", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dotCls: "bg-emerald-500" },
  rejected:  { label: "Rejected",  cls: "bg-red-50 text-red-700 border-red-200",             dotCls: "bg-red-500" },
};

const PIE_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#3b82f6",
  processed: "#10b981",
  rejected: "#ef4444",
};

const PIE_ORDER = ["pending", "approved", "processed", "rejected"];

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
// Account Details Dialog
// ─────────────────────────────────────────────────────────────

function AccountDetailsDialog({ spId }: { spId: string }) {
  const { data: response, isLoading, error } = useSWR<PaymentDetailsResponse>(
    spId ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/get/paymentdetails?id=${spId}` : null,
    fetcher
  );

  const details = response?.data?.paymentDetails;
  const notFound = response && !response.success;

  const fields: { label: string; value?: string }[] = [
    { label: "Bank Name", value: details?.bankName },
    { label: "Beneficiary Name", value: details?.beneficiaryName },
    { label: "Account Number", value: details?.accNumber },
    { label: "IFSC Code", value: details?.ifsc },
    { label: "UPI ID", value: details?.upi },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors" title="View account details">
          <Eye className="w-3.5 h-3.5" />
          Details
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">Account Details</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : notFound || error ? (
          <div className="text-center py-8 text-sm text-gray-500">
            {response?.message ?? "No account details found"}
          </div>
        ) : !details ? (
          <div className="text-center py-8 text-sm text-gray-500">No payment details configured</div>
        ) : (
          <div className="space-y-3 mt-2">
            {fields.map((f) => {
              if (!f.value) return null;
              return (
                <div key={f.label} className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-500 flex-shrink-0">{f.label}</span>
                  <span className="text-sm font-medium text-gray-900 text-right break-all">{f.value}</span>
                </div>
              );
            })}
            {details.qrCode && (
              <div className="pt-2">
                <span className="text-sm text-gray-500 block mb-2">QR Code</span>
                <img src={details.qrCode} alt="QR Code" className="w-full max-w-[200px] rounded-lg border border-gray-200" />
                <a
                  href={details.qrCode}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Full
                </a>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Approve/Reject Dialog
// ─────────────────────────────────────────────────────────────

function ApproveRejectDialog({ withdrawal, token }: { withdrawal: Withdrawal; token: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const action = async (actionType: "approve" | "reject") => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/withdrawal/${actionType}`,
        {
          method: "POST",
          body: JSON.stringify({ id: withdrawal._id }),
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        }
      );
      if (res.status !== 200) throw new Error();
      toast({ title: "Success", description: `Withdrawal ${actionType}d` });
      PIE_ORDER.forEach((s) =>
        globalMutate(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/withdrawal/requests?type=${s}`)
      );
    } catch {
      toast({ title: "Error", description: `Failed to ${actionType} withdrawal`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
          Action
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-900">
            Approve / Reject withdrawal for {withdrawal.name}?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500 mt-1">Amount: {fmtCurrency(withdrawal.amount)}</p>
        <div className="flex gap-3 mt-4">
          <button
            disabled={loading}
            onClick={() => action("approve")}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </button>
          <button
            disabled={loading}
            onClick={() => action("reject")}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <X className="w-4 h-4" />
            Reject
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Process Dialog
// ─────────────────────────────────────────────────────────────

function ProcessDialog({ withdrawal, token }: { withdrawal: Withdrawal; token: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  const handleProcess = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/withdrawal/process`,
        {
          method: "POST",
          body: JSON.stringify({ id: withdrawal._id, referenceNo, notes }),
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        }
      );
      if (res.status !== 200) throw new Error();
      toast({ title: "Success", description: "Withdrawal processed" });
      PIE_ORDER.forEach((s) =>
        globalMutate(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/withdrawal/requests?type=${s}`)
      );
    } catch {
      toast({ title: "Error", description: "Failed to process withdrawal", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">
          Process
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-900">
            Process withdrawal for {withdrawal.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Reference Number</label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Enter reference number"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
              rows={3}
              placeholder="Optional notes"
            />
          </div>
          <button
            disabled={loading}
            onClick={handleProcess}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Process Withdrawal
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function WithdrawalsTab({ token }: { token: string }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const headers = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  const mkUrl = (type: string) =>
    token ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/withdrawal/requests?type=${type}` : null;

  const { data: pendingRaw, isLoading: l1 } = useSWR<{ data: Withdrawal[] }>(
    mkUrl("pending"), (url: string) => fetcher(url, { headers })
  );
  const { data: approvedRaw, isLoading: l2 } = useSWR<{ data: Withdrawal[] }>(
    mkUrl("approved"), (url: string) => fetcher(url, { headers })
  );
  const { data: processedRaw, isLoading: l3 } = useSWR<{ data: Withdrawal[] }>(
    mkUrl("processed"), (url: string) => fetcher(url, { headers })
  );
  const { data: rejectedRaw, isLoading: l4 } = useSWR<{ data: Withdrawal[] }>(
    mkUrl("rejected"), (url: string) => fetcher(url, { headers })
  );

  const isLoading = l1 || l2 || l3 || l4;

  const allWithdrawals = useMemo(() => [
    ...(pendingRaw?.data ?? []),
    ...(approvedRaw?.data ?? []),
    ...(processedRaw?.data ?? []),
    ...(rejectedRaw?.data ?? []),
  ], [pendingRaw, approvedRaw, processedRaw, rejectedRaw]);

  // ── Counts per status ──
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, approved: 0, processed: 0, rejected: 0 };
    allWithdrawals.forEach((w) => { counts[w.processedStatus] = (counts[w.processedStatus] || 0) + 1; });
    return counts;
  }, [allWithdrawals]);

  // ── Filter + Sort ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...allWithdrawals]
      .filter((w) => {
        const matchSearch =
          !q ||
          w.name.toLowerCase().includes(q) ||
          w.email.toLowerCase().includes(q) ||
          w.spId.toLowerCase().includes(q);
        const matchStatus = statusFilter === "all" || w.processedStatus === statusFilter;
        const wDate = new Date(w.createdAt);
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(new Date(toDate).setHours(23, 59, 59, 999)) : null;
        const matchDate = (!from || wDate >= from) && (!to || wDate <= to);
        return matchSearch && matchStatus && matchDate;
      })
      .sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortKey) {
          case "name": aVal = a.name; bVal = b.name; break;
          case "email": aVal = a.email; bVal = b.email; break;
          case "amount": aVal = a.amount; bVal = b.amount; break;
          case "processedStatus": aVal = a.processedStatus; bVal = b.processedStatus; break;
          default: aVal = new Date(a.createdAt).getTime(); bVal = new Date(b.createdAt).getTime();
        }
        if (typeof aVal === "number" && typeof bVal === "number")
          return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        return sortDir === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
  }, [allWithdrawals, search, statusFilter, fromDate, toDate, sortKey, sortDir]);

  // ── Analytics ──
  const totalAmount = useMemo(() => allWithdrawals.reduce((s, w) => s + (Number(w.amount) || 0), 0), [allWithdrawals]);
  const processedAmount = useMemo(
    () => allWithdrawals.filter((w) => w.processedStatus === "processed").reduce((s, w) => s + (Number(w.amount) || 0), 0),
    [allWithdrawals]
  );
  const pendingAmount = useMemo(
    () => allWithdrawals.filter((w) => w.processedStatus === "pending").reduce((s, w) => s + (Number(w.amount) || 0), 0),
    [allWithdrawals]
  );
  const uniqueProviders = useMemo(() => new Set(allWithdrawals.map((w) => w.spId)).size, [allWithdrawals]);

  // Top requesters
  const topRequesters = useMemo(() => {
    const map: Record<string, number> = {};
    allWithdrawals.forEach((w) => { map[w.name] = (map[w.name] || 0) + (Number(w.amount) || 0); });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name: name.trim().split(" ")[0], value }));
  }, [allWithdrawals]);

  // Status pie
  const statusDist = useMemo(
    () => PIE_ORDER.map((s) => ({ name: s, value: statusCounts[s] || 0 })).filter((d) => d.value > 0),
    [statusCounts]
  );

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
    const rows = filtered.map((w) => ({
      Date: fmt(w.createdAt),
      Name: w.name,
      Email: w.email,
      Amount: Number(w.amount).toFixed(2),
      Status: w.processedStatus,
      "SP ID": w.spId,
      "Reference No": w.referenceNo ?? "—",
      Notes: w.notes ?? "—",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Withdrawals");
    XLSX.writeFile(wb, `Withdrawals_${new Date().toISOString().split("T")[0]}.xlsx`);
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
          <ArrowUpDown className={`w-3 h-3 ${sortKey === field ? "text-orange-600" : "text-gray-300"}`} />
        </span>
      </th>
    );
  }

  // ── Loading ──
  if (isLoading && !allWithdrawals.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading withdrawals…</p>
      </div>
    );
  }

  if (!allWithdrawals.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center">
          <ArrowDownToLine className="w-8 h-8 text-orange-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700">No withdrawals found</h3>
          <p className="text-sm text-gray-400 mt-1">Withdrawal requests will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Total Requests"
          value={allWithdrawals.length.toLocaleString()}
          icon={Activity}
          color="bg-orange-50 text-orange-600"
        />
        <KpiCard
          label="Total Amount"
          value={fmtCurrency(totalAmount)}
          icon={DollarSign}
          color="bg-violet-50 text-violet-600"
        />
        <KpiCard
          label="Pending"
          value={statusCounts.pending.toLocaleString()}
          sub={fmtCurrency(pendingAmount)}
          icon={Clock}
          color="bg-amber-50 text-amber-600"
        />
        <KpiCard
          label="Processed"
          value={statusCounts.processed.toLocaleString()}
          sub={fmtCurrency(processedAmount)}
          icon={CheckCircle2}
          color="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          label="Rejected"
          value={statusCounts.rejected.toLocaleString()}
          icon={XCircle}
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-gray-700">Top Requesters by Amount</h3>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={topRequesters} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: any) => [fmtCurrency(v), "Amount"]}
                contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}
              />
              <Bar dataKey="value" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-700">Status Distribution</h3>
          </div>
          <div className="flex items-center gap-4 flex-1 min-h-0">
            <div className="w-[130px] h-[130px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={58}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusDist.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any, name: any) => [v, name]}
                    contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5">
              {statusDist.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[entry.name] }} />
                  <span className="text-xs text-gray-600 capitalize">{entry.name}</span>
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
            placeholder="Search by name, email, or SP ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:border-orange-400 outline-none"
            title="From date"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:border-orange-400 outline-none"
            title="To date"
          />
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(""); setToDate(""); }} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
              Clear
            </button>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full">
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

      {/* ── Status Filter Chips ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {(["all", ...PIE_ORDER] as StatusFilter[]).map((s) => {
          const count = s === "all" ? allWithdrawals.length : statusCounts[s] ?? 0;
          const meta = s !== "all" ? STATUS_META[s] : null;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all capitalize ${
                statusFilter === s
                  ? meta
                    ? `${meta.cls} border-current font-semibold`
                    : "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-700"
              }`}
            >
              {s === "all" ? "All" : meta?.label ?? s}
              <span className={`ml-1 text-xs ${statusFilter === s ? "opacity-70" : "text-gray-400"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── No Results ── */}
      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-sm text-gray-500">No withdrawals match your current filters</p>
          <button
            onClick={() => { setSearch(""); setStatusFilter("all"); setFromDate(""); setToDate(""); }}
            className="mt-2 text-xs text-orange-600 hover:underline"
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
                  <SortableHeader label="Name" field="name" />
                  <SortableHeader label="Email" field="email" />
                  <SortableHeader label="Amount" field="amount" />
                  <SortableHeader label="Status" field="processedStatus" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Actions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Account
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((w) => {
                  const meta = STATUS_META[w.processedStatus] ?? STATUS_META.pending;
                  return (
                    <tr key={w._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-gray-500">{fmt(w.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[180px]">
                        <div className="font-medium text-sm text-gray-900 truncate">{w.name}</div>
                        <div className="text-xs text-gray-400 truncate">{w.spId}</div>
                      </td>
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <span className="text-sm text-gray-700 truncate block">{w.email}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{fmtCurrency(w.amount)}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${meta.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dotCls}`} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {w.processedStatus === "pending" && (
                          <ApproveRejectDialog withdrawal={w} token={token} />
                        )}
                        {w.processedStatus === "approved" && (
                          <ProcessDialog withdrawal={w} token={token} />
                        )}
                        {w.processedStatus === "processed" && w.referenceNo && (
                          <span className="text-xs text-gray-500">Ref: {w.referenceNo}</span>
                        )}
                        {w.processedStatus === "rejected" && (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <AccountDetailsDialog spId={w.spId} />
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
          {filtered.map((w) => {
            const meta = STATUS_META[w.processedStatus] ?? STATUS_META.pending;
            return (
              <div key={w._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-800 truncate">{w.name}</h3>
                    <p className="text-xs text-gray-400 truncate">{w.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                    <span className="text-sm font-bold text-gray-900">{fmtCurrency(w.amount)}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${meta.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dotCls}`} />
                      {meta.label}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-3">
                  <div>
                    <span className="text-gray-400 block">Date</span>
                    <span className="text-gray-800 font-medium">{fmt(w.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">SP ID</span>
                    <span className="text-gray-800 font-medium truncate block">{w.spId}</span>
                  </div>
                  {w.referenceNo && (
                    <div className="col-span-2">
                      <span className="text-gray-400 block">Reference</span>
                      <span className="text-gray-700">{w.referenceNo}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
                  <AccountDetailsDialog spId={w.spId} />
                  <div className="flex items-center gap-2">
                    {w.processedStatus === "pending" && <ApproveRejectDialog withdrawal={w} token={token} />}
                    {w.processedStatus === "approved" && <ProcessDialog withdrawal={w} token={token} />}
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
