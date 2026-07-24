"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import { pdf } from "@react-pdf/renderer";
import { transactionsType } from "@/app/dashboard/serviceprovider/services/transactions/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
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
    ArrowLeft,
    Mail,
    Phone,
    CalendarDays,
    RefreshCw,
    Sparkles,
    Send,
    Link2,
    FileIcon,
    Loader2,
    IndianRupee,
    ShoppingBag,
    UserCheck,
    Users,
    PieChart as PieChartIcon,
    BarChart3,
    Copy,
    Check,
} from "lucide-react";
import DownloadIcon from "@/icons/DownloadIcon";
import SubscriberInfoPDF from "@/components/Wallet/SubscriberInfoPDF";
import CheckCvlKraButton from "@/components/CVL/CheckCvlKraButton";

type UserProfile = {
    name?: string;
    email?: string;
    number?: number | string;
    telegram?: string;
    role?: string;
    profileUrl?: string;
    dob?: string;
    pannumber?: string;
    gender?: string;
    aadhaarLast4?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    linkedBrokers?: { brokerType?: string; clientCode?: string; linkedAt?: string }[];
    createdAt?: string;
};

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#6366f1", "#ef4444"];

export default function SubscriberDetailPage() {
    const params = useParams<{ id: string }>();
    const subscriberId = params?.id;
    const session = useSession();
    const providerId = session.data?.user?.id;
    const { toast } = useToast();
    const [downloading, setDownloading] = useState(false);

    const { data: profileRes, isLoading: profileLoading } = useSWR<{
        success: boolean;
        data: UserProfile | null;
    }>(
        subscriberId
            ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/userdetails?id=${subscriberId}`
            : null,
        fetcher,
    );

    const { data: txRes, isLoading: txLoading } = useSWR<{ data: transactionsType[] }>(
        providerId
            ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/transactions?id=${providerId}`
            : null,
        fetcher,
    );

    const orders = useMemo(() => {
        const all = txRes?.data ?? [];
        return all
            .filter((t) => t?.orderdBy?.id === subscriberId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [txRes, subscriberId]);

    const latestOrder = orders[0];
    const profile = profileRes?.data ?? null;
    const profileMissing = !profileLoading && !profile && orders.length > 0;

    // Prefer the full profile; fall back to fields already on the latest order
    // (covers SP-as-subscriber, where userdetails returns null).
    const view = useMemo(() => {
        const lo = latestOrder;
        return {
            name: profile?.name || lo?.orderdBy?.name || "—",
            email: profile?.email || lo?.orderdBy?.email || "—",
            number: profile?.number ?? lo?.number ?? "",
            gender: profile?.gender || (lo as any)?.gender || "",
            dob: profile?.dob || lo?.kycDetails?.dob || "",
            pannumber: profile?.pannumber || lo?.kycDetails?.panNumber || "",
            aadhaarLast4: profile?.aadhaarLast4 || (lo as any)?.aadhaarLast4 || "",
            address: profile?.address || "",
            city: profile?.city || (lo as any)?.city || "",
            state: profile?.state || (lo as any)?.state || "",
            pincode: profile?.pincode || "",
            telegram: profile?.telegram || "",
            role: profile?.role || "",
            profileUrl: profile?.profileUrl || "",
            linkedBrokers: profile?.linkedBrokers ?? [],
            memberSince: profile?.createdAt || "",
        };
    }, [profile, latestOrder]);

    /* ---------- Analytics ---------- */
    const analytics = useMemo(() => {
        const totalServices = orders.length;
        const totalSpent = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
        const activeCount = orders.filter((o) => !o.isExpired).length;
        const renewals = orders.filter((o) => !!(o as any).isRenewal).length;
        const avgOrderValue = totalServices ? totalSpent / totalServices : 0;
        const times = orders
            .map((o) => new Date(o.createdAt).getTime())
            .filter((t) => !Number.isNaN(t));
        const customerSince = times.length ? new Date(Math.min(...times)) : null;
        const lastPurchase = times.length ? new Date(Math.max(...times)) : null;
        return {
            totalServices,
            totalSpent,
            activeCount,
            renewals,
            avgOrderValue,
            customerSince,
            lastPurchase,
        };
    }, [orders]);

    const typeBreakdown = useMemo(() => {
        const m = new Map<string, number>();
        for (const o of orders) {
            const k = (o as any).type || "service";
            m.set(k, (m.get(k) || 0) + 1);
        }
        return Array.from(m.entries()).map(([name, value], i) => ({
            name,
            value,
            color: PIE_COLORS[i % PIE_COLORS.length],
        }));
    }, [orders]);

    const spendByMonth = useMemo(() => {
        const m = new Map<string, number>();
        for (const o of orders) {
            const d = new Date(o.createdAt);
            if (Number.isNaN(d.getTime())) continue;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            m.set(key, (m.get(key) || 0) + (Number(o.total) || 0));
        }
        return Array.from(m.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, total]) => ({ month, label: monthLabel(month), total }));
    }, [orders]);

    /* ---------- PDF download ---------- */
    const handleDownload = async () => {
        if (!orders.length) return;
        setDownloading(true);
        try {
            const blob = await pdf(
                <SubscriberInfoPDF
                    view={{
                        ...view,
                        linkedBrokers: view.linkedBrokers.map((b) => ({
                            brokerType: b.brokerType,
                            clientCode: b.clientCode,
                        })),
                        memberSince: view.memberSince ? formatDate(view.memberSince) : "",
                    }}
                    analytics={{
                        totalServices: analytics.totalServices,
                        totalSpent: analytics.totalSpent,
                        activeCount: analytics.activeCount,
                        renewals: analytics.renewals,
                        avgOrderValue: analytics.avgOrderValue,
                        customerSince: analytics.customerSince
                            ? formatDate(analytics.customerSince)
                            : "—",
                        lastPurchase: analytics.lastPurchase
                            ? formatDate(analytics.lastPurchase)
                            : "—",
                    }}
                    orders={orders}
                    generatedAt={formatDate(new Date())}
                />,
            ).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${view.name || "subscriber"}-details.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Subscriber PDF generation failed:", error);
            toast({
                title: "Download failed",
                description: "Could not generate the PDF. Please try again.",
                variant: "destructive",
            });
        } finally {
            setDownloading(false);
        }
    };

    const loading = !session.data || txLoading;

    /* ---------- Render ---------- */
    return (
        <div className="pb-20 min-h-screen p-5 min-w-0">
            <Toaster />
            {/* Top bar */}
            <div className="flex items-center justify-between gap-3 mb-5">
                <Link
                    href="/dashboard/serviceprovider/subscribers"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Subscribers
                </Link>
                {orders.length > 0 && (
                    <div className="flex items-center gap-2">
                        {subscriberId && view.pannumber && view.dob && (
                            <CheckCvlKraButton subscriberId={subscriberId} />
                        )}
                        <Button onClick={handleDownload} disabled={downloading} className="gap-2 bg-blue-600">
                            {downloading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <DownloadIcon className="w-4 h-4" />
                            )}
                            {downloading ? "Generating…" : "Download PDF"}
                        </Button>
                    </div>
                )}
            </div>

            {loading ? (
                <SkeletonView />
            ) : orders.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                    No orders found for this subscriber.
                </div>
            ) : (
                <div className="space-y-5 bg-white">
                    {/* Subscriber + profile details (combined) */}
                    <Card className="bg-white">
                        <CardContent className="p-5">
                            {/* Subscriber header */}
                            <div className="flex items-center gap-4">
                                {view.profileUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={view.profileUrl}
                                        alt={view.name}
                                        className="w-16 h-16 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xl font-semibold">
                                        {initialsOf(view.name)}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h1 className="text-xl font-bold truncate">{view.name}</h1>
                                    <div className="flex flex-col gap-0.5 mt-1 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1.5">
                                            <Mail className="w-3.5 h-3.5" /> {view.email}
                                        </span>
                                        {view.number ? (
                                            <span className="flex items-center gap-1.5">
                                                <Phone className="w-3.5 h-3.5" /> {String(view.number)}
                                            </span>
                                        ) : null}
                                        {view.memberSince ? (
                                            <span className="flex items-center gap-1.5 text-xs">
                                                <CalendarDays className="w-3.5 h-3.5" /> Member since{" "}
                                                {formatDate(view.memberSince)}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            {profileMissing && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
                                    Showing limited details from order records.
                                </p>
                            )}

                            {/* Profile details */}
                            <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-800">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                                    <DetailRow label="Gender" value={formatGender(view.gender)} />
                                    <DetailRow label="Date of Birth" value={view.dob} />
                                    <DetailRow label="PAN Number" value={view.pannumber} />
                                    <DetailRow
                                        label="Aadhaar Last 4"
                                        value={view.aadhaarLast4 ? `${view.aadhaarLast4}` : ""}
                                    />
                                    <DetailRow label="City" value={view.city} />
                                    <DetailRow label="State" value={view.state} />
                                    <DetailRow label="Pincode" value={view.pincode} />
                                    <DetailRow label="Role" value={view.role} />
                                    <DetailRow
                                        label="Telegram"
                                        value={view.telegram}
                                        icon={<Send className="w-3.5 h-3.5" />}
                                    />
                                    <div className="col-span-2 md:col-span-3">
                                        <DetailRow
                                            label="Address"
                                            value={[view.address, view.city, view.state, view.pincode]
                                                .filter(Boolean)
                                                .join(", ")}
                                        />
                                    </div>
                                </div>
                                {view.linkedBrokers.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                            Linked Brokers
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {view.linkedBrokers.map((b, i) => (
                                                <span
                                                    key={i}
                                                    className="inline-flex items-center gap-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 px-2.5 py-1.5"
                                                >
                                                    <Link2 className="w-3.5 h-3.5 text-blue-500" />
                                                    <span className="font-medium capitalize">
                                                        {b.brokerType || "Broker"}
                                                    </span>
                                                    {b.clientCode ? (
                                                        <span className="text-muted-foreground">
                                                            · {b.clientCode}
                                                        </span>
                                                    ) : null}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Analytics — KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Kpi
                            icon={<IndianRupee className="w-5 h-5" />}
                            label="Total Spent"
                            value={`₹${analytics.totalSpent.toLocaleString("en-IN")}`}
                            color="emerald"
                        />
                        <Kpi
                            icon={<ShoppingBag className="w-5 h-5" />}
                            label="Total Services"
                            value={analytics.totalServices}
                            color="blue"
                        />
                        <Kpi
                            icon={<UserCheck className="w-5 h-5" />}
                            label="Active Services"
                            value={analytics.activeCount}
                            color="purple"
                        />
                        <Kpi
                            icon={<RefreshCw className="w-5 h-5" />}
                            label="Renewals"
                            value={analytics.renewals}
                            color="amber"
                        />
                        <Kpi
                            icon={<IndianRupee className="w-5 h-5" />}
                            label="Avg Order Value"
                            value={`₹${Math.round(analytics.avgOrderValue).toLocaleString("en-IN")}`}
                            color="blue"
                        />
                        <Kpi
                            icon={<CalendarDays className="w-5 h-5" />}
                            label="Customer Since"
                            value={analytics.customerSince ? formatDate(analytics.customerSince) : "—"}
                            color="emerald"
                        />
                        <Kpi
                            icon={<CalendarDays className="w-5 h-5" />}
                            label="Last Purchase"
                            value={analytics.lastPurchase ? formatDate(analytics.lastPurchase) : "—"}
                            color="purple"
                        />
                        <Kpi
                            icon={<Users className="w-5 h-5" />}
                            label="Service Types"
                            value={typeBreakdown.length}
                            color="amber"
                        />
                    </div>

                    {/* Analytics — charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <Card className="rounded-xl shadow-sm bg-white">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <PieChartIcon className="w-4 h-4 text-purple-500" /> Service Type Breakdown
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[280px] w-full">
                                    {typeBreakdown.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={typeBreakdown}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={95}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    label={({ name, percent }) =>
                                                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                                                    }
                                                    labelLine={false}
                                                >
                                                    {typeBreakdown.map((entry, index) => (
                                                        <Cell key={index} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <EmptyChart />
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-xl shadow-sm bg-white">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-blue-500" /> Spend Over Time
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[280px] w-full">
                                    {spendByMonth.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={spendByMonth}
                                                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                                                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: "#fff",
                                                        borderRadius: "10px",
                                                        border: "1px solid #e5e7eb",
                                                        fontSize: 12,
                                                    }}
                                                    formatter={(value: any) => [
                                                        `₹${Number(value).toLocaleString("en-IN")}`,
                                                        "Spend",
                                                    ]}
                                                />
                                                <Bar
                                                    dataKey="total"
                                                    name="Spend"
                                                    fill="#3b82f6"
                                                    radius={[4, 4, 0, 0]}
                                                    barSize={28}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <EmptyChart />
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Subscribed services — sortable table */}
                    <Card className="bg-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                                Subscribed Services ({orders.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 min-w-0 grid grid-cols-[minmax(0,1fr)]">
                            <ServicesTable orders={orders} />
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

/* ---------- subscribed services — sortable table ---------- */

type SvcField =
    | "service"
    | "type"
    | "purchase"
    | "status"
    | "paymentStatus"
    | "subtotal"
    | "gst"
    | "total"
    | "coupon"
    | "payment"
    | "validity"
    | "startDate"
    | "endDate"
    | "schedule"
    | "date"
    | "orderId"
    | "paymentId"
    | "telegram"
    | "docs";

function docCount(o: transactionsType) {
    const kyc = o.kycDetails;
    return [o.invoiceLink, o.paymentProof, o.signedDocumentUrl, kyc?.panUrl, kyc?.aadhaarUrl].filter(
        Boolean,
    ).length;
}

function payStatusOf(o: transactionsType) {
    return (o.paymentStatus || (o.verifiedByRa ? "verified" : "")) as string;
}

// Telegram invite links: a package order carries one link per included plan
// (`telegramInviteLinks`), a single-service order carries one (`telegramInviteLink`).
// Each plan's link is labelled by its plan name; links are de-duped by URL.
function tgLinksOf(o: transactionsType): { label: string; url: string }[] {
    const out: { label: string; url: string }[] = [];
    const seen = new Set<string>();
    const add = (label: string, url?: string) => {
        if (url && !seen.has(url)) {
            seen.add(url);
            out.push({ label, url });
        }
    };
    const multi = (o as any).telegramInviteLinks;
    if (Array.isArray(multi)) {
        multi.forEach((t: any, i: number) => add(t?.serviceName || `Plan ${i + 1}`, t?.link));
    }
    add("Join", (o as any).telegramInviteLink);
    return out;
}

const SVC_COLUMNS: { label: string; field: SvcField }[] = [
    { label: "Service", field: "service" },
    { label: "Type", field: "type" },
    { label: "Purchase", field: "purchase" },
    { label: "Status", field: "status" },
    { label: "Payment Status", field: "paymentStatus" },
    { label: "Subtotal", field: "subtotal" },
    { label: "GST", field: "gst" },
    { label: "Total", field: "total" },
    { label: "Coupon", field: "coupon" },
    { label: "Payment Method", field: "payment" },
    { label: "Validity", field: "validity" },
    { label: "Start Date", field: "startDate" },
    { label: "End Date", field: "endDate" },
    { label: "Event Schedule", field: "schedule" },
    { label: "Purchased", field: "date" },
    { label: "Order ID", field: "orderId" },
    { label: "Payment ID", field: "paymentId" },
    { label: "Telegram", field: "telegram" },
    { label: "Documents", field: "docs" },
];

function ServicesTable({ orders }: { orders: transactionsType[] }) {
    const [field, setField] = useState<SvcField>("date");
    const [dir, setDir] = useState<"asc" | "desc">("desc");

    const sorted = useMemo(() => {
        const accessor = (o: transactionsType): string | number => {
            switch (field) {
                case "service":
                    return (o.serviceName || "").toLowerCase();
                case "type":
                    return String((o as any).type || "service").toLowerCase();
                case "purchase":
                    return (o as any).isRenewal ? 1 : 0;
                case "status":
                    return o.isExpired ? 1 : 0;
                case "paymentStatus":
                    return payStatusOf(o).toLowerCase();
                case "subtotal":
                    return Number(o.subtotal) || 0;
                case "gst":
                    return Number(o.gst) || 0;
                case "total":
                    return Number(o.total) || 0;
                case "coupon":
                    return String((o as any).coupon?.code || "").toLowerCase();
                case "payment":
                    return (o.paymentMethod || "").toLowerCase();
                case "validity":
                    return Number(o.validity) || 0;
                case "startDate":
                    return (o as any).startDate ? new Date((o as any).startDate).getTime() || 0 : 0;
                case "endDate":
                    return (o as any).endDate ? new Date((o as any).endDate).getTime() || 0 : 0;
                case "schedule":
                    return (o as any).eventSchedule
                        ? new Date((o as any).eventSchedule).getTime() || 0
                        : 0;
                case "date":
                    return new Date(o.createdAt).getTime() || 0;
                case "orderId":
                    return ((o as any).orderId || o._id || "").toLowerCase();
                case "paymentId":
                    return (o.paymentId || "").toLowerCase();
                case "telegram":
                    return tgLinksOf(o).length;
                case "docs":
                    return docCount(o);
            }
        };
        const rows = [...orders];
        rows.sort((a, b) => {
            const av = accessor(a);
            const bv = accessor(b);
            if (av < bv) return dir === "asc" ? -1 : 1;
            if (av > bv) return dir === "asc" ? 1 : -1;
            return 0;
        });
        return rows;
    }, [orders, field, dir]);

    const onSort = (f: SvcField) => {
        if (field === f) {
            setDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setField(f);
            setDir("desc");
        }
    };

    return (
        <div className="w-full overflow-x-auto border-t border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[2300px] text-sm">
                <thead className="bg-muted/50">
                    <tr>
                        {SVC_COLUMNS.map((c) => (
                            <SortableTh
                                key={c.field}
                                label={c.label}
                                field={c.field}
                                active={field}
                                dir={dir}
                                onSort={onSort}
                            />
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sorted.map((o) => (
                        <ServiceTableRow key={o._id} order={o} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function SortableTh({
    label,
    field,
    active,
    dir,
    onSort,
}: {
    label: string;
    field: SvcField;
    active: SvcField;
    dir: "asc" | "desc";
    onSort: (f: SvcField) => void;
}) {
    const isActive = active === field;
    return (
        <th
            onClick={() => onSort(field)}
            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 cursor-pointer select-none hover:bg-muted/70 transition whitespace-nowrap"
        >
            <div className="flex items-center gap-1">
                {label}
                <span className={isActive ? "text-gray-700 dark:text-gray-200" : "text-gray-400"}>
                    {isActive ? (dir === "asc" ? "↑" : "↓") : "↕"}
                </span>
            </div>
        </th>
    );
}

function ServiceTableRow({ order }: { order: transactionsType }) {
    const isRenewal = !!(order as any).isRenewal;
    const kyc = order.kycDetails;
    const hasDocs = docCount(order) > 0;
    const payStatus = payStatusOf(order);
    const orderId = (order as any).orderId || order._id || "";
    const coupon = (order as any).coupon;
    const discount = Number((order as any).discountAmount) || 0;
    const tg = tgLinksOf(order);

    return (
        <tr className="hover:bg-muted/40 transition-colors align-top">
            <td className="px-4 py-3 font-medium whitespace-nowrap">{order.serviceName || "—"}</td>
            <td className="px-4 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {(order as any).type || "service"}
                </span>
            </td>
            <td className="px-4 py-3">
                <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        isRenewal
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}
                >
                    {isRenewal ? (
                        <RefreshCw className="w-2.5 h-2.5" />
                    ) : (
                        <Sparkles className="w-2.5 h-2.5" />
                    )}
                    {isRenewal ? "Renewal" : "Fresh"}
                </span>
            </td>
            <td className="px-4 py-3">
                <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        order.isExpired
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    }`}
                >
                    {order.isExpired ? "Expired" : "Active"}
                </span>
            </td>
            <td className="px-4 py-3">
                {payStatus ? (
                    <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                            payStatus === "verified"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : payStatus === "rejected"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                    >
                        {payStatus}
                    </span>
                ) : (
                    <span className="text-gray-400 text-xs">—</span>
                )}
            </td>
            <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                ₹{Number(order.subtotal ?? 0).toFixed(2)}
            </td>
            <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                ₹{Number(order.gst ?? 0).toFixed(2)}
            </td>
            <td className="px-4 py-3 font-semibold tabular-nums whitespace-nowrap">
                ₹{Number(order.total ?? 0).toFixed(2)}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                {coupon?.code ? (
                    <div className="flex flex-col">
                        <span className="font-medium">{coupon.code}</span>
                        {discount > 0 ? (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                −₹{discount.toFixed(2)}
                            </span>
                        ) : null}
                    </div>
                ) : (
                    <span className="text-gray-400 text-xs">—</span>
                )}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">{order.paymentMethod || "—"}</td>
            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {order.validity ? `${order.validity} days` : "—"}
            </td>
            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {(order as any).startDate ? formatDate((order as any).startDate) : "—"}
            </td>
            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {(order as any).endDate ? formatDate((order as any).endDate) : "—"}
            </td>
            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {(order as any).eventSchedule
                    ? `${new Date((order as any).eventSchedule).toLocaleDateString("en-IN")}${
                          (order as any).eventMode ? ` · ${(order as any).eventMode}` : ""
                      }`
                    : "—"}
            </td>
            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                      })
                    : "—"}
            </td>
            <td className="px-4 py-3">
                <span
                    className="font-mono text-xs text-muted-foreground truncate inline-block max-w-[140px] align-bottom"
                    title={orderId}
                >
                    {orderId || "—"}
                </span>
            </td>
            <td className="px-4 py-3">
                <span
                    className="font-mono text-xs text-muted-foreground truncate inline-block max-w-[140px] align-bottom"
                    title={order.paymentId || ""}
                >
                    {order.paymentId || "—"}
                </span>
            </td>
            <td className="px-4 py-3">
                {tg.length ? (
                    <div className="flex flex-col gap-1 text-xs">
                        {tg.map((t, i) => (
                            <CopyButton
                                key={i}
                                url={t.url}
                                label={t.label === "Join" ? "Copy invite link" : t.label}
                            />
                        ))}
                    </div>
                ) : (
                    <span className="text-gray-400 text-xs">—</span>
                )}
            </td>
            <td className="px-4 py-3">
                {hasDocs ? (
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
                        {order.invoiceLink && (
                            <DocLink href={order.invoiceLink} label="Invoice" download />
                        )}
                        {order.paymentProof && (
                            <DocLink href={order.paymentProof} label="Payment Proof" />
                        )}
                        {order.signedDocumentUrl && (
                            <DocLink href={order.signedDocumentUrl} label="Signed TnC" />
                        )}
                        {kyc?.panUrl && <DocLink href={kyc.panUrl} label="PAN Doc" />}
                        {kyc?.aadhaarUrl && <DocLink href={kyc.aadhaarUrl} label="Aadhaar Doc" />}
                    </div>
                ) : (
                    <span className="text-gray-400 text-xs">—</span>
                )}
            </td>
        </tr>
    );
}

/* ---------- helpers ---------- */

function DetailRow({
    label,
    value,
    icon,
}: {
    label: string;
    value?: string | number | null;
    icon?: React.ReactNode;
}) {
    const display = value === 0 || value ? String(value) : "—";
    return (
        <div className="flex flex-col">
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            <span className="text-sm font-medium flex items-center gap-1.5 break-words">
                {icon}
                {display}
            </span>
        </div>
    );
}

function DocLink({
    href,
    label,
    download,
}: {
    href: string;
    label: string;
    download?: boolean;
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            {...(download ? { download: true } : {})}
            className="flex items-center gap-1.5 text-primary hover:underline"
        >
            {download ? (
                <DownloadIcon className="w-3.5 h-3.5" />
            ) : (
                <FileIcon className="w-3.5 h-3.5" />
            )}
            {label}
        </a>
    );
}

// Telegram invite links are copy-only — the SP shares them manually if the
// subscriber didn't receive the email. Clicking copies the URL to clipboard.
function CopyButton({ url, label }: { url: string; label: string }) {
    const [copied, setCopied] = useState(false);
    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard unavailable — no-op
        }
    };
    return (
        <button
            type="button"
            onClick={onCopy}
            title={url}
            className="inline-flex items-center gap-1.5 text-primary hover:underline max-w-[200px]"
        >
            {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
                <Copy className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="truncate">{copied ? "Copied" : label}</span>
        </button>
    );
}

function Kpi({
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
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {label}
            </div>
            <div className="mt-1 text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                {typeof value === "number" ? value.toLocaleString("en-IN") : value}
            </div>
        </div>
    );
}

function EmptyChart() {
    return (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Not enough data
        </div>
    );
}

function SkeletonView() {
    return (
        <div className="space-y-5 animate-pulse">
            <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800" />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="h-[320px] rounded-xl bg-gray-100 dark:bg-gray-800" />
                <div className="h-[320px] rounded-xl bg-gray-100 dark:bg-gray-800" />
            </div>
        </div>
    );
}

function initialsOf(name: string) {
    return String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || "")
        .join("") || "?";
}

function formatGender(g: string | null | undefined) {
    const v = String(g || "").toUpperCase();
    if (v === "M" || v === "MALE") return "Male";
    if (v === "F" || v === "FEMALE") return "Female";
    if (v === "O" || v === "OTHER") return "Other";
    return g || "";
}

function formatDate(d: string | number | Date) {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function monthLabel(month: string) {
    // month = "YYYY-MM"
    const [y, m] = month.split("-");
    const date = new Date(Number(y), Number(m) - 1, 1);
    if (Number.isNaN(date.getTime())) return month;
    return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}
