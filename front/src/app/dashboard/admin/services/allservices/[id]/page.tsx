"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import ApproveServiceBox from "@/components/Admin/AdminServiceApproval/ServiceBox/ApproveServiceBox";
import RejectServiceBox from "@/components/Admin/AdminServiceApproval/ServiceBox/RejectServiceBox";
import Image from "next/image";
import { use } from "react";
import { Toaster } from "@/components/ui/toaster";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  ArrowUpDown,
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
  Gift,
  Globe,
  Hash,
  Info,
  Layers,
  LineChart,
  List,
  MessageSquare,
  Search,
  Send,
  Shield,
  Tag,
  Target,
  Ticket,
  TrendingUp,
  User,
  Users,
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
type RecommendationItem = {
  _id: string;
  scriptname: string;
  exchange: string;
  entryType: string;
  entryPrice: number;
  target: number;
  stoploss: number;
  status: string;
  result: string;
  pnl: number;
  pnlpercentage: number;
  holdingPeriod: string;
  createdAt: string;
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
type ServiceData = {
  _id: string;
  title: string;
  authorData: { id: string; name: string; email: string; authorImage?: string; type: string; aboutAuthor?: string; isVerified?: boolean };
  serviceType: string;
  segment: string;
  description: string;
  validity: number;
  price?: number;
  pricingPlans?: { validity: number; price: number }[];
  faqs?: { question: string; answer: string }[];
  activated: boolean;
  AUM?: number;
  NoOfClients?: number;
  inceptionDate?: string;
  Fundmanager?: string;
  returnsByTime?: number[];
  AsOn?: string;
  isFreeTrial: boolean;
  freeTrailDays: number;
  trailAvailedBy?: string[];
  subscribedBy?: string[];
  orders?: string[];
  Documents?: { name: string; link: string }[];
  keyFeatures?: string[];
  bonusFeatures?: string[];
  approvalStatus: boolean;
  telegramChannelId?: string;
  bannerURL?: string;
  tncFileURL?: string;
  shareWithMarketplaces?: string[];
  purchaseType?: "ONE_TIME" | "RENEWABLE";
  createdAt: string;
  updatedAt?: string;
};

type ApiResponse = {
  success: boolean;
  service: ServiceData;
  subscribers: SubscriberItem[];
  trialUsers: SubscriberItem[];
  orders: OrderItem[];
  recommendationCount: number;
  recentRecommendations: RecommendationItem[];
  leads: { total: number; byStatus: Record<string, number>; list: LeadItem[] };
  coupons: CouponItem[];
  marketplaces: { _id: string; name: string }[];
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
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const token = session.data?.backendToken ?? "";

  const { data, error } = useSWR<ApiResponse>(
    token ? [`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/servicedetails/${id}`, token] : null,
    fetcher
  );

  const service = data?.service ?? null;

  // ── Subscriber table state
  const [subSearch, setSubSearch] = useState("");
  const [subSort, setSubSort] = useState<"name" | "email" | "createdAt">("name");
  const [subDir, setSubDir] = useState<"asc" | "desc">("asc");

  const filteredSubs = useMemo(() => {
    const q = subSearch.toLowerCase();
    return [...(data?.subscribers ?? [])]
      .filter((s) => !q || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q))
      .sort((a, b) => {
        let av: any, bv: any;
        if (subSort === "createdAt") { av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime(); }
        else { av = (a as any)[subSort] ?? ""; bv = (b as any)[subSort] ?? ""; }
        if (typeof av === "number") return subDir === "asc" ? av - bv : bv - av;
        return subDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
  }, [data?.subscribers, subSearch, subSort, subDir]);

  const toggleSubSort = useCallback((k: "name" | "email" | "createdAt") => {
    if (subSort === k) setSubDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSubSort(k); setSubDir("asc"); }
  }, [subSort]);

  const exportSubs = useCallback(() => {
    const rows = filteredSubs.map((s) => ({ Name: s.name ?? "—", Email: s.email ?? "—", Phone: s.phone ?? "—", "Subscribed Since": fmt(s.createdAt) }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Subscribers");
    XLSX.writeFile(wb, `Subscribers_${service?.title?.replace(/\s+/g, "_") ?? "service"}.xlsx`);
  }, [filteredSubs, service?.title]);

  // ── Orders table state
  const [ordSearch, setOrdSearch] = useState("");
  const [ordSort, setOrdSort] = useState<"buyer" | "total" | "startDate" | "endDate" | "createdAt">("createdAt");
  const [ordDir, setOrdDir] = useState<"asc" | "desc">("desc");

  const filteredOrders = useMemo(() => {
    const q = ordSearch.toLowerCase();
    return [...(data?.orders ?? [])]
      .filter((o) => !q || o.orderdBy?.name?.toLowerCase().includes(q) || o.orderdBy?.email?.toLowerCase().includes(q) || o.paymentMethod?.toLowerCase().includes(q))
      .sort((a, b) => {
        let av: any, bv: any;
        switch (ordSort) {
          case "buyer": av = a.orderdBy?.name ?? ""; bv = b.orderdBy?.name ?? ""; break;
          case "total": av = a.total ?? 0; bv = b.total ?? 0; break;
          case "startDate": av = new Date(a.startDate).getTime(); bv = new Date(b.startDate).getTime(); break;
          case "endDate": av = new Date(a.endDate).getTime(); bv = new Date(b.endDate).getTime(); break;
          default: av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime();
        }
        if (typeof av === "number") return ordDir === "asc" ? av - bv : bv - av;
        return ordDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
  }, [data?.orders, ordSearch, ordSort, ordDir]);

  const toggleOrdSort = useCallback((k: typeof ordSort) => {
    if (ordSort === k) setOrdDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setOrdSort(k); setOrdDir("asc"); }
  }, [ordSort]);

  const exportOrders = useCallback(() => {
    const rows = filteredOrders.map((o) => ({
      Buyer: o.orderdBy?.name ?? "—",
      Email: o.orderdBy?.email ?? "—",
      Amount: o.total ?? 0,
      Subtotal: o.subtotal ?? 0,
      GST: o.gst ?? 0,
      "Payment Method": o.paymentMethod ?? "—",
      "Start Date": fmt(o.startDate),
      "End Date": fmt(o.endDate),
      Status: o.isExpired ? "Expired" : "Active",
      "Payment Status": o.paymentStatus ?? "—",
      Renewal: o.isRenewal ? "Yes" : "No",
      Coupon: o.coupon?.code ?? "—",
      Discount: o.discountAmount ?? 0,
      "Order Date": fmt(o.createdAt),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `Orders_${service?.title?.replace(/\s+/g, "_") ?? "service"}.xlsx`);
  }, [filteredOrders, service?.title]);

  // ── FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // ── Loading & Error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <FileText className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700">Failed to Load Service</h3>
        <p className="text-sm text-gray-400">Please try again later</p>
      </div>
    );
  }
  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading service details…</p>
      </div>
    );
  }

  const subs = data?.subscribers?.length ?? 0;
  const activeOrders = data?.orders?.filter((o) => !o.isExpired).length ?? 0;
  const totalOrders = data?.orders?.length ?? 0;
  const hasPricingPlans = service.pricingPlans && service.pricingPlans.length > 0;
  const hasLegacyPricing = service.price != null && service.validity != null;

  // ─── SortableHeader helper (inline) ──────────────────────────
  function SortHeader({ label, field, current, dir, toggle }: { label: string; field: string; current: string; dir: string; toggle: (k: any) => void }) {
    return (
      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap" onClick={() => toggle(field)}>
        <span className="inline-flex items-center gap-1">{label}<ArrowUpDown className={`w-3 h-3 ${current === field ? "text-indigo-600" : "text-gray-300"}`} /></span>
      </th>
    );
  }

  return (
    <>
      <Toaster />
      <div className="space-y-6 p-4">

        {/* ─── 1. Header ─── */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/admin/services/allservices")} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900 truncate">{service.title}</h1>
            <p className="text-sm text-gray-500">by {service.authorData?.name ?? "—"} · {service.segment}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!service.activated && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Deactivated</span>
            )}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold ${service.approvalStatus ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
              {service.approvalStatus ? <><CheckCircle2 className="w-3.5 h-3.5" /> Approved</> : <><Clock className="w-3.5 h-3.5" /> Pending</>}
            </span>
          </div>
        </div>

        {/* ─── 2. Admin Approval Actions ─── */}
        {!service.approvalStatus && (session.data?.user.email === "info@tradeboxlive.com" || session.data?.user.email === "penguinzx6@gmail.com") && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3"><Shield className="w-4 h-4 text-amber-600" /><h2 className="text-sm font-semibold text-amber-800">Admin Review Required</h2></div>
            <p className="text-xs text-amber-700 mb-4">This service is pending approval. Review the details and take action.</p>
            <div className="flex gap-3">
              <ApproveServiceBox id={service._id} token={session.data?.user.backendToken!} />
              <RejectServiceBox id={service._id} email={service.authorData?.email!} name={service.title} token={session.data?.user.backendToken!} />
            </div>
          </div>
        )}

        {/* ─── 3. Banner ─── */}
        {service.bannerURL && (
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <Image src={service.bannerURL} alt={service.title} width={1280} height={480} className="w-full h-auto max-h-80 object-cover" />
          </div>
        )}

        {/* ─── 4. Quick Stats ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <StatCard icon={Tag} label="Segment" value={service.segment} color="bg-indigo-50 text-indigo-600" />
          <StatCard icon={Briefcase} label="Service Type" value={service.serviceType ?? "—"} color="bg-violet-50 text-violet-600" />
          <StatCard icon={Users} label="Subscribers" value={subs} color="bg-blue-50 text-blue-600" />
          <StatCard icon={CreditCard} label="Total Orders" value={totalOrders} sub={`${activeOrders} active`} color="bg-emerald-50 text-emerald-600" />
          <StatCard icon={Gift} label="Free Trial" value={service.isFreeTrial ? `Yes (${service.freeTrailDays}d)` : "No"} sub={service.isFreeTrial ? `${data?.trialUsers?.length ?? 0} availed` : undefined} color="bg-amber-50 text-amber-600" />
          <StatCard icon={Layers} label="Purchase Type" value={service.purchaseType === "ONE_TIME" ? "One Time" : "Renewable"} color="bg-rose-50 text-rose-600" />
          <StatCard icon={Target} label="Recommendations" value={data?.recommendationCount ?? 0} color="bg-cyan-50 text-cyan-600" />
          <StatCard icon={TrendingUp} label="Leads" value={data?.leads?.total ?? 0} color="bg-teal-50 text-teal-600" />
          <StatCard icon={Ticket} label="Coupons" value={data?.coupons?.length ?? 0} color="bg-fuchsia-50 text-fuchsia-600" />
          <StatCard icon={CheckCircle2} label="Status" value={service.activated ? "Active" : "Deactivated"} color={service.activated ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"} />
        </div>

        {/* ─── 5. Description ─── */}
        <SectionCard icon={FileText} title="Description">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{service.description}</p>
        </SectionCard>

        {/* ─── 6. Pricing Plans ─── */}
        <SectionCard icon={DollarSign} title="Pricing Plans" color="text-amber-500">
          {hasPricingPlans ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {service.pricingPlans!.map((plan, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm text-gray-800">Plan {i + 1}</h3>
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-lg">{plan.validity} Days</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-3">₹{plan.price.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-gray-400 mt-1">Excluding GST</p>
                </div>
              ))}
            </div>
          ) : hasLegacyPricing ? (
            <div className="border border-gray-200 rounded-xl p-4 max-w-sm">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-sm text-gray-800">Standard Plan</h3>
                <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-lg">{service.validity} Days</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-3">₹{(service.price ?? 0).toLocaleString("en-IN")}</p>
              <p className="text-xs text-gray-400 mt-1">Excluding GST</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No pricing information available</p>
          )}
        </SectionCard>

        {/* ─── 7. Key Features + Bonus Features ─── */}
        {((service.keyFeatures?.length ?? 0) > 0 || (service.bonusFeatures?.length ?? 0) > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(service.keyFeatures?.length ?? 0) > 0 && (
              <SectionCard icon={List} title="Key Features">
                <ul className="space-y-2.5">
                  {service.keyFeatures!.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{f}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
            {(service.bonusFeatures?.length ?? 0) > 0 && (
              <SectionCard icon={Gift} title="Bonus Features" color="text-amber-500">
                <ul className="space-y-2.5">
                  {service.bonusFeatures!.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{f}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </div>
        )}

        {/* ─── 8. FAQs ─── */}
        {service.faqs && service.faqs.length > 0 && (
          <SectionCard icon={MessageSquare} title="FAQs" color="text-violet-500">
            <div className="space-y-2">
              {service.faqs.map((faq, i) => (
                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="text-sm font-medium text-gray-800">{faq.question}</span>
                    {openFaq === i ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-3 pt-0">
                      <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ─── 9. Documents ─── */}
        {(service.tncFileURL || (service.Documents && service.Documents.length > 0)) && (
          <SectionCard icon={FileText} title="Documents" color="text-red-500">
            <div className="space-y-3">
              {service.tncFileURL && (
                <div onClick={() => window.open(service.tncFileURL, "_blank")} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-50 rounded-xl"><FileText className="w-5 h-5 text-red-500" /></div>
                    <div><h3 className="text-sm font-medium text-gray-900">Terms & Conditions</h3><p className="text-xs text-gray-500">PDF Document</p></div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
              )}
              {service.Documents?.map((doc, i) => (
                <div key={i} onClick={() => window.open(doc.link, "_blank")} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl"><FileText className="w-5 h-5 text-blue-500" /></div>
                    <div><h3 className="text-sm font-medium text-gray-900">{doc.name || `Document ${i + 1}`}</h3></div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ─── 10. Fund Information ─── */}
        {service.serviceType === "fund" && (
          <SectionCard icon={LineChart} title="Fund Information" color="text-blue-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {service.inceptionDate && (
                <div><p className="text-xs text-gray-500 font-medium">Inception Date</p><p className="text-sm font-semibold text-gray-900 mt-0.5">{fmt(service.inceptionDate)}</p></div>
              )}
              {service.Fundmanager && (
                <div><p className="text-xs text-gray-500 font-medium">Fund Manager</p><p className="text-sm font-semibold text-gray-900 mt-0.5">{service.Fundmanager}</p></div>
              )}
              {service.AUM != null && (
                <div><p className="text-xs text-gray-500 font-medium">AUM</p><p className="text-sm font-semibold text-gray-900 mt-0.5">₹{service.AUM.toLocaleString("en-IN")}</p></div>
              )}
              {service.NoOfClients != null && (
                <div><p className="text-xs text-gray-500 font-medium">No. of Clients</p><p className="text-sm font-semibold text-gray-900 mt-0.5">{service.NoOfClients.toLocaleString("en-IN")}</p></div>
              )}
              {service.AsOn && (
                <div><p className="text-xs text-gray-500 font-medium">As On</p><p className="text-sm font-semibold text-gray-900 mt-0.5">{service.AsOn}</p></div>
              )}
            </div>
            {service.returnsByTime && service.returnsByTime.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">Returns by Period</p>
                <div className="flex flex-wrap gap-3">
                  {["1M", "3M", "6M", "1Y", "2Y", "3Y", "5Y", "Since Inception"].map((label, i) => {
                    const val = service.returnsByTime?.[i];
                    if (val == null) return null;
                    return (
                      <div key={label} className="text-center px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className={`text-sm font-bold mt-0.5 ${val >= 0 ? "text-emerald-600" : "text-red-600"}`}>{val > 0 ? "+" : ""}{val}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {/* ─── 11. Subscribers Table ─── */}
        <SectionCard icon={Users} title={`Subscribers (${subs})`} color="text-blue-500">
          {subs === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No subscribers yet</p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search subscribers…" value={subSearch} onChange={(e) => setSubSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none" />
                </div>
                <button onClick={exportSubs} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors">
                  <Download className="w-4 h-4" /> Export
                </button>
              </div>
              <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <SortHeader label="Name" field="name" current={subSort} dir={subDir} toggle={toggleSubSort} />
                        <SortHeader label="Email" field="email" current={subSort} dir={subDir} toggle={toggleSubSort} />
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                        <SortHeader label="Since" field="createdAt" current={subSort} dir={subDir} toggle={toggleSubSort} />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredSubs.map((s) => (
                        <tr key={s._id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{s.name ?? "—"}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{s.email ?? "—"}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{s.phone ?? "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{fmt(s.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="md:hidden space-y-2 mt-2">
                {filteredSubs.map((s) => (
                  <div key={s._id} className="border border-gray-200 rounded-xl p-3">
                    <p className="text-sm font-medium text-gray-900">{s.name ?? "—"}</p>
                    <p className="text-xs text-gray-500">{s.email ?? "—"} · {s.phone ?? "—"}</p>
                    <p className="text-xs text-gray-400 mt-1">Since {fmt(s.createdAt)}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        {/* ─── 12. Orders / Subscription History ─── */}
        <SectionCard icon={CreditCard} title={`Orders (${totalOrders})`} color="text-emerald-500">
          {totalOrders === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No orders yet</p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search orders…" value={ordSearch} onChange={(e) => setOrdSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none" />
                </div>
                <button onClick={exportOrders} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors">
                  <Download className="w-4 h-4" /> Export
                </button>
              </div>
              <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <SortHeader label="Buyer" field="buyer" current={ordSort} dir={ordDir} toggle={toggleOrdSort} />
                        <SortHeader label="Amount" field="total" current={ordSort} dir={ordDir} toggle={toggleOrdSort} />
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Method</th>
                        <SortHeader label="Start" field="startDate" current={ordSort} dir={ordDir} toggle={toggleOrdSort} />
                        <SortHeader label="End" field="endDate" current={ordSort} dir={ordDir} toggle={toggleOrdSort} />
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Payment</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Renewal</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Coupon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredOrders.map((o) => (
                        <tr key={o._id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{o.orderdBy?.name ?? "—"}</div>
                            <div className="text-xs text-gray-400">{o.orderdBy?.email ?? ""}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">{fmtCurrency(o.total)}</div>
                            {o.gst > 0 && <div className="text-[10px] text-gray-400">GST: {fmtCurrency(o.gst)}</div>}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 capitalize whitespace-nowrap">{o.paymentMethod ?? "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmt(o.startDate)}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmt(o.endDate)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-semibold ${o.isExpired ? "bg-gray-100 text-gray-500" : "bg-emerald-50 text-emerald-700"}`}>
                              {o.isExpired ? "Expired" : "Active"}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-semibold ${
                              o.paymentStatus === "verified" ? "bg-emerald-50 text-emerald-700" : o.paymentStatus === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              {o.paymentStatus ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{o.isRenewal ? "Yes" : "No"}</td>
                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{o.coupon?.code ?? "—"}{o.discountAmount ? ` (-${fmtCurrency(o.discountAmount)})` : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="md:hidden space-y-2 mt-2">
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

        {/* ─── 13. Recommendations ─── */}
        <SectionCard icon={Target} title={`Recommendations (${data?.recommendationCount ?? 0})`} color="text-cyan-500">
          {(data?.recentRecommendations?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No recommendations shared with this service</p>
          ) : (
            <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Script</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Exchange</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Entry</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Target</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SL</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">P&L</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data!.recentRecommendations.map((r) => (
                      <tr key={r._id} className="hover:bg-gray-50/60">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.scriptname}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{r.exchange}</td>
                        <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize ${r.entryType === "buy" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{r.entryType}</span></td>
                        <td className="px-4 py-3 text-sm text-gray-900">{r.entryPrice}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{r.target}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{r.stoploss}</td>
                        <td className="px-4 py-3"><span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize ${r.status === "open" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{r.status}</span></td>
                        <td className="px-4 py-3 text-sm font-semibold">{r.pnl != null ? <span className={r.pnl >= 0 ? "text-emerald-600" : "text-red-600"}>{r.pnl > 0 ? "+" : ""}{r.pnl?.toFixed(2)}</span> : "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmt(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {(data?.recentRecommendations?.length ?? 0) > 0 && (
            <div className="md:hidden space-y-2 mt-2">
              {data!.recentRecommendations.map((r) => (
                <div key={r._id} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-gray-900">{r.scriptname} <span className="text-xs text-gray-400">({r.exchange})</span></p>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${r.entryType === "buy" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{r.entryType}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-gray-400 block">Entry</span><span className="font-medium">{r.entryPrice}</span></div>
                    <div><span className="text-gray-400 block">Target</span><span className="font-medium">{r.target}</span></div>
                    <div><span className="text-gray-400 block">P&L</span>{r.pnl != null ? <span className={`font-semibold ${r.pnl >= 0 ? "text-emerald-600" : "text-red-600"}`}>{r.pnl > 0 ? "+" : ""}{r.pnl?.toFixed(2)}</span> : <span>—</span>}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {(data?.recommendationCount ?? 0) > 10 && (
            <p className="text-xs text-gray-400 text-center mt-3">Showing 10 of {data?.recommendationCount} recommendations</p>
          )}
        </SectionCard>

        {/* ─── 14. Leads ─── */}
        {(data?.leads?.total ?? 0) > 0 && (
          <SectionCard icon={TrendingUp} title={`Leads (${data?.leads?.total ?? 0})`} color="text-teal-500">
            {/* Status summary chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(data?.leads?.byStatus ?? {}).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                <span key={status} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                  <span className="text-gray-500 capitalize">{status.replace(/_/g, " ")}</span>
                  <span className="font-bold text-gray-900">{count}</span>
                </span>
              ))}
            </div>

            {/* Desktop table */}
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
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize">{l.type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                            l.status === "converted"
                              ? "bg-emerald-50 text-emerald-700"
                              : l.status === "payment_failed" || l.status === "abandoned"
                              ? "bg-red-50 text-red-700"
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

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {data!.leads.list.map((l) => (
                <div key={l._id} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{l.userName}</p>
                      {l.userPhone && <p className="text-xs text-gray-400">{l.userPhone}</p>}
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-semibold capitalize ${
                      l.status === "converted"
                        ? "bg-emerald-50 text-emerald-700"
                        : l.status === "payment_failed" || l.status === "abandoned"
                        ? "bg-red-50 text-red-700"
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

        {/* ─── 15. Coupons ─── */}
        {(data?.coupons?.length ?? 0) > 0 && (
          <SectionCard icon={Ticket} title={`Coupons (${data?.coupons?.length ?? 0})`} color="text-fuchsia-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data!.coupons.map((c) => {
                const expired = new Date(c.expiryDate) < new Date();
                return (
                  <div key={c._id} className={`border rounded-xl p-4 ${expired ? "border-gray-200 opacity-60" : "border-fuchsia-200 bg-fuchsia-50/30"}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-sm font-bold text-gray-900">{c.code}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${expired ? "bg-gray-100 text-gray-500" : "bg-emerald-50 text-emerald-700"}`}>{expired ? "Expired" : "Active"}</span>
                    </div>
                    {c.description && <p className="text-xs text-gray-500 mb-2">{c.description}</p>}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-gray-400">Discount</span><p className="font-semibold text-gray-800">{c.discountType === "percentage" ? `${c.discount}%` : fmtCurrency(c.discount)}</p></div>
                      <div><span className="text-gray-400">Usage</span><p className="font-semibold text-gray-800">{c.usedCount}/{c.usageLimit}</p></div>
                      <div><span className="text-gray-400">Valid From</span><p className="text-gray-700">{fmt(c.startDate)}</p></div>
                      <div><span className="text-gray-400">Expires</span><p className="text-gray-700">{fmt(c.expiryDate)}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* ─── 16. Telegram & Integrations ─── */}
        {(service.telegramChannelId || (data?.marketplaces?.length ?? 0) > 0) && (
          <SectionCard icon={Send} title="Integrations" color="text-sky-500">
            <div className="space-y-3">
              {service.telegramChannelId && (
                <div className="flex items-center gap-3 p-3 bg-sky-50/60 rounded-xl border border-sky-200">
                  <Send className="w-4 h-4 text-sky-500" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Telegram Channel ID</p>
                    <p className="text-sm font-mono font-semibold text-gray-900">{service.telegramChannelId}</p>
                  </div>
                </div>
              )}
              {(data?.marketplaces?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-2">Shared with Marketplaces</p>
                  <div className="flex flex-wrap gap-2">
                    {data!.marketplaces.map((m) => (
                      <span key={m._id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700">
                        <Globe className="w-3 h-3 text-gray-400" /> {m.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* ─── 17. Author Details ─── */}
        <SectionCard icon={User} title="Author Details">
          <div className="flex items-center gap-4">
            {service.authorData?.authorImage && service.authorData.authorImage !== "NA" ? (
              <Image src={service.authorData.authorImage} alt={service.authorData.name} width={48} height={48} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center"><User className="w-5 h-5 text-indigo-400" /></div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-900">{service.authorData?.name ?? "—"}</p>
              <p className="text-xs text-gray-500">{service.authorData?.email ?? "—"}</p>
              <p className="text-xs text-gray-400 capitalize">{service.authorData?.type ?? "—"}</p>
              {service.authorData?.aboutAuthor && <p className="text-xs text-gray-400 mt-1">{service.authorData.aboutAuthor}</p>}
            </div>
          </div>
        </SectionCard>

        {/* ─── 18. Meta Information ─── */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3"><Info className="w-4 h-4 text-gray-400" /><h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Meta Information</h2></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-xs">
            <div><span className="text-gray-400 block">Service ID</span><span className="font-mono text-gray-700 break-all">{service._id}</span></div>
            <div><span className="text-gray-400 block">Created</span><span className="text-gray-700">{fmt(service.createdAt)}</span></div>
            <div><span className="text-gray-400 block">Updated</span><span className="text-gray-700">{fmt(service.updatedAt)}</span></div>
            <div><span className="text-gray-400 block">Purchase Type</span><span className="text-gray-700">{service.purchaseType === "ONE_TIME" ? "One Time" : "Renewable"}</span></div>
            <div><span className="text-gray-400 block">Activated</span><span className={`font-semibold ${service.activated ? "text-emerald-600" : "text-red-600"}`}>{service.activated ? "Yes" : "No"}</span></div>
          </div>
        </div>

      </div>
    </>
  );
}
