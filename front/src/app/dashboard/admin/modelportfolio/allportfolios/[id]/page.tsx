"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import Image from "next/image";
import { use } from "react";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  ArrowUpDown,
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  Info,
  Layers,
  LineChart,
  List,
  PieChart,
  Search,
  Send,
  Shield,
  Tag,
  Target,
  Ticket,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────

type SubscriberItem = { _id: string; name: string; email: string; phone?: string; createdAt: string };
type OrderItem = {
  _id: string;
  orderdBy: { name: string; id: string; email: string };
  soldBy: { name: string; id: string };
  amount: number;
  subtotal: number;
  gst: number;
  total: number;
  paymentMethod: string;
  startDate: string;
  endDate: string;
  isExpired: boolean;
  paymentStatus: string;
  isRenewal: boolean;
  coupon?: { code: string; type: string; value: number };
  discountAmount: number;
  createdAt: string;
};
type LeadItem = {
  _id: string;
  serviceId: string;
  userId: string;
  userName: string;
  userPhone: string;
  providerId?: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
};
type CouponItem = {
  _id: string;
  code: string;
  description: string;
  discountType: string;
  discount: number;
  startDate: string;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  couponType: string;
};
type ScriptItem = {
  slNo: number;
  exchangeType: string;
  segmentType: string;
  scriptName: { exchange: string; token: string; name: string };
  cmp: number;
  buyRate: number;
  quantity: number;
  weightage: number;
  value: number;
  currentCMP?: number | null;
  initialValue?: number;
  currentValue?: number;
  profitLoss?: number;
  profitLossPercentage?: number;
};
type ClosedPosition = {
  scriptName: { exchange: string; token: string; name: string };
  cmp: number;
  segmentType: string;
  exchangeType: string;
  weightage: number;
  quantity: number;
  buyRate: number;
  value: number;
  investedValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  closedAt: string;
  remarks?: string;
};
type PerformanceEntry = { month: string; value: number; returns?: number; profitLoss?: number };
type DailyHistory = { _id: string; portfolioId: string; date: string; totalValue: number; totalInvestment: number; pnl: number };
type ServiceProviderData = {
  _id: string;
  name: string;
  number?: string;
  email?: string;
  profileUrl?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  regNumber?: string;
  description?: string;
  disclaimer?: string;
};
type PortfolioData = {
  _id: string;
  portfolioName: string;
  theme: string;
  methodology: string;
  benchmarkIndex: string;
  investmentHorizon: number;
  reviewFrequency: number;
  minInvestmentAmount: number;
  feeValidity: string;
  fees: number;
  rationale: string;
  disclosure: string;
  riskLevel: number;
  tncFileURL?: string;
  bannerURL?: string;
  telegramChannelId?: string;
  rebalanceCount: number;
  scripts: ScriptItem[];
  closedPositions?: ClosedPosition[];
  performanceHistory?: PerformanceEntry[];
  subscribedBy?: string[];
  shareWithMarketplaces?: string[];
  Commercials?: {
    yearlyCharge?: number;
    deductionPerSale?: number;
    startDate?: string;
    endDate?: string;
    approvedByAdmin?: boolean;
  };
  riskMetrics?: { standardDeviation?: string; sharpeRatio?: string; maximumDrawdown?: string };
  authorData: { id: string; name: string; email: string };
  launchDate?: string;
  createdAt: string;
  updatedAt?: string;
};

type ApiResponse = {
  success: boolean;
  portfolio: PortfolioData;
  subscribers: SubscriberItem[];
  orders: OrderItem[];
  leads: { total: number; byStatus: Record<string, number>; list: LeadItem[] };
  coupons: CouponItem[];
  marketplaces: { _id: string; name: string }[];
  serviceProvider: ServiceProviderData | null;
  dailyHistory: DailyHistory[];
};

// ─── Helpers ─────────────────────────────────────────────────

