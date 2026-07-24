"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { ScoreCardTypes } from "@/lib/types";
import * as XLSX from "xlsx";
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
import {
  TrendingUp,
  Activity,
  Users,
  ArrowUpDown,
  Download,
  Search,
  Trophy,
  Target,
  CheckCircle2,
  Circle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

export interface AggregatedData {
  spname: string;
  totalRecommendations: number;
  openRecommendations: number;
  totalClosed: number;
  successfulTrades: number;
  successRatio: number;
  returns: number;
  returnPercentage: number;
}

function aggregateRecommendations(dataArray: ScoreCardTypes[]): AggregatedData[] {
  const map: Record<
    string,
    {
      spname: string;
      totalRecommendations: number;
      openRecommendations: number;
      totalClosed: number;
      successfulTrades: number;
      returns: number;
      totalEntryPrice: number;
    }
  > = {};

  for (const item of dataArray) {
    const name = item.authorData.name;
    if (!map[name]) {
      map[name] = {
        spname: name,
        totalRecommendations: 0,
        openRecommendations: 0,
        totalClosed: 0,
        successfulTrades: 0,
        returns: 0,
        totalEntryPrice: 0,
      };
    }
    const p = map[name];
    p.totalRecommendations += 1;
    if (item.status === "open") {
      p.openRecommendations += 1;
    } else if (item.status === "closed") {
      p.totalClosed += 1;
      if (item.result === "tp") p.successfulTrades += 1;
      p.returns += item.pnl || 0;
      p.totalEntryPrice += item.entryPrice || 0;
    }
  }

  return Object.values(map).map((p) => ({
    ...p,
    successRatio: p.totalClosed ? (p.successfulTrades / p.totalClosed) * 100 : 0,
    returnPercentage: p.totalEntryPrice > 0 ? (p.returns / p.totalEntryPrice) * 100 : 0,
  }));
}

type SortKey = keyof AggregatedData;
type SortDir = "asc" | "desc";
type ActivityFilter = "all" | "open" | "closed" | "inactive";

const DONUT_COLORS = ["#f59e0b", "#10b981"];
const BAR_COLOR = "#6366f1";

function KPICard({
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
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800 mb-1 truncate max-w-[180px]">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-gray-600">
          {entry.name}:{" "}
          <span className="font-bold" style={{ color: entry.color }}>
            {entry.value}
          </span>
        </p>
      ))}
    </div>
  );
};

