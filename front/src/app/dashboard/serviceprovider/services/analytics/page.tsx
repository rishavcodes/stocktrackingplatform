"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isReadOnlySubProfile } from "@/lib/subProfilePermissions";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	Users,
	IndianRupee,
	RefreshCw,
	UserCheck,
	TrendingUp,
	MapPin,
	Trophy,
	Briefcase,
	ChevronDown,
	Loader2,
} from "lucide-react";

/* ---------- Types matching the /api/post/plan-analytics response ---------- */
type PlanRef = { _id: string; title: string; segment?: string; serviceType?: string };
type Metrics = {
	totalSubscribers: number;
	activeSubscribers: number;
	expiredSubscribers: number;
	totalOrders: number;
	activeOrders: number;
	expiredOrders: number;
	totalRevenue: number;
	renewals: number;
	renewalRate: number;
	avgOrderValue: number;
};
type MonthlyPoint = { month: string; revenue: number; orders: number };
type StatePoint = { state: string; count: number };
type GenderPoint = { gender: string; count: number };
type TopSubscriber = {
	userId: string;
	name: string;
	email: string;
	state: string;
	ordersCount: number;
	totalSpent: number;
	lastPurchase?: string;
};
type AnalyticsData = {
	success: boolean;
	plans: PlanRef[];
	selectedServiceId: string | null;
	metrics: Metrics;
	monthlyRevenue: MonthlyPoint[];
	stateDistribution: StatePoint[];
	genderDistribution: GenderPoint[];
	top10: TopSubscriber[];
};

const COLORS = [
	"#3b82f6",
	"#10b981",
	"#f59e0b",
	"#8b5cf6",
	"#ec4899",
	"#06b6d4",
	"#84cc16",
	"#f43f5e",
	"#6366f1",
	"#14b8a6",
];

function formatINR(n: number | null | undefined): string {
	return Number(n || 0).toLocaleString("en-IN", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});
}

