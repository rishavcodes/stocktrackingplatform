"use client";
import React from "react";
import { SuperUserApprovalDetailsType, ProviderBillingData, ProviderAnalyticsData, WalletTransaction } from "./SuperUserApprovalDetailsType";
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from "recharts";
import {
    Users, TrendingUp, BookOpen, Activity,
    Briefcase, Wallet,
} from "lucide-react";

type Props = {
    sp: SuperUserApprovalDetailsType;
    billingData?: ProviderBillingData | null;
    billingLoading?: boolean;
    analyticsData?: ProviderAnalyticsData | null;
    analyticsLoading?: boolean;
};

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4"];

export default function AnalyticsTab({ sp, billingData, billingLoading, analyticsData, analyticsLoading }: Props) {
    const stats = sp.stats;

    // ── Subscriber breakdown by category (live data preferred) ──
    const subscriberBreakdown = [
        { name: "Services", value: analyticsData?.services?.totalSubscribers ?? stats?.serviceStats?.totalSubscribers ?? 0, color: "#10b981" },
        { name: "Portfolios", value: stats?.modelPortfolioStates?.totalSubscribers ?? 0, color: "#3b82f6" },
        { name: "Packages", value: analyticsData?.packages?.totalPurchases ?? 0, color: "#8b5cf6" },
        { name: "Events", value: analyticsData?.events?.totalRegistrations ?? 0, color: "#f59e0b" },
    ].filter((d) => d.value > 0);
    const totalSubscriberCount = subscriberBreakdown.reduce((a, b) => a + b.value, 0);

    // ── Content data (live data preferred for articles and services) ──
    const contentData = [
        { name: "Articles", value: analyticsData?.articles?.total ?? stats?.contentStats?.articles ?? 0 },
        { name: "Events", value: analyticsData?.events?.total ?? stats?.contentStats?.events ?? 0 },
        { name: "Services", value: analyticsData?.services?.total ?? stats?.contentStats?.services ?? 0 },
    ].filter((d) => d.value > 0);

    // ── Recommendation data — prefer live analyticsData over stale stats ──
    const recoOpen = analyticsData?.recommendations?.open ?? stats?.recommendationStats?.open ?? 0;
    const recoClosed = analyticsData?.recommendations?.closed ?? stats?.recommendationStats?.close ?? 0;
    const recoData = [
        { name: "Open", value: recoOpen },
        { name: "Closed", value: recoClosed },
    ];
    const recoTotal = analyticsData?.recommendations?.total ?? recoOpen + recoClosed;

    // ── Portfolio data ──
    const portfolioData = [
        { name: "Active", value: stats?.modelPortfolioStates?.activePortfolios ?? 0 },
        { name: "Closed", value: stats?.modelPortfolioStates?.closedPortfolios ?? 0 },
    ];

    // ── Course data ──
    const courseData = [
        { name: "Published", value: stats?.courseStates?.publishedCourses ?? 0 },
        { name: "Draft", value: stats?.courseStates?.draftCourses ?? 0 },
    ];

    // ── Wallet transaction breakdown ──
    const txBreakdown: Record<string, number> = {};
    billingData?.walletTransactions?.forEach((tx: WalletTransaction) => {
        const label = TX_LABELS[tx.type] || tx.type;
        txBreakdown[label] = (txBreakdown[label] || 0) + tx.amount;
    });

    const txBreakdownData = Object.entries(txBreakdown)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => b.value - a.value);

    // ── TradeBox revenue from this SP (without GST) ──
    // Upfront = one-time subscription setup fee (already stored pre-GST).
    // Wallet deductions = ongoing charges TradeBox debits from the SP wallet;
    //   these are stored with 18% GST baked in (see PaymentController.ts:638),
    //   so we divide by 1.18 to back out the GST portion.
    const TRADEBOX_EARNING_TX_TYPES = new Set([
        "Onboarding-Charge",
        "Renewal-Charge",
        "subscription-charge",
        "additional_charge",
        "model-portfolio-charge",
    ]);
    const walletDeductionGross = billingData?.walletTransactions
        ?.filter((tx) => TRADEBOX_EARNING_TX_TYPES.has(tx.type))
        .reduce((sum, tx) => sum + (tx.amount || 0), 0) ?? 0;
    const walletDeductionNet = walletDeductionGross / 1.18;
    // currentSubscriptionDetails.amount is typed as string but actually stored as number
    const upfrontRevenue = Number(sp.currentSubscriptionDetails?.amount ?? 0) || 0;
    const totalTradeboxRevenue = upfrontRevenue + walletDeductionNet;
    const revenueBreakdownData = [
        { name: "Upfront", value: Math.round(upfrontRevenue), color: "#8b5cf6" },
        { name: "Wallet Deductions", value: Math.round(walletDeductionNet), color: "#10b981" },
    ].filter((d) => d.value > 0);

    // ── Services data ──
    const servicesActive = [
        { name: "Recommendations", active: sp.services?.recommendations },
        { name: "Payment Gateway", active: sp.services?.paymentGateway },
        { name: "Onboarding", active: sp.services?.onboarding },
        { name: "Content", active: sp.services?.content },
        { name: "Model Portfolio", active: sp.services?.modelPortfolio },
        { name: "Recurring Pay", active: sp.services?.recurringPayment },
        { name: "LMS", active: sp.lmsCommercial?.enabled },
    ];
    const activeCount = servicesActive.filter((s) => s.active).length;
    const inactiveCount = servicesActive.length - activeCount;
    const servicesPieData = [
        { name: "Active", value: activeCount },
        { name: "Inactive", value: inactiveCount },
    ];

    // ── Total Sales (total invoice value billed to customers, incl. GST) ──
    const totalOrders = billingData?.orders?.length ?? 0;
    const totalRevenue = billingData?.orders?.reduce((sum, o) => sum + (o.total || 0), 0) ?? 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // ── Live counts from analyticsData ──
    const livePlans = analyticsData?.services?.total ?? stats?.serviceStats?.totalPlans ?? 0;
    const livePackages = analyticsData?.packages?.total ?? 0;

    return (
        <div className="space-y-6">
            {/* ── KPI Row ── */}
            {(analyticsLoading) ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className="rounded-xl px-4 py-3 bg-white border border-gray-200 animate-pulse">
                            <div className="h-3 bg-gray-100 rounded mb-2 w-2/3" />
                            <div className="h-6 bg-gray-100 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                    <KPI icon={<Users className="w-4 h-4" />} label="Subscribers" value={totalSubscriberCount} />
                    <KPI icon={<TrendingUp className="w-4 h-4" />} label="Recommendations" value={recoTotal} />
                    <KPI icon={<Briefcase className="w-4 h-4" />} label="Plans" value={livePlans} />
                    <KPI icon={<Activity className="w-4 h-4" />} label="Packages" value={livePackages} />
                    <KPI icon={<BookOpen className="w-4 h-4" />} label="Courses" value={stats?.courseStates?.totalCourses ?? 0} />
                    <KPI icon={<TrendingUp className="w-4 h-4" />} label="Revenue" value={`₹${Math.round(totalRevenue).toLocaleString("en-IN")}`} />
                    <KPI icon={<Wallet className="w-4 h-4" />} label="Balance" value={`₹${sp.wallet?.amount?.toFixed(0) || 0}`} />
                </div>
            )}

            {/* ── Subscriber Breakdown (full-width hero) ── */}
            <ChartCard title="Subscriber Breakdown" subtitle={`${totalSubscriberCount} total across all categories`}>
                {analyticsLoading ? (
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : subscriberBreakdown.length > 0 ? (
                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                        <div className="relative flex-shrink-0">
                            <ResponsiveContainer width={260} height={260}>
                                <PieChart>
                                    <Pie data={subscriberBreakdown} dataKey="value" cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={3} strokeWidth={0}>
                                        {subscriberBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(v: any) => v.toLocaleString()} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold text-gray-900 leading-none">{totalSubscriberCount.toLocaleString()}</span>
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mt-1">Total</span>
                            </div>
                        </div>
                        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {subscriberBreakdown.map((entry) => {
                                const pct = totalSubscriberCount > 0 ? (entry.value / totalSubscriberCount) * 100 : 0;
                                return (
                                    <div key={entry.name} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                            <span className="text-sm font-medium text-gray-600">{entry.name}</span>
                                        </div>
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-2xl font-bold text-gray-900">{entry.value.toLocaleString()}</span>
                                            <span className="text-xs font-semibold text-gray-400">{pct.toFixed(1)}%</span>
                                        </div>
                                        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{ width: `${pct}%`, backgroundColor: entry.color }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : <EmptyChart />}
            </ChartCard>

            {/* ── Row 1: Content Distribution ── */}
            <div className="grid grid-cols-1 gap-5">
                <ChartCard title="Content Distribution" subtitle={`${contentData.reduce((a, b) => a + b.value, 0)} items`}>
                    {contentData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={contentData} barSize={28}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {contentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyChart />}
                </ChartCard>
            </div>

            {/* ── Row 2: Recommendations + Portfolios ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <ChartCard title="Recommendations" subtitle={`${recoTotal} total · ${stats?.recommendationStats?.returnPercentage ?? 0}% return`}>
                    {recoTotal > 0 ? (
                        <div className="flex items-center gap-6">
                            <ResponsiveContainer width={140} height={140}>
                                <PieChart>
                                    <Pie data={recoData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={4} strokeWidth={0}>
                                        <Cell fill="#10b981" />
                                        <Cell fill="#ef4444" />
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-3">
                                <ChartMetric label="Open" value={recoData[0].value} color="#10b981" />
                                <ChartMetric label="Closed" value={recoData[1].value} color="#ef4444" />
                                <ChartMetric label="Return Ratio" value={stats?.recommendationStats?.returnRatio ?? 0} color="#8b5cf6" />
                            </div>
                        </div>
                    ) : <EmptyChart />}
                </ChartCard>

                <ChartCard title="Model Portfolios" subtitle={`${stats?.modelPortfolioStates?.totalPortfolios ?? 0} total · ${stats?.modelPortfolioStates?.avgReturnPercentage ?? 0}% avg return`}>
                    {(portfolioData[0].value + portfolioData[1].value) > 0 ? (
                        <div className="flex items-center gap-6">
                            <ResponsiveContainer width={140} height={140}>
                                <PieChart>
                                    <Pie data={portfolioData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={4} strokeWidth={0}>
                                        <Cell fill="#3b82f6" />
                                        <Cell fill="#94a3b8" />
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-3">
                                <ChartMetric label="Active" value={portfolioData[0].value} color="#3b82f6" />
                                <ChartMetric label="Closed" value={portfolioData[1].value} color="#94a3b8" />
                                <ChartMetric label="Subscribers" value={stats?.modelPortfolioStates?.totalSubscribers ?? 0} color="#8b5cf6" />
                            </div>
                        </div>
                    ) : <EmptyChart />}
                </ChartCard>

                <ChartCard title="Courses" subtitle={`${stats?.courseStates?.totalCourses ?? 0} total · ₹${stats?.courseStates?.totalRevenue ?? 0} revenue`}>
                    {(courseData[0].value + courseData[1].value) > 0 ? (
                        <div className="flex items-center gap-6">
                            <ResponsiveContainer width={140} height={140}>
                                <PieChart>
                                    <Pie data={courseData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={4} strokeWidth={0}>
                                        <Cell fill="#10b981" />
                                        <Cell fill="#f59e0b" />
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-3">
                                <ChartMetric label="Published" value={courseData[0].value} color="#10b981" />
                                <ChartMetric label="Draft" value={courseData[1].value} color="#f59e0b" />
                                <ChartMetric label="Enrollments" value={stats?.courseStates?.totalEnrollments ?? 0} color="#3b82f6" />
                            </div>
                        </div>
                    ) : <EmptyChart />}
                </ChartCard>
            </div>

            {/* ── Plans & Packages Row ── */}
            {analyticsData && (analyticsData.services.total > 0 || analyticsData.packages.total > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {analyticsData.services.total > 0 && (
                        <ChartCard title="Plans / Services" subtitle={`${analyticsData.services.total} plans · ${analyticsData.services.totalSubscribers} subscribers`}>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {analyticsData.services.list.map((svc) => (
                                    <div key={svc._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                        <span className="text-sm text-gray-700 truncate flex-1 mr-4">{svc.title}</span>
                                        <span className="text-xs font-semibold text-gray-500 flex-shrink-0">{svc.subscribedBy?.length ?? 0} subs</span>
                                    </div>
                                ))}
                            </div>
                        </ChartCard>
                    )}
                    {analyticsData.packages.total > 0 && (
                        <ChartCard title="Packages" subtitle={`${analyticsData.packages.total} packages · ${analyticsData.packages.totalPurchases} purchases`}>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {analyticsData.packages.list.map((pkg) => (
                                    <div key={pkg._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                        <span className="text-sm text-gray-700 truncate flex-1 mr-4">{pkg.title}</span>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <span className="text-xs text-gray-400">{pkg.pricingPlans?.length ? `From ₹${Math.min(...pkg.pricingPlans.map((t) => t.price))}` : "—"}</span>
                                            <span className="text-xs font-semibold text-gray-500">{pkg.stats?.purchases ?? 0} sold</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ChartCard>
                    )}
                </div>
            )}

            {/* ── Row 3: Wallet Flow + Total Revenue ── */}
            {billingLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* ── Row 3: TradeBox Revenue + Transaction Breakdown + Total Sales + Services ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                        <ChartCard title="TradeBox Revenue" subtitle={`₹${Math.round(totalTradeboxRevenue).toLocaleString()} earned (excl. GST)`}>
                            {totalTradeboxRevenue > 0 ? (
                                <div className="flex items-center gap-6">
                                    <ResponsiveContainer width={120} height={120}>
                                        <PieChart>
                                            <Pie data={revenueBreakdownData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={4} strokeWidth={0}>
                                                {revenueBreakdownData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                                            </Pie>
                                            <Tooltip formatter={(v: any) => `₹${v.toLocaleString()}`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="space-y-2 flex-1 min-w-0">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-semibold">Upfront</p>
                                            <p className="text-sm font-bold text-purple-700">₹{Math.round(upfrontRevenue).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-semibold">Wallet Ded.</p>
                                            <p className="text-sm font-bold text-emerald-700">₹{Math.round(walletDeductionNet).toLocaleString()}</p>
                                        </div>
                                        <div className="pt-1.5 border-t border-gray-100">
                                            <p className="text-[10px] text-gray-400 uppercase font-semibold">Total</p>
                                            <p className="text-sm font-bold text-gray-900">₹{Math.round(totalTradeboxRevenue).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : <EmptyChart />}
                        </ChartCard>

                        <ChartCard title="Transaction Breakdown" subtitle={`${billingData?.walletTransactions?.length ?? 0} transactions`}>
                            {txBreakdownData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={txBreakdownData} layout="vertical" barSize={16}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="#94a3b8" width={90} />
                                        <Tooltip formatter={(v: any) => `₹${v.toLocaleString()}`} />
                                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                            {txBreakdownData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <EmptyChart />}
                        </ChartCard>

                        <ChartCard title="Total Sales" subtitle="Total invoice value billed to customers (incl. GST)">
                            {totalOrders > 0 ? (
                                <div className="h-full flex flex-col justify-center">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Total Sales</p>
                                    <p className="text-3xl font-bold text-gray-900 leading-tight mt-1">
                                        ₹{Math.round(totalRevenue).toLocaleString("en-IN")}
                                    </p>
                                    <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Invoices</p>
                                            <p className="text-base font-bold text-gray-800 mt-0.5">{totalOrders.toLocaleString("en-IN")}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Avg Order</p>
                                            <p className="text-base font-bold text-gray-800 mt-0.5">₹{Math.round(avgOrderValue).toLocaleString("en-IN")}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : <EmptyChart />}
                        </ChartCard>

                        <ChartCard title="Services Status" subtitle={`${activeCount} of ${servicesActive.length} active`}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <ResponsiveContainer width={100} height={100}>
                                        <PieChart>
                                            <Pie data={servicesPieData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={45} paddingAngle={4} strokeWidth={0}>
                                                <Cell fill="#10b981" />
                                                <Cell fill="#e5e7eb" />
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex-1 space-y-1.5">
                                        {servicesActive.map((s) => (
                                            <div key={s.name} className="flex items-center gap-2">
                                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.active ? "bg-green-500" : "bg-gray-300"}`} />
                                                <span className={`text-xs ${s.active ? "text-gray-700 font-medium" : "text-gray-400"}`}>{s.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </ChartCard>
                    </div>

                </>
            )}
        </div>
    );
}

/* ── Helpers ── */

const TX_LABELS: Record<string, string> = {
    topup: "Top Up",
    "manual-topup": "Manual Top Up",
    withdraw: "Withdrawal",
    deduction: "Deduction",
    "subscription-charge": "Subscription",
    "Onboarding-Charge": "Onboarding",
    "Renewal-Charge": "Renewal",
    additional_charge: "Additional",
    "model-portfolio-charge": "Portfolio",
    "course-sale": "Course Sale",
    "marketplace-broker-commission": "Broker Commission",
};

function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number; color?: string }) {
    return (
        <div className="rounded-xl px-4 py-3 bg-white border border-gray-200">
            <div className="flex items-center gap-2 mb-1 text-gray-400">{icon}<span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span></div>
            <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
    );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
                {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function ChartMetric({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">{label}</p>
                <p className="text-sm font-bold text-gray-800">{value.toLocaleString()}</p>
            </div>
        </div>
    );
}

function EmptyChart() {
    return (
        <div className="flex items-center justify-center h-32 text-sm text-gray-300">
            No data available
        </div>
    );
}
