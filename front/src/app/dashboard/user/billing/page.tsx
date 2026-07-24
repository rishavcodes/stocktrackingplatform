"use client";

import { useMemo, useState } from "react";
import fetcher from "@/lib/data/setup";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import {
  CreditCard,
  IndianRupee,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

/**
 * Normalises raw `validity` values stored on orders into a human-readable
 * label. Handles plain day-counts ("30" → "30 days"), pre-formatted strings
 * ("12 months", "2 years") and comma-separated metadata ("30,2024-01-01" → first part).
 */
function formatValidity(validity: unknown): string {
  if (validity == null || validity === "") return "—";
  const raw = String(validity).trim();

  // If a unit is already present, keep it (taking the first comma-segment).
  if (/month|year|day|week/i.test(raw)) {
    return raw.split(",")[0].trim();
  }

  // Pull the leading integer (handles "30" or "30,..." or "30 ").
  const match = raw.match(/^\s*(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 365 && num % 365 === 0) {
      const years = num / 365;
      return `${years} year${years === 1 ? "" : "s"}`;
    }
    if (num >= 30 && num % 30 === 0 && num <= 360) {
      const months = num / 30;
      return `${months} month${months === 1 ? "" : "s"}`;
    }
    return `${num} day${num === 1 ? "" : "s"}`;
  }

  return raw;
}

interface Order {
  _id: string;
  serviceName: string;
  soldBy: { name: string; id: string };
  subtotal?: number;
  gst?: number;
  total?: number;
  amount?: number;
  paymentMethod: string;
  type?: string;
  validity: string;
  isExpired: boolean;
  invoiceLink?: string;
  startDate?: string;
  endDate?: string;
  isRenewal?: boolean;
  createdAt: string;
}

interface CourseOrder {
  _id: string;
  courseId: { _id: string; title: string } | null;
  subtotal: number;
  gst: number;
  total: number;
  status: string;
  createdAt: string;
}

interface BillingData {
  success: boolean;
  data: {
    orders: Order[];
    courseOrders: CourseOrder[];
  };
}

export default function UserBillingPage() {
  const { data: session } = useSession();

  const { data, isLoading } = useSWR<BillingData>(
    session?.user?.id
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/user-billing?userId=${session.user.id}`
      : null,
    fetcher
  );

  const orders = data?.data?.orders || [];
  const courseOrders = data?.data?.courseOrders || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  // Date range filter — from/to inclusive on the day. Empty string = unbounded.
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  // Sort: column key + direction. dir === null means no sort (insertion order).
  type SortKey = "createdAt" | "serviceName" | "type" | "expert" | "amount" | "validity";
  type SortDir = "asc" | "desc" | null;
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (key: SortKey) => {
    // Click cycle: same column asc → desc → none; new column → asc
    setSortKey((prevKey) => {
      if (prevKey !== key) {
        setSortDir("asc");
        return key;
      }
      setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"));
      return key;
    });
  };

  // Unique providers and types for filter dropdowns
  const providerOptions = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => { if (o.soldBy?.name) set.add(o.soldBy.name); });
    return Array.from(set).sort();
  }, [orders]);

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => { if (o.type) set.add(o.type); });
    return Array.from(set).sort();
  }, [orders]);

  // Filtered + sorted orders. Filtering first to keep the sort small.
  const filteredOrders = useMemo(() => {
    // Parse date filter bounds once. `toDate` is inclusive of the whole day,
    // so we bump it to end-of-day to avoid losing entries timestamped late.
    const fromTs = fromDate ? new Date(fromDate).getTime() : null;
    const toTs = toDate
      ? new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1
      : null;

    const filtered = orders.filter((o) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (
          !o.serviceName?.toLowerCase().includes(q) &&
          !o.soldBy?.name?.toLowerCase().includes(q)
        ) return false;
      }
      if (providerFilter !== "all" && o.soldBy?.name !== providerFilter) return false;
      if (typeFilter !== "all" && o.type !== typeFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "active" && o.isExpired) return false;
        if (statusFilter === "expired" && !o.isExpired) return false;
      }
      if (fromTs !== null || toTs !== null) {
        const ts = new Date(o.createdAt).getTime();
        if (fromTs !== null && ts < fromTs) return false;
        if (toTs !== null && ts > toTs) return false;
      }
      return true;
    });

    if (!sortDir) return filtered;

    // Per-column accessor — keeps the sort comparator small and explicit.
    const valueOf = (o: Order): string | number => {
      switch (sortKey) {
        case "createdAt":   return new Date(o.createdAt).getTime();
        case "serviceName": return (o.serviceName || "").toLowerCase();
        case "type":        return (o.type || "service").toLowerCase();
        case "expert":      return (o.soldBy?.name || "").toLowerCase();
        case "amount":      return o.total || o.amount || 0;
        case "validity":    return formatValidity(o.validity).toLowerCase();
      }
    };

    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [orders, searchQuery, providerFilter, typeFilter, statusFilter, fromDate, toDate, sortKey, sortDir]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    providerFilter !== "all" ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    fromDate !== "" ||
    toDate !== "";

  const clearFilters = () => {
    setSearchQuery("");
    setProviderFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
    setFromDate("");
    setToDate("");
  };

  // Course orders aren't piped through the main filter list (no provider,
  // type, status), so we apply just the date-range filter to them here. That
  // way the summary cards above reflect "what the user is currently looking
  // at" when they pick e.g. Jan → Feb.
  const filteredCourseOrders = useMemo(() => {
    if (!fromDate && !toDate) return courseOrders;
    const fromTs = fromDate ? new Date(fromDate).getTime() : null;
    const toTs = toDate
      ? new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1
      : null;
    return courseOrders.filter((c) => {
      const ts = new Date(c.createdAt).getTime();
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      return true;
    });
  }, [courseOrders, fromDate, toDate]);

  // Summary cards now reflect the FILTERED data (search, provider, type,
  // status, date) so picking "Jan → Feb" rolls the totals up to just that
  // window. The unfiltered raw arrays are still used for `hasData` so the
  // page doesn't show the "No purchases yet" empty state when the user is
  // simply on a filter that has no matches.
  const summary = useMemo(() => {
    let totalSpent = 0;
    let activeCount = 0;
    let expiredCount = 0;

    filteredOrders.forEach((o) => {
      totalSpent += o.total || o.amount || 0;
      if (o.isExpired) expiredCount++;
      else activeCount++;
    });

    filteredCourseOrders.forEach((c) => {
      totalSpent += c.total || 0;
    });

    return {
      totalSpent,
      activeCount,
      expiredCount,
      totalOrders: filteredOrders.length + filteredCourseOrders.length,
    };
  }, [filteredOrders, filteredCourseOrders]);

  const hasData = orders.length > 0 || courseOrders.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
    

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
          <div className="h-96 rounded-xl bg-muted animate-pulse" />
        </div>
      ) : !hasData ? (
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 md:p-8">
          <div className="flex flex-col items-center justify-center py-12 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mb-4">
              <CreditCard className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              No purchases yet
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Once you subscribe to services, portfolios, or courses, your billing
              history will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              label="Total Spent"
              value={summary.totalSpent.toLocaleString("en-IN")}
              icon={<IndianRupee className="w-5 h-5" />}
              color="blue"
            />
            <SummaryCard
              label="Total Orders"
              value={summary.totalOrders.toString()}
              icon={<FileText className="w-5 h-5" />}
              color="purple"
            />
            <SummaryCard
              label="Active"
              value={summary.activeCount.toString()}
              icon={<CheckCircle2 className="w-5 h-5" />}
              color="green"
            />
            <SummaryCard
              label="Expired"
              value={summary.expiredCount.toString()}
              icon={<Clock className="w-5 h-5" />}
              color="gray"
            />
          </div>

          {/* Service / Portfolio / Package Orders */}
          {orders.length > 0 && (
            <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 space-y-4">
                

                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search by plan or provider…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      From
                    </label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      max={toDate || undefined}
                      className="h-9 text-sm w-[150px]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      To
                    </label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      min={fromDate || undefined}
                      className="h-9 text-sm w-[150px]"
                    />
                  </div>
                  {/* <div className="min-w-[160px]">
                    <Select value={providerFilter} onValueChange={setProviderFilter}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All Providers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Providers</SelectItem>
                        {providerOptions.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div> */}
                  {/* <div className="min-w-[130px]">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {typeOptions.map((t) => (
                          <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div> */}
                  {/* <div className="min-w-[130px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div> */}
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline h-9 px-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-gray-100 dark:border-gray-800">
                      <SortableTh label="Date"     k="createdAt"   sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                      <SortableTh label="Name"     k="serviceName" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                      <SortableTh label="Type"     k="type"        sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                      <SortableTh label="Expert"   k="expert"      sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                      <SortableTh label="Amount"   k="amount"      sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                      <SortableTh label="Validity" k="validity"    sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                      <th className="px-3 sm:px-4 md:px-6 py-3 font-medium text-center">Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 sm:px-6 py-12 text-center text-muted-foreground"
                        >
                          No orders match your filters.
                        </td>
                      </tr>
                    ) : null}
                    {filteredOrders.map((order) => (
                      <tr
                        key={order._id}
                        className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition"
                      >
                        <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-muted-foreground whitespace-nowrap">
                          <div className="flex flex-col leading-tight">
                            <span>
                              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-[11px] text-muted-foreground/80">
                              {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 font-medium text-gray-900 dark:text-white max-w-[200px] truncate">
                          {order.serviceName}
                          {order.isRenewal && (
                            <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded">
                              Renewal
                            </span>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 capitalize text-muted-foreground whitespace-nowrap">
                          {order.type || "service"}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-muted-foreground whitespace-nowrap">
                          {order.soldBy?.name || "-"}
                        </td>
                        <td className="pl-2 pr-3 sm:pl-3 sm:pr-4 md:pl-4 md:pr-6 py-3 md:py-4 font-semibold whitespace-nowrap">
                          {(order.total || order.amount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-muted-foreground whitespace-nowrap">
                          {formatValidity(order.validity)}
                        </td>
                        <td className="px-3 sm:px-4 md:px-6 py-3 md:py-4 text-center">
                          {order.invoiceLink ? (
                            <a
                              href={order.invoiceLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Course Orders */}
          {courseOrders.length > 0 && (
            <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Course Purchases
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-gray-100 dark:border-gray-800">
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Course</th>
                      <th className="px-6 py-3 font-medium">Subtotal</th>
                      <th className="px-6 py-3 font-medium">GST</th>
                      <th className="px-6 py-3 font-medium">Total</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseOrders.map((co) => (
                      <tr
                        key={co._id}
                        className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition"
                      >
                        <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                          {new Date(co.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white max-w-[250px] truncate">
                          {co.courseId?.title || "Unknown Course"}
                        </td>
                        <td className="px-6 py-4">
                          Rs. {(co.subtotal || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4">
                          Rs. {(co.gst || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4 font-semibold">
                          Rs. {(co.total || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function SortableTh({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
}: {
  label: string;
  k: "createdAt" | "serviceName" | "type" | "expert" | "amount" | "validity";
  sortKey: string;
  sortDir: "asc" | "desc" | null;
  onClick: (k: "createdAt" | "serviceName" | "type" | "expert" | "amount" | "validity") => void;
}) {
  const active = sortKey === k && sortDir !== null;
  const Icon = !active
    ? ArrowUpDown
    : sortDir === "asc"
      ? ArrowUp
      : ArrowDown;
  return (
    <th className="px-3 sm:px-4 md:px-6 py-3 font-medium">
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1 transition-colors ${
          active
            ? "text-gray-900 dark:text-white"
            : "text-muted-foreground hover:text-gray-700 dark:hover:text-gray-300"
        }`}
      >
        {label}
        <Icon className={`w-3.5 h-3.5 ${active ? "opacity-100" : "opacity-50"}`} />
      </button>
    </th>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "blue" | "purple" | "green" | "gray";
}) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
    purple: "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400",
    green: "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400",
    gray: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  };

  return (
    <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
