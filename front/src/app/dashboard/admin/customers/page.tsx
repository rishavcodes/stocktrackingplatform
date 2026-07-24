"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";
import {
  AreaChart,
  Area,
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
  Users,
  Download,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import CustomersMoreInfo from "@/components/Admin/CustomersTable/CustomersMoreInfo";

type CustomerData = {
  _id: string;
  name: string;
  email: string;
  number: string | number;
  gender: string;
  dob: string;
  pannumber: string;
  createdAt: string;
  following: number;
  servicesAvailed: number;
  orders: number;
  enrolledCourses: number;
  leadsCount: number;
  eventsEnrolled: number;
  plansCount: number;
  portfoliosCount: number;
  packagesCount: number;
  activeSubscriptions: number;
  inactiveSubscriptions: number;
  broker: string;
  subscriptions: SubscriptionRow[];
};

type SubscriptionRow = {
  type: "Plan" | "Model Portfolio" | "Event";
  raName: string;
  serviceName: string;
  status: "Active" | "Inactive" | "Registered";
  subscribedAt: string;
};

// Flattened row shown in the table — one per user-subscription
// (or one per user with empty subscription fields if the user has none).
type CustomerTableRow = {
  userId: string;
  registeredAt: string;
  name: string;
  email: string;
  number: string | number;
  pannumber: string;
  dob: string;
  raTagged: string;
  service: string;
  status: string;
  broker: string;
};

type SortKey =
  | "registeredAt"
  | "name"
  | "email"
  | "number"
  | "pannumber"
  | "dob"
  | "raTagged"
  | "service"
  | "status"
  | "broker";
type SortDir = "asc" | "desc";
type TabKey = "all" | "leads" | "subscribers" | "events" | "kyc";

const GENDER_COLORS: Record<string, string> = {
  Male: "#6366f1",
  Female: "#ec4899",
  Other: "#10b981",
  Unknown: "#e5e7eb",
};
const PIE_COLOR_LIST = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#e5e7eb"];

function formatDate(d?: string): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

function formatDateTime(d?: string): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-indigo-600 font-bold">{payload[0].value} new users</p>
    </div>
  );
};

// Module-scope so the object identity is stable across renders — keeps it
// out of useMemo dep arrays and prevents downstream memos re-running.
const TAB_PREDICATES: Record<TabKey, (u: CustomerData) => boolean> = {
  all: () => true,
  leads: (u) => (u.leadsCount ?? 0) > 0,
  subscribers: (u) => (u.servicesAvailed ?? 0) > 0,
  events: (u) => (u.eventsEnrolled ?? 0) > 0,
  kyc: (u) => !!u.pannumber?.trim() && u.pannumber !== "-",
};

