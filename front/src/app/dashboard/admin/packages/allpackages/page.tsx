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
  Package,
  ShoppingCart,
  Users,
  Layers,
  CheckCircle2,
} from "lucide-react";

type PackageItem = {
  _id: string;
  title: string;
  description: string;
  authorData: { id?: string; name: string; email?: string; type?: string };
  includedServices: { _id: string; title: string }[];
  pricingPlans: { price: number; validity: number }[];
  bannerURL?: string;
  tncFileURL?: string;
  activated: boolean;
  approvalStatus: boolean;
  shareWithMarketplaces?: string[];
  stats: { purchases: number };
  createdAt: string;
};

type SortKey = "title" | "author" | "price" | "validity" | "purchases" | "services" | "createdAt";
type SortDir = "asc" | "desc";

function fmt(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
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

export default function AllPackagesPage() {
  const router = useRouter();
  const session = useSession();
  const token = session.data?.backendToken ?? "";

  const { data, isLoading } = useSWR(
    token ? [`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/allpackages`, token] : null,
    fetcher
  );
  const packages: PackageItem[] = (data?.data as PackageItem[]) ?? [];

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...packages]
      .filter(
        (p) =>
          !q ||
          p.title.toLowerCase().includes(q) ||
          (p.authorData?.name ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortKey) {
          case "title": aVal = a.title; bVal = b.title; break;
          case "author": aVal = a.authorData?.name ?? ""; bVal = b.authorData?.name ?? ""; break;
          case "price":
            aVal = a.pricingPlans?.length ? Math.min(...a.pricingPlans.map((t) => t.price)) : 0;
            bVal = b.pricingPlans?.length ? Math.min(...b.pricingPlans.map((t) => t.price)) : 0;
            break;
          case "validity":
            aVal = a.pricingPlans?.length ? Math.max(...a.pricingPlans.map((t) => t.validity)) : 0;
            bVal = b.pricingPlans?.length ? Math.max(...b.pricingPlans.map((t) => t.validity)) : 0;
            break;
          case "purchases": aVal = a.stats?.purchases ?? 0; bVal = b.stats?.purchases ?? 0; break;
          case "services": aVal = a.includedServices?.length ?? 0; bVal = b.includedServices?.length ?? 0; break;
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
  }, [packages, search, sortKey, sortDir]);

  const totalPurchases = useMemo(
    () => packages.reduce((sum, p) => sum + (p.stats?.purchases ?? 0), 0),
    [packages]
  );
  const uniqueProviders = useMemo(
    () => new Set(packages.map((p) => p.authorData?.id).filter(Boolean)).size,
    [packages]
  );
  const totalIncludedServices = useMemo(
    () => packages.reduce((sum, p) => sum + (p.includedServices?.length ?? 0), 0),
    [packages]
  );

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else { setSortKey(key); setSortDir("asc"); }
    },
    [sortKey]
  );

  const handleExport = useCallback(() => {
    const rows = filtered.map((p) => ({
      Title: p.title,
      Author: p.authorData?.name ?? "—",
      "Lowest Price": p.pricingPlans?.length ? Math.min(...p.pricingPlans.map((t) => t.price)) : 0,
      Tiers: p.pricingPlans?.length ?? 0,
      Purchases: p.stats?.purchases ?? 0,
      "Services Included": p.includedServices?.length ?? 0,
      Activated: p.activated ? "Yes" : "No",
      "Approval Status": p.approvalStatus ? "Approved" : "Pending",
      "Created At": fmt(p.createdAt),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Packages");
    XLSX.writeFile(wb, `Packages_${new Date().toISOString().split("T")[0]}.xlsx`);
  }, [filtered]);

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading packages…</p>
      </div>
    );
  }

  if (!packages.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <Package className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700">No packages found</h3>
          <p className="text-sm text-gray-400 mt-1">Packages will appear here once created</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Package className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Packages</h1>
          <p className="text-sm text-gray-500">Overview of all packages</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total Packages" value={packages.length} icon={Package} color="bg-indigo-50 text-indigo-600" />
        <KpiCard label="Total Purchases" value={totalPurchases.toLocaleString()} icon={ShoppingCart} color="bg-blue-50 text-blue-600" />
        <KpiCard label="Unique Providers" value={uniqueProviders} icon={Users} color="bg-rose-50 text-rose-600" />
        <KpiCard label="Included Services" value={totalIncludedServices} sub="across all packages" icon={Layers} color="bg-violet-50 text-violet-600" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or author…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          />
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
          <p className="text-sm text-gray-500">No packages match your search</p>
          <button onClick={() => setSearch("")} className="mt-2 text-xs text-indigo-600 hover:underline">
            Clear search
          </button>
        </div>
      )}

      {/* Desktop Table */}
      {filtered.length > 0 && (
        <div className="hidden md:block border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortableHeader label="Title" field="title" />
                  <SortableHeader label="Author" field="author" />
                  <SortableHeader label="Price" field="price" />
                  <SortableHeader label="Validity" field="validity" />
                  <SortableHeader label="Purchases" field="purchases" />
                  <SortableHeader label="Services" field="services" />
                  <SortableHeader label="Created" field="createdAt" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => (
                  <tr
                    key={p._id}
                    className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/admin/packages/allpackages/${p._id}`)}
                  >
                    <td className="px-4 py-3.5 max-w-[250px]">
                      <div className="font-medium text-sm text-gray-900 truncate">{p.title}</div>
                      <div className="text-xs text-gray-400 truncate">{p.description}</div>
                    </td>
                    <td className="px-4 py-3.5 max-w-[150px]">
                      <span className="text-sm text-gray-700 truncate block">{p.authorData?.name ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {p.pricingPlans?.length ? `From ${fmtCurrency(Math.min(...p.pricingPlans.map((t) => t.price)))}` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{p.pricingPlans?.length ?? 0} tiers</span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-sm font-medium text-gray-900">{p.stats?.purchases ?? 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
                        {p.includedServices?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="text-xs text-gray-600">{fmt(p.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile Cards */}
      {filtered.length > 0 && (
        <div className="md:hidden space-y-3">
          {filtered.map((p) => (
            <div
              key={p._id}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm cursor-pointer"
              onClick={() => router.push(`/dashboard/admin/packages/allpackages/${p._id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-800 truncate">{p.title}</h3>
                  <p className="text-xs text-gray-400 truncate">{p.authorData?.name ?? "—"}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900 ml-3 flex-shrink-0">
                  {p.pricingPlans?.length ? `From ${fmtCurrency(Math.min(...p.pricingPlans.map((t) => t.price)))}` : "—"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-gray-400 block">Tiers</span>
                  <span className="text-gray-800 font-medium">{p.pricingPlans?.length ?? 0}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Purchases</span>
                  <span className="text-gray-800 font-medium">{p.stats?.purchases ?? 0}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Created</span>
                  <span className="text-gray-800 font-medium">{fmt(p.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
