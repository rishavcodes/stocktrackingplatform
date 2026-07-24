"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import fetcher from "@/lib/data/setup";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import {
  FileText,
  Video,
  Calendar,
  Briefcase,
  Users,
  Download,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  BarChart3,
} from "lucide-react";

const SP_CATEGORIES = [
  "AIF",
  "Banking",
  "Forex Experts",
  "Mutual Funds",
  "PMS",
  "Research Analyst",
  "Registered Investment Advisor",
  "Stock Brokers",
  "Tax Experts",
  "Trainers",
];

export type SPStatsTableType = {
  _id: string;
  totalArticles: number;
  totalDocuments: number;
  totalEvents: number;
  totalFollowerCount: number;
  totalServices: number;
  totalVideos: number;
};

// New table — one row per SP "bucket" (RA-Individual etc.) with the
// metrics from the spec screenshot. Backend computes this; we render it.
type StatsByTypeRow = {
  bucket:
    | "RA - Individual"
    | "RA - Non Individual"
    | "Sub Profile"
    | "RIA"
    | "Broker"
    | "PMS"
    | "AIF";
  registered: number;
  subscribers: number;
  sales: number;
  revenue: number;
  recommendations: number;
  articles: number;
  plans: number;
  packages: number;
  portfolios: number;
};

type SortKey = keyof SPStatsTableType;
type SortDir = "asc" | "desc";

const BAR_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#ec4899"];

function KPICard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-gray-600 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: entry.color }} />
          {entry.name}:{" "}
          <span className="font-bold text-gray-800">{entry.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

const formatTooltipCount = (value: ValueType | undefined): [string, string] => {
  if (value === undefined || value === null) return ["", "Count"];
  if (typeof value === "number") return [value.toLocaleString(), "Count"];
  if (typeof value === "string") {
    const n = Number(value);
    return [Number.isFinite(n) ? n.toLocaleString() : value, "Count"];
  }
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "number") return [first.toLocaleString(), "Count"];
    if (typeof first === "string") {
      const n = Number(first);
      return [Number.isFinite(n) ? n.toLocaleString() : first, "Count"];
    }
  }
  return ["", "Count"];
};

