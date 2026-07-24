"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Download,
  Users,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type ServiceProvider = {
  _id: string;
  RegName: string;
  email: string;
  regNumber: string;
  category: string;
  type: string;
  verified: boolean;
  number?: string;
  city?: string;
  state?: string;
  certificate?: string;
  createdAt?: string;
  // NEW columns — backend must populate these on the /serviceproviders
  // endpoint. Optional so legacy responses without them still render
  // gracefully (the cell shows "—").
  wallet?: { amount?: number } | null;
  subscriptionActive?: boolean;
  revenue?: number;
  // Total count of verified sales (orders) for this SP. Distinct from
  // `revenue`, which is the sum of those orders' totals.
  totalSales?: number;
};

type SortKey =
  | "RegName"
  | "email"
  | "category"
  | "city"
  | "state"
  | "type"
  | "createdAt"
  | "walletBalance"
  | "revenue"
  | "totalSales";
type SortDir = "asc" | "desc";

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// INR formatter — shows "₹1,23,456" with no decimals for the common case
// of whole-rupee amounts, falls back to "—" when the value is missing.
function formatINR(amount: number | undefined | null): string {
  if (amount == null || isNaN(Number(amount))) return "—";
  return `₹${Number(amount).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

const CATEGORY_SHORT: Record<string, string> = {
  "Research Analyst": "RA",
  Broker: "BRK",
};

function shortCategory(cat: string): string {
  return CATEGORY_SHORT[cat] ?? cat;
}

export default function ApprovedProviders() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  // Active fiscal-year filter — calendar year (Jan 1 – Dec 31). Values are
  // "all" or a YYYY string like "2026".
  const [activeYear, setActiveYear] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("RegName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.backendToken}`,
  };

  const url =
    status === "authenticated"
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/serviceproviders?verified=true`
      : null;

  const { data, isLoading } = useSWR<{ serviceProviders: ServiceProvider[] }>(
    url,
    (url: string) => fetcher(url, { headers })
  );

  /* ---- Derive category list from data ---- */
  const categories = useMemo(() => {
    if (!data?.serviceProviders) return ["All"];
    const cats = new Set(data.serviceProviders.map((p) => p.category));
    return ["All", ...Array.from(cats).sort()];
  }, [data]);

  /* ---- Category counts ---- */
  const categoryCounts = useMemo(() => {
    if (!data?.serviceProviders) return {} as Record<string, number>;
    const counts: Record<string, number> = {
      All: data.serviceProviders.length,
    };
    data.serviceProviders.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [data]);

  /* ---- FY (calendar-year) filter options + counts ----
     Builds the unique years present in the data so the dropdown only shows
     years that actually have providers. Sorted newest-first — admins
     scanning recent signups want the latest FY at the top. */
  const yearOptions = useMemo(() => {
    if (!data?.serviceProviders) return [] as { value: string; label: string; count: number }[];
    const buckets = new Map<string, number>();
    for (const p of data.serviceProviders) {
      if (!p.createdAt) continue;
      const d = new Date(p.createdAt);
      if (isNaN(d.getTime())) continue;
      const key = String(d.getFullYear());
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, count]) => ({ value: key, label: `FY ${key}`, count }));
  }, [data]);

  /* ---- Filtering + Sorting ---- */
  const processed = useMemo(() => {
    if (!data?.serviceProviders) return [];
    const q = searchQuery.toLowerCase();

    const filtered = data.serviceProviders.filter((p) => {
      const matchesSearch =
        p.RegName?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.regNumber?.toLowerCase().includes(q);
      const matchesCategory =
        activeCategory === "All" || p.category === activeCategory;
      // FY match: a provider matches "2026" if their createdAt falls inside
      // calendar year 2026. Providers without a createdAt fall out of any
      // active year filter — we don't know when they registered.
      let matchesYear = true;
      if (activeYear !== "all") {
        if (!p.createdAt) {
          matchesYear = false;
        } else {
          const d = new Date(p.createdAt);
          matchesYear = String(d.getFullYear()) === activeYear;
        }
      }
      return matchesSearch && matchesCategory && matchesYear;
    });

    return [...filtered].sort((a, b) => {
      // Dates sort numerically by epoch time — missing values pushed to the
      // bottom regardless of direction so they don't masquerade as "oldest".
      if (sortKey === "createdAt") {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sortDir === "asc" ? aTime - bTime : bTime - aTime;
      }
      // Wallet + revenue sort numerically. Missing values treated as 0 so
      // they cluster at the bottom on descending (admins usually want
      // top-revenue first).
      if (sortKey === "walletBalance") {
        const aNum = Number(a.wallet?.amount ?? 0);
        const bNum = Number(b.wallet?.amount ?? 0);
        return sortDir === "asc" ? aNum - bNum : bNum - aNum;
      }
      if (sortKey === "revenue") {
        const aNum = Number(a.revenue ?? 0);
        const bNum = Number(b.revenue ?? 0);
        return sortDir === "asc" ? aNum - bNum : bNum - aNum;
      }
      if (sortKey === "totalSales") {
        const aNum = Number(a.totalSales ?? 0);
        const bNum = Number(b.totalSales ?? 0);
        return sortDir === "asc" ? aNum - bNum : bNum - aNum;
      }
      const aVal = ((a as any)[sortKey] ?? "").toString().toLowerCase();
      const bVal = ((b as any)[sortKey] ?? "").toString().toLowerCase();
      return sortDir === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }, [data, searchQuery, activeCategory, activeYear, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleRowClick = (id: string) =>
    router.push(`/dashboard/admin/serviceprovider/${id}`);

  const handleExportToExcel = () => {
    const exportData = processed.map((p) => ({
      Name: p.RegName,
      Email: p.email,
      Phone: p.number ?? "",
      Type: p.type ?? "",
      Category: p.category,
      Subscription:
        p.subscriptionActive === undefined
          ? ""
          : p.subscriptionActive
            ? "Active"
            : "Inactive",
      "Wallet Balance": p.wallet?.amount ?? 0,
      "Total Sales": p.totalSales ?? 0,
      Revenue: p.revenue ?? 0,
      City: p.city ?? "",
      State: p.state ?? "",
      Registered: formatDate(p.createdAt),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ApprovedProviders");
    XLSX.writeFile(
      wb,
      `Approved_Providers_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  /* ---- Sortable Header ---- */
  const SortableHeader = ({
    label,
    field,
  }: {
    label: string;
    field: SortKey;
  }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`w-3 h-3 ${sortKey === field ? "text-emerald-600" : "text-gray-300"
            }`}
        />
      </span>
    </th>
  );

  /* ---- LOADING ---- */
  if (status === "loading" || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">
          Loading approved providers…
        </p>
      </div>
    );
  }

  /* ---- EMPTY ---- */
  if (!data?.serviceProviders?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
          <Users className="w-8 h-8 text-emerald-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-700">
            No approved providers yet
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Approved service providers will appear here
          </p>
        </div>
      </div>
    );
  }

  /* ---- MAIN UI ---- */
  return (
    // w-full + max-w-full + min-w-0 cap the component to its parent's width so
    // a wide inner table can't push the page horizontally. overflow-x-hidden
    // is the belt-and-braces backstop. The actual scroll lives on the inner
    // table card below.
    <div className="space-y-5 px-4 py-6 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or reg no…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {processed.length} provider{processed.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={handleExportToExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters — category + month dropdowns */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Category */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="approved-category-filter"
            className="text-xs font-semibold text-gray-600"
          >
            Category
          </label>
          <div className="relative">
            <select
              id="approved-category-filter"
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="appearance-none pl-3 pr-9 h-10 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition cursor-pointer min-w-[220px]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All"
                    ? `All (${categoryCounts[cat] ?? 0})`
                    : `${cat} (${shortCategory(cat)}) · ${categoryCounts[cat] ?? 0}`}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Financial year (calendar year: Jan 1 – Dec 31) */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="approved-fy-filter"
            className="text-xs font-semibold text-gray-600"
          >
            Financial year
          </label>
          <div className="relative">
            <select
              id="approved-fy-filter"
              value={activeYear}
              onChange={(e) => setActiveYear(e.target.value)}
              className="appearance-none pl-3 pr-9 h-10 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition cursor-pointer min-w-[180px]"
            >
              <option value="all">All years</option>
              {yearOptions.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label} · {y.count}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Clear-all — one link covers both filters */}
        {(activeCategory !== "All" || activeYear !== "all") && (
          <button
            type="button"
            onClick={() => {
              setActiveCategory("All");
              setActiveYear("all");
            }}
            className="text-xs font-medium text-gray-500 hover:text-emerald-700 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* No results */}
      {processed.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">
            No providers match your search
            {activeCategory !== "All" && ` in "${activeCategory}"`}
          </p>
        </div>
      )}

      {/* ---- Desktop Table ----
          Outer card clips the rounded corners; inner div owns the horizontal
          scroll so the scrollbar lives inside the card, not under the page.
          `overscroll-x-contain` stops a left-swipe inside the table from
          triggering the browser's back-gesture on Mac trackpads.
          `overflow-x-scroll` (vs auto) forces the scrollbar to always show on
          macOS, where auto-hidden scrollbars make wide tables look truncated.
          The `[&::-webkit-scrollbar*]` arbitrary variants thin and colour it
          so it reads as a UI element instead of a stray gray bar. */}
      {processed.length > 0 && (
        <div className="hidden md:block w-full max-w-full border border-gray-200 rounded-2xl overflow-hidden bg-white">
          <div
            className="w-full overflow-x-scroll overscroll-x-contain
              [&::-webkit-scrollbar]:h-2
              [&::-webkit-scrollbar-track]:bg-gray-100
              [&::-webkit-scrollbar-thumb]:bg-gray-300
              [&::-webkit-scrollbar-thumb]:rounded-full
              hover:[&::-webkit-scrollbar-thumb]:bg-gray-400"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#d1d5db #f3f4f6" }}
          >
            {/* `whitespace-nowrap` keeps every cell on one line, so columns
                size to their natural content. That makes the table wider
                than the scroller and forces the horizontal scrollbar to
                appear. `min-w-max` is the belt-and-braces backup. */}
            <table className="min-w-max whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortableHeader label="Registered" field="createdAt" />
                  <SortableHeader label="Name" field="RegName" />
                  <SortableHeader label="Email" field="email" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <SortableHeader label="Type" field="type" />
                  <SortableHeader label="Category" field="category" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Subscription
                  </th>
                  <SortableHeader label="Wallet" field="walletBalance" />
                  <SortableHeader label="Sales" field="totalSales" />
                  <SortableHeader label="Revenue" field="revenue" />
                  <SortableHeader label="City" field="city" />
                  <SortableHeader label="State" field="state" />
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {processed.map((p) => (
                  <tr
                    key={p._id}
                    onClick={() => handleRowClick(p._id)}
                    className="group cursor-pointer hover:bg-emerald-50/50 transition-colors"
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="text-xs text-gray-500">
                        {formatDate(p.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-gray-800">
                        {p.RegName}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600 max-w-[180px] truncate">
                      {p.email}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {p.number ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {p.type ?? "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-medium text-blue-700" title={p.category}>
                        {shortCategory(p.category)}
                      </span>
                    </td>
                    {/* Subscription — coloured pill so the admin can scan
                        active vs inactive at a glance. */}
                    <td className="px-4 py-3.5">
                      {p.subscriptionActive === undefined ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : p.subscriptionActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-gray-700 whitespace-nowrap">
                      {formatINR(p.wallet?.amount)}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-gray-700 whitespace-nowrap">
                      {p.totalSales != null
                        ? p.totalSales.toLocaleString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium text-gray-700 whitespace-nowrap">
                      {formatINR(p.revenue)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {p.city ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {p.state ?? "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Mobile Cards ---- */}
      {processed.length > 0 && (
        <div className="md:hidden space-y-3">
          {processed.map((p) => (
            <div
              key={p._id}
              onClick={() => handleRowClick(p._id)}
              className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-800 truncate">
                    {p.RegName}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">{p.email}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-gray-400 block">Phone</span>
                  <span className="text-gray-700 font-medium">
                    {p.number ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Subscription</span>
                  {p.subscriptionActive === undefined ? (
                    <span className="text-gray-400">—</span>
                  ) : p.subscriptionActive ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      Inactive
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-gray-400 block">Wallet</span>
                  <span className="text-gray-700 font-medium">
                    {formatINR(p.wallet?.amount)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Sales</span>
                  <span className="text-gray-700 font-medium">
                    {p.totalSales != null
                      ? p.totalSales.toLocaleString("en-IN")
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Revenue</span>
                  <span className="text-gray-700 font-medium">
                    {formatINR(p.revenue)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">City / State</span>
                  <span className="text-gray-700 font-medium">
                    {[p.city, p.state].filter(Boolean).join(", ") || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Category</span>
                  <span className="text-xs font-medium text-blue-700" title={p.category}>
                    {shortCategory(p.category)}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {formatDate(p.createdAt)}
                </span>
                <span className="text-xs text-gray-500">
                  {p.type ?? "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}