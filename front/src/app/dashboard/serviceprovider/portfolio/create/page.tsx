"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, IndianRupee, Loader2, Plus, X } from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import MarketPlaceSelect from "@/components/MultiSelect/MarketPlaceSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/inputbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
// import { useNavigate } from "@tanstack/react-router";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import PictureIcon from "@/icons/PictureIcon";
import { fetchCMP } from "@/lib/cmp";
import { indices } from "@/lib/idices";
import { useRouter } from "next/navigation";
// Hardcoded dropdown data. Segment is fixed to Equity (the only supported
// segment today) — the asset row goes straight from Exchange to Script.
const EXCHANGES = ["NSE", "BSE"];

// Updated asset schema with validation
const assetSchema = z
	.object({
		slNo: z.number(),
		exchangeType: z.string().min(1, "Exchange is required"),
		segmentType: z.string().min(1, "Segment is required"),
		scriptName: z.object({
			exchange: z.string().min(1, "Exchange is required"),
			token: z.string().min(1, "Token is required"),
			name: z.string().min(1, "Name is required"),
		}),
		cmp: z.number().nullable(),
		qty: z.coerce.number().nullable(),
		weightage: z.coerce.number().nullable(),
		value: z.coerce.number().nullable(),
		target: z.coerce.number().nullable().optional(),
	})
	.refine((data) => data.qty !== null || data.weightage !== null, {
		message: "Enter QTY or Weightage",
		path: ["qty"],
	});

const formSchema = z.object({
	portfolioName: z.string().min(2, {
		message: "Portfolio name must be at least 2 characters.",
	}),
	theme: z.string().min(2, {
		message: "Theme must be at least 2 characters.",
	}),
	methodology: z.string().min(10, {
		message: "Methodology must be at least 10 characters.",
	}),
	rationale: z.string().min(10, {
		message: "Rationale must be at least 10 characters.",
	}),
	tncFile: z
		.instanceof(File)
		.refine(
			(file) => file.size <= 5 * 1024 * 1024,
			"File size must be less than 5MB",
		)
		.refine((file) => file.type === "application/pdf", "File must be a PDF"),
	bannerImage: z
		.instanceof(File)
		.refine(
			(file) => file.size <= 5 * 1024 * 1024,
			"Banner image size must be less than 5MB",
		)
		.refine(
			(file) => file.type.startsWith("image/"),
			"Banner must be an image file",
		)
		.optional(),
	disclosure: z.string().min(10, {
		message: "Disclosure must be at least 10 characters.",
	}),
	benchmarkIndex: z.string().min(1, {
		message: "Benchmark index is required.",
	}),
	investmentHorizon: z.coerce.number().min(1, {
		message: "Investment horizon must be at least 1 month.",
	}),
	reviewFrequency: z.coerce.number().min(1, {
		message: "Review frequency must be at least 1 month.",
	}),
	minInvestmentAmount: z.coerce.number().min(0, {
		message: "Minimum investment amount must be positive.",
	}),
	riskLevel: z.coerce
		.number()
		.refine((v) => [25, 50, 100].includes(v), {
			message: "Please select a risk level.",
		}),
	pricingPlans: z
		.array(
			z.object({
				validity: z.coerce
					.number()
					.int({ message: "Validity must be a whole number of days." })
					.min(1, { message: "Validity must be at least 1 day." })
					.max(365, { message: "Validity cannot exceed 365 days." }),
				price: z.coerce
					.number()
					.min(0, { message: "Price must be a positive number." }),
			}),
		)
		.min(1, { message: "At least one pricing plan is required." })
		.max(5, { message: "You can add up to 5 pricing plans." }),
	riskMetrics: z.object({
		standardDeviation: z.string().optional(),
		sharpeRatio: z.string().optional(),
		maximumDrawdown: z.string().optional(),
	}),
	assets: z
		.array(assetSchema)
		.min(1, { message: "At least one asset is required." })
		.superRefine((assets, ctx) => {
			// @ts-expect-error Accessing parent form data in Zod superRefine context
			const minInvestmentAmount = ctx?.options?.data?.minInvestmentAmount;
			if (typeof minInvestmentAmount !== "number") return;
			// Check if any asset value exceeds minInvestmentAmount
			assets.forEach((a, i) => {
				if ((a.value ?? 0) > minInvestmentAmount) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: "Asset value cannot exceed minimum investment amount",
						path: [i, "value"],
					});
				}
			});
			// Check if total value exceeds minInvestmentAmount
			const total = assets.reduce((sum, a) => sum + (a.value ?? 0), 0);
			if (total > minInvestmentAmount) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						"Total value of all assets cannot exceed minimum investment amount",
					path: ["value"],
				});
			}
		}),
});
 
