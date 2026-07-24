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
  Calendar,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  Info,
  Layers,
  Package,
  Search,
  Shield,
  ShoppingCart,
  Tag,
  Ticket,
  User,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────

type IncludedService = {
  _id: string;
  title: string;
  segment?: string;
  serviceType?: string;
  subscribedBy?: string[];
  price?: number;
  bannerURL?: string;
};
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
  perCustomerLimit?: number;
  couponType: string;
};
type PackageData = {
  _id: string;
  title: string;
  description: string;
  authorData: { id: string; name: string; email?: string; type?: string };
  includedServices: IncludedService[];
  pricingPlans: { price: number; validity: number }[];
  bannerURL?: string;
  tncFileURL?: string;
  activated: boolean;
  approvalStatus: boolean;
  shareWithMarketplaces?: string[];
  stats: { purchases: number };
  createdAt: string;
  updatedAt?: string;
};
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
type ApiResponse = {
  success: boolean;
  package: PackageData;
  orders: OrderItem[];
  coupons: CouponItem[];
  marketplaces: { _id: string; name: string }[];
  serviceProvider: ServiceProviderData | null;
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

function SortHeader({ label, field, current, dir, toggle }: { label: string; field: string; current: string; dir: string; toggle: (f: any) => void }) {
  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap"
      onClick={() => toggle(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${current === field ? "text-indigo-600" : "text-gray-300"}`} />
      </span>
    </th>
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
    token ? [`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/packagedetails/${id}`, token] : null,
    fetcher
  );

  const pkg = data?.package ?? null;

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
    XLSX.writeFile(wb, `Orders_${pkg?.title?.replace(/\s+/g, "_") ?? "package"}.xlsx`);
  }, [filteredOrders, pkg?.title]);

  // ── Loading & Error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <FileText className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-700">Failed to Load Package</h3>
        <p className="text-sm text-gray-400">Please try again later</p>
      </div>
    );
  }
  if (!pkg) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading package details…</p>
      </div>
    );
  }

  const activeOrders = data?.orders?.filter((o) => !o.isExpired).length ?? 0;
  const totalRevenue = data?.orders?.reduce((s, o) => s + (o.total ?? 0), 0) ?? 0;
  const sp = data?.serviceProvider;

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* ── 1. Header ─────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="mt-1 p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{pkg.title}</h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${pkg.approvalStatus ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
              {pkg.approvalStatus ? <CheckCircle2 className="w-3 h-3" /> : <Info className="w-3 h-3" />}
              {pkg.approvalStatus ? "Approved" : "Pending"}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${pkg.activated ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
              {pkg.activated ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">by {pkg.authorData?.name ?? "—"}</p>
        </div>
      </div>

      {/* ── 2. Banner Image ────────────────────────────────────── */}
      {pkg.bannerURL && (
        <div className="relative w-full h-48 sm:h-64 rounded-2xl overflow-hidden border border-gray-200">
          <Image src={pkg.bannerURL} alt={pkg.title} fill className="object-cover" unoptimized />
        </div>
      )}

      {/* ── 3. Quick Stats Grid ────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={DollarSign} label="Starts from" value={pkg.pricingPlans?.length ? fmtCurrency(Math.min(...pkg.pricingPlans.map((t) => t.price))) : "—"} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={Calendar} label="Tiers" value={pkg.pricingPlans?.length ?? 0} color="bg-blue-50 text-blue-600" />
        <StatCard icon={ShoppingCart} label="Purchases" value={pkg.stats?.purchases ?? 0} color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={Layers} label="Services" value={pkg.includedServices?.length ?? 0} color="bg-violet-50 text-violet-600" />
        <StatCard icon={CreditCard} label="Active Orders" value={activeOrders} color="bg-sky-50 text-sky-600" />
        <StatCard icon={DollarSign} label="Total Revenue" value={fmtCurrency(totalRevenue)} color="bg-rose-50 text-rose-600" />
      </div>

      {/* ── 4. Description ─────────────────────────────────────── */}
      {pkg.description && (
        <SectionCard icon={FileText} title="Description" color="text-gray-600">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{pkg.description}</p>
        </SectionCard>
      )}

      {/* ── 5. Included Services ───────────────────────────────── */}
      {pkg.includedServices?.length > 0 && (
        <SectionCard icon={Layers} title={`Included Services (${pkg.includedServices.length})`} color="text-violet-500">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Segment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Subscribers</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pkg.includedServices.map((svc: IncludedService) => (
                  <tr
                    key={svc._id}
                    className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/admin/services/allservices/${svc._id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-indigo-700 hover:underline">{svc.title ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {svc.segment ? (
                        <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">{svc.segment}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{svc.serviceType ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{svc.subscribedBy?.length ?? 0}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{fmtCurrency(svc.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {pkg.includedServices.map((svc: IncludedService) => (
              <div
                key={svc._id}
                className="border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => router.push(`/dashboard/admin/services/allservices/${svc._id}`)}
              >
                <p className="text-sm font-semibold text-indigo-700">{svc.title ?? "—"}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div><span className="text-gray-400">Segment</span><br /><span className="text-gray-800">{svc.segment ?? "—"}</span></div>
                  <div><span className="text-gray-400">Type</span><br /><span className="text-gray-800">{svc.serviceType ?? "—"}</span></div>
                  <div><span className="text-gray-400">Subscribers</span><br /><span className="text-gray-800">{svc.subscribedBy?.length ?? 0}</span></div>
                  <div><span className="text-gray-400">Price</span><br /><span className="text-gray-800">{fmtCurrency(svc.price)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── 6. Pricing ─────────────────────────────────────────── */}
      <SectionCard icon={DollarSign} title={`Pricing Tiers (${pkg.pricingPlans?.length ?? 0})`} color="text-emerald-500">
        {pkg.pricingPlans?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pkg.pricingPlans.map((tier, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Tier {idx + 1}</p>
                <p className="text-2xl font-bold text-gray-900">{fmtCurrency(tier.price)}</p>
                <p className="text-sm text-gray-500 mt-1">Valid for {tier.validity} days</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No pricing tiers configured.</p>
        )}
      </SectionCard>

      {/* ── 7. Orders Table ─────────────────────────────────────── */}
      <SectionCard icon={CreditCard} title={`Orders (${data?.orders?.length ?? 0})`} color="text-blue-500">
        {(data?.orders?.length ?? 0) > 0 ? (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders…"
                  value={ordSearch}
                  onChange={(e) => setOrdSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>
              <button onClick={exportOrders} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <SortHeader label="Buyer" field="buyer" current={ordSort} dir={ordDir} toggle={toggleOrdSort} />
                    <SortHeader label="Total" field="total" current={ordSort} dir={ordDir} toggle={toggleOrdSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Method</th>
                    <SortHeader label="Start" field="startDate" current={ordSort} dir={ordDir} toggle={toggleOrdSort} />
                    <SortHeader label="End" field="endDate" current={ordSort} dir={ordDir} toggle={toggleOrdSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Status</th>
                    <SortHeader label="Date" field="createdAt" current={ordSort} dir={ordDir} toggle={toggleOrdSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((o) => (
                    <tr key={o._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{o.orderdBy?.name ?? "—"}</div>
                        <div className="text-xs text-gray-400">{o.orderdBy?.email ?? ""}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{fmtCurrency(o.total)}</td>
                      <td className="px-4 py-3 text-gray-600">{o.paymentMethod ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{fmt(o.startDate)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{fmt(o.endDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium ${o.isExpired ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                          {o.isExpired ? "Expired" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{fmt(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-3 mt-3">
              {filteredOrders.map((o) => (
                <div key={o._id} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{o.orderdBy?.name ?? "—"}</p>
                      <p className="text-xs text-gray-400">{o.orderdBy?.email ?? ""}</p>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium ${o.isExpired ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                      {o.isExpired ? "Expired" : "Active"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-gray-400">Total</span><br /><span className="text-gray-800 font-medium">{fmtCurrency(o.total)}</span></div>
                    <div><span className="text-gray-400">Start</span><br /><span className="text-gray-800">{fmt(o.startDate)}</span></div>
                    <div><span className="text-gray-400">End</span><br /><span className="text-gray-800">{fmt(o.endDate)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">No orders yet</p>
        )}
      </SectionCard>

      {/* ── 8. Coupons ──────────────────────────────────────────── */}
      {(data?.coupons?.length ?? 0) > 0 && (
        <SectionCard icon={Ticket} title={`Coupons (${data!.coupons.length})`} color="text-orange-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data!.coupons.map((c) => (
              <div key={c._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{c.code}</span>
                  <span className="text-xs text-gray-500">{c.couponType}</span>
                </div>
                {c.description && <p className="text-xs text-gray-600 mb-2">{c.description}</p>}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-400">Discount</span><br /><span className="font-medium text-gray-800">{c.discountType === "percent" ? `${c.discount}%` : fmtCurrency(c.discount)}</span></div>
                  <div><span className="text-gray-400">Usage</span><br /><span className="font-medium text-gray-800">{c.usedCount} / {c.usageLimit || "∞"}</span></div>
                  <div><span className="text-gray-400">Start</span><br /><span className="text-gray-800">{fmt(c.startDate)}</span></div>
                  <div><span className="text-gray-400">Expiry</span><br /><span className="text-gray-800">{fmt(c.expiryDate)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── 9. Marketplaces ─────────────────────────────────────── */}
      {(data?.marketplaces?.length ?? 0) > 0 && (
        <SectionCard icon={Globe} title={`Marketplaces (${data!.marketplaces.length})`} color="text-cyan-500">
          <div className="flex flex-wrap gap-2">
            {data!.marketplaces.map((m) => (
              <span key={m._id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full text-xs font-medium">
                <Globe className="w-3 h-3" />
                {m.name}
              </span>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── 10. Author / Service Provider ─────────────────────── */}
      {sp && (
        <SectionCard icon={User} title="Service Provider Details" color="text-rose-500">
          <div className="flex flex-col sm:flex-row gap-6">
            {sp.profileUrl && (
              <div className="flex-shrink-0">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-gray-200">
                  <Image src={sp.profileUrl} alt={sp.name} fill className="object-cover" unoptimized />
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm flex-1">
              <div><span className="text-gray-400 text-xs">Name</span><p className="font-medium text-gray-900">{sp.name ?? "—"}</p></div>
              <div><span className="text-gray-400 text-xs">Email</span><p className="font-medium text-gray-900">{sp.email ?? "—"}</p></div>
              <div><span className="text-gray-400 text-xs">Phone</span><p className="font-medium text-gray-900">{sp.number ?? "—"}</p></div>
              <div><span className="text-gray-400 text-xs">Reg Number</span><p className="font-medium text-gray-900">{sp.regNumber ?? "—"}</p></div>
              {(sp.address1 || sp.city || sp.state) && (
                <div className="sm:col-span-2">
                  <span className="text-gray-400 text-xs">Address</span>
                  <p className="font-medium text-gray-900">{[sp.address1, sp.address2, sp.city, sp.state].filter(Boolean).join(", ")}</p>
                </div>
              )}
              {sp.description && (
                <div className="sm:col-span-2">
                  <span className="text-gray-400 text-xs">Description</span>
                  <p className="text-gray-700">{sp.description}</p>
                </div>
              )}
              {sp.disclaimer && (
                <div className="sm:col-span-2">
                  <span className="text-gray-400 text-xs">Disclaimer</span>
                  <p className="text-gray-700">{sp.disclaimer}</p>
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {/* ── 11. Documents ──────────────────────────────────────── */}
      {pkg.tncFileURL && (
        <SectionCard icon={FileText} title="Documents" color="text-gray-600">
          <a
            href={pkg.tncFileURL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Terms &amp; Conditions
          </a>
        </SectionCard>
      )}

      {/* ── 12. Meta Information ────────────────────────────────── */}
      <SectionCard icon={Hash} title="Meta Information" color="text-gray-400">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div><span className="text-gray-400 text-xs">Package ID</span><p className="font-mono text-xs text-gray-600 break-all">{pkg._id}</p></div>
          <div><span className="text-gray-400 text-xs">Created At</span><p className="text-gray-700">{fmt(pkg.createdAt)}</p></div>
          <div><span className="text-gray-400 text-xs">Updated At</span><p className="text-gray-700">{fmt(pkg.updatedAt)}</p></div>
        </div>
      </SectionCard>
    </div>
  );
}
