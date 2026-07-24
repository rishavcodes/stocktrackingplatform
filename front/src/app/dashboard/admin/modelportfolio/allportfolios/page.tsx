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
  PieChart,
  CheckCircle2,
  Users,
  Layers,
  Shield,
} from "lucide-react";

type PortfolioItem = {
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
  riskLevel: number;
  authorData: { id?: string; name: string; email?: string };
  subscribedBy?: string[];
  scripts?: unknown[];
  Commercials?: { approvedByAdmin?: boolean };
  createdAt: string;
};

type SortKey = "name" | "author" | "theme" | "risk" | "minInvestment" | "subscribers" | "createdAt";
type SortDir = "asc" | "desc";

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

export default function AllPortfoliosPage() {
  const router = useRouter();
  const session = useSession();
  const token = session.data?.backendToken ?? "";

  const { data, isLoading } = useSWR(
    token ? [`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/allportfolios`, token] : null,
    fetcher
  );
  const portfolios: PortfolioItem[] = (data?.data as PortfolioItem[]) ?? [];

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...portfolios]
      .filter(
        (p) =>
          !q ||
          p.portfolioName.toLowerCase().includes(q) ||
          (p.theme ?? "").toLowerCase().includes(q) ||
          (p.authorData?.name ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortKey) {
          case "name": aVal = a.portfolioName; bVal = b.portfolioName; break;
          case "author": aVal = a.authorData?.name ?? ""; bVal = b.authorData?.name ?? ""; break;
          case "theme": aVal = a.theme ?? ""; bVal = b.theme ?? ""; break;
          case "risk": aVal = a.riskLevel; bVal = b.riskLevel; break;
          case "minInvestment": aVal = a.minInvestmentAmount; bVal = b.minInvestmentAmount; break;
          case "subscribers": aVal = a.subscribedBy?.length ?? 0; bVal = b.subscribedBy?.length ?? 0; break;
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
  }, [portfolios, search, sortKey, sortDir]);

  const totalSubscribers = useMemo(
    () => portfolios.reduce((sum, p) => sum + (p.subscribedBy?.length ?? 0), 0),
    [portfolios]
  );
  const uniqueThemes = useMemo(() => new Set(portfolios.map((p) => p.theme).filter(Boolean)).size, [portfolios]);
  const uniqueAuthors = useMemo(() => new Set(portfolios.map((p) => p.authorData?.id).filter(Boolean)).size, [portfolios]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else { setSortKey(key); setSortDir("asc"); }
    },
    [sortKey]
  );

  const handleExport = useCallback(() => {
    const rows = filtered.map((p) => ({
      "Portfolio Name": p.portfolioName,
      Author: p.authorData?.name ?? "—",
      Theme: p.theme ?? "—",
      "Risk Level": p.riskLevel,
      "Min Investment": p.minInvestmentAmount,
      Fees: `${p.fees}%`,
      Subscribers: p.subscribedBy?.length ?? 0,
      Scripts: p.scripts?.length ?? 0,
      "Created At": fmt(p.createdAt),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Portfolios");
    XLSX.writeFile(wb, `Portfolios_${new Date().toISOString().split("T")[0]}.xlsx`);
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
        <p className="text-sm text-gray-500 font-medium">Loading portfolios…</p>
      </div>
    );
  }

  if (!portfolios.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <PieChart className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700">No portfolios found</h3>
          <p className="text-sm text-gray-400 mt-1">Portfolios will appear here once created</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
          <PieChart className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Portfolios</h1>
          <p className="text-sm text-gray-500">Overview of all model portfolios</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total Portfolios" value={portfolios.length} icon={PieChart} color="bg-indigo-50 text-indigo-600" />
        <KpiCard label="Subscribers" value={totalSubscribers.toLocaleString()} icon={Users} color="bg-blue-50 text-blue-600" />
        <KpiCard label="Themes" value={uniqueThemes} icon={Layers} color="bg-violet-50 text-violet-600" />
        <KpiCard label="Providers" value={uniqueAuthors} sub="unique authors" icon={Users} color="bg-rose-50 text-rose-600" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, theme, or author…"
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
          <p className="text-sm text-gray-500">No portfolios match your search</p>
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
                  <SortableHeader label="Portfolio Name" field="name" />
                  <SortableHeader label="Author" field="author" />
                  <SortableHeader label="Theme" field="theme" />
                  <SortableHeader label="Risk Level" field="risk" />
                  <SortableHeader label="Min Investment" field="minInvestment" />
                  <SortableHeader label="Subscribers" field="subscribers" />
                  <SortableHeader label="Created" field="createdAt" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => {
                  const subs = p.subscribedBy?.length ?? 0;
                  return (
                    <tr
                      key={p._id}
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/admin/modelportfolio/allportfolios/${p._id}`)}
                    >
                      <td className="px-4 py-3.5 max-w-[250px]">
                        <div className="font-medium text-sm text-gray-900 truncate">{p.portfolioName}</div>
                        <div className="text-xs text-gray-400 truncate">{p.methodology ?? ""}</div>
                      </td>
                      <td className="px-4 py-3.5 max-w-[150px]">
                        <span className="text-sm text-gray-700 truncate block">{p.authorData?.name ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {p.theme ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                          p.riskLevel <= 3
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : p.riskLevel <= 6
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}>
                          <Shield className="w-3 h-3" />
                          {p.riskLevel}/10
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">{fmtCurrency(p.minInvestmentAmount)}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-sm font-medium text-gray-900">{subs}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-gray-600">{fmt(p.createdAt)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile Cards */}
      {filtered.length > 0 && (
        <div className="md:hidden space-y-3">
          {filtered.map((p) => {
            const subs = p.subscribedBy?.length ?? 0;
            return (
              <div
                key={p._id}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm cursor-pointer"
                onClick={() => router.push(`/dashboard/admin/modelportfolio/allportfolios/${p._id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-800 truncate">{p.portfolioName}</h3>
                    <p className="text-xs text-gray-400 truncate">{p.authorData?.name ?? "—"}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ml-3 flex-shrink-0 ${
                    p.riskLevel <= 3
                      ? "bg-emerald-50 text-emerald-700"
                      : p.riskLevel <= 6
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700"
                  }`}>
                    <Shield className="w-3 h-3" />
                    {p.riskLevel}/10
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-gray-400 block">Theme</span>
                    <span className="text-gray-800 font-medium">{p.theme ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Subscribers</span>
                    <span className="text-gray-800 font-medium">{subs}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Min Invest</span>
                    <span className="text-gray-800 font-medium">{fmtCurrency(p.minInvestmentAmount)}</span>
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
