"use client";

import { motion } from "framer-motion";
import {
	Calendar,
	Globe2,
	Loader2,
	MoreVertical,
	Pencil,
	Plus,
	Search,
	Trash2,
	Users,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useId, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DropdownOption } from "@/components/ui/multi-select-dropdown-search";
import { MultiSelectDropdownSearch } from "@/components/ui/multi-select-dropdown-search";
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
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";

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

interface RAInvitation {
	raId: {
		_id: string;
		name?: string;
		RegName?: string;
		companyName?: string;
		email?: string;
	} | null;
	status: string;
}

interface MarketplaceDetail {
	_id: string;
	name: string;
	description?: string;
	invitations: RAInvitation[];
	activeRaIds: Array<{
		_id: string;
		name?: string;
		RegName?: string;
		companyName?: string;
		email?: string;
	}>;
}

const MyMarketplacesPage = () => {
	const nameId = useId();
	const descriptionId = useId();
	const { data: session } = useSession();
	const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [pagination, setPagination] = useState<PaginationData | null>(null);
	const limit = 10;
	const router = useRouter();
	const debouncedSearchQuery = useDebounce(searchQuery, 500);
	const { toast } = useToast();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [marketplaceToDelete, setMarketplaceToDelete] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	// Edit state
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [editingMarketplace, setEditingMarketplace] =
		useState<MarketplaceDetail | null>(null);
	const [editFormData, setEditFormData] = useState({
		name: "",
		description: "",
	});
	const [isLoadingMarketplace, setIsLoadingMarketplace] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);

	// RA state
	const [raOptions, setRaOptions] = useState<DropdownOption[]>([]);
	const [isLoadingRa, setIsLoadingRa] = useState(false);
	const [currentRAs, setCurrentRAs] = useState<
		Array<{ id: string; name: string }>
	>([]);
	const [selectedNewRaIds, setSelectedNewRaIds] = useState<string[]>([]);
	const [removedRaIds, setRemovedRaIds] = useState<string[]>([]);

	const fetchMarketplaces = async (page: number, search: string) => {
		try {
			setLoading(true);
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
				...(search && { search }),
			});

			const response = await fetch(
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

	// Fetch service providers from API
	const fetchServiceProviders = useCallback(async (search: string = "") => {
		setIsLoadingRa(true);
		try {
			const params = new URLSearchParams({
				page: "1",
				limit: "50",
				...(search && { search }),
			});

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/serviceproviders?${params.toString()}`,
			);

			if (!response.ok) {
				throw new Error("Failed to fetch service providers");
			}

			const result = await response.json();

			if (result.success && result.data?.serviceProviders) {
				const mappedOptions: DropdownOption[] =
					result.data.serviceProviders.map(
						(provider: {
							id: string;
							name: string;
							RegName?: string;
							companyName?: string;
						}) => ({
							value: provider.id,
							label:
								provider.name ||
								provider.RegName ||
								provider.companyName ||
								"Unknown",
						}),
					);
				setRaOptions(mappedOptions);
			}
		} catch (error) {
			console.error("Error fetching service providers:", error);
			setRaOptions([]);
		} finally {
			setIsLoadingRa(false);
		}
	}, []);

	const fetchMarketplaceDetails = async (marketplaceId: string) => {
		setIsLoadingMarketplace(true);
		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceId}`,
				{
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.backendToken}`,
					},
				},
			);

			if (!response.ok) {
				throw new Error("Failed to fetch marketplace details");
			}

			const result = await response.json();

			if (result.success) {
				setEditingMarketplace(result.data);
				setEditFormData({
					name: result.data.name || "",
					description: result.data.description || "",
				});

				// Build the current-RA list from the SAME source as the card count
				// (activeRaIds), merged with still-pending invitations so the broker
				// can also revoke unaccepted invites. De-duped by id (active wins),
				// null-safe against deleted/unpopulated serviceproviders.
				type PopulatedRA = {
					_id: string;
					name?: string;
					RegName?: string;
					companyName?: string;
				} | null;
				const raName = (ra: NonNullable<PopulatedRA>) =>
					ra.name || ra.RegName || ra.companyName || "Unknown";

				const mergedRAs = new Map<string, { id: string; name: string }>();

				// (a) Active RAs — exactly what the card counts
				for (const ra of (result.data.activeRaIds ?? []) as PopulatedRA[]) {
					if (!ra || !ra._id) continue;
					mergedRAs.set(ra._id, { id: ra._id, name: raName(ra) });
				}

				// (b) Pending invitations — not yet active, but removable
				for (const inv of (result.data.invitations ?? []) as RAInvitation[]) {
					if (inv.status !== "pending") continue;
					const ra = inv.raId;
					if (!ra || !ra._id) continue;
					if (!mergedRAs.has(ra._id)) {
						mergedRAs.set(ra._id, { id: ra._id, name: raName(ra) });
					}
				}

				setCurrentRAs(Array.from(mergedRAs.values()));
				setSelectedNewRaIds([]);
				setRemovedRaIds([]);
			}
		} catch (error) {
			console.error("Error fetching marketplace details:", error);
			toast({
				title: "Error",
				description: "Failed to load marketplace details",
				variant: "destructive",
			});
		} finally {
			setIsLoadingMarketplace(false);
		}
	};

	const handleEdit = async (marketplaceId: string) => {
		setEditDialogOpen(true);
		await fetchMarketplaceDetails(marketplaceId);
		await fetchServiceProviders();
	};

	const handleRemoveRA = (raId: string) => {
		// Add to removed list
		setRemovedRaIds((prev) => [...prev, raId]);
		// Remove from current RAs
		setCurrentRAs((prev) => prev.filter((ra) => ra.id !== raId));
	};

	const handleAddNewRAs = (selectedIds: string[]) => {
		setSelectedNewRaIds(selectedIds);
	};

	const handleRaSearchChange = useCallback(
		(searchQuery: string) => {
			fetchServiceProviders(searchQuery);
		},
		[fetchServiceProviders],
	);

	const handleUpdateMarketplace = async () => {
		if (!editingMarketplace) return;

		setIsUpdating(true);

		try {
			const payload: {
				name?: string;
				description?: string;
				removeRaIds?: string[];
				invitedRaIds?: string[];
			} = {};

			// Only include changed fields
			if (editFormData.name !== editingMarketplace.name) {
				payload.name = editFormData.name.trim();
			}

			if (editFormData.description !== editingMarketplace.description) {
				payload.description = editFormData.description.trim();
			}

			if (removedRaIds.length > 0) {
				payload.removeRaIds = removedRaIds;
			}

			if (selectedNewRaIds.length > 0) {
				payload.invitedRaIds = selectedNewRaIds;
			}

			// Check if any changes were made
			if (Object.keys(payload).length === 0) {
				toast({
					title: "No changes",
					description: "No changes were made to the marketplace",
				});
				setEditDialogOpen(false);
				return;
			}

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${editingMarketplace._id}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.backendToken}`,
					},
					body: JSON.stringify(payload),
				},
			);

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || "Failed to update marketplace");
			}

			toast({
				title: "Success",
				description: "Marketplace updated successfully",
			});

			// Refresh the list
			fetchMarketplaces(currentPage, debouncedSearchQuery);
			setEditDialogOpen(false);
		} catch (error) {
			console.error("Error updating marketplace:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error
						? error.message
						: "Failed to update marketplace",
				variant: "destructive",
			});
		} finally {
			setIsUpdating(false);
		}
	};

	const handleDelete = (marketplaceId: string, marketplaceName: string) => {
		setMarketplaceToDelete({ id: marketplaceId, name: marketplaceName });
		setDeleteDialogOpen(true);
	};

	const confirmDelete = async () => {
		if (!marketplaceToDelete || !session?.backendToken) return;

		try {
			setIsDeleting(true);
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace/${marketplaceToDelete.id}`,
				{
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.backendToken}`,
					},
				},
			);

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || "Failed to delete marketplace");
			}

			toast({
				title: "Success",
				description: "Marketplace deleted successfully",
			});

			// Refresh the list
			fetchMarketplaces(currentPage, debouncedSearchQuery);
		} catch (error) {
			console.error("Error deleting marketplace:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error
						? error.message
						: "Failed to delete marketplace",
				variant: "destructive",
			});
		} finally {
			setIsDeleting(false);
			setDeleteDialogOpen(false);
			setMarketplaceToDelete(null);
		}
	};

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
							Manage and monitor your marketplaces
						</p>
					</div>
					<div className="flex flex-col sm:flex-row gap-2 md:min-w-[400px]">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								type="text"
								placeholder="Search marketplaces..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10"
							/>
						</div>
						<Button
							className="gap-2 shrink-0"
							onClick={() =>
								router.push("/dashboard/broker/marketplace/create")
							}
						>
							<Plus className="h-4 w-4" />
							Create
						</Button>
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
							<Users className="h-8 w-8 text-muted-foreground" />
						</div>
						<h3 className="text-xl font-semibold">No marketplaces found</h3>
						<p className="text-muted-foreground">
							{searchQuery
								? "Try adjusting your search query"
								: "Get started by creating your first marketplace"}
						</p>
						{!searchQuery && (
							<Button className="mt-4">
								<Plus className="h-4 w-4 mr-2" />
								Create Marketplace
							</Button>
						)}
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
										<div className="flex items-start justify-between gap-2">
											<div className="flex-1 min-w-0">
												<CardTitle className="text-lg truncate">
													{marketplace.name}
												</CardTitle>
												<CardDescription className="mt-1 text-xs">
													{marketplace.broker.name}
												</CardDescription>
											</div>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 shrink-0"
													>
														<MoreVertical className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onClick={() => handleEdit(marketplace.id)}
													>
														<Pencil className="h-4 w-4 mr-2" />
														Edit
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() =>
															router.push(
																`/dashboard/broker/marketplace/${marketplace.id}/footer`
															)
														}
													>
														<Globe2 className="h-4 w-4 mr-2" />
														Marketplace Settings
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() =>
															handleDelete(marketplace.id, marketplace.name)
														}
														className="text-destructive focus:text-destructive"
													>
														<Trash2 className="h-4 w-4 mr-2" />
														Delete
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
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
												Created{" "}
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

			{/* Edit Marketplace Dialog */}
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent className="max-w-2xl p-4 max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit Marketplace</DialogTitle>
						<DialogDescription>
							Update marketplace details and manage RA invitations
						</DialogDescription>
					</DialogHeader>

					{isLoadingMarketplace ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					) : (
						<div className="space-y-6 py-4">
							{/* Name Field */}
							<div className="space-y-2">
								<Label htmlFor={nameId}>Marketplace Name</Label>
								<Input
									id={nameId}
									value={editFormData.name}
									onChange={(e) =>
										setEditFormData((prev) => ({
											...prev,
											name: e.target.value,
										}))
									}
									placeholder="Enter marketplace name"
									maxLength={120}
								/>
								<p className="text-xs text-muted-foreground">
									{editFormData.name.length}/120 characters
								</p>
							</div>

							{/* Description Field */}
							<div className="space-y-2">
								<Label htmlFor={descriptionId}>Description</Label>
								<Textarea
									id={descriptionId}
									value={editFormData.description}
									onChange={(e) =>
										setEditFormData((prev) => ({
											...prev,
											description: e.target.value,
										}))
									}
									placeholder="Enter marketplace description"
									rows={4}
									maxLength={500}
								/>
								<p className="text-xs text-muted-foreground">
									{editFormData.description.length}/500 characters
								</p>
							</div>

							{/* Current RAs */}
							<div className="space-y-2">
								<Label>Current RA Providers</Label>
								{currentRAs.length === 0 ? (
									<p className="text-sm text-muted-foreground">
										No RA providers currently invited
									</p>
								) : (
									<div className="space-y-2">
										{currentRAs.map((ra) => (
											<div
												key={ra.id}
												className="flex items-center justify-between p-2 border rounded-md"
											>
												<span className="text-sm">{ra.name}</span>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleRemoveRA(ra.id)}
													className="h-8 w-8 p-0 text-destructive hover:text-destructive"
												>
													<X className="h-4 w-4" />
												</Button>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Add New RAs */}
							<div className="space-y-2">
								<Label>Invite New RA Providers</Label>
								<MultiSelectDropdownSearch
									options={raOptions}
									value={selectedNewRaIds}
									onChange={handleAddNewRAs}
									placeholder="Search and select RA providers"
									searchPlaceholder="Search RA providers..."
									emptyMessage="No RA providers found"
									onSearchChange={handleRaSearchChange}
									isLoading={isLoadingRa}
								/>
								{selectedNewRaIds.length > 0 && (
									<p className="text-xs text-muted-foreground">
										{selectedNewRaIds.length} RA provider
										{selectedNewRaIds.length !== 1 ? "s" : ""} selected
									</p>
								)}
							</div>
						</div>
					)}

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setEditDialogOpen(false)}
							disabled={isUpdating}
						>
							Cancel
						</Button>
						<Button
							onClick={handleUpdateMarketplace}
							disabled={isUpdating || isLoadingMarketplace}
						>
							{isUpdating ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Updating...
								</>
							) : (
								"Update Marketplace"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete the
							marketplace{" "}
							<span className="font-semibold text-foreground">
								&ldquo;{marketplaceToDelete?.name}&rdquo;
							</span>{" "}
							and remove all associated data.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							className="bg-gray-500 text-white hover:bg-gray-600"
							disabled={isDeleting}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default MyMarketplacesPage;
