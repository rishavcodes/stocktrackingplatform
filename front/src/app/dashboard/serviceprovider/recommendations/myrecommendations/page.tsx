"use client";

import { useSession } from "next-auth/react";
import {
	MyRecommendationTable,
	ScoreCardTypesEnum,
	useScoreCardData,
} from "@/components";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function MyRecommendationsPage() {
	const session = useSession();

	const {
		openTrades,
		closedTrades,
		totalOpenTrades,
		totalClosedTrades,
		loadMoreOpen,
		loadMoreClosed,
		openLoading,
		closedLoading,
		initializing,
		error,
	} = useScoreCardData(
		session.data?.user.id!,
		session.data?.user.role!,
		ScoreCardTypesEnum.ServiceProviderDashboard,
	);

	// Auth is still resolving — show a spinner instead of mounting the
	// table with empty data (which would flash the "No recommendations
	// found" empty state for ~500ms-2s and make users hit refresh).
	if (session.status === "loading") {
		return (
			<div className="mt-5 pb-20 flex items-center justify-center min-h-[40vh] text-gray-500">
				<Loader2 className="w-5 h-5 animate-spin mr-2" />
				Loading…
			</div>
		);
	}

	// Expired/missing token — surface explicitly rather than rendering an
	// empty page silently (the historical "blank page" bug).
	if (session.status === "unauthenticated") {
		return (
			<div className="mt-5 pb-20 flex flex-col items-center justify-center min-h-[40vh] text-gray-700 dark:text-gray-300">
				<p className="mb-3">Your session has expired.</p>
				<Link
					href="/login"
					className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
				>
					Sign in again
				</Link>
			</div>
		);
	}

	const openCount = totalOpenTrades ?? openTrades?.length ?? 0;
	const openHasMore = (openTrades?.length ?? 0) < (totalOpenTrades ?? 0);
	const closedHasMore = (closedTrades?.length ?? 0) < (totalClosedTrades ?? 0);

	return (
		<div className="mt-5 pb-20">
			{error && (
				<div className="mb-3 px-4 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
					Live tracking is offline — {error}. Retrying…
				</div>
			)}
			<Tabs defaultValue="open" className="w-full">
				<TabsList>
					<TabsTrigger value="open">
						Open Recommendations ({openCount})
					</TabsTrigger>
					<TabsTrigger value="closed">Closed Recommendations</TabsTrigger>
				</TabsList>

				<TabsContent value="open" className="mt-4">
					<MyRecommendationTable
						data={openTrades}
						type="open"
						isDashboard={true}
						totalOpenTrades={totalOpenTrades}
						onLoadMore={loadMoreOpen}
						hasMore={openHasMore}
						loadingMore={openLoading}
						initializing={initializing}
					/>
				</TabsContent>

				<TabsContent value="closed" className="mt-4">
					<MyRecommendationTable
						data={closedTrades}
						type="closed"
						isDashboard={true}
						onLoadMore={loadMoreClosed}
						hasMore={closedHasMore}
						loadingMore={closedLoading}
						initializing={initializing}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
