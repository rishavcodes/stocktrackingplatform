"use client";

import { motion } from "framer-motion";
import { Building2, Calendar, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { authFetch } from "@/lib/authFetch";

interface Marketplace {
	id: string;
	name: string;
	description?: string;
	slug: string;
	broker: {
		name: string;
		email?: string;
		profileUrl?: string;
	};
	activeRAsCount: number;
	createdAt: string;
	updatedAt: string;
}

interface PaginationData {
	currentPage: number;
	totalPages: number;
	totalCount: number;
	limit: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

const MyMarketplacesPage = () => {
	const router = useRouter();
	const { data: session } = useSession();
	const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [pagination, setPagination] = useState<PaginationData | null>(null);
	const limit = 10;
	const debouncedSearchQuery = useDebounce(searchQuery, 500);

	const fetchMarketplaces = async (page: number, search: string) => {
		try {
			setLoading(true);
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
				...(search && { search }),
			});

			const response = await authFetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace?${params}`,
				{
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.backendToken}`,
					},
				},
			);

			if (!response.ok) throw new Error("Failed to fetch marketplaces");

			const result = await response.json();

			if (result.success) {
				setMarketplaces(result.data);
				setPagination(result.pagination);
			}
		} catch (error) {
			console.error("Error fetching marketplaces:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (session?.backendToken) {
			fetchMarketplaces(currentPage, debouncedSearchQuery);
		}
	}, [session?.backendToken, currentPage, debouncedSearchQuery]);

	useEffect(() => {
		// Reset to page 1 when search query changes
		if (debouncedSearchQuery !== undefined) {
			setCurrentPage(1);
		}
	}, [debouncedSearchQuery]);

	const handleViewDetails = (marketplaceId: string, slug: string) => {
		router.push(`/marketplace/${slug}`);
	};

	const renderPaginationItems = () => {
		if (!pagination) return null;

		const items = [];
		const { currentPage, totalPages } = pagination;

		// Show first page
		if (currentPage > 2) {
			items.push(
				<PaginationItem key={1}>
					<PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
				</PaginationItem>,
			);
		}

		// Show ellipsis
		if (currentPage > 3) {
			items.push(<PaginationEllipsis key="ellipsis-start" />);
		}

		// Show pages around current page
		for (
			let i = Math.max(1, currentPage - 1);
			i <= Math.min(totalPages, currentPage + 1);
			i++
		) {
			items.push(
				<PaginationItem key={i}>
					<PaginationLink
						onClick={() => setCurrentPage(i)}
						isActive={currentPage === i}
					>
						{i}
					</PaginationLink>
				</PaginationItem>,
			);
		}

		// Show ellipsis
		if (currentPage < totalPages - 2) {
			items.push(<PaginationEllipsis key="ellipsis-end" />);
		}

		// Show last page
		if (currentPage < totalPages - 1) {
			items.push(
				<PaginationItem key={totalPages}>
					<PaginationLink onClick={() => setCurrentPage(totalPages)}>
						{totalPages}
					</PaginationLink>
				</PaginationItem>,
			);
		}

		return items;
	};

	return (
		<div className="container mx-auto p-4 space-y-4">
			{/* Header Section */}
			<div className="flex flex-col gap-4">
				<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">
							My Marketplaces
						</h1>
						<p className="text-muted-foreground mt-1">
							Marketplaces where you are an active RA
						</p>
					</div>
					<div className="relative md:min-w-[350px]">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Search marketplaces..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
				</div>
			</div>

			{/* Stats */}
			{pagination && (
				<div className="flex gap-4 text-sm text-muted-foreground">
					<span>
						Showing {(currentPage - 1) * limit + 1}-
						{Math.min(currentPage * limit, pagination.totalCount)} of{" "}
						{pagination.totalCount} marketplaces
					</span>
				</div>
			)}

			{/* Marketplaces Grid */}
			{loading ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<Card key={i} className="overflow-hidden">
							<CardHeader>
								<Skeleton className="h-6 w-3/4" />
								<Skeleton className="h-4 w-1/2 mt-2" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-20 w-full" />
							</CardContent>
						</Card>
					))}
				</div>
			) : marketplaces.length === 0 ? (
				<Card className="p-12">
					<div className="text-center space-y-3">
						<div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
							<Building2 className="h-8 w-8 text-muted-foreground" />
						</div>
						<h3 className="text-xl font-semibold">No marketplaces found</h3>
						<p className="text-muted-foreground">
							{searchQuery
								? "Try adjusting your search query"
								: "You are not part of any marketplaces yet"}
						</p>
					</div>
				</Card>
			) : (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{marketplaces.map((marketplace, index) => (
							<motion.div
								key={marketplace.id}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.3, delay: index * 0.05 }}
							>
								<Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 h-full flex flex-col">
									<CardHeader className="pb-3">
										<CardTitle className="text-lg">
											{marketplace.name}
										</CardTitle>
										<CardDescription className="flex items-center gap-1.5 text-xs mt-1">
											<Building2 className="h-3 w-3" />
											{marketplace.broker.name}
										</CardDescription>
									</CardHeader>

									<CardContent className="flex-1 space-y-4">
										{marketplace.description && (
											<p className="text-sm text-muted-foreground line-clamp-3">
												{marketplace.description}
											</p>
										)}

										<div className="flex items-center gap-2 text-sm">
											<Users className="h-4 w-4 text-muted-foreground" />
											<span className="font-medium">
												{marketplace.activeRAsCount}
											</span>
											<span className="text-muted-foreground">
												Active RA{marketplace.activeRAsCount !== 1 ? "s" : ""}
											</span>
										</div>

										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											<Calendar className="h-3 w-3" />
											<span>
												Joined{" "}
												{new Date(marketplace.createdAt).toLocaleDateString(
													"en-US",
													{
														month: "short",
														day: "numeric",
														year: "numeric",
													},
												)}
											</span>
										</div>
									</CardContent>

									<CardFooter className="pt-3 border-t flex items-center justify-between gap-2">
										<Badge variant="secondary" className="text-xs">
											/{marketplace.slug}
										</Badge>
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												handleViewDetails(marketplace.id, marketplace.slug)
											}
										>
											View Details
										</Button>
									</CardFooter>
								</Card>
							</motion.div>
						))}
					</div>

					{/* Pagination */}
					{pagination && pagination.totalPages > 1 && (
						<div className="flex justify-center mt-8">
							<Pagination>
								<PaginationContent>
									<PaginationItem>
										<PaginationPrevious
											onClick={() =>
												pagination.hasPrevPage &&
												setCurrentPage((prev) => prev - 1)
											}
											className={
												!pagination.hasPrevPage
													? "pointer-events-none opacity-50"
													: "cursor-pointer"
											}
										/>
									</PaginationItem>

									{renderPaginationItems()}

									<PaginationItem>
										<PaginationNext
											onClick={() =>
												pagination.hasNextPage &&
												setCurrentPage((prev) => prev + 1)
											}
											className={
												!pagination.hasNextPage
													? "pointer-events-none opacity-50"
													: "cursor-pointer"
											}
										/>
									</PaginationItem>
								</PaginationContent>
							</Pagination>
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default MyMarketplacesPage;