const defaultAsset = {
	slNo: 1,
	exchangeType: "",
	segmentType: "Equity",
	scriptName: {
		exchange: "",
		token: "",
		name: "",
	},
	cmp: null,
	qty: null,
	weightage: null,
	value: null,
	target: null as number | null | undefined,
};

const CreatePortfolio = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [fetchingCMP, setFetchingCMP] = useState<string | null>(null);
	const [bannerPreview, setBannerPreview] = useState<string | null>(null);
	const [shareWithMarketplaces, setShareWithMarketplaces] = useState<string[]>(
		[],
	);
	// const navigate = useNavigate();
	const { toast } = useToast();
	const session = useSession();
	const bannerInputRef = useRef<HTMLInputElement>(null);
  
	// Initialize the form
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			portfolioName: "",
			theme: "",
			methodology: "",
			rationale: "",
			disclosure: "",
			benchmarkIndex: "",
			investmentHorizon: undefined,
			reviewFrequency: undefined,
			minInvestmentAmount: undefined,
			tncFile: undefined,
			bannerImage: undefined,
			riskLevel: 1,
			pricingPlans: [{ validity: 30, price: 0 }],
			riskMetrics: {
				standardDeviation: "",
				sharpeRatio: "",
				maximumDrawdown: "",
			},
			assets: [defaultAsset],
		},
	});

	const { fields, append, remove, update } = useFieldArray({
		control: form.control,
		name: "assets",
	});
	const {
		fields: pricingFields,
		append: appendPricing,
		remove: removePricing,
	} = useFieldArray({
		control: form.control,
		name: "pricingPlans",
	});