function formatMonth(key: string): string {
	// "2026-04" → "Apr 26"
	const [y, m] = key.split("-");
	const d = new Date(Number(y), Number(m) - 1, 1);
	return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

export default function PlanAnalyticsPage() {
	const { data: session } = useSession();
	const providerId = session?.user?.id;
	const router = useRouter();

	// Plan Analytics is hidden from view-only admin sub profiles — bounce them
	// to the plan list if they reach it via a direct URL. No early return here:
	// it would skip the hooks declared below and break the Rules of Hooks.
	const readOnly = isReadOnlySubProfile(session);
	useEffect(() => {
		if (readOnly) {
			router.replace("/dashboard/serviceprovider/services/myplans");
		}
	}, [readOnly, router]);

	const [selectedPlanId, setSelectedPlanId] = useState<string>("");
	const [data, setData] = useState<AnalyticsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!providerId) return;
		setLoading(true);
		setError("");
		const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/plan-analytics?providerId=${providerId}${selectedPlanId ? `&serviceId=${selectedPlanId}` : ""}`;
		fetch(url)
			.then((r) => r.json())
			.then((res) => {
				if (res?.success) setData(res);
				else setError(res?.message || "Failed to load analytics");
			})
			.catch(() => setError("Failed to load analytics"))
			.finally(() => setLoading(false));
	}, [providerId, selectedPlanId]);

	const selectedPlan = useMemo<PlanRef | null>(() => {
		if (!data?.plans) return null;
		return data.plans.find((p: PlanRef) => p._id === selectedPlanId) || null;
	}, [data, selectedPlanId]);

	const monthlyChartData = useMemo(
		() =>
			(data?.monthlyRevenue || []).map((m: MonthlyPoint) => ({
				...m,
				monthLabel: formatMonth(m.month),
			})),
		[data]
	);

	const stateChartData = useMemo(
		() => (data?.stateDistribution || []).slice(0, 10),
		[data]
	);

	if (loading && !data) {
		return (
			<div className="flex items-center justify-center h-96">
				<Loader2 className="w-8 h-8 animate-spin text-gray-400" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6 text-center text-red-500">{error}</div>
		);
	}

	if (!data) return null;

	const m = data.metrics;

	return (
		<div className="p-4 sm:p-6 space-y-4">
			{/* Header — title + plan selector */}
			<div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
				<div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="flex items-center gap-3">
							
							<div>
								<h1 className="text-lg font-semibold text-gray-900 dark:text-white">
									Plan Analytics
								</h1>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									{selectedPlan
										? `Showing data for: ${selectedPlan.title}`
										: "Showing data across all your plans"}
								</p>
							</div>
						</div>

						{/* Plan selector */}
						<div className="relative">
							<Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
							<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
							<select
								value={selectedPlanId}
								onChange={(e) => setSelectedPlanId(e.target.value)}
								className="h-10 pl-9 pr-9 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[240px] appearance-none"
							>
								<option value="">All Plans</option>
								{data.plans.map((p: PlanRef) => (
									<option key={p._id} value={p._id}>
										{p.title}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
				<KpiCard
					icon={<Users className="w-5 h-5" />}
					label="Total Subscribers"
					value={m.totalSubscribers.toLocaleString("en-IN")}
					hint={`${m.activeSubscribers} active`}
					color="blue"
				/>
				<KpiCard
					icon={<UserCheck className="w-5 h-5" />}
					label="Active Subscribers"
					value={m.activeSubscribers.toLocaleString("en-IN")}
					hint={`${m.expiredSubscribers} expired`}
					color="emerald"
				/>
				<KpiCard
					icon={<IndianRupee className="w-5 h-5" />}
					label="Total Revenue"
					value={`₹${formatINR(m.totalRevenue)}`}
					hint={`${m.totalOrders} orders`}
					color="amber"
				/>
				<KpiCard
					icon={<RefreshCw className="w-5 h-5" />}
					label="Renewals"
					value={m.renewals.toLocaleString("en-IN")}
					hint={`${m.renewalRate.toFixed(1)}% rate`}
					color="purple"
				/>
				<KpiCard
					icon={<TrendingUp className="w-5 h-5" />}
					label="Avg Order Value"
					value={`₹${formatINR(m.avgOrderValue)}`}
					hint="per purchase"
					color="rose"
				/>
			</div>

			{/* Revenue Trend + Gender Distribution */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{/* Revenue trend */}
				<div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
					<div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<TrendingUp className="w-4 h-4 text-blue-500" />
							<h3 className="text-sm font-semibold">Revenue Trend</h3>
							<span className="text-xs text-gray-400">last 12 months</span>
						</div>
					</div>
					<div className="p-3 h-72">
						{monthlyChartData.length === 0 ? (
							<EmptyState text="No revenue yet for this plan." />
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={monthlyChartData}>
									<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
									<XAxis
										dataKey="monthLabel"
										fontSize={11}
										tick={{ fill: "#6b7280" }}
									/>
									<YAxis
										fontSize={11}
										tick={{ fill: "#6b7280" }}
										tickFormatter={(v: number) =>
											v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
										}
									/>
									<Tooltip
										formatter={(
											value: number | undefined,
											name: string | undefined
										) =>
											name === "revenue"
												? [`₹${formatINR(value ?? 0)}`, "Revenue"]
												: [value ?? 0, "Orders"]
										}
									/>
									<Bar
										dataKey="revenue"
										fill="#3b82f6"
										radius={[6, 6, 0, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						)}
					</div>
				</div>

				{/* Gender pie */}
				<div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
					<div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
						<Users className="w-4 h-4 text-purple-500" />
						<h3 className="text-sm font-semibold">Gender Split</h3>
					</div>
					<div className="p-3 h-72">
						{data.genderDistribution.length === 0 ? (
							<EmptyState text="No subscribers yet." />
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={data.genderDistribution}
										dataKey="count"
										nameKey="gender"
										cx="50%"
										cy="50%"
										innerRadius={45}
										outerRadius={80}
										paddingAngle={2}
									>
										{data.genderDistribution.map((_: GenderPoint, i: number) => (
											<Cell key={i} fill={COLORS[i % COLORS.length]} />
										))}
									</Pie>
									<Tooltip />
									<Legend
										verticalAlign="bottom"
										iconType="circle"
										wrapperStyle={{ fontSize: 12 }}
									/>
								</PieChart>
							</ResponsiveContainer>
						)}
					</div>
				</div>
			</div>

			{/* State distribution + Top 10 */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{/* State chart */}
				<div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
					<div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
						<MapPin className="w-4 h-4 text-rose-500" />
						<h3 className="text-sm font-semibold">Subscribers by State</h3>
						<span className="text-xs text-gray-400">top 10</span>
					</div>
					<div className="p-3 h-80">
						{stateChartData.length === 0 ? (
							<EmptyState text="No subscriber state data available." />
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={stateChartData}
									layout="vertical"
									margin={{ left: 20 }}
								>
									<CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
									<XAxis type="number" fontSize={11} tick={{ fill: "#6b7280" }} />
									<YAxis
										type="category"
										dataKey="state"
										fontSize={11}
										tick={{ fill: "#6b7280" }}
										width={100}
									/>
									<Tooltip />
									<Bar dataKey="count" radius={[0, 6, 6, 0]}>
										{stateChartData.map((_: StatePoint, i: number) => (
											<Cell key={i} fill={COLORS[i % COLORS.length]} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						)}
					</div>
				</div>

				{/* Top 10 */}
				<div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
					<div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
						<Trophy className="w-4 h-4 text-amber-500" />
						<h3 className="text-sm font-semibold">Top 10 Subscribers</h3>
						<span className="text-xs text-gray-400">by total spend</span>
					</div>
					<div className="overflow-x-auto">
						{data.top10.length === 0 ? (
							<div className="p-10">
								<EmptyState text="No subscribers yet." />
							</div>
						) : (
							<table className="w-full text-sm">
								<thead>
									<tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
										<th className="px-4 py-2.5 text-left">#</th>
										<th className="px-4 py-2.5 text-left">Name</th>
										<th className="px-4 py-2.5 text-left">State</th>
										<th className="px-4 py-2.5 text-right">Orders</th>
										<th className="px-4 py-2.5 text-right">Spend</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
									{data.top10.map((s: TopSubscriber, i: number) => (
										<tr
											key={s.userId}
											className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition"
										>
											<td className="px-4 py-2.5">
												<span
													className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
														i === 0
															? "bg-amber-100 text-amber-700"
															: i === 1
																? "bg-gray-200 text-gray-700"
																: i === 2
																	? "bg-orange-100 text-orange-700"
																	: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
													}`}
												>
													{i + 1}
												</span>
											</td>
											<td className="px-4 py-2.5">
												<div className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">
													{s.name}
												</div>
												<div className="text-[11px] text-gray-500 truncate max-w-[180px]">
													{s.email}
												</div>
											</td>
											<td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
												{s.state}
											</td>
											<td className="px-4 py-2.5 text-right tabular-nums">
												{s.ordersCount}
											</td>
											<td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
												₹{formatINR(s.totalSpent)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

type KpiColor = "blue" | "emerald" | "amber" | "purple" | "rose";
function KpiCard({
	icon,
	label,
	value,
	hint,
	color,
}: {
	icon: ReactNode;
	label: string;
	value: string | number;
	hint?: string;
	color: KpiColor;
}) {
	const palette: Record<KpiColor, string> = {
		blue: "from-blue-500 to-indigo-600",
		emerald: "from-emerald-500 to-green-600",
		amber: "from-amber-500 to-orange-600",
		purple: "from-purple-500 to-fuchsia-600",
		rose: "from-rose-500 to-pink-600",
	};
	return (
		<div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm hover:shadow transition">
			<div className="flex items-center justify-between mb-2">
				<div
					className={`w-9 h-9 rounded-lg bg-gradient-to-br ${palette[color] ?? palette.blue} flex items-center justify-center text-white shadow-sm`}
				>
					{icon}
				</div>
			</div>
			<div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
				{label}
			</div>
			<div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white tabular-nums truncate">
				{value}
			</div>
			{hint && (
				<div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
					{hint}
				</div>
			)}
		</div>
	);
}

function EmptyState({ text }: { text: string }) {
	return (
		<div className="h-full w-full flex items-center justify-center text-sm text-gray-400">
			{text}
		</div>
	);
}
