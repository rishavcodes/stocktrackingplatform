"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Search,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Inbox,
    User,
    Building,
    CreditCard,
    Clock,
    Bell,
    BellOff,
} from "lucide-react";
import {
    ensurePushSubscribed,
    getPushPermission,
    isPushSupported,
    sendTestPush,
    unsubscribeFromPush,
} from "@/lib/pushNotifications";

type Issue = {
    _id: string;
    step: string;
    severity: "info" | "warning" | "critical";
    reason: string;
    errorCode?: string;
    errorMessage?: string;

    customerId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;

    spId?: string;
    spName?: string;

    planId?: string;
    planTitle?: string;
    planPrice?: number;

    paymentId?: string;
    orderId?: string;
    clientId?: string;

    userAgent?: string;
    ipAddress?: string;

    metadata?: Record<string, any>;
    stack?: string;

    occurrenceCount: number;
    lastOccurredAt: string;

    status: "new" | "investigating" | "resolved" | "refunded" | "ignored";
    notes?: string;
    resolvedAt?: string;
    resolvedBy?: string;

    createdAt: string;
    updatedAt: string;
};

const STATUS_META: Record<string, { label: string; classes: string }> = {
    new: { label: "New", classes: "bg-red-50 text-red-700 border-red-200" },
    investigating: { label: "Investigating", classes: "bg-amber-50 text-amber-700 border-amber-200" },
    resolved: { label: "Resolved", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    refunded: { label: "Refunded", classes: "bg-blue-50 text-blue-700 border-blue-200" },
    ignored: { label: "Ignored", classes: "bg-gray-100 text-gray-500 border-gray-200" },
};

const SEVERITY_META: Record<string, { label: string; classes: string; icon: any }> = {
    critical: { label: "Critical", classes: "text-red-600", icon: AlertTriangle },
    warning: { label: "Warning", classes: "text-amber-600", icon: AlertTriangle },
    info: { label: "Info", classes: "text-blue-600", icon: AlertTriangle },
};

const STEP_LABELS: Record<string, string> = {
    esign_init: "eSign init",
    esign_callback: "eSign callback",
    esign_aadhaar_mismatch: "Aadhaar mismatch",
    esign_session_timeout: "eSign timeout",
    payment_init: "Payment init",
    payment_verification: "Payment verify",
    order_creation: "Order creation",
    wallet_deduction: "Wallet deduction",
    telegram_invite: "Telegram invite",
    other: "Other",
};

function formatDate(d?: string | Date): string {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function OnboardingIssuesPage() {
    const session = useSession();
    const [issues, setIssues] = useState<Issue[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("new");
    const [stepFilter, setStepFilter] = useState<string>("");
    const [severityFilter, setSeverityFilter] = useState<string>("");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Expanded row
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Push notification state
    const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");
    const [pushBusy, setPushBusy] = useState(false);

    useEffect(() => {
        setPushPermission(getPushPermission());
    }, []);

    const handleEnablePush = async () => {
        if (!session.data?.backendToken) return;
        setPushBusy(true);
        try {
            const result = await ensurePushSubscribed(session.data.backendToken);
            setPushPermission(result.status);
            if (result.subscribed) {
                // Send a test push so the user immediately sees it working
                await sendTestPush(session.data.backendToken);
            }
        } finally {
            setPushBusy(false);
        }
    };

    const handleDisablePush = async () => {
        if (!session.data?.backendToken) return;
        if (!confirm("Stop receiving onboarding failure notifications on this device?")) return;
        setPushBusy(true);
        try {
            await unsubscribeFromPush(session.data.backendToken);
        } catch (err) {
            console.error("unsubscribeFromPush failed:", err);
            // Fall through — we still flip the UI so the user isn't stuck
        } finally {
            // Always reset state so the button can't get stuck on "Turning off…"
            // even if the SW or backend never responded.
            setPushPermission("default");
            setPushBusy(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const headers = useMemo(
        () => ({
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data?.backendToken}`,
        }),
        [session.data?.backendToken]
    );

    const fetchIssues = async () => {
        if (!session.data?.backendToken) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.set("status", statusFilter);
            if (stepFilter) params.set("step", stepFilter);
            if (severityFilter) params.set("severity", severityFilter);
            if (debouncedSearch) params.set("search", debouncedSearch);
            params.set("limit", "50");

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/onboarding-issues?${params}`,
                { headers }
            );
            const data = await res.json();
            if (data?.success) {
                setIssues(data.issues || []);
                setTotal(data.total ?? 0);
                setCounts(data.counts ?? {});
            }
        } catch (err) {
            console.error("Failed to fetch onboarding issues:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIssues();
    }, [statusFilter, stepFilter, severityFilter, debouncedSearch, session.data?.backendToken]);

    const updateStatus = async (id: string, status: Issue["status"], notes?: string) => {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/onboarding-issues/${id}`,
                {
                    method: "PATCH",
                    headers,
                    body: JSON.stringify({ status, ...(notes !== undefined ? { notes } : {}) }),
                }
            );
            const data = await res.json();
            if (data?.success) {
                // Update in-place
                setIssues((prev) =>
                    prev.map((it) => (it._id === id ? { ...it, ...data.issue } : it))
                );
            }
        } catch (err) {
            console.error("Failed to update issue:", err);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Inbox className="w-5 h-5 text-emerald-600" />
                        Onboarding Issues
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">
                        Real-user failures across the customer onboarding flow
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isPushSupported() && (
                        pushPermission === "granted" ? (
                            <button
                                onClick={handleDisablePush}
                                disabled={pushBusy}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-60"
                                title="Click to turn off notifications"
                            >
                                <Bell className="w-3.5 h-3.5" />
                                {pushBusy ? "Turning off…" : "Notifications on"}
                            </button>
                        ) : pushPermission === "denied" ? (
                            <span
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-700 bg-red-50 border border-red-200"
                                title="Notifications were blocked. Enable them in your browser site settings (lock icon in address bar)."
                            >
                                <BellOff className="w-3.5 h-3.5" />
                                Notifications blocked
                            </span>
                        ) : (
                            <button
                                onClick={handleEnablePush}
                                disabled={pushBusy}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                            >
                                <Bell className="w-3.5 h-3.5" />
                                {pushBusy ? "Enabling…" : "Enable notifications"}
                            </button>
                        )
                    )}
                    <button
                        onClick={fetchIssues}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── Status tiles ── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(["new", "investigating", "resolved", "refunded", "ignored"] as const).map((s) => {
                    const meta = STATUS_META[s];
                    const active = statusFilter === s;
                    return (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(active ? "" : s)}
                            className={`text-left rounded-xl border p-3 transition-all ${active ? meta.classes + " border-2" : "bg-white border-gray-200 hover:border-gray-300"}`}
                        >
                            <p className={`text-[10px] font-semibold uppercase tracking-wider ${active ? "" : "text-gray-400"}`}>
                                {meta.label}
                            </p>
                            <p className="text-2xl font-bold mt-1">{counts[s] ?? 0}</p>
                        </button>
                    );
                })}
            </div>

            {/* ── Filters ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by customer, SP, plan, error..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                    />
                </div>
                <select
                    value={stepFilter}
                    onChange={(e) => setStepFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                    <option value="">All steps</option>
                    {Object.entries(STEP_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                    ))}
                </select>
                <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                    <option value="">All severities</option>
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                </select>
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">
                        {total.toLocaleString()} {total === 1 ? "issue" : "issues"}
                    </h3>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : issues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <CheckCircle2 className="w-10 h-10 mb-2 text-emerald-300" />
                        <p className="text-sm">No issues match your filters</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {issues.map((issue) => {
                            const expanded = expandedId === issue._id;
                            const sev = SEVERITY_META[issue.severity];
                            const SevIcon = sev.icon;
                            return (
                                <div key={issue._id} className="hover:bg-gray-50/50">
                                    <button
                                        onClick={() => setExpandedId(expanded ? null : issue._id)}
                                        className="w-full px-5 py-3 flex items-start gap-4 text-left"
                                    >
                                        <div className={`flex-shrink-0 mt-0.5 ${sev.classes}`}>
                                            <SevIcon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-semibold text-gray-600">
                                                    {STEP_LABELS[issue.step] || issue.step}
                                                </span>
                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_META[issue.status].classes}`}>
                                                    {STATUS_META[issue.status].label}
                                                </span>
                                                {issue.occurrenceCount > 1 && (
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                                                        ×{issue.occurrenceCount}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-800 mt-0.5 truncate">{issue.reason}</p>
                                            <p className="text-[11px] text-gray-400 mt-1">
                                                {issue.customerName || issue.customerEmail || "Unknown customer"}
                                                {issue.spName ? ` · ${issue.spName}` : ""}
                                                {issue.planTitle ? ` · ${issue.planTitle}` : ""}
                                                {issue.planPrice ? ` · ₹${issue.planPrice}` : ""}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end flex-shrink-0">
                                            <span className="text-[11px] text-gray-400 whitespace-nowrap">
                                                {formatDate(issue.lastOccurredAt)}
                                            </span>
                                            {expanded ? (
                                                <ChevronUp className="w-4 h-4 text-gray-400 mt-1" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-gray-400 mt-1" />
                                            )}
                                        </div>
                                    </button>

                                    {expanded && (
                                        <div className="px-5 pb-5 pt-1 bg-gray-50/40 border-t border-gray-100">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mt-3">
                                                <Detail icon={<User className="w-3.5 h-3.5" />} label="Customer">
                                                    <p className="text-sm font-medium text-gray-900">{issue.customerName || "—"}</p>
                                                    <p className="text-xs text-gray-500">{issue.customerEmail || "—"}</p>
                                                    {issue.customerPhone && (
                                                        <p className="text-xs text-gray-500">{issue.customerPhone}</p>
                                                    )}
                                                </Detail>
                                                <Detail icon={<Building className="w-3.5 h-3.5" />} label="Service Provider">
                                                    <p className="text-sm font-medium text-gray-900">{issue.spName || "—"}</p>
                                                    <p className="text-xs text-gray-400">{issue.spId || ""}</p>
                                                </Detail>
                                                <Detail icon={<CreditCard className="w-3.5 h-3.5" />} label="Plan">
                                                    <p className="text-sm font-medium text-gray-900">{issue.planTitle || "—"}</p>
                                                    {issue.planPrice ? (
                                                        <p className="text-xs text-gray-500">₹{issue.planPrice}</p>
                                                    ) : null}
                                                </Detail>
                                                <Detail icon={<Clock className="w-3.5 h-3.5" />} label="Timing">
                                                    <p className="text-sm text-gray-900">First: {formatDate(issue.createdAt)}</p>
                                                    <p className="text-xs text-gray-500">
                                                        Last: {formatDate(issue.lastOccurredAt)}
                                                        {issue.occurrenceCount > 1 && ` (×${issue.occurrenceCount} attempts)`}
                                                    </p>
                                                </Detail>
                                            </div>

                                            {/* Error */}
                                            <div className="mt-4">
                                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Error</p>
                                                <div className="bg-white border border-gray-200 rounded-lg p-3">
                                                    <p className="text-sm text-gray-800">{issue.reason}</p>
                                                    {issue.errorMessage && (
                                                        <p className="text-xs text-gray-500 mt-1 font-mono break-all">{issue.errorMessage}</p>
                                                    )}
                                                    {issue.errorCode && (
                                                        <p className="text-[10px] text-gray-400 mt-1">Code: {issue.errorCode}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Context */}
                                            {(issue.userAgent || issue.ipAddress || issue.paymentId || issue.orderId || issue.clientId) && (
                                                <div className="mt-4">
                                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Context</p>
                                                    <div className="bg-white border border-gray-200 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                        {issue.userAgent && <div><span className="text-gray-400">User-Agent:</span> <span className="text-gray-700">{issue.userAgent}</span></div>}
                                                        {issue.ipAddress && <div><span className="text-gray-400">IP:</span> <span className="text-gray-700 font-mono">{issue.ipAddress}</span></div>}
                                                        {issue.paymentId && <div><span className="text-gray-400">Payment ID:</span> <span className="text-gray-700 font-mono">{issue.paymentId}</span></div>}
                                                        {issue.orderId && <div><span className="text-gray-400">Order ID:</span> <span className="text-gray-700 font-mono">{issue.orderId}</span></div>}
                                                        {issue.clientId && <div><span className="text-gray-400">Client ID:</span> <span className="text-gray-700 font-mono">{issue.clientId}</span></div>}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Metadata */}
                                            {issue.metadata && Object.keys(issue.metadata).length > 0 && (
                                                <div className="mt-4">
                                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Metadata</p>
                                                    <pre className="bg-gray-900 text-gray-100 text-[11px] rounded-lg p-3 overflow-x-auto">
                                                        {JSON.stringify(issue.metadata, null, 2)}
                                                    </pre>
                                                </div>
                                            )}

                                            {/* Notes */}
                                            <div className="mt-4">
                                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                                                <textarea
                                                    defaultValue={issue.notes || ""}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== (issue.notes || "")) {
                                                            updateStatus(issue._id, issue.status, e.target.value);
                                                        }
                                                    }}
                                                    placeholder="Add notes about your investigation..."
                                                    className="w-full text-sm border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                                                    rows={2}
                                                />
                                            </div>

                                            {/* Status actions */}
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {(["new", "investigating", "resolved", "refunded", "ignored"] as const).map((s) => {
                                                    const active = issue.status === s;
                                                    return (
                                                        <button
                                                            key={s}
                                                            onClick={() => updateStatus(issue._id, s)}
                                                            disabled={active}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${active
                                                                ? STATUS_META[s].classes + " border-2 cursor-default"
                                                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                                                }`}
                                                        >
                                                            {STATUS_META[s].label}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {issue.resolvedAt && (
                                                <p className="text-[11px] text-gray-400 mt-3">
                                                    Resolved {formatDate(issue.resolvedAt)}{issue.resolvedBy ? ` by ${issue.resolvedBy}` : ""}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function Detail({
    icon, label, children,
}: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                {icon}
                <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
            </div>
            {children}
        </div>
    );
}
