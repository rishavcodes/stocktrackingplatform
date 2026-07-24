import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-blue-900/20">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Header Skeleton */}
				<div className="mb-8 space-y-4">
					<div className="flex items-start justify-between">
						<div className="flex-1 space-y-3">
							<Skeleton className="h-10 w-96 max-w-full" />
							<Skeleton className="h-6 w-full max-w-2xl" />
						</div>
						<Skeleton className="h-8 w-24" />
					</div>
					<div className="flex gap-4">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-32" />
					</div>
				</div>

				{/* Tabs Skeleton */}
				<div className="space-y-6">
					<Skeleton className="h-12 w-full" />

					{/* Content Grid Skeleton */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{Array.from({ length: 9 }).map((_, i) => (
							<Card
								key={`content-skeleton-${String(i)}`}
								className="overflow-hidden"
							>
								<Skeleton className="h-48 w-full" />
								<CardContent className="pt-4 space-y-3">
									<Skeleton className="h-5 w-3/4" />
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-2/3" />
									<div className="flex justify-between pt-2">
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-4 w-16" />
									</div>
								</CardContent>
							</Card>
						))}
					</div>

					{/* Pagination Skeleton */}
					<div className="flex justify-center">
						<Skeleton className="h-10 w-80" />
					</div>
				</div>
			</div>
		</div>
	);
}