const  router  = useRouter();
	// Handle banner image change
	const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			// Validate file type
			if (!file.type.startsWith("image/")) {
				toast({
					title: "Invalid file type",
					description: "Please select an image file",
					variant: "destructive",
				});
				return;
			}

			// Validate file size
			if (file.size > 5 * 1024 * 1024) {
				toast({
					title: "File too large",
					description: "Banner image must be less than 5MB",
					variant: "destructive",
				});
				return;
			}

			form.setValue("bannerImage", file);

			// Create preview
			const reader = new FileReader();
			reader.onload = () => {
				setBannerPreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	// Remove banner image
	const removeBanner = () => {
		form.setValue("bannerImage", undefined);
		setBannerPreview(null);
		if (bannerInputRef.current) {
			bannerInputRef.current.value = "";
		}
	};

	// Calculation logic for asset values
	const minInvestmentAmount = form.watch("minInvestmentAmount") ?? 0;
	const assets = form.watch("assets");
	let totalAssetValue = 0;
	const calculatedAssets = assets.map((asset) => {
		const cmp = asset.cmp ?? null;
		let qty = asset.qty ?? null;
		let weightage = asset.weightage ?? null;
		let value = asset.value ?? null;
		// If script changed, update CMP
		if (cmp !== asset.cmp) {
			asset.cmp = cmp;
		}
		// If qty is entered, calculate value and weightage
		if (qty && cmp) {
			value = qty * cmp;
			weightage =
				minInvestmentAmount > 0
					? Math.round((value / minInvestmentAmount) * 100 * 100) / 100
					: null;
		} else if (weightage && cmp) {
			value = (minInvestmentAmount * weightage) / 100;
			qty = Math.round(value / cmp);
		}
		totalAssetValue += value || 0;
		return { ...asset, cmp, qty, weightage, value };
	});
	const cashValue = Math.max(minInvestmentAmount - totalAssetValue, 0);

	// Form submission handler
	async function onSubmit(values: z.infer<typeof formSchema>) {
		setIsLoading(true);
		try {
			const isValid = await form.trigger();
			if (!isValid) {
				toast({
					title: "Please fill in all required fields",
					description: "Please check the form for validation errors",
					variant: "destructive",
				});
				return;
			}

			if (!session?.data?.user) {
				throw new Error("User session not found");
			}

			const authorData = {
				id: session.data.user.id,
				name: session.data.user.RegName || "",
				email: session.data.user.email || "",
			};

			// ✅ Build FormData for file + JSON
			const formData = new FormData();
			formData.append("tncFile", values.tncFile);
			if (values.bannerImage) {
				formData.append("bannerImage", values.bannerImage);
			}
			formData.append(
				"data",
				JSON.stringify({
					...values,
					shareWithMarketplaces,
					assets: calculatedAssets,
					authorData,
				}),
			);

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/portfolio/create-portfolio`,
				{
					method: "POST",
					body: formData,
				},
			);

			if (!response.ok) {
				const errorData = await response.json();
				if (Array.isArray(errorData?.errors) && errorData.errors.length > 0) {
					const details = errorData.errors
						.map((e: { path?: (string | number)[]; message?: string }) => {
							const field = Array.isArray(e.path) ? e.path.join(".") : "";
							return field ? `${field}: ${e.message}` : e.message;
						})
						.filter(Boolean)
						.join(" | ");
					throw new Error(details || errorData.message || "Failed to create portfolio");
				}
				throw new Error(errorData.message || "Failed to create portfolio");
			}

			const { data: portfolio } = await response.json();
			console.log("PORTFOLIO", portfolio);

			toast({
				title: "Portfolio created successfully",
				description: "Your portfolio has been created successfully",
				variant: "default",
			});

			form.reset();
			router.push("/dashboard/serviceprovider/portfolio/myportfolios")
			setBannerPreview(null);
		} catch (error) {
			console.error("Error creating portfolio:", error);
			toast({
				title: "Failed to create portfolio",
				description:
					error instanceof Error ? error.message : "Unexpected error",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	}

	// Cache for script options fetched from API, keyed by exch_seg
	const [scriptOptionsCache, setScriptOptionsCache] = useState<Record<string, { label: string; value: string }[]>>({});

	const fetchScriptOptions = useCallback(async (exchSeg: string) => {
		if (scriptOptionsCache[exchSeg]) return;
		try {
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scripts/symbols?exch_seg=${exchSeg}`
			);
			const result = await res.json();
			const options = (result.data || []).map((name: string) => ({
				label: name,
				value: name,
			}));
			setScriptOptionsCache((prev) => ({ ...prev, [exchSeg]: options }));
		} catch {
			// ignore
		}
	}, [scriptOptionsCache]);

	// Fetch script options when any asset's exchange/segment changes
	useEffect(() => {
		assets.forEach((asset) => {
			const exchSeg =
				asset.exchangeType + asset.segmentType === "NSEEquity" ? "NSE" :
				asset.exchangeType + asset.segmentType === "BSEEquity" ? "BSE" : null;
			if (exchSeg && !scriptOptionsCache[exchSeg]) {
				fetchScriptOptions(exchSeg);
			}
		});
	}, [assets.map((a) => a.exchangeType + a.segmentType).join(",")]);

	const getScriptOptions = (exchangeType: string, segmentType: string) => {
		const exchSeg =
			exchangeType + segmentType === "NSEEquity" ? "NSE" :
			exchangeType + segmentType === "BSEEquity" ? "BSE" : null;
		if (exchSeg && scriptOptionsCache[exchSeg]) {
			return scriptOptionsCache[exchSeg];
		}
		return [{ label: "Select Script", value: "Select Script" }];
	};

	return (
		<>
			<Toaster />
			<div className="mx-auto">
				<div className="bg-white dark:bg-gray-900 text-black dark:text-white rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 transition-colors duration-300">
					{/* <CardHeader>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Create New Portfolio
            </CardTitle>
          </CardHeader> */}
					<CardContent className="p-6">
						<div className="text-sm text-gray-600 dark:text-gray-400 mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
							<span className="text-red-500">*</span> All fields marked with an
							asterisk are required
						</div>

						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className="space-y-8"
							>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormField
										control={form.control}
										name="portfolioName"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Portfolio Name <span className="text-red-500">*</span>
												</FormLabel>
												<FormControl>
													<Input
														placeholder="Enter portfolio name"
														{...field}
														className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="theme"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Theme <span className="text-red-500">*</span>
												</FormLabel>
												<FormControl>
													<Input
														placeholder="Enter portfolio theme"
														{...field}
														className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="methodology"
										render={({ field }) => (
											<FormItem className="col-span-2">
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Methodology <span className="text-red-500">*</span>
												</FormLabel>
												<FormControl>
													<Textarea
														placeholder="Describe your investment methodology"
														{...field}
														className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 h-[200px] resize-none transition-all"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="benchmarkIndex"
										render={({ field }) => (
											<FormItem className="w-full">
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Benchmark Index{" "}
													<span className="text-red-500">*</span>
												</FormLabel>
												<FormControl>
													<SearchableSelect
														options={indices.map((item) => ({
															value: item.DispSym,
															label: item.DispSym,
															...item,
														}))}
														value={field.value}
														onChange={(val) => {
															console.log("Val", val);
															field.onChange(val.value);
														}}
														placeholder="Select benchmark index"
														searchPlaceholder="Search benchmark index..."
														className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<div className="space-y-2 mb-4">
										<label
											htmlFor="marketplaces-label"
											className="text-sm font-medium"
										>
											Select Marketplaces
										</label>
										<MarketPlaceSelect onChange={setShareWithMarketplaces} />
									</div>

									{/* Banner Image Section */}
									<FormItem className="col-span-2">
										<FormLabel className="text-gray-700 dark:text-gray-300">
											Banner Image
										</FormLabel>
										<div className="space-y-2">
											{bannerPreview ? (
												<div className="relative group">
													<Image
														src={bannerPreview}
														alt="portfolio-banner-preview"
														width={800}
														height={300}
														className="w-full h-48 object-cover rounded-md border-2 border-gray-300 dark:border-gray-600 group-hover:border-blue-500 transition-colors"
													/>
													<button
														type="button"
														onClick={removeBanner}
														className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
													>
														<svg
															xmlns="http://www.w3.org/2000/svg"
															className="h-4 w-4"
															viewBox="0 0 20 20"
															fill="currentColor"
														>
															<path
																fillRule="evenodd"
																d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
																clipRule="evenodd"
															/>
														</svg>
													</button>
												</div>
											) : (
												<label
													htmlFor="bannerInput"
													className="block space-y-2 cursor-pointer group"
												>
													<div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center hover:border-blue-500 dark:hover:border-blue-400 transition-all group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50">
														<PictureIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-2 group-hover:text-blue-500 transition-colors" />
														<p className="text-gray-600 dark:text-gray-400 group-hover:text-blue-500 transition-colors">
															Click to upload banner image
														</p>
														<p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
															PNG, JPG up to 5MB
														</p>
													</div>
												</label>
											)}
											<input
												type="file"
												id="bannerInput"
												ref={bannerInputRef}
												className="hidden"
												accept="image/*"
												onChange={handleBannerChange}
											/>
										</div>
										<FormMessage>
											{form.formState.errors.bannerImage?.message}
										</FormMessage>
									</FormItem>

									<FormField
										control={form.control}
										name="tncFile"
										render={({ field: { value, onChange, ...fieldProps } }) => (
											<FormItem className="col-span-2">
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Terms & Conditions (PDF){" "}
													<span className="text-red-500">*</span>
												</FormLabel>
												<FormControl>
													<div>
														{value ? (
															<div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
																<div className="flex items-center justify-between">
																	<span className="text-gray-700 dark:text-gray-300">
																		{value.name}
																	</span>
																	<button
																		type="button"
																		onClick={() => onChange(null)}
																		className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
																	>
																		Remove
																	</button>
																</div>
															</div>
														) : (
															<label
																htmlFor="tncFile"
																className="block space-y-2 cursor-pointer group"
															>
																<div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center hover:border-blue-500 dark:hover:border-blue-400 transition-all group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50">
																	<svg
																		className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-2 group-hover:text-blue-500 transition-colors"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																		xmlns="http://www.w3.org/2000/svg"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			strokeWidth={2}
																			d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
																		/>
																	</svg>
																	<p className="text-gray-600 dark:text-gray-400 group-hover:text-blue-500 transition-colors">
																		Click to upload PDF document
																	</p>
																	<p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
																		PDF up to 5MB
																	</p>
																</div>
															</label>
														)}
														<input
															type="file"
															id="tncFile"
															className="hidden"
															accept="application/pdf"
															onChange={(e) => {
																const file = e.target.files?.[0];
																if (!file) return;

																if (file.type !== "application/pdf") {
																	toast({
																		title: "Invalid file type",
																		description: "Please select a PDF file",
																		variant: "destructive",
																	});
																	e.target.value = "";
																	return;
																}

																if (file.size > 5 * 1024 * 1024) {
																	toast({
																		title: "File too large",
																		description: "PDF must be less than 5MB",
																		variant: "destructive",
																	});
																	e.target.value = "";
																	return;
																}

																onChange(file);
															}}
															{...fieldProps}
														/>
													</div>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="investmentHorizon"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Investment Horizon (months){" "}
													<span className="text-red-500">*</span>
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														placeholder="Enter investment horizon"
														{...field}
														className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="reviewFrequency"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Review Frequency (months){" "}
													<span className="text-red-500">*</span>
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														placeholder="Enter review frequency"
														{...field}
														className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="minInvestmentAmount"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Minimum Investment Amount (₹){" "}
													<span className="text-red-500">*</span>
												</FormLabel>
												<FormControl>
													<Input
														type="number"
														placeholder="Enter minimum investment amount"
														{...field}
														className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="riskLevel"
										render={({ field }) => {
											const options = [
												{ label: "Low", value: 25, active: "bg-green-500 text-white border-green-500", idle: "bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20" },
												{ label: "Medium", value: 50, active: "bg-orange-500 text-white border-orange-500", idle: "bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20" },
												{ label: "High", value: 100, active: "bg-red-500 text-white border-red-500", idle: "bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" },
											];
											return (
												<FormItem>
													<FormLabel className="text-gray-700 dark:text-gray-300">
														Risk Level <span className="text-red-500">*</span>
													</FormLabel>
													<FormControl>
														<div className="grid grid-cols-3 gap-2">
															{options.map((opt) => {
																const selected = field.value === opt.value;
																return (
																	<button
																		key={opt.value}
																		type="button"
																		onClick={() => field.onChange(opt.value)}
																		className={`px-4 py-2 rounded-lg border-2 font-semibold transition-all ${selected ? opt.active : opt.idle}`}
																	>
																		{opt.label}
																	</button>
																);
															})}
														</div>
													</FormControl>
													<FormMessage />
												</FormItem>
											);
										}}
									/>

									{/* Pricing Plans — multiple validity/price tiers */}
									<div className="col-span-2 space-y-3">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<IndianRupee className="w-4 h-4 text-emerald-600" />
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Pricing Plans <span className="text-red-500">*</span>
												</FormLabel>
												<span className="text-xs text-gray-400">
													• add up to 5 validity/price options
												</span>
											</div>
											{pricingFields.length < 5 && (
												<Button
													type="button"
													variant="outline"
													className="cursor-pointer border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400 dark:hover:text-white transition-all text-xs px-2.5 py-1 h-auto"
													onClick={() =>
														appendPricing({ validity: 30, price: 0 })
													}
												>
													<Plus className="w-3.5 h-3.5 mr-1" /> Add Plan
												</Button>
											)}
										</div>

										<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
											{pricingFields.map((pf, idx) => (
												<div
													key={pf.id}
													className="relative p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/40 hover:border-blue-300 dark:hover:border-blue-700 transition"
												>
													<div className="flex items-center justify-between mb-2">
														<span className="inline-flex items-center px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-semibold rounded-full uppercase tracking-wide">
															Plan {idx + 1}
														</span>
														{pricingFields.length > 1 && (
															<button
																type="button"
																onClick={() => removePricing(idx)}
																className="text-gray-400 hover:text-red-500 p-0.5 rounded transition"
															>
																<X size={13} />
															</button>
														)}
													</div>

													<div className="space-y-2">
														<FormField
															control={form.control}
															name={`pricingPlans.${idx}.validity`}
															render={({ field }) => (
																<FormItem>
																	<FormLabel className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
																		Validity (days)
																	</FormLabel>
																	<FormControl>
																		<Input
																			type="number"
																			min={1}
																			max={365}
																			placeholder="30"
																			{...field}
																			className="h-8 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
																		/>
																	</FormControl>
																	<FormMessage />
																</FormItem>
															)}
														/>
														<FormField
															control={form.control}
															name={`pricingPlans.${idx}.price`}
															render={({ field }) => (
																<FormItem>
																	<FormLabel className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
																		Price (₹)
																	</FormLabel>
																	<FormControl>
																		<Input
																			type="number"
																			min={0}
																			placeholder="0"
																			{...field}
																			className="h-8 text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
																		/>
																	</FormControl>
																	<FormMessage />
																</FormItem>
															)}
														/>
													</div>
												</div>
											))}
										</div>
										{form.formState.errors.pricingPlans?.root && (
											<p className="text-red-500 text-sm">
												{form.formState.errors.pricingPlans.root.message}
											</p>
										)}
									</div>

									{/* Risk Metrics Section */}
									<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
										<FormField
											control={form.control}
											name="riskMetrics.standardDeviation"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-gray-700 dark:text-gray-300">
														Standard Deviation
													</FormLabel>
													<FormControl>
														<Input
															placeholder="Enter standard deviation"
															{...field}
															className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="riskMetrics.sharpeRatio"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-gray-700 dark:text-gray-300">
														Sharpe Ratio
													</FormLabel>
													<FormControl>
														<Input
															placeholder="Enter sharpe ratio"
															{...field}
															className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="riskMetrics.maximumDrawdown"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-gray-700 dark:text-gray-300">
														Maximum Drawdown
													</FormLabel>
													<FormControl>
														<Input
															placeholder="Enter maximum drawdown"
															{...field}
															className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
								</div>

								{/* Rationale and Disclosure Section */}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<FormField
										control={form.control}
										name="rationale"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Rationale <span className="text-red-500">*</span>
												</FormLabel>
												<FormControl>
													<Textarea
														placeholder="Explain the rationale behind this portfolio"
														{...field}
														className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 h-[200px] resize-none transition-all"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="disclosure"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-gray-700 dark:text-gray-300">
													Disclosure <span className="text-red-500">*</span>
												</FormLabel>
												<FormControl>
													<Textarea
														placeholder="Add any important disclosures about this portfolio"
														{...field}
														className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 h-[200px] resize-none transition-all"
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								{/* Asset List Section */}
								<div className="mt-8">
									<h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
										Assets <span className="text-red-500">*</span>
									</h3>
									{/* Table-level error for asset value/total value */}
									{form.formState.errors.assets?.root && (
										<div className="text-red-500 text-sm mb-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
											{form.formState.errors.assets.root.message}
										</div>
									)}
									{form.formState.errors.assets &&
										Array.isArray(form.formState.errors.assets) &&
										form.formState.errors.assets.map((err, idx) =>
											err?.value ? (
												<div
													key={idx}
													className="text-red-500 text-sm mb-2 p-2 bg-red-50 dark:bg-red-900/20 rounded"
												>
													{err.value.message}
												</div>
											) : null,
										)}
									<div className="overflow-x-auto rounded-lg border border-gray-300 dark:border-gray-600">
										<table className="min-w-full text-sm text-left">
											<thead className="bg-gray-100 dark:bg-gray-800">
												<tr>
													<th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
														Sl No
													</th>
													<th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
														Exchange <span className="text-red-500">*</span>
													</th>
													<th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
														Script Name <span className="text-red-500">*</span>
													</th>
													<th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
														CMP
													</th>
													<th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
														QTY <span className="text-red-500">*</span>
													</th>
													<th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
														Weightage(%){" "}
														<span className="text-gray-500 text-xs">auto</span>
													</th>
													<th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
														Target{" "} 
														<span className="text-gray-500 text-xs mt-2">optional</span>
													</th>
													<th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
														Value
														
													</th>
													<th className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium"></th>
												</tr>
											</thead>
											<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
												{fields.map((field, idx) => (
													<tr
														key={field.id}
														className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
													>
														<td className="px-4 py-3">{idx + 1}</td>
														{/* Exchange Type */} 
														<td className="px-4 py-3">
															<FormField
																control={form.control}
																name={`assets.${idx}.exchangeType`}
																render={({ field: exField }) => (
																	<>
																		<Select
																			onValueChange={exField.onChange}
																			value={exField.value}
																		>
																			<FormControl>
																				<SelectTrigger className="bg-white dark:bg-gray-800 cursor-pointer w-full border-gray-300 dark:border-gray-600 text-black dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all">
																					<SelectValue placeholder="Select exchange" />
																				</SelectTrigger>
																			</FormControl>
																			<SelectContent className="bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600">
																				{EXCHANGES.map((ex) => (
																					<SelectItem
																						className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
																						key={ex}
																						value={ex}
																					>
																						{ex}
																					</SelectItem>
																				))} 
																			</SelectContent>
																		</Select>
																		<FormMessage />
																	</>
																)}
															/>
														</td>
														{/* Script Name */}
														<td className="px-4 py-3">
															<FormField
																disabled={
																	!calculatedAssets[idx]?.exchangeType
																}
																control={form.control}
																name={`assets.${idx}.scriptName`}
																render={({ field: scriptField }) => (
																	<>
																		<SearchableSelect
																			disabled={
																				!calculatedAssets[idx]?.exchangeType
																			}
																			options={
																				getScriptOptions(
																					calculatedAssets[idx]?.exchangeType ||
																						"",
																					calculatedAssets[idx]?.segmentType ||
																						"",
																				) || []
																			}
																			value={scriptField.value.name}
																			onChange={async (val) => {
																				if (!val) return;

																				const assetExchange = calculatedAssets[idx]?.exchangeType || "";
																				const assetSegment = calculatedAssets[idx]?.segmentType || "";
																				const exchSeg =
																					assetExchange + assetSegment === "NSEEquity" ? "NSE" :
																					assetExchange + assetSegment === "BSEEquity" ? "BSE" : "";

																				// Look up token from API
																				let token = "";
																				try {
																					const tokenRes = await fetch(
																						`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/scripts/token?exch_seg=${exchSeg}&name=${encodeURIComponent(val.label)}`
																					);
																					const tokenData = await tokenRes.json();
																					token = tokenData?.data?.token || "";
																				} catch {
																					token = "";
																				}

																				scriptField.onChange({
																					exchange: exchSeg,
																					token: token,
																					name: val.label,
																				});

																				// Update CMP when script changes
																				let cmp = null;
																				try {
																					setFetchingCMP(idx.toString());
																					const data = await fetchCMP({
																						token: [token],
																						exchange: exchSeg,
																					});
																					cmp = data?.data;
																				} catch (error) {
																					console.error(
																						"Error fetching CMP:",
																						error,
																					);
																					cmp = null;
																				} finally {
																					setFetchingCMP(null);
																				}

																				const currentAsset = form.getValues(
																					`assets.${idx}`,
																				);
																				form.setValue(`assets.${idx}.cmp`, cmp);

																				// Reset qty, weightage and value when script changes
																				update(idx, {
																					...currentAsset,
																					scriptName: {
																						exchange: exchSeg,
																						token: token,
																						name: val.label,
																					},
																					cmp: cmp,
																					qty: null,
																					weightage: null,
																					value: null,
																				});
																			}}
																			placeholder="Select script"
																			searchPlaceholder="Search script..."
																			className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
																		/>
																		<FormMessage />
																	</>
																)}
															/>
														</td>
														{/* CMP */}
														<td className="px-4 py-3">
															{fetchingCMP === idx.toString() ? (
																<div className="flex items-center justify-center">
																	<Loader2 className="animate-spin h-5 w-5 text-blue-500" />
																</div>
															) : (
																<Input
																	value={calculatedAssets[idx]?.cmp ?? ""}
																	disabled
																	className="bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
																	placeholder="CMP"
																/>
															)}
														</td>
														{/* QTY */}
														<td className="px-4 py-3">
															<FormField
																control={form.control}
																name={`assets.${idx}.qty`}
																render={({ field: qtyField }) => (
																	<>
																		<Input 
																			readOnly={!minInvestmentAmount}
																			onClick={() => { 
																				if (!minInvestmentAmount) {
																					toast({
																						title:
																							"Please enter minimum investment amount",
																						description:
																							"Minimum investment amount is required to calculate QTY",
																						duration: 3000,
																						className: "bg-red-500 text-white",
																					});
																				}
																			}}
																			type="number"
																			{...qtyField}
																			className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
																			placeholder="QTY"
																			value={qtyField.value ?? ""}
																			onChange={(e) => {
																				const val = e.target.value
																					? Math.round(parseFloat(e.target.value))
																					: null;
																				// Get CMP for this row
																				const cmp =
																					calculatedAssets[idx]?.cmp ??
																					assets[idx]?.cmp ??
																					null;
																				// Calculate value and weightage
																				const value =
																					val && cmp ? val * cmp : null;
																				const weightage =
																					value && minInvestmentAmount
																						? (value / minInvestmentAmount) *
																							100
																						: null;
																				if (
																					value &&
																					value > minInvestmentAmount
																				) {
																					form.setError(`assets.${idx}.value`, {
																						message:
																							"Value cannot exceed minimum investment amount",
																					});
																					form.setError(`assets.${idx}.qty`, {
																						message:
																							"QTY cannot exceed minimum investment amount",
																					});
																					form.setError(
																						`assets.${idx}.weightage`,
																						{
																							message:
																								"Weightage cannot exceed minimum investment amount",
																						},
																					);
																					form.trigger("assets");
																					return;
																				}
																				// Update qty, weightage, and value in form state
																				form.setValue(
																					`assets.${idx}.qty`,
																					val,
																					{ shouldValidate: true },
																				);
																				form.setValue(
																					`assets.${idx}.weightage`,
																					weightage != null
																						? Math.round(weightage * 100) / 100
																						: null,
																					{
																						shouldValidate: true,
																					},
																				);
																				form.setValue(
																					`assets.${idx}.value`,
																					value,
																					{ shouldValidate: true },
																				);
																				form.trigger("assets");
																			}}
																		/>
																		<FormMessage />
																	</>
																)}
															/>
														</td>
														{/* Weightage — auto-calculated from QTY, not editable */}
														<td className="px-4 py-3">
															<Input
																value={(() => {
																	const w = calculatedAssets[idx]?.weightage;
																	return typeof w === "number" && !isNaN(w)
																		? w.toFixed(2)
																		: "";
																})()}
																disabled
																className="bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
																placeholder="Weightage %"
															/>
														</td>
														<td className="px-4 py-3"> 
															<FormField
																control={form.control}
																name={`assets.${idx}.target`}
																render={({ field: targetField }) => (
																	<>
																		<Input
																			type="number"
																			{...targetField}
																			className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
																			placeholder="Target (optional)"
																			value={ targetField.value ?? ""}
																			onChange={(e) => {
																				const val = e.target.value
																					? parseFloat(e.target.value)
																					: null;
																				targetField.onChange(val);
																			}}
																		/>
																		<FormMessage />
																	</>
																)}
															/>
														</td>
														{/* Value */}
														<td className="px-4 py-3">
															<Input
																value={(() => {
																	const v = calculatedAssets[idx]?.value;
																	return typeof v === "number" && !isNaN(v)
																		? v.toFixed(2)
																		: "";
																})()}
																disabled
																className="bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
																placeholder="Value"
															/>
															{/* Show error if value exceeds minInvestmentAmount */}
															{(() => {
																const val = calculatedAssets[idx]?.value;
																return val != null && val > minInvestmentAmount;
															})() && (
																	<div className="text-red-500 text-xs mt-1">
																		Value cannot exceed minimum investment
																		amount
																	</div>
																)}
														</td>
														{/* Remove button */}
														<td className="px-4 py-3">
															{fields.length > 1 && (
																<Button
																	variant="destructive"
																	className="text-xs px-3 py-1 hover:bg-red-600 transition-colors"
																	onClick={() => remove(idx)}
																>
																	Remove
																</Button>
															)}
														</td>
													</tr>
												))}
												{/* Total Row */}
												{(() => {
													const totalQty = calculatedAssets.reduce(
														(sum, a) => sum + (a.qty ?? 0),
														0
													);
													const totalWeightage = calculatedAssets.reduce(
														(sum, a) => sum + (a.weightage ?? 0),
														0
													);
													const totalTarget = calculatedAssets.reduce(
														(sum, a) => sum + (a.target ?? 0),
														0
													);
													return (
														<tr className="bg-gray-200 dark:bg-gray-700 font-medium">
															<td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-semibold">Total</td>
															<td className="px-4 py-3">
																<Input
																	value="-"
																	disabled
																	className="bg-gray-200 dark:bg-gray-700 border-none text-gray-700 dark:text-gray-300 font-medium"
																/>
															</td>
															<td className="px-4 py-3">
																<Input
																	value="Total"
																	disabled
																	className="bg-gray-200 dark:bg-gray-700 border-none text-gray-800 dark:text-gray-200 font-semibold"
																/>
															</td>
															<td className="px-4 py-3">
																<Input
																	value="-"
																	disabled
																	className="bg-gray-200 dark:bg-gray-700 border-none text-gray-700 dark:text-gray-300 font-medium"
																/>
															</td>
															<td className="px-4 py-3">
																<Input
																	value={totalQty > 0 ? totalQty.toFixed(2) : "-"}
																	disabled
																	className="bg-gray-200 dark:bg-gray-700 border-none text-gray-800 dark:text-gray-200 font-medium"
																/>
															</td>
															<td className="px-4 py-3">
																<Input
																	value={totalWeightage > 0 ? totalWeightage.toFixed(2) + " %" : "-"}
																	disabled
																	className="bg-gray-200 dark:bg-gray-700 border-none text-gray-800 dark:text-gray-200 font-medium"
																/>
															</td>
															<td className="px-4 py-3">
																<Input
																	value={totalTarget > 0 ? totalTarget.toFixed(2) : "-"}
																	disabled
																	className="bg-gray-200 dark:bg-gray-700 border-none text-gray-800 dark:text-gray-200 font-medium"
																/>
															</td>
															<td className="px-4 py-3">
																<Input
																	value={totalAssetValue > 0 ? totalAssetValue.toFixed(2) : "-"}
																	disabled
																	className="bg-gray-200 dark:bg-gray-700 border-none text-gray-800 dark:text-gray-200 font-semibold"
																/>
															</td>
															<td className="px-4 py-3"></td>
														</tr>
													);
												})()}
												{/* Cash Row (not part of form state) */}
												<tr className="bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
													<td className="px-4 py-3">{fields.length + 1}</td>
													<td className="px-4 py-3">
														<Input
															value="-"
															disabled
															className="bg-blue-100 dark:bg-blue-900/30 border-none text-gray-700 dark:text-gray-300"
														/>
													</td>
													<td className="px-4 py-3">
														<Input
															value="Uninvested Balance"
															disabled
															className="bg-blue-100 dark:bg-blue-900/30 border-none text-blue-700 dark:text-blue-300 font-medium"
														/>
													</td>
													<td className="px-4 py-3">
														<Input
															value={"-"}
															disabled
															className="bg-blue-100 dark:bg-blue-900/30 border-none text-gray-700 dark:text-gray-300"
														/>
													</td>
													<td className="px-4 py-3">
														<Input
															value={"-"}
															disabled
															className="bg-blue-100 dark:bg-blue-900/30 border-none text-gray-700 dark:text-gray-300"
														/>
													</td>
													<td className="px-4 py-3">
														<Input
															value={"-"}
															disabled
															className="bg-blue-100 dark:bg-blue-900/30 border-none text-gray-700 dark:text-gray-300"
														/>
													</td>
													<td className="px-4 py-3">
														<Input
															value={"-"}
															disabled
															className="bg-blue-100 dark:bg-blue-900/30 border-none text-gray-700 dark:text-gray-300"
														/>
													</td>
													<td className="px-4 py-3">
														<Input
															value={cashValue.toFixed(2)}
															disabled
															className="bg-blue-100 dark:bg-blue-900/30 border-none text-blue-700 dark:text-blue-300 font-medium"
														/>
													</td>
													<td className="px-4 py-3"></td>
												</tr>
											</tbody>
										</table>
									</div>
									<Button
										type="button"
										variant="outline"
										className="mt-4 cursor-pointer border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400 dark:hover:text-white transition-all"
										onClick={() =>
											append({
												slNo: fields.length + 1,
												exchangeType: "",
												segmentType: "Equity",
												scriptName: {
													exchange: "",
													token: "",
													name: "",
												},
												cmp: null,
												qty: null,
												weightage: null,
												value: null,
												target: null,
											})
										}
									>
										<Plus className="w-4 h-4 mr-2" />
										Add More Assets
									</Button>
								</div>

								<div className="w-full flex justify-end items-center pt-6 border-t border-gray-200 dark:border-gray-700">
									<Button
										type="submit"
										variant="default"
										className="w-max cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
										disabled={isLoading}
									>
										{isLoading ? (
											<>
												<Loader2 className="animate-spin mr-2 h-4 w-4" />
												Creating Portfolio...
											</>
										) : (
											"Create Portfolio"
										)}
									</Button>
								</div>
							</form>
						</Form>
					</CardContent>
				</div>
			</div>
		</>
	);
};

export default CreatePortfolio;
