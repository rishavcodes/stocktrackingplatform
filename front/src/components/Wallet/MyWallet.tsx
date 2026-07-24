"use client";

import * as XLSX from "xlsx";
import { useMemo, useState } from "react";
import TransactionDrawer from "@/components/Wallet/TransactionDrawer";
import { Button } from "@/components/ui/button";
import { transactionsType } from "@/app/dashboard/serviceprovider/services/transactions/page";
import DownloadIon from "@/icons/DownloadIcon";
import {
    FileIcon,
    PhoneIcon,
    Search,
    Users,
    UserCheck,
    RefreshCw,
    ShoppingBag,
    Sparkles,
    MapPin,
    UserCircle2,
    Fingerprint,
} from "lucide-react";
import EmailIcon from "@/icons/EmailIcon";
import ProfileIcon from "@/icons/ProfileIcon";

type TypeFilter = "all" | "service" | "portfolio" | "package" | "event";
type PurchaseTypeFilter = "all" | "fresh" | "renewal";
type SortField = "date" | "customer" | "service" | "amount" | "status";
type SortDir = "asc" | "desc";

export default function MyWalletClient({ transactions }: { transactions: transactionsType[] }) {
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [purchaseTypeFilter, setPurchaseTypeFilter] = useState<PurchaseTypeFilter>("all");
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [sortField, setSortField] = useState<SortField>("date");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    /* ---------- Stats (across ALL transactions, before filtering) ---------- */
    const stats = useMemo(() => {
        const all = new Set<string>();
        const active = new Set<string>();
        let renewals = 0;
        for (const t of transactions) {
            const id = t.orderdBy?.id;
            if (id) {
                all.add(id);
                if (!t.isExpired) active.add(id);
            }
            if ((t as any).isRenewal) renewals++;
        }
        return {
            totalSubscribers: all.size,
            activeSubscribers: active.size,
            renewals,
            totalOrders: transactions.length,
        };
    }, [transactions]);

    /* ---------- Type counts for the dropdown labels ---------- */
    const typeCounts = useMemo(() => {
        const counts: Record<string, number> = { all: transactions.length, service: 0, portfolio: 0, package: 0, event: 0 };
        for (const t of transactions) {
            const type = (t as any).type;
            if (type && counts[type] !== undefined) counts[type]++;
        }
        return counts;
    }, [transactions]);

    /* ---------- Filter + sort ---------- */
    const visibleTransactions = useMemo(() => {
        let rows = [...transactions];

        if (typeFilter !== "all") {
            rows = rows.filter((t) => (t as any).type === typeFilter);
        }

        if (purchaseTypeFilter === "fresh") {
            rows = rows.filter((t) => !(t as any).isRenewal);
        } else if (purchaseTypeFilter === "renewal") {
            rows = rows.filter((t) => !!(t as any).isRenewal);
        }

        if (dateFrom) {
            const from = new Date(dateFrom);
            from.setHours(0, 0, 0, 0);
            rows = rows.filter((t) => new Date(t.createdAt) >= from);
        }
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            rows = rows.filter((t) => new Date(t.createdAt) <= to);
        }

        const q = search.trim().toLowerCase();
        if (q) {
            rows = rows.filter(
                (t) =>
                    t.orderdBy?.name?.toLowerCase().includes(q) ||
                    t.orderdBy?.email?.toLowerCase().includes(q) ||
                    t.serviceName?.toLowerCase().includes(q) ||
                    String(t.number || "").toLowerCase().includes(q) ||
                    String((t as any).city || "").toLowerCase().includes(q) ||
                    String((t as any).state || "").toLowerCase().includes(q)
            );
        }

        rows.sort((a, b) => {
            let av: string | number;
            let bv: string | number;
            switch (sortField) {
                case "date":
                    av = new Date(a.createdAt).getTime();
                    bv = new Date(b.createdAt).getTime();
                    break;
                case "customer":
                    av = a.orderdBy?.name || "";
                    bv = b.orderdBy?.name || "";
                    break;
                case "service":
                    av = a.serviceName || "";
                    bv = b.serviceName || "";
                    break;
                case "amount":
                    av = Number(a.total) || 0;
                    bv = Number(b.total) || 0;
                    break;
                case "status":
                    // Subscription status — active subscriptions sort first.
                    av = a.isExpired ? "inactive" : "active";
                    bv = b.isExpired ? "inactive" : "active";
                    break;
            }
            if (av < bv) return sortDir === "asc" ? -1 : 1;
            if (av > bv) return sortDir === "asc" ? 1 : -1;
            return 0;
        });

        return rows;
    }, [transactions, typeFilter, purchaseTypeFilter, dateFrom, dateTo, search, sortField, sortDir]);

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

    /* ---------- Excel export ---------- */
    const exportToExcel = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString().replace(/\//g, "-");
        const timeStr = now.toLocaleTimeString().replace(/:/g, "-");

        const excelData = visibleTransactions.map((transaction) => ({
            CustomerName: transaction.orderdBy?.name || "Withdrawal",
            CustomerEmail: transaction.orderdBy?.email || "",
            "Phone Number": transaction?.number || "",
            City: (transaction as any).city || "",
            State: (transaction as any).state || "",
            Gender: formatGender((transaction as any).gender) || "",
            "Aadhaar (last 4)": (transaction as any).aadhaarLast4
                ? `XXXX ${(transaction as any).aadhaarLast4}`
                : "",
            "Service Name": transaction.serviceName || "",
            "Purchase Type": (transaction as any).isRenewal ? "Renewal" : "Fresh",
            Validity: transaction.validity ? `${transaction.validity} days` : "",
            Expired: transaction.isExpired ? "Yes" : "No",
            "Base Amount": transaction.orderdBy ? `₹${(transaction.subtotal ?? 0).toFixed(2)}` : "",
            GST: transaction.orderdBy ? `₹${(transaction.gst ?? 0).toFixed(2)}` : "",
            "Total Amount": transaction.orderdBy ? `₹${(transaction.total ?? 0).toFixed(2)}` : "",
            "Purchase Date": transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : "",
            "Purchase Time": transaction.createdAt ? new Date(transaction.createdAt).toLocaleTimeString() : "",
            "Payment Method": transaction.paymentMethod || "",
            Status: transaction.isExpired ? "Inactive" : "Active",
            "Invoice Link": transaction.invoiceLink || "",
            "Payment Proof": transaction.paymentProof || "",
            "PAN URL": transaction.kycDetails?.panUrl || "",
            "PAN Number": transaction.kycDetails?.panNumber || "",
            "Date of Birth": transaction.kycDetails?.dob || "",
            "Signed TnC": transaction.signedDocumentUrl || "",
        }));

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
                        {/* <h1 className="text-2xl font-bold">Subscribers</h1> */}
                        <p className="text-muted-foreground mt-1 text-sm">
                            {visibleTransactions.length} of {transactions.length} transactions
                        </p>
                    </div>
                    <Button onClick={exportToExcel} className="gap-2 bg-green-600">
                        Export to Excel
                    </Button>
                </div>

                {/* Filter bar */}
                <div className="flex flex-wrap items-end gap-3 p-3 mb-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    {/* Search */}
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

                    {/* From */}
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

                    {/* To */}
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

                    {/* Service type */}
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

                    {/* Purchase type */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Purchase Type
                        </label>
                        <select
                            value={purchaseTypeFilter}
                            onChange={(e) => setPurchaseTypeFilter(e.target.value as PurchaseTypeFilter)}
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
                    <table className="w-full text-sm sm:text-base min-w-[900px]">
                        <thead className="bg-muted/50">
                            <tr>
                                <SortableHeader label="Date & Time" field="date" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="min-w-[140px]" />
                                <SortableHeader label="Customer Info" field="customer" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="min-w-[240px]" />
                                <SortableHeader label="Service Details" field="service" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="min-w-[220px]" />
                                <SortableHeader label="Amount Breakup" field="amount" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="min-w-[160px]" />
                                <SortableHeader label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="min-w-[150px]" />
                                <th className="px-4 py-3 text-left min-w-[180px]">Documents</th>
                                <th className="px-4 py-3 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {visibleTransactions?.map((transaction) => {
                                const isRenewal = !!(transaction as any).isRenewal;
                                return (
                                    <tr key={transaction._id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {new Date(transaction.createdAt).toLocaleDateString("en-IN", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                    })}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(transaction.createdAt).toLocaleTimeString("en-IN", {
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
                                                    <span className="font-medium">{transaction.orderdBy?.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                    <EmailIcon className="w-4 h-4" />
                                                    <span className="truncate max-w-[200px]">{transaction.orderdBy?.email}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                    <PhoneIcon className="w-4 h-4" />
                                                    <span>{transaction?.number}</span>
                                                </div>
                                                {((transaction as any).city || (transaction as any).state) && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                        <span className="truncate max-w-[200px]">
                                                            {[(transaction as any).city, (transaction as any).state]
                                                                .filter(Boolean)
                                                                .join(", ")}
                                                        </span>
                                                    </div>
                                                )}
                                                {((transaction as any).gender || (transaction as any).aadhaarLast4) && (
                                                    <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                                                        {(transaction as any).gender && (
                                                            <span className="inline-flex items-center gap-1">
                                                                <UserCircle2 className="w-3.5 h-3.5" />
                                                                {formatGender((transaction as any).gender)}
                                                            </span>
                                                        )}
                                                        {(transaction as any).aadhaarLast4 && (
                                                            <span className="inline-flex items-center gap-1">
                                                                <Fingerprint className="w-3.5 h-3.5" />
                                                                XXXX {(transaction as any).aadhaarLast4}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-medium">{transaction.serviceName}</span>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${transaction.isExpired
                                                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                            }`}
                                                    >
                                                        {transaction.isExpired ? "Expired" : `${transaction.validity} days`}
                                                    </span>
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${isRenewal
                                                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                            }`}
                                                    >
                                                        {isRenewal ? <RefreshCw className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
                                                        {isRenewal ? "Renewal" : "Fresh"}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col text-sm">
                                                <div className="flex justify-between gap-3">
                                                    <span className="text-gray-500">Base:</span>
                                                    <span className="tabular-nums">₹{Number(transaction?.subtotal ?? 0).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between gap-3">
                                                    <span className="text-gray-500">GST:</span>
                                                    <span className="tabular-nums">₹{Number(transaction?.gst ?? 0).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between gap-3 font-semibold border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
                                                    <span>Total:</span>
                                                    <span className="tabular-nums">₹{Number(transaction?.total ?? 0).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${transaction.isExpired
                                                    ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                    }`}
                                            >
                                                <span
                                                    className={`relative flex h-2 w-2 ${transaction.isExpired ? "" : ""}`}
                                                >
                                                    {!transaction.isExpired && (
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                    )}
                                                    <span
                                                        className={`relative inline-flex rounded-full h-2 w-2 ${transaction.isExpired ? "bg-gray-400" : "bg-emerald-500"
                                                            }`}
                                                    />
                                                </span>
                                                {transaction.isExpired ? "Inactive" : "Active"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-2 text-xs">
                                                {transaction.invoiceLink && (
                                                    <a href={transaction.invoiceLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                                                        <DownloadIon className="w-4 h-4" /> Invoice
                                                    </a>
                                                )}
                                                {transaction.paymentProof && (
                                                    <a href={transaction.paymentProof} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                                                        <FileIcon className="w-4 h-4" /> Payment Proof
                                                    </a>
                                                )}
                                                {transaction.kycDetails?.panUrl && (
                                                    <a href={transaction.kycDetails.panUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                                                        <FileIcon className="w-4 h-4" /> PAN
                                                    </a>
                                                )}
                                                {transaction.signedDocumentUrl && (
                                                    <a href={transaction.signedDocumentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
                                                        <FileIcon className="w-4 h-4" /> TnC
                                                    </a>
                                                )}
                                                {transaction.kycDetails?.panNumber && (
                                                    <p className="text-gray-500">PAN: {transaction.kycDetails.panNumber}</p>
                                                )}
                                                {transaction.kycDetails?.dob && (
                                                    <p className="text-gray-500">DOB: {transaction.kycDetails.dob}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <TransactionDrawer transaction={transaction} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-4 mt-5">
                    {visibleTransactions?.map((transaction) => {
                        const isRenewal = !!(transaction as any).isRenewal;
                        const isWithdrawal = !transaction.orderdBy;
                        return (
                            <div key={transaction._id} className="p-4 border rounded-lg">
                                <div className="space-y-2">
                                    <h2 className="font-semibold">Customer Info</h2>
                                    <div className="text-sm">{isWithdrawal ? "Withdrawal" : transaction.orderdBy?.name}</div>
                                    {!isWithdrawal && <div className="text-sm">{transaction.orderdBy?.email}</div>}
                                    {!isWithdrawal && <div className="text-sm">{transaction?.number}</div>}
                                    {((transaction as any).city || (transaction as any).state) && (
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {[(transaction as any).city, (transaction as any).state]
                                                .filter(Boolean)
                                                .join(", ")}
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                                        {(transaction as any).gender && (
                                            <span>Gender: {formatGender((transaction as any).gender)}</span>
                                        )}
                                        {(transaction as any).aadhaarLast4 && (
                                            <span>Aadhaar: XXXX {(transaction as any).aadhaarLast4}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2 mt-3">
                                    <h2 className="font-semibold">Service Details</h2>
                                    <div className="text-sm">{transaction.serviceName}</div>
                                    <div className="flex gap-1.5 flex-wrap">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${transaction.isExpired ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                                            {transaction.isExpired ? "Expired" : `${transaction.validity} days`}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${isRenewal ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                            {isRenewal ? "Renewal" : "Fresh"}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2 mt-3">
                                    <h2 className="font-semibold">Amount Breakup</h2>
                                    <div className="text-sm">Base: ₹{Number(transaction.subtotal ?? 0).toFixed(2)}</div>
                                    <div className="text-sm">GST: ₹{Number(transaction.gst ?? 0).toFixed(2)}</div>
                                    <div className="text-sm font-semibold">Total: ₹{Number(transaction.total ?? 0).toFixed(2)}</div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <TransactionDrawer transaction={transaction} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {visibleTransactions.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        {transactions.length === 0
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
    return g || "—";
}

/* ---------- helper components ---------- */

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
