"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { authFetch } from "@/lib/authFetch";
import { motion } from "framer-motion";
import {
	Users,
	TrendingUp,
	Briefcase,
	Layers,
	BookOpen,
	Calendar,
} from "lucide-react";

type BrokerStats = {
	registeredRAs: number;
	recommendations: number;
	modelPortfolios: number;
	services: number;
	courses: number;
	events: number;
	totalMarketplaces: number;
};

const statCards = [
	{
		key: "registeredRAs" as const,
		title: "Research Analysts",
		icon: Users,
		color: "text-blue-500",
		bg: "bg-blue-50 dark:bg-blue-900/20",
	},
	{
		key: "recommendations" as const,
		title: "Recommendations",
		icon: TrendingUp,
		color: "text-green-500",
		bg: "bg-green-50 dark:bg-green-900/20",
	},
	{
		key: "modelPortfolios" as const,
		title: "Model Portfolios",
		icon: Briefcase,
		color: "text-purple-500",
		bg: "bg-purple-50 dark:bg-purple-900/20",
	},
	{
		key: "services" as const,
		title: "Services",
		icon: Layers,
		color: "text-orange-500",
		bg: "bg-orange-50 dark:bg-orange-900/20",
	},
	{
		key: "courses" as const,
		title: "Courses",
		icon: BookOpen,
		color: "text-indigo-500",
		bg: "bg-indigo-50 dark:bg-indigo-900/20",
	},
	{
		key: "events" as const,
		title: "Events",
		icon: Calendar,
		color: "text-pink-500",
		bg: "bg-pink-50 dark:bg-pink-900/20",
	},
];

export default function OverviewPage() {
	const { data: session } = useSession();
	const [stats, setStats] = useState<BrokerStats | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!session?.backendToken) return;

		const fetchStats = async () => {
			try {
				const res = await authFetch(
					`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/broker/stats`,
					{
						headers: {
							Authorization: `Bearer ${session.backendToken}`,
						},
					},
				);
				const data = await res.json();
				if (data.success) {
					setStats(data.data);
				}
			} catch (error) {
				console.error("Failed to fetch broker stats:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchStats();
	}, [session?.backendToken]);

	if (loading) {
		return <p className="p-6 text-gray-500">Loading statistics...</p>;
	}

	return (
		<div className="pb-20 min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="m-5">
				<div className="mb-6">
					<h1 className="text-2xl font-bold text-gray-800 dark:text-white">
						Dashboard Overview
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
						{stats?.totalMarketplaces || 0} active marketplace
						{stats?.totalMarketplaces !== 1 ? "s" : ""}
					</p>
				</div>

				<motion.div
					className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.1 }}
				>
					{statCards.map((card, index) => {
						const Icon = card.icon;
						const value = stats?.[card.key] || 0;

						return (
							<motion.div
								key={card.key}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: index * 0.1 }}
								whileHover={{ scale: 1.03 }}
								className="transition-transform"
							>
								<div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
									<div className="flex items-center gap-4">
										<div
											className={`w-12 h-12 rounded-lg ${card.bg} flex items-center justify-center`}
										>
											<Icon className={`w-6 h-6 ${card.color}`} />
										</div>
										<div>
											<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
												{card.title}
											</p>
											<p className="text-3xl font-bold text-gray-800 dark:text-white">
												{value.toLocaleString()}
											</p>
										</div>
									</div>
								</div>
							</motion.div>
						);
					})}
				</motion.div>
			</div>
		</div>
	);
}
