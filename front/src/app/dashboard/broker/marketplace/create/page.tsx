"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DropdownOption } from "@/components/ui/multi-select-dropdown-search";
import { MultiSelectDropdownSearch } from "@/components/ui/multi-select-dropdown-search";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface MarketplaceFormData {
	name: string;
	description: string;
	invitedRaIds: string[];
}

const CreateMarketplacePage = () => {
	const nameId = useId();
	const descriptionId = useId();
	const router = useRouter();
	const { data: session } = useSession();
	const { toast } = useToast();

	const [formData, setFormData] = useState<MarketplaceFormData>({
		name: "",
		description: "",
		invitedRaIds: [],
	});

	const [errors, setErrors] = useState<
		Partial<Record<keyof MarketplaceFormData, string>>
	>({});

	const [isSubmitting, setIsSubmitting] = useState(false);

	// Service providers state
	const [raOptions, setRaOptions] = useState<DropdownOption[]>([]);
	const [isLoadingRa, setIsLoadingRa] = useState(false);

	const validateForm = (): boolean => {
		const newErrors: Partial<Record<keyof MarketplaceFormData, string>> = {};

		if (!formData.name.trim()) {
			newErrors.name = "Marketplace name is required";
		} else if (formData.name.trim().length < 3) {
			newErrors.name = "Marketplace name must be at least 3 characters long";
		} else if (formData.name.trim().length > 120) {
			newErrors.name = "Marketplace name cannot exceed 120 characters";
		}

		if (!formData.description.trim()) {
			newErrors.description = "Description is required";
		} else if (formData.description.trim().length < 10) {
			newErrors.description = "Description must be at least 10 characters long";
		} else if (formData.description.length > 500) {
			newErrors.description = "Description cannot exceed 500 characters";
		}

		if (formData.invitedRaIds.length === 0) {
			newErrors.invitedRaIds = "Please select at least one RA provider";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		if (isSubmitting) {
			return;
		}

		setIsSubmitting(true);

		try {
			const payload = {
				name: formData.name.trim(),
				description: formData.description.trim(),
				invitedRaIds: formData.invitedRaIds,
			};

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/marketplace`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user.backendToken!}`,
					},
					body: JSON.stringify(payload),
				},
			);

			const result = await response.json();

			if (!response.ok) {
				// Handle specific error cases
				if (response.status === 401) {
					toast({
						variant: "destructive",
						title: "Authentication Required",
						description: "Please log in to create a marketplace",
					});
					return;
				}

				if (response.status === 403) {
					toast({
						variant: "destructive",
						title: "Permission Denied",
						description:
							result.message || "Only brokers can create marketplaces",
					});
					return;
				}

				if (response.status === 409) {
					toast({
						variant: "destructive",
						title: "Marketplace Already Exists",
						description:
							result.message || "A marketplace with this name already exists",
					});
					return;
				}

				if (response.status === 400) {
					toast({
						variant: "destructive",
						title: "Invalid Input",
						description:
							result.message || "Please check your input and try again",
					});
					return;
				}

				throw new Error(result.message || "Failed to create marketplace");
			}

			// Success
			toast({
				title: "Success!",
				description: "Marketplace created successfully",
				variant: "success"
			});

			// Navigate to my-marketplaces page
			router.push("/dashboard/broker/marketplace/my-marketplaces");
		} catch (error) {
			console.error("Error creating marketplace:", error);
			toast({
				variant: "destructive",
				title: "Error",
				description:
					error instanceof Error
						? error.message
						: "Failed to create marketplace. Please try again.",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
		// Clear error when user starts typing
		if (errors[name as keyof MarketplaceFormData]) {
			setErrors((prev) => ({ ...prev, [name]: undefined }));
		}
	};

	const handleRaSelectionChange = (selectedIds: string[]) => {
		setFormData((prev) => ({ ...prev, invitedRaIds: selectedIds }));
		// Clear error when user makes a selection
		if (errors.invitedRaIds && selectedIds.length > 0) {
			setErrors((prev) => ({ ...prev, invitedRaIds: undefined }));
		}
	};

	// Fetch service providers from API
	const fetchServiceProviders = useCallback(
		async (search: string = "", page: number = 1) => {
			setIsLoadingRa(true);
			try {
				const params = new URLSearchParams({
					page: page.toString(),
					limit: "50", // Fetch more items for better UX
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
					// Map API response to DropdownOption format
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
		},
		[],
	);

	// Fetch initial service providers on mount
	useEffect(() => {
		fetchServiceProviders();
	}, [fetchServiceProviders]);

	// Handle search query changes from the dropdown component
	const handleRaSearchChange = useCallback(
		(searchQuery: string) => {
			fetchServiceProviders(searchQuery);
		},
		[fetchServiceProviders],
	);

	return (
		<div className="mx-auto max-w-7xl py-8 px-4">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
					Create Marketplace
				</h1>
				<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
					Create a new marketplace and invite RA providers to join
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Marketplace Name */}
				<div className="space-y-2">
					<Label htmlFor={nameId} className="text-sm font-medium">
						Marketplace Name <span className="text-red-500">*</span>
					</Label>
					<Input
						id={nameId}
						name="name"
						type="text"
						value={formData.name}
						onChange={handleInputChange}
						placeholder="Enter marketplace name"
						className={errors.name ? "border-red-500" : ""}
						maxLength={120}
					/>
					{errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
					<p className="text-xs text-gray-500">
						{formData.name.length}/120 characters
					</p>
				</div>

				{/* Description */}
				<div className="space-y-2">
					<Label htmlFor={descriptionId} className="text-sm font-medium">
						Description <span className="text-red-500">*</span>
					</Label>
					<Textarea
						id={descriptionId}
						name="description"
						value={formData.description}
						onChange={handleInputChange}
						placeholder="Enter marketplace description (minimum 10 characters)"
						className={errors.description ? "border-red-500" : ""}
						rows={4}
						maxLength={500}
					/>
					{errors.description && (
						<p className="text-sm text-red-500">{errors.description}</p>
					)}
					<p className="text-xs text-gray-500">
						{formData.description.length}/500 characters
					</p>
				</div>

				{/* Invite RA Providers */}
				<div className="space-y-2">
					<Label className="text-sm font-medium">
						Invite RA Providers <span className="text-red-500">*</span>
					</Label>
					<MultiSelectDropdownSearch
						options={raOptions}
						value={formData.invitedRaIds}
						onChange={handleRaSelectionChange}
						placeholder="Search and select RA providers"
						searchPlaceholder="Search RA providers..."
						emptyMessage="No RA providers found"
						onSearchChange={handleRaSearchChange}
						isLoading={isLoadingRa}
					/>
					{errors.invitedRaIds && (
						<p className="text-sm text-red-500">{errors.invitedRaIds}</p>
					)}
					{formData.invitedRaIds.length > 0 && (
						<p className="text-xs text-gray-500">
							{formData.invitedRaIds.length} RA provider
							{formData.invitedRaIds.length !== 1 ? "s" : ""} selected
						</p>
					)}
				</div>

				{/* Submit Button */}
				<div className="flex justify-between items-center gap-4 pt-4">
					<Button
						type="submit"
						variant="default"
						className="w-fit"
						disabled={isSubmitting}
					>
						{isSubmitting ? (
							<>
								<svg
									className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<title>Loading spinner</title>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									/>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									/>
								</svg>
								Creating...
							</>
						) : (
							"Create Marketplace"
						)}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							setFormData({
								name: "",
								description: "",
								invitedRaIds: [],
							});
							setErrors({});
						}}
						disabled={isSubmitting}
					>
						Reset
					</Button>
				</div>
			</form>
		</div>
	);
};

export default CreateMarketplacePage;