export default function Leaderboard() {
  const session = useSession();
  const [dataArray, setDataArray] = useState<ScoreCardTypes[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("totalRecommendations");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    const token = session.data?.user?.backendToken || (session.data as any)?.backendToken;
    if (!token) return;

    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/fetchallscorecards`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then((result) => {
        if (result?.data) setDataArray(result.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session.data]);

  const aggregatedData = useMemo(() => aggregateRecommendations(dataArray), [dataArray]);

  // ── KPIs ──
  const totalRecs = aggregatedData.reduce((a, b) => a + b.totalRecommendations, 0);
  const totalOpen = aggregatedData.reduce((a, b) => a + b.openRecommendations, 0);
  const totalClosed = aggregatedData.reduce((a, b) => a + b.totalClosed, 0);
  const totalRAs = aggregatedData.length;
  const overallSuccessRate = totalClosed > 0
    ? ((aggregatedData.reduce((a, b) => a + b.successfulTrades, 0) / totalClosed) * 100).toFixed(1)
    : "0.0";

  // ── Donut data ──
  const donutData = [
    { name: "Open", value: totalOpen },
    { name: "Closed", value: totalClosed },
  ].filter((d) => d.value > 0);

  // ── Bar chart: top 10 by total recs ──
  const top10 = useMemo(
    () =>
      [...aggregatedData]
        .sort((a, b) => b.totalRecommendations - a.totalRecommendations)
        .slice(0, 10)
        .map((r) => ({
          name: r.spname.length > 14 ? r.spname.slice(0, 14) + "…" : r.spname,
          fullName: r.spname,
          Total: r.totalRecommendations,
          Open: r.openRecommendations,
          Closed: r.totalClosed,
        })),
    [aggregatedData]
  );

  // ── Filtered + sorted table ──
  const processed = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = aggregatedData.filter((r) => {
      if (!r.spname.toLowerCase().includes(q)) return false;
      switch (activityFilter) {
        case "open":
          return r.openRecommendations > 0;
        case "closed":
          return r.totalClosed > 0;
        case "inactive":
          // No active or completed recs — only recs in other states (or none at all)
          return r.openRecommendations === 0 && r.totalClosed === 0;
        default:
          return true;
      }
    });
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string")
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [aggregatedData, search, activityFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      processed.map((r, i) => ({
        Rank: i + 1,
        "RA Name": r.spname,
        Total: r.totalRecommendations,
        Open: r.openRecommendations,
        Closed: r.totalClosed,
        "Success Rate (%)": r.successRatio.toFixed(2),
        "Return (%)": r.returnPercentage.toFixed(2),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leaderboard");
    XLSX.writeFile(wb, `Scorecard_Leaderboard_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500" />
      : <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />;
  };

  const Th = ({
    label,
    field,
    align = "left",
  }: {
    label: string;
    field: SortKey;
    align?: "left" | "right";
  }) => (
    <th
      className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 whitespace-nowrap text-${align}`}
      onClick={() => toggleSort(field)}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end w-full" : ""}`}>
        {label}
        <SortIcon field={field} />
      </span>
    </th>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading leaderboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Recommendation Leaderboard
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">RA-wise recommendation analytics overview</p>
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          label="Total Recommendations"
          value={totalRecs.toLocaleString()}
          icon={Activity}
          color="bg-indigo-50 text-indigo-600"
        />
        <KPICard
          label="Open"
          value={totalOpen.toLocaleString()}
          sub={`${totalRecs ? ((totalOpen / totalRecs) * 100).toFixed(1) : 0}% of total`}
          icon={Circle}
          color="bg-amber-50 text-amber-600"
        />
        <KPICard
          label="Closed"
          value={totalClosed.toLocaleString()}
          sub={`${totalRecs ? ((totalClosed / totalRecs) * 100).toFixed(1) : 0}% of total`}
          icon={CheckCircle2}
          color="bg-emerald-50 text-emerald-600"
        />
        <KPICard
          label="Overall Success Rate"
          value={`${overallSuccessRate}%`}
          sub="of closed calls"
          icon={Target}
          color="bg-green-50 text-green-600"
        />
        <KPICard
          label="Active RAs"
          value={totalRAs}
          sub="with recommendations"
          icon={Users}
          color="bg-violet-50 text-violet-600"
        />
      </div>

      {/* ── Leaderboard Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Table toolbar */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">RA Rankings</h3>
            <p className="text-xs text-gray-400">{processed.length} service provider{processed.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value as ActivityFilter)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
            >
              <option value="all">All activity</option>
              <option value="open">Has open recs</option>
              <option value="closed">Has closed recs</option>
              <option value="inactive">Inactive (no open / closed)</option>
            </select>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by RA name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {processed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <TrendingUp className="w-10 h-10 text-gray-200" />
            <p className="text-sm text-gray-400">No data found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left w-12">#</th>
                  <Th label="RA Name" field="spname" align="left" />
                  <Th label="Total" field="totalRecommendations" align="right" />
                  <Th label="Open" field="openRecommendations" align="right" />
                  <Th label="Closed" field="totalClosed" align="right" />
                  <Th label="Success Rate" field="successRatio" align="right" />
                  <Th label="Return %" field="returnPercentage" align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {processed.map((row, i) => {
                  const rank = i + 1;
                  const rankBadge =
                    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
                  const successColor =
                    row.successRatio >= 70
                      ? "text-emerald-600 bg-emerald-50"
                      : row.successRatio >= 50
                      ? "text-amber-600 bg-amber-50"
                      : "text-red-600 bg-red-50";
                  const returnColor =
                    row.returnPercentage > 0
                      ? "text-emerald-600"
                      : row.returnPercentage < 0
                      ? "text-red-500"
                      : "text-gray-400";

                  return (
                    <tr key={row.spname} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3.5 text-sm text-gray-400 font-medium">
                        {rankBadge ? (
                          <span className="text-base">{rankBadge}</span>
                        ) : (
                          <span>{rank}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-indigo-600">
                              {row.spname.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">
                            {row.spname}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-bold text-gray-900">{row.totalRecommendations}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                          {row.openRecommendations}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          {row.totalClosed}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {row.totalClosed > 0 ? (
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${successColor}`}>
                            {row.successRatio.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className={`px-4 py-3.5 text-right text-sm font-semibold ${returnColor}`}>
                        {row.totalClosed > 0
                          ? `${row.returnPercentage >= 0 ? "+" : ""}${row.returnPercentage.toFixed(2)}%`
                          : <span className="text-xs text-gray-300 font-normal">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