export default function CustomersPage() {
  const session = useSession();
  const [data, setData] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("registeredAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    const token =
      session.data?.user?.backendToken || (session.data as any)?.backendToken;
    if (!token) return;

    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/customerstable`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then((res) => { if (res?.data) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session.data]);

  // ── Gender normalization helper ──
  const normalizeGender = (g?: string) => {
    const v = g?.trim().toUpperCase();
    if (v === "M" || v === "MALE") return "Male";
    if (v === "F" || v === "FEMALE") return "Female";
    if (v === "O" || v === "OTHER") return "Other";
    return null; // unset / "-"
  };

  // ── KPIs ──
  const totalUsers = data.length;
  const maleCount = useMemo(
    () => data.filter((u) => normalizeGender(u.gender) === "Male").length,
    [data]
  );
  const femaleCount = useMemo(
    () => data.filter((u) => normalizeGender(u.gender) === "Female").length,
    [data]
  );

  const tabCounts = useMemo(
    () => ({
      all: data.length,
      leads: data.filter(TAB_PREDICATES.leads).length,
      subscribers: data.filter(TAB_PREDICATES.subscribers).length,
      events: data.filter(TAB_PREDICATES.events).length,
      kyc: data.filter(TAB_PREDICATES.kyc).length,
    }),
    [data]
  );

  // ── Gender Pie ──
  const genderPie = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((u) => {
      const g = normalizeGender(u.gender) ?? "Not Set";
      counts[g] = (counts[g] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [data]);

  // ── Signup trend by month (last 12 months) ──
  const signupTrend = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((u) => {
      if (!u.createdAt) return;
      try {
        const d = new Date(u.createdAt);
        const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        counts[key] = (counts[key] || 0) + 1;
      } catch {}
    });
    // Sort chronologically and take last 12
    const sorted = Object.entries(counts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => {
        const parse = (s: string) => {
          const [m, y] = s.split(" ");
          return new Date(`${m} 20${y}`).getTime();
        };
        return parse(a.month) - parse(b.month);
      })
      .slice(-12);
    return sorted;
  }, [data]);

  // ── Product-wise breakup: unique customers per product type ──
  const productBreakup = useMemo(() => {
    const plans = data.filter((u) => (u.plansCount ?? 0) > 0).length;
    const portfolios = data.filter((u) => (u.portfoliosCount ?? 0) > 0).length;
    const events = data.filter((u) => (u.eventsEnrolled ?? 0) > 0).length;
    return [
      { name: "Plans", value: plans, color: "#6366f1" },
      { name: "Portfolios", value: portfolios, color: "#10b981" },
      { name: "Events", value: events, color: "#f59e0b" },
    ];
  }, [data]);
  const productTotal = productBreakup.reduce((a, b) => a + b.value, 0);

  // ── Subscribers breakup: unique customers by subscription state ──
  // Active and Inactive are mutually exclusive (Inactive = ALL subs expired),
  // so Active + Inactive = Total. Counts subs across plans/portfolios/packages.
  const subscribersBreakup = useMemo(() => {
    let active = 0;
    let inactive = 0;
    data.forEach((u) => {
      const a = u.activeSubscriptions ?? 0;
      const i = u.inactiveSubscriptions ?? 0;
      if (a > 0) active += 1;
      else if (i > 0) inactive += 1;
    });
    return {
      total: active + inactive,
      active,
      inactive,
      chart: [
        { name: "Active", value: active, color: "#10b981" },
        { name: "Inactive", value: inactive, color: "#94a3b8" },
      ],
    };
  }, [data]);

  // ── Flatten users → one row per subscription (or one empty row if none) ──
  const flattenedRows = useMemo<CustomerTableRow[]>(() => {
    const out: CustomerTableRow[] = [];
    for (const u of data) {
      const base = {
        userId: u._id,
        registeredAt: u.createdAt,
        name: u.name || "",
        email: u.email || "",
        number: u.number,
        pannumber: u.pannumber || "",
        dob: u.dob || "",
        broker: u.broker || "",
      };
      if (u.subscriptions && u.subscriptions.length > 0) {
        for (const s of u.subscriptions) {
          out.push({
            ...base,
            raTagged: s.raName,
            service: s.type,
            status: s.status,
          });
        }
      } else {
        out.push({ ...base, raTagged: "—", service: "—", status: "—" });
      }
    }
    return out;
  }, [data]);

  // ── Filtered + sorted table ──
  const processed = useMemo(() => {
    const q = search.toLowerCase();
    const tabPredicate = TAB_PREDICATES[activeTab];
    // The tab filter still operates on the user level — look up the user once.
    const usersById = new Map(data.map((u) => [u._id, u]));
    const filtered = flattenedRows.filter((row) => {
      const user = usersById.get(row.userId);
      if (!user || !tabPredicate(user)) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        String(row.number).includes(q) ||
        row.pannumber.toLowerCase().includes(q) ||
        row.raTagged.toLowerCase().includes(q) ||
        row.service.toLowerCase().includes(q)
      );
    });
    return [...filtered].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, flattenedRows, search, activeTab, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      processed.map((r) => ({
        "Registered on - Date, time": formatDateTime(r.registeredAt),
        Name: r.name,
        "Email Id": r.email,
        "Phone no": r.number,
        "Pan No": r.pannumber || "—",
        DOB: r.dob ? formatDate(r.dob) : "—",
        "RA Tagged": r.raTagged,
        Service: r.service,
        Status: r.status,
        Broker: r.broker || "—",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, `Customers_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 text-indigo-500" />
      : <ArrowDown className="w-3 h-3 text-indigo-500" />;
  };

  const Th = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 whitespace-nowrap"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label} <SortIcon field={field} />
      </span>
    </th>
  );

  if (loading || session.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading customers…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4">
      <Toaster />

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">All registered platform users</p>
        </div>
        <button
          onClick={exportToExcel}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* ── Segment Tabs ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-1.5 inline-flex flex-wrap gap-1 max-w-full overflow-x-auto">
        {([
          { key: "all", label: "Total Customers" },
          { key: "leads", label: "Leads" },
          { key: "subscribers", label: "Plan Subscribers" },
          { key: "events", label: "Event Enrolled" },
          { key: "kyc", label: "KYC Verified" },
        ] as { key: TabKey; label: string }[]).map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  active ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {tabCounts[t.key].toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Charts ── */}
      {data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-5">
          {/* Signup Trend */}
          <div className="lg:col-span-2 xl:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">User Signup Trend</h3>
            <p className="text-xs text-gray-400 mb-4">Monthly new registrations (last 12 months)</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={signupTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#signupGradient)"
                  dot={{ r: 3, fill: "#6366f1" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Product-wise Breakup */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Product-wise Breakup</h3>
            <p className="text-xs text-gray-400 mb-2">
              Unique customers per product type
            </p>
            {productTotal > 0 ? (
              <>
                <div className="flex-1 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={productBreakup.filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {productBreakup
                          .filter((d) => d.value > 0)
                          .map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, name) => [
                          (v as number).toLocaleString(),
                          name as string,
                        ]}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {productBreakup.map((p) => (
                    <div
                      key={p.name}
                      className="text-center p-2.5 rounded-xl"
                      style={{ backgroundColor: `${p.color}14` }}
                    >
                      <p
                        className="text-base font-bold"
                        style={{ color: p.color }}
                      >
                        {p.value}
                      </p>
                      <p className="text-xs text-gray-500">{p.name}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-300">
                No product data yet
              </div>
            )}
          </div>

          {/* Subscribers Breakup */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Subscribers Breakup</h3>
            <p className="text-xs text-gray-400 mb-2">
              Active vs inactive subscribers (all expired = inactive)
            </p>
            {subscribersBreakup.total > 0 ? (
              <>
                <div className="relative flex-1 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={subscribersBreakup.chart.filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={82}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {subscribersBreakup.chart
                          .filter((d) => d.value > 0)
                          .map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, name) => [
                          (v as number).toLocaleString(),
                          name as string,
                        ]}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -mt-6">
                    <span className="text-2xl font-bold text-gray-900 leading-none">
                      {subscribersBreakup.total.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-1">
                      Total
                    </span>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="text-center p-2.5 rounded-xl bg-emerald-50">
                    <p className="text-base font-bold text-emerald-700">
                      {subscribersBreakup.active}
                    </p>
                    <p className="text-xs text-gray-500">Active</p>
                  </div>
                  <div className="text-center p-2.5 rounded-xl bg-gray-100">
                    <p className="text-base font-bold text-gray-600">
                      {subscribersBreakup.inactive}
                    </p>
                    <p className="text-xs text-gray-500">Inactive</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-300">
                No subscribers yet
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">All Customer data </h3>
            <p className="text-xs text-gray-400">
              {processed.length.toLocaleString()} row
              {processed.length !== 1 ? "s" : ""} across {totalUsers.toLocaleString()} customer
              {totalUsers !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone or PAN…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
            />
          </div>
        </div>

        {processed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="w-10 h-10 text-gray-200" />
            <p className="text-sm text-gray-400">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <Th label="Registered on — Date, time" field="registeredAt" />
                  <Th label="Name" field="name" />
                  <Th label="Email Id" field="email" />
                  <Th label="Phone no" field="number" />
                  <Th label="Pan No" field="pannumber" />
                  <Th label="DOB" field="dob" />
                  <Th label="RA Tagged" field="raTagged" />
                  <Th label="Service" field="service" />
                  <Th label="Status" field="status" />
                  <Th label="Broker" field="broker" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {processed.map((row, idx) => {
                  const initials = row.name
                    ?.split(" ")
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase())
                    .join("") || "?";

                  const serviceColor =
                    row.service === "Plan"
                      ? "text-indigo-600 bg-indigo-50"
                      : row.service === "Model Portfolio"
                      ? "text-emerald-600 bg-emerald-50"
                      : row.service === "Event"
                      ? "text-amber-600 bg-amber-50"
                      : "text-gray-400 bg-gray-100";

                  const statusColor =
                    row.status === "Active"
                      ? "text-emerald-600 bg-emerald-50"
                      : row.status === "Inactive"
                      ? "text-gray-500 bg-gray-100"
                      : row.status === "Registered"
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-400 bg-gray-100";

                  return (
                    <tr
                      key={`${row.userId}-${idx}`}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      {/* Registered on */}
                      <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                        {formatDateTime(row.registeredAt)}
                      </td>
                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-indigo-600">{initials}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-800 truncate max-w-[140px]">
                            {row.name || "—"}
                          </span>
                        </div>
                      </td>
                      {/* Email */}
                      <td className="px-4 py-3.5 text-sm text-gray-600 truncate max-w-[180px]">
                        {row.email || "—"}
                      </td>
                      {/* Phone */}
                      <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                        {row.number || "—"}
                      </td>
                      {/* PAN */}
                      <td className="px-4 py-3.5">
                        {row.pannumber ? (
                          <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg">
                            {row.pannumber}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      {/* DOB */}
                      <td className="px-4 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                        {row.dob ? formatDate(row.dob) : <span className="text-gray-300">—</span>}
                      </td>
                      {/* RA Tagged */}
                      <td className="px-4 py-3.5 text-sm text-gray-700 truncate max-w-[160px]">
                        {row.raTagged || "—"}
                      </td>
                      {/* Service */}
                      <td className="px-4 py-3.5">
                        {row.service && row.service !== "—" ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${serviceColor}`}>
                            {row.service}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {row.status && row.status !== "—" ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
                            {row.status}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      {/* Broker */}
                      <td className="px-4 py-3.5 text-xs text-gray-600 whitespace-nowrap capitalize">
                        {row.broker || <span className="text-gray-300">—</span>}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="inline-flex items-center gap-1">
                          <CustomersMoreInfo _id={row.userId} />
                          <ViewAsCustomerButton
                            userId={row.userId}
                            adminToken={
                              session.data?.user?.backendToken ||
                              (session.data as any)?.backendToken
                            }
                          />
                        </div>
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

// "View as Customer" — mirrors the SP impersonation flow on the approval
// details page. Stashes the admin's NextAuth cookie, mints a short-lived
// impersonation token for the target user, then opens the bridge page
// which swaps the cookie and lands on the customer dashboard.
// The ImpersonationBanner at the top of the user dashboard handles exit.
function ViewAsCustomerButton({
  userId,
  adminToken,
}: {
  userId: string;
  adminToken?: string;
}) {
  const [loading, setLoading] = useState(false);

  const start = async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const stashRes = await fetch("/api/admin/impersonate/stash", {
        method: "POST",
        credentials: "include",
      });
      if (!stashRes.ok) {
        const json = await stashRes.json().catch(() => ({}));
        alert(json?.message ?? "Failed to back up admin session");
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/impersonate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ targetId: userId, targetType: "user" }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json?.token) {
        alert(json?.message ?? "Failed to start impersonation");
        return;
      }
      window.location.href = `/auth/impersonate?token=${encodeURIComponent(
        json.token
      )}&dest=${encodeURIComponent("/dashboard/user")}`;
    } catch {
      alert("Failed to start impersonation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={start}
      disabled={loading || !adminToken}
      title="Open this customer's dashboard as them"
      className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-60 transition-colors"
    >
      <ExternalLink className="w-4 h-4" />
    </button>
  );
}