function fmt(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtCurrency(n?: number): string {
  if (n == null || isNaN(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Reusable sub-components ─────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${color}`}><Icon className="w-3.5 h-3.5" /></div>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionCard({ icon: Icon, title, children, color = "text-indigo-500" }: { icon: React.ElementType; title: string; children: React.ReactNode; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-4 h-4 ${color}`} />
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

const fetcher = ([url, token]: [string, string]) =>
  fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = useSession();
  const router = useRouter();
  const { id } = use(params);
  const token = session.data?.backendToken ?? "";

  const { data, isLoading } = useSWR<ApiResponse>(
    token ? [`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/portfoliodetails/${id}`, token] : null,
    fetcher
  );
  const portfolio = data?.portfolio;

  // ─── Approve / Reject state ─────────────────────────────
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [updating, setUpdating] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [commercials, setCommercials] = useState({ yearlyCharge: 0, deductionPerSale: 0 });

  React.useEffect(() => {
    if (portfolio?.Commercials) {
      setCommercials({
        yearlyCharge: portfolio.Commercials.yearlyCharge ?? 0,
        deductionPerSale: portfolio.Commercials.deductionPerSale ?? 0,
      });
    }
  }, [portfolio?.Commercials]);

  const handleApprove = async () => {
    try {
      setUpdating(true);
      setActionMsg(null);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/update-commercials?id=${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id, ...commercials, approvedByAdmin: true }),
        }
      );
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Failed to approve");
      }
      setActionMsg({ type: "success", text: "Portfolio approved successfully!" });
      setShowApproveModal(false);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    try {
      setUpdating(true);
      setActionMsg(null);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/update-commercials?id=${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id, approvedByAdmin: false, rejectionReason }),
        }
      );
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Failed to reject");
      }
      setActionMsg({ type: "success", text: "Portfolio rejected successfully!" });
      setShowRejectModal(false);
      setRejectionReason("");
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setUpdating(false);
    }
  };

  // ─── Subscribers table state ────────────────────────────
  const [subSearch, setSubSearch] = useState("");
  const [subSortKey, setSubSortKey] = useState<"name" | "email" | "createdAt">("createdAt");
  const [subSortDir, setSubSortDir] = useState<"asc" | "desc">("desc");
  const toggleSubSort = useCallback((k: "name" | "email" | "createdAt") => {
    if (subSortKey === k) setSubSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSubSortKey(k); setSubSortDir("asc"); }
  }, [subSortKey]);
  const filteredSubs = useMemo(() => {
    const q = subSearch.toLowerCase();
    return [...(data?.subscribers ?? [])]
      .filter((s) => !q || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q))
      .sort((a, b) => {
        let av: any, bv: any;
        if (subSortKey === "name") { av = a.name; bv = b.name; }
        else if (subSortKey === "email") { av = a.email; bv = b.email; }
        else { av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime(); }
        if (typeof av === "number") return subSortDir === "asc" ? av - bv : bv - av;
        return subSortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
  }, [data?.subscribers, subSearch, subSortKey, subSortDir]);

  // ─── Orders table state ─────────────────────────────────
  const [orderSearch, setOrderSearch] = useState("");
  const [orderSortKey, setOrderSortKey] = useState<"buyer" | "total" | "createdAt">("createdAt");
  const [orderSortDir, setOrderSortDir] = useState<"asc" | "desc">("desc");
  const toggleOrderSort = useCallback((k: "buyer" | "total" | "createdAt") => {
    if (orderSortKey === k) setOrderSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setOrderSortKey(k); setOrderSortDir("asc"); }
  }, [orderSortKey]);
  const filteredOrders = useMemo(() => {
    const q = orderSearch.toLowerCase();
    return [...(data?.orders ?? [])]
      .filter((o) => !q || o.orderdBy?.name?.toLowerCase().includes(q) || o.orderdBy?.email?.toLowerCase().includes(q))
      .sort((a, b) => {
        let av: any, bv: any;
        if (orderSortKey === "buyer") { av = a.orderdBy?.name ?? ""; bv = b.orderdBy?.name ?? ""; }
        else if (orderSortKey === "total") { av = a.total; bv = b.total; }
        else { av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime(); }
        if (typeof av === "number") return orderSortDir === "asc" ? av - bv : bv - av;
        return orderSortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
  }, [data?.orders, orderSearch, orderSortKey, orderSortDir]);

  function SortHeader({ label, active, dir, onClick }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }) {
    return (
      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-700 whitespace-nowrap" onClick={onClick}>
        <span className="inline-flex items-center gap-1">{label}<ArrowUpDown className={`w-3 h-3 ${active ? "text-indigo-600" : "text-gray-300"}`} /></span>
      </th>
    );
  }

  // ─── Loading / Error ────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading portfolio details…</p>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <PieChart className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500">Portfolio not found</p>
        <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline">Go back</button>
      </div>
    );
  }

  const sp = data?.serviceProvider;
  const isApproved = portfolio.Commercials?.approvedByAdmin === true;

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* ─── Approve Modal ─── */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Approve Portfolio</h2>
              <p className="text-sm text-gray-500 mt-1">Set commercial terms for approval</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Charge (₹)</label>
                <input type="number" value={commercials.yearlyCharge} onChange={(e) => setCommercials((p) => ({ ...p, yearlyCharge: parseFloat(e.target.value) || 0 }))} className="border border-gray-300 rounded-lg p-2.5 w-full text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deduction Per Sale (₹)</label>
                <input type="number" value={commercials.deductionPerSale} onChange={(e) => setCommercials((p) => ({ ...p, deductionPerSale: parseFloat(e.target.value) || 0 }))} className="border border-gray-300 rounded-lg p-2.5 w-full text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowApproveModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleApprove} disabled={updating} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                  {updating ? "Processing…" : "Confirm Approval"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reject Modal ─── */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Reject Portfolio</h2>
              <p className="text-sm text-gray-500 mt-1">Provide a reason for rejection</p>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why you are rejecting this portfolio…"
                className="border border-gray-300 rounded-lg p-2.5 w-full text-sm h-28 focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowRejectModal(false); setRejectionReason(""); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleReject} disabled={updating || !rejectionReason.trim()} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {updating ? "Processing…" : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 1. Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/admin/modelportfolio/allportfolios")} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{portfolio.portfolioName}</h1>
            <p className="text-sm text-gray-500">{portfolio.theme}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isApproved ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}>
            {isApproved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Approved</> : <><Clock className="w-3.5 h-3.5" /> Pending</>}
          </span>
          <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${
            portfolio.riskLevel <= 3 ? "bg-emerald-50 text-emerald-700" : portfolio.riskLevel <= 6 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
          }`}>
            <Shield className="w-3 h-3" /> Risk: {portfolio.riskLevel}/10
          </span>
        </div>
      </div>

      {/* Action messages */}
      {actionMsg && (
        <div className={`p-3 rounded-xl text-sm font-medium ${actionMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {actionMsg.text}
        </div>
      )}

      {/* ─── 2. Admin Actions ─── */}
      {/* <div className="flex gap-3 flex-wrap">
        <button onClick={() => setShowApproveModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors">
          <CheckCircle2 className="w-4 h-4" /> {isApproved ? "Update Commercials" : "Approve Portfolio"}
        </button>
        <button onClick={() => setShowRejectModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">
          <X className="w-4 h-4" /> Reject Portfolio
        </button>
      </div> */}

      {/* ─── 3. Banner Image ─── */}
      {portfolio.bannerURL && (
        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
          <Image src={portfolio.bannerURL} alt="Portfolio banner" width={1200} height={400} className="w-full h-48 sm:h-64 object-cover" />
        </div>
      )}

      {/* ─── 4. Quick Stats Grid ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Subscribers" value={data?.subscribers?.length ?? 0} color="bg-blue-50 text-blue-600" />
        <StatCard icon={DollarSign} label="Min Investment" value={fmtCurrency(portfolio.minInvestmentAmount)} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={Target} label="Fees" value={`${portfolio.fees}%`} sub={portfolio.feeValidity} color="bg-amber-50 text-amber-600" />
        <StatCard icon={Shield} label="Risk Level" value={`${portfolio.riskLevel}/10`} color="bg-red-50 text-red-600" />
        <StatCard icon={BarChart3} label="Rebalances" value={portfolio.rebalanceCount ?? 0} color="bg-violet-50 text-violet-600" />
        <StatCard icon={Clock} label="Investment Horizon" value={`${portfolio.investmentHorizon} mo`} color="bg-sky-50 text-sky-600" />
        <StatCard icon={Calendar} label="Review Frequency" value={`${portfolio.reviewFrequency} mo`} color="bg-teal-50 text-teal-600" />
        <StatCard icon={List} label="Scripts" value={portfolio.scripts?.length ?? 0} color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={LineChart} label="Closed Positions" value={portfolio.closedPositions?.length ?? 0} color="bg-gray-100 text-gray-600" />
        <StatCard icon={Briefcase} label="Orders" value={data?.orders?.length ?? 0} color="bg-orange-50 text-orange-600" />
      </div>

      {/* ─── 5. Methodology ─── */}
      <SectionCard icon={Info} title="Methodology" color="text-blue-500">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{portfolio.methodology}</p>
      </SectionCard>

      {/* ─── 6. Rationale ─── */}
      <SectionCard icon={FileText} title="Rationale" color="text-emerald-500">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{portfolio.rationale}</p>
      </SectionCard>

      {/* ─── 7. Disclosure ─── */}
      <SectionCard icon={Shield} title="Disclosure" color="text-amber-500">
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{portfolio.disclosure}</p>
      </SectionCard>

      {/* ─── 8. Benchmark & Risk Metrics ─── */}
      <SectionCard icon={BarChart3} title="Benchmark & Risk Metrics" color="text-violet-500">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500">Benchmark Index</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{portfolio.benchmarkIndex}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500">Std. Deviation</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{portfolio.riskMetrics?.standardDeviation || "—"}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500">Sharpe Ratio</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{portfolio.riskMetrics?.sharpeRatio || "—"}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500">Max Drawdown</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{portfolio.riskMetrics?.maximumDrawdown || "—"}</p>
          </div>
        </div>
      </SectionCard>

      {/* ─── 9. Current Holdings (Scripts) ─── */}
      {(portfolio.scripts?.length ?? 0) > 0 && (
        <SectionCard icon={List} title={`Current Holdings (${portfolio.scripts.length})`} color="text-indigo-500">
          <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Script</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Exchange</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Segment</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Buy Rate</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Weightage</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {portfolio.scripts.map((s, i) => (
                    <tr key={i} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 text-xs text-gray-500">{s.slNo ?? i + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.scriptName?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{s.exchangeType}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{s.segmentType}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{fmtCurrency(s.buyRate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{s.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{s.weightage}%</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{fmtCurrency(s.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {portfolio.scripts.map((s, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-3">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-900">{s.scriptName?.name ?? "—"}</p>
                  <span className="text-xs text-gray-500">{s.exchangeType}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-gray-400 block">Buy Rate</span><span className="font-semibold text-gray-800">{fmtCurrency(s.buyRate)}</span></div>
                  <div><span className="text-gray-400 block">Qty</span><span className="text-gray-700">{s.quantity}</span></div>
                  <div><span className="text-gray-400 block">Weightage</span><span className="text-gray-700">{s.weightage}%</span></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ─── 10. Closed Positions ─── */}
      {(portfolio.closedPositions?.length ?? 0) > 0 && (
        <SectionCard icon={LineChart} title={`Closed Positions (${portfolio.closedPositions!.length})`} color="text-gray-600">
          <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Script</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Segment</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Buy Rate</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">CMP</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Invested</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Current</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">P&L</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">P&L %</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Closed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {portfolio.closedPositions!.map((cp, i) => (
                    <tr key={i} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{cp.scriptName?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{cp.segmentType}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{fmtCurrency(cp.buyRate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{fmtCurrency(cp.cmp)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{cp.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{fmtCurrency(cp.investedValue)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{fmtCurrency(cp.value)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-right">
                        <span className={cp.profitLoss >= 0 ? "text-emerald-600" : "text-red-600"}>
                          {cp.profitLoss > 0 ? "+" : ""}{fmtCurrency(cp.profitLoss)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right">
                        <span className={cp.profitLossPercentage >= 0 ? "text-emerald-600" : "text-red-600"}>
                          {cp.profitLossPercentage > 0 ? "+" : ""}{cp.profitLossPercentage?.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{fmt(cp.closedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="md:hidden space-y-2">
            {portfolio.closedPositions!.map((cp, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-3">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-900">{cp.scriptName?.name ?? "—"}</p>
                  <span className={`text-xs font-semibold ${cp.profitLoss >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {cp.profitLoss > 0 ? "+" : ""}{cp.profitLossPercentage?.toFixed(2)}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-gray-400 block">Invested</span><span className="font-semibold text-gray-800">{fmtCurrency(cp.investedValue)}</span></div>
                  <div><span className="text-gray-400 block">Current</span><span className="text-gray-700">{fmtCurrency(cp.value)}</span></div>
                  <div><span className="text-gray-400 block">Closed</span><span className="text-gray-700">{fmt(cp.closedAt)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ─── 11. Performance History ─── */}
      {((portfolio.performanceHistory?.length ?? 0) > 0 || (data?.dailyHistory?.length ?? 0) > 0) && (
        <SectionCard icon={TrendingUp} title="Performance History" color="text-cyan-500">
          {/* Monthly */}
          {(portfolio.performanceHistory?.length ?? 0) > 0 && (
            <>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Monthly Performance</h3>
              <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden mb-4">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Month</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Value</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Returns</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {portfolio.performanceHistory!.slice().sort((a, b) => b.month.localeCompare(a.month)).map((e) => (
                        <tr key={e.month} className="hover:bg-gray-50/60">
                          <td className="px-4 py-3 text-sm text-gray-900">{e.month}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{fmtCurrency(e.value)}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            {e.returns != null ? <span className={e.returns >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>{e.returns > 0 ? "+" : ""}{e.returns.toFixed(2)}%</span> : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {e.profitLoss != null ? <span className={e.profitLoss >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>{e.profitLoss > 0 ? "+" : ""}{fmtCurrency(e.profitLoss)}</span> : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="md:hidden space-y-2 mb-4">
                {portfolio.performanceHistory!.slice().sort((a, b) => b.month.localeCompare(a.month)).map((e) => (
                  <div key={e.month} className="border border-gray-200 rounded-xl p-3 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">{e.month}</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{fmtCurrency(e.value)}</p>
                      {e.returns != null && <p className={`text-xs font-semibold ${e.returns >= 0 ? "text-emerald-600" : "text-red-600"}`}>{e.returns > 0 ? "+" : ""}{e.returns.toFixed(2)}%</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {/* Daily history summary */}
          {(data?.dailyHistory?.length ?? 0) > 0 && (
            <>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Daily P&L History (last 30 entries)</h3>
              <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Value</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Investment</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data!.dailyHistory.slice(-30).reverse().map((d) => (
                        <tr key={d._id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-3 text-sm text-gray-900">{fmt(d.date)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{fmtCurrency(d.totalValue)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{fmtCurrency(d.totalInvestment)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-right">
                            <span className={d.pnl >= 0 ? "text-emerald-600" : "text-red-600"}>{d.pnl > 0 ? "+" : ""}{fmtCurrency(d.pnl)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </SectionCard>
      )}

      {/* ─── 12. Commercials ─── */}
      <SectionCard icon={CreditCard} title="Commercials" color="text-orange-500">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500">Yearly Charge</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{fmtCurrency(portfolio.Commercials?.yearlyCharge)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500">Deduction/Sale</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{fmtCurrency(portfolio.Commercials?.deductionPerSale)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500">Start Date</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{fmt(portfolio.Commercials?.startDate)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs text-gray-500">End Date</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{fmt(portfolio.Commercials?.endDate)}</p>
          </div>
        </div>
      </SectionCard>

      {/* ─── 13. Subscribers Table ─── */}
      <SectionCard icon={Users} title={`Subscribers (${data?.subscribers?.length ?? 0})`} color="text-blue-500">
        {(data?.subscribers?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No subscribers yet</p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input type="text" placeholder="Search subscribers…" value={subSearch} onChange={(e) => setSubSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none" />
              </div>
              <button onClick={() => { const rows = filteredSubs.map((s) => ({ Name: s.name, Email: s.email, Phone: s.phone ?? "", "Joined At": fmt(s.createdAt) })); const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Subscribers"); XLSX.writeFile(wb, "Subscribers.xlsx"); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
            <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <SortHeader label="Name" active={subSortKey === "name"} dir={subSortDir} onClick={() => toggleSubSort("name")} />
                      <SortHeader label="Email" active={subSortKey === "email"} dir={subSortDir} onClick={() => toggleSubSort("email")} />
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                      <SortHeader label="Joined" active={subSortKey === "createdAt"} dir={subSortDir} onClick={() => toggleSubSort("createdAt")} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSubs.map((s) => (
                      <tr key={s._id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{s.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{s.phone ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmt(s.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="md:hidden space-y-2">
              {filteredSubs.map((s) => (
                <div key={s._id} className="border border-gray-200 rounded-xl p-3">
                  <p className="text-sm font-medium text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.email}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                    <div><span className="text-gray-400 block">Phone</span><span className="text-gray-700">{s.phone ?? "—"}</span></div>
                    <div><span className="text-gray-400 block">Joined</span><span className="text-gray-700">{fmt(s.createdAt)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </SectionCard>

      {/* ─── 14. Orders Table ─── */}
      <SectionCard icon={CreditCard} title={`Orders (${data?.orders?.length ?? 0})`} color="text-green-500">
        {(data?.orders?.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No orders yet</p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input type="text" placeholder="Search orders…" value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none" />
              </div>
              <button onClick={() => { const rows = filteredOrders.map((o) => ({ Buyer: o.orderdBy?.name ?? "—", Email: o.orderdBy?.email ?? "", Amount: o.total, Method: o.paymentMethod, Start: fmt(o.startDate), End: fmt(o.endDate), Status: o.isExpired ? "Expired" : "Active" })); const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Orders"); XLSX.writeFile(wb, "Orders.xlsx"); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
            <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <SortHeader label="Buyer" active={orderSortKey === "buyer"} dir={orderSortDir} onClick={() => toggleOrderSort("buyer")} />
                      <SortHeader label="Amount" active={orderSortKey === "total"} dir={orderSortDir} onClick={() => toggleOrderSort("total")} />
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Start</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">End</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <SortHeader label="Date" active={orderSortKey === "createdAt"} dir={orderSortDir} onClick={() => toggleOrderSort("createdAt")} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map((o) => (
                      <tr key={o._id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{o.orderdBy?.name ?? "—"}</p>
                          <p className="text-xs text-gray-400">{o.orderdBy?.email ?? ""}</p>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{fmtCurrency(o.total)}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 capitalize">{o.paymentMethod}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmt(o.startDate)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmt(o.endDate)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-semibold ${o.isExpired ? "bg-gray-100 text-gray-500" : "bg-emerald-50 text-emerald-700"}`}>
                            {o.isExpired ? "Expired" : "Active"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmt(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="md:hidden space-y-2">
              {filteredOrders.map((o) => (
                <div key={o._id} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{o.orderdBy?.name ?? "—"}</p>
                      <p className="text-xs text-gray-400">{o.orderdBy?.email ?? ""}</p>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-semibold ${o.isExpired ? "bg-gray-100 text-gray-500" : "bg-emerald-50 text-emerald-700"}`}>
                      {o.isExpired ? "Expired" : "Active"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-gray-400 block">Amount</span><span className="font-semibold text-gray-800">{fmtCurrency(o.total)}</span></div>
                    <div><span className="text-gray-400 block">Method</span><span className="text-gray-700 capitalize">{o.paymentMethod}</span></div>
                    <div><span className="text-gray-400 block">Start</span><span className="text-gray-700">{fmt(o.startDate)}</span></div>
                    <div><span className="text-gray-400 block">End</span><span className="text-gray-700">{fmt(o.endDate)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </SectionCard>

      {/* ─── 15. Leads ─── */}
      {(data?.leads?.list?.length ?? 0) > 0 && (
        <SectionCard icon={TrendingUp} title={`Leads (${data?.leads?.total ?? 0})`} color="text-teal-500">
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(data?.leads?.byStatus ?? {}).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
              <span key={status} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                <span className="text-gray-500 capitalize">{status.replace(/_/g, " ")}</span>
                <span className="font-bold text-gray-900">{count}</span>
              </span>
            ))}
          </div>
          <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data!.leads.list.map((l) => (
                    <tr key={l._id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{l.userName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{l.userPhone || "—"}</td>
                      <td className="px-4 py-3"><span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize">{l.type}</span></td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                          l.status === "converted" ? "bg-emerald-50 text-emerald-700"
                          : l.status === "payment_failed" || l.status === "abandoned" ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                        }`}>{l.status.replace(/_/g, " ")}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{fmt(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="md:hidden space-y-2">
            {data!.leads.list.map((l) => (
              <div key={l._id} className="border border-gray-200 rounded-xl p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{l.userName}</p>
                    {l.userPhone && <p className="text-xs text-gray-400">{l.userPhone}</p>}
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-semibold capitalize ${
                    l.status === "converted" ? "bg-emerald-50 text-emerald-700"
                    : l.status === "payment_failed" || l.status === "abandoned" ? "bg-red-50 text-red-700"
                    : "bg-amber-50 text-amber-700"
                  }`}>{l.status.replace(/_/g, " ")}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-400 block">Type</span><span className="text-gray-700 capitalize">{l.type}</span></div>
                  <div><span className="text-gray-400 block">Date</span><span className="text-gray-700">{fmt(l.createdAt)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ─── 16. Coupons ─── */}
      {(data?.coupons?.length ?? 0) > 0 && (
        <SectionCard icon={Ticket} title={`Coupons (${data?.coupons?.length ?? 0})`} color="text-fuchsia-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data!.coupons.map((c) => {
              const isExpired = c.expiryDate ? new Date(c.expiryDate) < new Date() : false;
              return (
                <div key={c._id} className={`border rounded-xl p-4 ${isExpired ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200"}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-indigo-700 font-mono tracking-wider">{c.code}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isExpired ? "bg-gray-100 text-gray-500" : "bg-emerald-50 text-emerald-700"}`}>
                      {isExpired ? "Expired" : "Active"}
                    </span>
                  </div>
                  {c.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{c.description}</p>}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-gray-400 block">Discount</span><span className="font-semibold text-gray-800">{c.discountType === "percentage" ? `${c.discount}%` : fmtCurrency(c.discount)}</span></div>
                    <div><span className="text-gray-400 block">Used</span><span className="text-gray-700">{c.usedCount} / {c.usageLimit}</span></div>
                    <div><span className="text-gray-400 block">Start</span><span className="text-gray-700">{fmt(c.startDate)}</span></div>
                    <div><span className="text-gray-400 block">Expiry</span><span className="text-gray-700">{fmt(c.expiryDate)}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* ─── 17. Telegram & Marketplaces ─── */}
      {(portfolio.telegramChannelId || (data?.marketplaces?.length ?? 0) > 0) && (
        <SectionCard icon={Globe} title="Integrations & Marketplaces" color="text-sky-500">
          <div className="space-y-3">
            {portfolio.telegramChannelId && (
              <div className="flex items-center gap-2 text-sm">
                <Send className="w-4 h-4 text-blue-500" />
                <span className="text-gray-500">Telegram Channel ID:</span>
                <span className="font-mono text-gray-900">{portfolio.telegramChannelId}</span>
              </div>
            )}
            {(data?.marketplaces?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Shared with Marketplaces</p>
                <div className="flex flex-wrap gap-2">
                  {data!.marketplaces.map((m) => (
                    <span key={m._id} className="inline-block px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">{m.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ─── 18. Author / Service Provider Details ─── */}
      <SectionCard icon={User} title="Author / Service Provider" color="text-rose-500">
        <div className="flex flex-col sm:flex-row gap-6">
          {sp?.profileUrl && (
            <div className="flex-shrink-0">
              <Image src={sp.profileUrl} alt="Provider" width={80} height={80} className="w-20 h-20 rounded-2xl object-cover border border-gray-200" />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 flex-1 text-sm">
            <div><span className="text-gray-400 block text-xs">Name</span><span className="text-gray-900 font-medium">{sp?.name ?? portfolio.authorData?.name ?? "—"}</span></div>
            <div><span className="text-gray-400 block text-xs">Email</span><span className="text-gray-900">{sp?.email ?? portfolio.authorData?.email ?? "—"}</span></div>
            <div><span className="text-gray-400 block text-xs">Phone</span><span className="text-gray-900">{sp?.number ?? "—"}</span></div>
            <div><span className="text-gray-400 block text-xs">Reg. Number</span><span className="text-gray-900 font-mono">{sp?.regNumber ?? "—"}</span></div>
            <div className="sm:col-span-2"><span className="text-gray-400 block text-xs">Address</span><span className="text-gray-900">{[sp?.address1, sp?.address2, sp?.city, sp?.state].filter(Boolean).join(", ") || "—"}</span></div>
            {sp?.description && <div className="sm:col-span-2"><span className="text-gray-400 block text-xs">Description</span><span className="text-gray-700">{sp.description}</span></div>}
            {sp?.disclaimer && <div className="sm:col-span-2"><span className="text-gray-400 block text-xs">Disclaimer</span><span className="text-gray-700 text-xs">{sp.disclaimer}</span></div>}
          </div>
        </div>
      </SectionCard>

      {/* ─── 19. Documents ─── */}
      {portfolio.tncFileURL && (
        <SectionCard icon={FileText} title="Documents" color="text-gray-600">
          <a href={portfolio.tncFileURL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline">
            <ExternalLink className="w-4 h-4" /> Terms & Conditions Document
          </a>
        </SectionCard>
      )}

      {/* ─── 20. Meta Information ─── */}
      <SectionCard icon={Hash} title="Meta Information" color="text-gray-400">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-400 block text-xs">Portfolio ID</span><span className="text-gray-900 font-mono text-xs break-all">{portfolio._id}</span></div>
          <div><span className="text-gray-400 block text-xs">Launch Date</span><span className="text-gray-900">{fmt(portfolio.launchDate)}</span></div>
          <div><span className="text-gray-400 block text-xs">Created At</span><span className="text-gray-900">{fmt(portfolio.createdAt)}</span></div>
          <div><span className="text-gray-400 block text-xs">Updated At</span><span className="text-gray-900">{fmt(portfolio.updatedAt)}</span></div>
        </div>
      </SectionCard>
    </div>
  );
}
