"use client";

import * as XLSX from "xlsx";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { transactionsType } from "@/app/dashboard/serviceprovider/services/transactions/page";
import {
    PhoneIcon,
    Search,
    Users,
    UserCheck,
    RefreshCw,
    ShoppingBag,
    Layers,
} from "lucide-react";
import EmailIcon from "@/icons/EmailIcon";
import ProfileIcon from "@/icons/ProfileIcon";
import EyeIcon from "@/icons/EyeIcon";
import Link from "next/link";

// A unique subscriber derived (client-side) from the flat orders list.
export type Subscriber = {
    id: string;
    latestOrder: transactionsType;
    orders: transactionsType[]; // newest-first
    totalServices: number;
    activeCount: number;
    hasRenewal: boolean;
    types: Set<string>;
};

type TypeFilter = "all" | "service" | "portfolio" | "package" | "event";
type PurchaseTypeFilter = "all" | "fresh" | "renewal";
type SortField = "date" | "customer" | "service" | "amount" | "status";
type SortDir = "asc" | "desc";

type PresenceEntry = { isOnline: boolean; lastSeenAt: string | null };

function lastSeenLabel(iso?: string | null): string {
    if (!iso) return "never";
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.round(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return new Date(iso).toLocaleDateString("en-IN");
}

export default function SubscribersClient({ transactions }: { transactions: transactionsType[] }) {
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [purchaseTypeFilter, setPurchaseTypeFilter] = useState<PurchaseTypeFilter>("all");
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [sortField, setSortField] = useState<SortField>("date");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    /* ---------- Live "online now" presence (authenticated, polled) ---------- */
    const { data: session } = useSession();
    const token =
        (session as any)?.backendToken || (session?.user as any)?.backendToken;
    const [presence, setPresence] = useState<Record<string, PresenceEntry>>({});

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        const load = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/subscriber-presence`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const json = await res.json();
                if (!cancelled && json?.success) setPresence(json.presence || {});
            } catch {
                // ignore — dots simply stay as-is
            }
        };
        load();
        // Poll so the dots stay roughly in step with the 5-min online window.
        const interval = setInterval(load, 45000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [token]);

    /* ---------- Group orders → one entry per unique subscriber ---------- */
    const subscribers = useMemo<Subscriber[]>(() => {
        const map = new Map<string, transactionsType[]>();
        for (const t of transactions) {
            const id = t.orderdBy?.id;
            if (!id) continue; // safety: drops withdrawals / malformed rows
            const arr = map.get(id);
            if (arr) arr.push(t);
            else map.set(id, [t]);
        }
        const out: Subscriber[] = [];
        map.forEach((orders, id) => {
            orders.sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
            out.push({
                id,
                latestOrder: orders[0],
                orders,
                totalServices: orders.length,
                activeCount: orders.filter((o) => !o.isExpired).length,
                hasRenewal: orders.some((o) => !!(o as any).isRenewal),
                types: new Set(orders.map((o) => (o as any).type).filter(Boolean)),
            });
        });
        return out;
    }, [transactions]);

    /* ---------- Stats (unique subscribers) ---------- */
    const stats = useMemo(() => {
        let active = 0;
        let renewals = 0;
        for (const s of subscribers) {
            if (s.activeCount > 0) active++;
            if (s.hasRenewal) renewals++;
        }
        return {
            totalSubscribers: subscribers.length,
            activeSubscribers: active,
            renewals,
            totalOrders: transactions.filter((t) => t?.orderdBy?.id).length,
        };
    }, [subscribers, transactions]);

    /* ---------- Type counts (by order) for dropdown labels ---------- */
    const typeCounts = useMemo(() => {
        const counts: Record<string, number> = {
            all: subscribers.length,
            service: 0,
            portfolio: 0,
            package: 0,
            event: 0,
        };
        for (const s of subscribers) {
            s.types.forEach((type) => {
                if (counts[type] !== undefined) counts[type]++;
            });
        }
        return counts;
    }, [subscribers]);

    /* ---------- Filter + sort ---------- */
    const visibleSubscribers = useMemo(() => {
        let rows = [...subscribers];

        // Type / purchase-type use "at least one matching order" semantics so a
        // subscriber doesn't vanish just because their latest order differs.
        if (typeFilter !== "all") {
            rows = rows.filter((s) => s.types.has(typeFilter));
        }
        if (purchaseTypeFilter === "fresh") {
            rows = rows.filter((s) => s.orders.some((o) => !(o as any).isRenewal));
        } else if (purchaseTypeFilter === "renewal") {
            rows = rows.filter((s) => s.hasRenewal);
        }

        if (dateFrom) {
            const from = new Date(dateFrom);
            from.setHours(0, 0, 0, 0);
            rows = rows.filter((s) => new Date(s.latestOrder.createdAt) >= from);
        }
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            rows = rows.filter((s) => new Date(s.latestOrder.createdAt) <= to);
        }

        const q = search.trim().toLowerCase();
        if (q) {
            rows = rows.filter((s) => {
                const lo = s.latestOrder;
                return (
                    lo.orderdBy?.name?.toLowerCase().includes(q) ||
                    lo.orderdBy?.email?.toLowerCase().includes(q) ||
                    String(lo.number || "").toLowerCase().includes(q) ||
                    String((lo as any).city || "").toLowerCase().includes(q) ||
                    String((lo as any).state || "").toLowerCase().includes(q) ||
                    s.orders.some((o) => o.serviceName?.toLowerCase().includes(q))
                );
            });
        }

        rows.sort((a, b) => {
            let av: string | number;
            let bv: string | number;
            switch (sortField) {
                case "date":
                    av = new Date(a.latestOrder.createdAt).getTime();
                    bv = new Date(b.latestOrder.createdAt).getTime();
                    break;
                case "customer":
                    av = a.latestOrder.orderdBy?.name || "";
                    bv = b.latestOrder.orderdBy?.name || "";
                    break;
                case "service":
                    av = a.latestOrder.serviceName || "";
                    bv = b.latestOrder.serviceName || "";
                    break;
                case "amount":
                    av = Number(a.latestOrder.total) || 0;
                    bv = Number(b.latestOrder.total) || 0;
                    break;
                case "status":
                    av = a.activeCount > 0 ? "active" : "inactive";
                    bv = b.activeCount > 0 ? "active" : "inactive";
                    break;
            }
            if (av < bv) return sortDir === "asc" ? -1 : 1;
            if (av > bv) return sortDir === "asc" ? 1 : -1;
            return 0;
        });

        return rows;
    }, [subscribers, typeFilter, purchaseTypeFilter, dateFrom, dateTo, search, sortField, sortDir]);

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDir("desc");
        }
    };

    const hasActiveFilters =
        typeFilter !== "all" ||
        purchaseTypeFilter !== "all" ||
        !!dateFrom ||
        !!dateTo ||
        !!search.trim();

    const clearFilters = () => {
        setTypeFilter("all");
        setPurchaseTypeFilter("all");
        setDateFrom("");
        setDateTo("");
        setSearch("");
    };

    /* ---------- Excel export (one row per subscriber) ---------- */
    const exportToExcel = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString().replace(/\//g, "-");
        const timeStr = now.toLocaleTimeString().replace(/:/g, "-");

        const excelData = visibleSubscribers.map((s) => {
            const lo = s.latestOrder;
            return {
              CustomerName: lo.orderdBy?.name || "",
              CustomerEmail: lo.orderdBy?.email || "",
              "Phone Number": lo?.number || "",
              "PAN Number": lo.kycDetails?.panNumber || "",
              "Date of Birth": lo.kycDetails?.dob || "",
              City: (lo as any).city || "",
              State: (lo as any).state || "",
              Gender: formatGender((lo as any).gender) || "",
              "Latest Service": lo.serviceName || "",
              "Total Services": s.totalServices,
              "Active Services": s.activeCount,
              "Latest Total": `₹${Number(lo.total ?? 0).toFixed(2)}`,
              "Latest Purchase Date": lo.createdAt
                ? new Date(lo.createdAt).toLocaleDateString()
                : "",
              "Latest Purchase Time": lo.createdAt
                ? new Date(lo.createdAt).toLocaleTimeString()
                : "",
              Status: s.activeCount > 0 ? "Active" : "Inactive",
              "Has Renewal": s.hasRenewal ? "Yes" : "No",
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Subscribers");
        XLSX.writeFile(workbook, `Subscribers_${dateStr}_${timeStr}.xlsx`);
    };

    return (
        <div className="pb-20 min-h-screen">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 mx-5">
                <StatCard
                    icon={<Users className="w-5 h-5" />}
                    label="Total Subscribers"
                    value={stats.totalSubscribers}
                    color="blue"
                />
                <StatCard
                    icon={<UserCheck className="w-5 h-5" />}
                    label="Active Subscribers"
                    value={stats.activeSubscribers}
                    color="emerald"
                />
                <StatCard
                    icon={<RefreshCw className="w-5 h-5" />}
                    label="Renewals"
                    value={stats.renewals}
                    color="purple"
                />
                <StatCard
                    icon={<ShoppingBag className="w-5 h-5" />}
                    label="Total Orders"
                    value={stats.totalOrders}
                    color="amber"
                />
            </div>

            <div className="dark:bg-gray-900 bg-white rounded-xl p-5 mt-5 shadow-sm mx-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div>
                        <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
                            <span>
                                {visibleSubscribers.length} of {subscribers.length} subscribers
                            </span>
                            <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                {subscribers.filter((s) => presence[s.id]?.isOnline).length} online now
                            </span>
                        </p>
                    </div>
                    <Button onClick={exportToExcel} className="gap-2 bg-green-600">
                        Export to Excel
                    </Button>
                </div>

                {/* Filter bar */}
                <div className="flex flex-wrap items-end gap-3 p-3 mb-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Search
                        </label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Name, email, phone, service…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-9 pl-8 pr-3 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            From
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            max={dateTo || undefined}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="h-9 px-3 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            To
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            min={dateFrom || undefined}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="h-9 px-3 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Service Type
                        </label>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                            className="h-9 px-3 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="all">All ({typeCounts.all})</option>
                            <option value="service">Plan ({typeCounts.service})</option>
                            <option value="event">Event ({typeCounts.event})</option>
                            <option value="portfolio">Portfolio ({typeCounts.portfolio})</option>
                            <option value="package">Package ({typeCounts.package})</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Purchase Type
                        </label>
                        <select
                            value={purchaseTypeFilter}
                            onChange={(e) =>
                                setPurchaseTypeFilter(e.target.value as PurchaseTypeFilter)
                            }
                            className="h-9 px-3 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="all">All</option>
                            <option value="fresh">Fresh</option>
                            <option value="renewal">Renewal</option>
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="h-9 px-3 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto rounded-lg border scrollbar-hide">
                    <table className="w-full text-sm sm:text-base min-w-[820px]">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-left w-12">#</th>
                                <SortableHeader label="Date & Time" field="date" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="min-w-[140px]" />
                                <SortableHeader label="Customer" field="customer" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="min-w-[240px]" />
                                <th className="px-4 py-3 text-left min-w-[150px]">Phone</th>
                                <SortableHeader label="Latest Service" field="service" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="min-w-[220px]" />
                                <SortableHeader label="Total" field="amount" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="min-w-[120px]" />
                                <SortableHeader label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="min-w-[130px]" />
                                <th className="px-4 py-3 text-left">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {visibleSubscribers?.map((s, idx) => {
                                const lo = s.latestOrder;
                                return (
                                    <tr key={s.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {new Date(lo.createdAt).toLocaleDateString("en-IN", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                    })}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(lo.createdAt).toLocaleTimeString("en-IN", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <ProfileIcon className="w-4 h-4" />
                                                    <span
                                                        className={`w-2 h-2 rounded-full flex-shrink-0 ${presence[s.id]?.isOnline ? "bg-green-500" : "bg-gray-300"}`}
                                                        title={
                                                            presence[s.id]?.isOnline
                                                                ? "Online now"
                                                                : `Last seen ${lastSeenLabel(presence[s.id]?.lastSeenAt)}`
                                                        }
                                                    />
                                                    <span className="font-medium">{lo.orderdBy?.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                    <EmailIcon className="w-4 h-4" />
                                                    <span className="truncate max-w-[200px]">{lo.orderdBy?.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 text-sm">
                                                <PhoneIcon className="w-4 h-4 text-gray-500" />
                                                <span>{lo?.number || "—"}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-medium">{lo.serviceName}</span>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${lo.isExpired
                                                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                            }`}
                                                    >
                                                        {lo.isExpired ? "Expired" : "Active"}
                                                    </span>
                                                    {s.totalServices > 1 && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                            <Layers className="w-2.5 h-2.5" />
                                                            +{s.totalServices - 1} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-semibold tabular-nums">
                                                ₹{Number(lo?.total ?? 0).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.activeCount === 0
                                                    ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                    }`}
                                            >
                                                <span className="relative flex h-2 w-2">
                                                    {s.activeCount > 0 && (
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                    )}
                                                    <span
                                                        className={`relative inline-flex rounded-full h-2 w-2 ${s.activeCount === 0 ? "bg-gray-400" : "bg-emerald-500"
                                                            }`}
                                                    />
                                                </span>
                                                {s.activeCount > 0 ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link
                                                href={`/dashboard/serviceprovider/subscribers/${s.id}`}
                                                aria-label="View subscriber details"
                                                className="inline-flex p-1.5 rounded-md hover:bg-muted transition-colors"
                                            >
                                                <EyeIcon className="w-5 h-5 text-blue-500" />
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-4 mt-5">
                    {visibleSubscribers?.map((s) => {
                        const lo = s.latestOrder;
                        return (
                            <div key={s.id} className="p-4 border rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="font-semibold flex items-center gap-1.5">
                                            <span
                                                className={`w-2 h-2 rounded-full ${presence[s.id]?.isOnline ? "bg-green-500" : "bg-gray-300"}`}
                                                title={
                                                    presence[s.id]?.isOnline
                                                        ? "Online now"
                                                        : `Last seen ${lastSeenLabel(presence[s.id]?.lastSeenAt)}`
                                                }
                                            />
                                            {lo.orderdBy?.name}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">{lo.orderdBy?.email}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">{lo?.number || "—"}</div>
                                    </div>
                                    <Link
                                        href={`/dashboard/serviceprovider/subscribers/${s.id}`}
                                        aria-label="View subscriber details"
                                        className="inline-flex p-1.5 rounded-md hover:bg-muted transition-colors"
                                    >
                                        <EyeIcon className="w-5 h-5 text-blue-500" />
                                    </Link>
                                </div>
                                <div className="space-y-2 mt-3">
                                    <div className="text-sm font-medium">{lo.serviceName}</div>
                                    <div className="flex gap-1.5 flex-wrap">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${lo.isExpired ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                                            {lo.isExpired ? "Expired" : "Active"}
                                        </span>
                                        {s.totalServices > 1 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-gray-100 text-gray-700">
                                                <Layers className="w-2.5 h-2.5" />
                                                +{s.totalServices - 1} more
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm font-semibold">Total: ₹{Number(lo.total ?? 0).toFixed(2)}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {visibleSubscribers.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        {subscribers.length === 0
                            ? "No subscribers yet."
                            : "No subscribers match the current filters."}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ---------- helpers ---------- */

function formatGender(g: string | null | undefined) {
    const v = String(g || "").toUpperCase();
    if (v === "M" || v === "MALE") return "Male";
    if (v === "F" || v === "FEMALE") return "Female";
    if (v === "O" || v === "OTHER") return "Other";
    return g || "";
}

function StatCard({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    color: "blue" | "emerald" | "purple" | "amber";
}) {
    const palette = {
        blue: "from-blue-500 to-indigo-600",
        emerald: "from-emerald-500 to-green-600",
        purple: "from-purple-500 to-fuchsia-600",
        amber: "from-amber-500 to-orange-600",
    };
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${palette[color]} flex items-center justify-center text-white shadow-sm mb-2`}>
                {icon}
            </div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</div>
            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                {typeof value === "number" ? value.toLocaleString("en-IN") : value}
            </div>
        </div>
    );
}

function SortableHeader({
    label,
    field,
    sortField,
    sortDir,
    onSort,
    className = "",
}: {
    label: string;
    field: SortField;
    sortField: SortField;
    sortDir: SortDir;
    onSort: (f: SortField) => void;
    className?: string;
}) {
    const active = sortField === field;
    return (
        <th
            onClick={() => onSort(field)}
            className={`px-4 py-3 text-left cursor-pointer select-none hover:bg-muted/70 transition ${className}`}
        >
            <div className="flex items-center gap-1">
                {label}
                <span className={`text-xs ${active ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}`}>
                    {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                </span>
            </div>
        </th>
    );
}