export default function ContentStats() {
  const session = useSession();
  const [sortKey, setSortKey] = useState<SortKey>("totalDocuments");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.data?.backendToken}`,
  };

  const { data, isLoading } = useSWR<{ serviceProviders: SPStatsTableType[] }>(
    session.status === "authenticated"
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/serviceproviderstats`
      : null,
    (url: string) => fetcher(url, { headers })
  );

  // New per-bucket aggregations powering the spec table (RA-Individual etc.).
  const { data: byTypeData } = useSWR<{ data: StatsByTypeRow[] }>(
    session.status === "authenticated"
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/contentstatsbytype`
      : null,
    (url: string) => fetcher(url, { headers })
  );
  const byTypeRows: StatsByTypeRow[] = byTypeData?.data ?? [];
  const byTypeTotals = useMemo(
    () =>
      byTypeRows.reduce(
        (acc, r) => ({
          registered: acc.registered + r.registered,
          subscribers: acc.subscribers + r.subscribers,
          sales: acc.sales + r.sales,
          revenue: acc.revenue + r.revenue,
          recommendations: acc.recommendations + r.recommendations,
          articles: acc.articles + r.articles,
          plans: acc.plans + r.plans,
          packages: acc.packages + r.packages,
          portfolios: acc.portfolios + r.portfolios,
        }),
        {
          registered: 0,
          subscribers: 0,
          sales: 0,
          revenue: 0,
          recommendations: 0,
          articles: 0,
          plans: 0,
          packages: 0,
          portfolios: 0,
        }
      ),
    [byTypeRows]
  );

  // ── Build complete dataset (fill missing categories with 0) ──
  const rows = useMemo<SPStatsTableType[]>(() => {
    if (!data?.serviceProviders) return [];
    const map = Object.fromEntries(data.serviceProviders.map((r) => [r._id, r]));
    return SP_CATEGORIES.map((cat) =>
      map[cat] ?? {
        _id: cat,
        totalArticles: 0,
        totalDocuments: 0,
        totalEvents: 0,
        totalFollowerCount: 0,
        totalServices: 0,
        totalVideos: 0,
      }
    );
  }, [data]);

  // ── Totals ──
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          totalDocuments: acc.totalDocuments + r.totalDocuments,
          totalArticles: acc.totalArticles + r.totalArticles,
          totalVideos: acc.totalVideos + r.totalVideos,
          totalEvents: acc.totalEvents + r.totalEvents,
          totalServices: acc.totalServices + r.totalServices,
          totalFollowerCount: acc.totalFollowerCount + r.totalFollowerCount,
        }),
        { totalDocuments: 0, totalArticles: 0, totalVideos: 0, totalEvents: 0, totalServices: 0, totalFollowerCount: 0 }
      ),
    [rows]
  );

  // ── Sorted table rows ──
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string")
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  // ── Bar chart data (short labels) ──
  const shortLabel = (s: string) => {
    const map: Record<string, string> = {
      "AIF": "AIF",
      "Banking": "Banking",
      "Forex Experts": "Forex",
      "Mutual Funds": "MF",
      "PMS": "PMS",
      "Research Analyst": "RA",
      "Registered Investment Advisor": "RIA",
      "Stock Brokers": "Broker",
      "Tax Experts": "Tax",
      "Trainers": "Trainers",
    };
    return map[s] ?? s;
  };

  const barData = rows.map((r) => ({
    name: shortLabel(r._id),
    fullName: r._id,
    Onboarded: r.totalDocuments,
    Articles: r.totalArticles,
    Videos: r.totalVideos,
    Events: r.totalEvents,
    Services: r.totalServices,
  }));

  // ── Radar chart data ──
  const radarData = [
    { metric: "Articles", value: totals.totalArticles },
    { metric: "Videos", value: totals.totalVideos },
    { metric: "Events", value: totals.totalEvents },
    { metric: "Services", value: totals.totalServices },
    { metric: "Onboarded", value: totals.totalDocuments },
    { metric: "Followers", value: totals.totalFollowerCount },
  ];

  // ── Export ──
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      [...sorted,
        { _id: "TOTAL", ...totals }
      ].map((r) => ({
        Category: r._id,
        Onboarded: r.totalDocuments,
        Articles: r.totalArticles,
        Videos: r.totalVideos,
        Events: r.totalEvents,
        Services: r.totalServices,
        Followers: r.totalFollowerCount,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ContentStats");
    XLSX.writeFile(wb, `Content_Statistics_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 text-indigo-500" />
      : <ArrowDown className="w-3 h-3 text-indigo-500" />;
  };

  const Th = ({ label, field, align = "right" }: { label: string; field: SortKey; align?: "left" | "right" }) => (
    <th
      className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 whitespace-nowrap text-${align}`}
      onClick={() => toggleSort(field)}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end w-full" : ""}`}>
        {label} <SortIcon field={field} />
      </span>
    </th>
  );

  const Td = ({ value, highlight }: { value: number; highlight?: boolean }) => (
    <td className="px-4 py-3.5 text-right">
      <span className={`text-sm font-semibold ${highlight ? "text-indigo-700" : value > 0 ? "text-gray-800" : "text-gray-300"}`}>
        {value > 0 ? value.toLocaleString() : "—"}
      </span>
    </td>
  );

  if (isLoading || session.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading content stats…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            Content Statistics
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Platform-wide content breakdown by category</p>
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
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KPICard label="Onboarded" value={totals.totalDocuments} icon={Users} color="text-indigo-600" bg="bg-indigo-50" />
        <KPICard label="Articles" value={totals.totalArticles} icon={FileText} color="text-amber-600" bg="bg-amber-50" />
        <KPICard label="Videos" value={totals.totalVideos} icon={Video} color="text-rose-600" bg="bg-rose-50" />
        <KPICard label="Events" value={totals.totalEvents} icon={Calendar} color="text-emerald-600" bg="bg-emerald-50" />
        <KPICard label="Services" value={totals.totalServices} icon={Briefcase} color="text-blue-600" bg="bg-blue-50" />
        <KPICard label="Followers" value={totals.totalFollowerCount} icon={Users} color="text-violet-600" bg="bg-violet-50" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">By SP Type</h3>
          <p className="text-xs text-gray-400">
            Performance breakdown by SP category and type
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Registered</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Subscribers</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Sales</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Recommendations</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Articles</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Plans</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Package</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Model Portfolio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {byTypeRows.map((row) => (
                <tr key={row.bucket} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-medium text-gray-800">{row.bucket}</span>
                  </td>
                  <Td value={row.registered} highlight />
                  <Td value={row.subscribers} />
                  <Td value={row.sales} />
                  <td className="px-4 py-3.5 text-right">
                    <span className={`text-sm font-semibold ${row.revenue > 0 ? "text-emerald-700" : "text-gray-300"}`}>
                      {row.revenue > 0 ? `₹${row.revenue.toLocaleString("en-IN")}` : "—"}
                    </span>
                  </td>
                  <Td value={row.recommendations} />
                  <Td value={row.articles} />
                  <Td value={row.plans} />
                  <Td value={row.packages} />
                  <Td value={row.portfolios} />
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td className="px-4 py-3.5">
                  <span className="text-sm font-bold text-gray-900">Total</span>
                </td>
                <td className="px-4 py-3.5 text-right"><span className="text-sm font-bold text-gray-900">{byTypeTotals.registered.toLocaleString()}</span></td>
                <td className="px-4 py-3.5 text-right"><span className="text-sm font-bold text-gray-900">{byTypeTotals.subscribers.toLocaleString()}</span></td>
                <td className="px-4 py-3.5 text-right"><span className="text-sm font-bold text-gray-900">{byTypeTotals.sales.toLocaleString()}</span></td>
                <td className="px-4 py-3.5 text-right"><span className="text-sm font-bold text-emerald-700">₹{byTypeTotals.revenue.toLocaleString("en-IN")}</span></td>
                <td className="px-4 py-3.5 text-right"><span className="text-sm font-bold text-gray-900">{byTypeTotals.recommendations.toLocaleString()}</span></td>
                <td className="px-4 py-3.5 text-right"><span className="text-sm font-bold text-gray-900">{byTypeTotals.articles.toLocaleString()}</span></td>
                <td className="px-4 py-3.5 text-right"><span className="text-sm font-bold text-gray-900">{byTypeTotals.plans.toLocaleString()}</span></td>
                <td className="px-4 py-3.5 text-right"><span className="text-sm font-bold text-gray-900">{byTypeTotals.packages.toLocaleString()}</span></td>
                <td className="px-4 py-3.5 text-right"><span className="text-sm font-bold text-gray-900">{byTypeTotals.portfolios.toLocaleString()}</span></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Charts ── */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Grouped Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Content by Category</h3>
            <p className="text-xs text-gray-400 mb-4">Articles, Videos, Events & Services per SP category</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="Articles" fill={BAR_COLORS[0]} radius={[3, 3, 0, 0]} maxBarSize={16} />
                <Bar dataKey="Videos" fill={BAR_COLORS[1]} radius={[3, 3, 0, 0]} maxBarSize={16} />
                <Bar dataKey="Events" fill={BAR_COLORS[2]} radius={[3, 3, 0, 0]} maxBarSize={16} />
                <Bar dataKey="Services" fill={BAR_COLORS[3]} radius={[3, 3, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Platform Content Mix</h3>
            <p className="text-xs text-gray-400 mb-2">Overall distribution across content types</p>
            <div className="flex-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#f3f4f6" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <Radar
                    name="Platform"
                    dataKey="value"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.2}
                  />
                  <Tooltip formatter={formatTooltipCount} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {/* Mini legend */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { label: "Articles", val: totals.totalArticles, color: "bg-indigo-100 text-indigo-700" },
                { label: "Videos", val: totals.totalVideos, color: "bg-amber-100 text-amber-700" },
                { label: "Events", val: totals.totalEvents, color: "bg-emerald-100 text-emerald-700" },
                { label: "Services", val: totals.totalServices, color: "bg-blue-100 text-blue-700" },
              ].map((item) => (
                <div key={item.label} className={`text-center p-2 rounded-lg ${item.color}`}>
                  <p className="text-sm font-bold">{item.val.toLocaleString()}</p>
                  <p className="text-xs opacity-80">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Category Table ── */}
      {/* <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">By Category</h3>
          <p className="text-xs text-gray-400">{SP_CATEGORIES.length} categories</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th label="Category" field="_id" align="left" />
                <Th label="Onboarded" field="totalDocuments" />
                <Th label="Articles" field="totalArticles" />
                <Th label="Videos" field="totalVideos" />
                <Th label="Events" field="totalEvents" />
                <Th label="Services" field="totalServices" />
                <Th label="Followers" field="totalFollowerCount" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((row) => (
                <tr key={row._id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-indigo-600">{shortLabel(row._id)}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-800">{row._id}</span>
                    </div>
                  </td>
                  <Td value={row.totalDocuments} highlight />
                  <Td value={row.totalArticles} />
                  <Td value={row.totalVideos} />
                  <Td value={row.totalEvents} />
                  <Td value={row.totalServices} />
                  <Td value={row.totalFollowerCount} />
                </tr>
              ))}
            </tbody>
            
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td className="px-4 py-3.5">
                  <span className="text-sm font-bold text-gray-900">Total</span>
                </td>
                {[
                  totals.totalDocuments,
                  totals.totalArticles,
                  totals.totalVideos,
                  totals.totalEvents,
                  totals.totalServices,
                  totals.totalFollowerCount,
                ].map((v, i) => (
                  <td key={i} className="px-4 py-3.5 text-right">
                    <span className="text-sm font-bold text-gray-900">{v.toLocaleString()}</span>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div> */}

      {/* ── By SP Type (spec-format table) ── */}
      
    </div>
  );
}
