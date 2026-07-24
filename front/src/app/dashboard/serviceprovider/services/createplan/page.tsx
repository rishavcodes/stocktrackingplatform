"use client";

import {
	Briefcase,
	Calendar,
	Check,
	FileText,
	HelpCircle,
	IndianRupee,
	Image as ImageIcon,
	Layers,
	Loader2,
	MessageSquare,
	Phone,
	Plus,
	Repeat,
	Send,
	Store,
	Tag,
	TrendingUp,
	User,
	Users,
	Wallet,
	X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { isReadOnlySubProfile } from "@/lib/subProfilePermissions";
import { DocumentsListInput } from "@/components";
import MarketPlaceSelect from "@/components/MultiSelect/MarketPlaceSelect";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";

export type CreateServicesType = {
	title: string;
	description: string;
	pricingPlans: {
		validity: number;
		price: number;
		purchaseType: "ONE_TIME" | "RENEWABLE";
	}[];
	faqs: { question: string; answer: string }[];
	AUM?: number;
	NoOfClients?: number;
	inceptionDate?: string;
	Fundmanager?: string;
	onemonth?: number;
	sixmonths?: number;
	oneyear?: number;
	threeyears?: number;
	fiveyears?: number;
	AsOn?: string;
	isFreeTrial: boolean;
	freeTrailDays: number;
	segment: string;
	bannerURL: File | null;
	tncFile: File | null;
	purchaseType: "ONE_TIME" | "RENEWABLE";
	/** Optional: e.g. 5 calls per week */
	callsQuota: number;
	callsPeriod: "DAY" | "WEEK" | "MONTH";
	allowRecurringPayment: boolean;
};

export default function CreateServices() {
	const session = useSession();
	const { toast } = useToast();
	const router = useRouter();

	// View-only admin sub profiles can't create plans. Bounce them to the plan
	// list if they reach this form via a direct URL (the backend also rejects
	// the create call). No early return — that would skip the hooks below.
	const readOnly = isReadOnlySubProfile(session?.data);
	useEffect(() => {
		if (readOnly) {
			router.replace("/dashboard/serviceprovider/services/myplans");
		}
	}, [readOnly, router]);

	const [isFund, setIsFund] = useState<boolean>(false);
	const [isFaq, setIsFaq] = useState<boolean>(false);
	const [previewUrl, setPreviewUrl] = useState<string>("");
	const [needTelegram, setNeedTelegram] = useState<boolean>(false);
	const [telegramChannelId, setTelegramChannelId] = useState<string>("");
	const [telegramError, setTelegramError] = useState<string>("");
	const [loading, setLoading] = useState(false);

	const [shareWithMarketplaces, setShareWithMarketplaces] = useState<string[]>(
		[],
	);
	const [recurringPaymentAllowed, setRecurringPaymentAllowed] = useState(false);

	const [documents, setDocuments] = useState<
		{ name: string; link: string; _id: string }[]
	>([]);

	const bannerInputRef = useRef<HTMLInputElement>(null);

	const [serviceData, setServiceData] = useState<CreateServicesType>({
		title: "",
		description: "",
		pricingPlans: [{ validity: 0, price: 0, purchaseType: "RENEWABLE" }],
		faqs: [{ question: "", answer: "" }],
		tncFile: null,
		AUM: Number(undefined),
		NoOfClients: Number(undefined),
		inceptionDate: "",
		Fundmanager: "",
		onemonth: Number(undefined),
		sixmonths: Number(undefined),
		oneyear: Number(undefined),
		threeyears: Number(undefined),
		fiveyears: Number(undefined),
		AsOn: "",
		isFreeTrial: false,
		freeTrailDays: Number(0),
		segment: "",
		bannerURL: null,
		purchaseType: "RENEWABLE",
		callsQuota: 0,
		callsPeriod: "DAY",
		allowRecurringPayment: false,
	});

	const [errorMessage, setErrorMessage] = useState<string>("");

	useEffect(() => {
		if (
			session.data?.user.category === "PMS" ||
			session.data?.user.category === "AIF" ||
			session.data?.user.category === "Mutual Funds"
		) {
			setIsFund(true);
		}
	}, [session.data?.user.category]);

	// Check if admin has enabled Recurring Payment service for this SP
	useEffect(() => {
		if (!session.data?.user?.id) return;
		fetch(
			`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/check-subscription?providerId=${session.data.user.id}`,
		)
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (data?.isSubscription && data?.services?.recurringPayment) {
					setRecurringPaymentAllowed(true);
				}
			})
			.catch(() => {});
	}, [session.data?.user?.id]);

	function serviceDataChangehandler(
		event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) {
		const { name, value, type } = event.target;

		setServiceData((prev) => ({
			...prev,
			[name]:
				type === "checkbox"
					? (event.target as HTMLInputElement).checked
					: value,
		}));
	}

	function handleCallsQuotaChange(e: ChangeEvent<HTMLInputElement>) {
		const v = e.target.value;
		setServiceData((prev) => ({
			...prev,
			callsQuota: v === "" ? 0 : Math.max(0, parseInt(v, 10) || 0),
		}));
	}

	function bannerChangeHandler(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			toast({
				title: "Invalid file type",
				description: "Please select an image file (PNG or JPG)",
				variant: "destructive",
			});
			if (bannerInputRef.current) bannerInputRef.current.value = "";
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
			toast({
				title: "File too large",
				description: `Banner image is ${sizeMB}MB. Max allowed size is 5MB.`,
				variant: "destructive",
			});
			if (bannerInputRef.current) bannerInputRef.current.value = "";
			return;
		}

		const url = URL.createObjectURL(file);
		setPreviewUrl(url);
		setServiceData((prev) => ({ ...prev, bannerURL: file }));
	}

	function removeBanner() {
		setPreviewUrl("");
		setServiceData((prev) => ({ ...prev, bannerURL: null }));
		if (bannerInputRef.current) bannerInputRef.current.value = "";
	}

	// Handle PDF file upload
	function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];

		if (file) {
			if (file.type !== "application/pdf") {
				setErrorMessage("Only PDF files are allowed.");
				return;
			}

			if (file.size > 5 * 1024 * 1024) {
				setErrorMessage("File size must be less than 5MB.");
				return;
			}

			setErrorMessage(""); // Clear any existing error
			setServiceData((prev) => ({ ...prev, tncFile: file }));
		}
	}
	// NEW: Handle F&Q changes
	function handleFaqChange(
		index: number,
		field: "question" | "answer",
		value: string,
	) {
		setServiceData((prev) => {
			const updatedFaqs = [...prev.faqs];
			updatedFaqs[index][field] = value;
			return {
				...prev,
				faqs: updatedFaqs,
			};
		});
	}
	// NEW: Add  F&Q
	function addFaq() {
		setServiceData((prev) => ({
			...prev,
			faqs: [...prev.faqs, { question: "", answer: "" }],
		}));
	}

	// NEW: Remove F&Q
	function removeFaq(index: number) {
		setServiceData((prev) => ({
			...prev,
			faqs: prev.faqs.filter((_, i) => i !== index),
		}));
	}

	// NEW: Handle pricing plan changes
	function handlePricingPlanChange(
		index: number,
		field: "validity" | "price",
		value: number,
	) {
		setServiceData((prev) => {
			const newPlans = [...prev.pricingPlans];
			newPlans[index] = { ...newPlans[index], [field]: value };
			return { ...prev, pricingPlans: newPlans };
		});
	}

	function handlePricingPlanPurchaseType(
		index: number,
		purchaseType: "ONE_TIME" | "RENEWABLE",
	) {
		setServiceData((prev) => {
			const newPlans = [...prev.pricingPlans];
			newPlans[index] = { ...newPlans[index], purchaseType };
			return { ...prev, pricingPlans: newPlans };
		});
	}

	// NEW: Add new pricing plan
	function addPricingPlan() {
		setServiceData((prev) => ({
			...prev,
			pricingPlans: [
				...prev.pricingPlans,
				{ validity: 0, price: 0, purchaseType: "RENEWABLE" },
			],
		}));
	}

	// NEW: Remove pricing plan
	function removePricingPlan(index: number) {
		setServiceData((prev) => ({
			...prev,
			pricingPlans: prev.pricingPlans.filter((_, i) => i !== index),
		}));
	}

	const validateTelegramChannelId = (id: string): boolean => {
		const telegramRegex = /^-100\d+$/;
		if (!telegramRegex.test(id)) {
			setTelegramError(
				"Telegram Channel ID must start with -100 followed by numbers",
			);
			return false;
		}
		setTelegramError("");
		return true;
	};

	async function PostService(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);

		// NEW: Validate all pricing plans
		for (const plan of serviceData.pricingPlans) {
			if (plan.validity > 365) {
				toast({
					title: "Validity Exceeded",
					description: "Validity should not be more than 365 days!",
					variant: "destructive",
				});
				return;
			}

			const maxAllowedPrice = 151000;
			if (plan.price > maxAllowedPrice) {
				toast({
					title: "Invalid Price",
					description: `Price exceeds maximum allowed price of ${maxAllowedPrice}`,
					variant: "destructive",
				});
				return;
			}
		}

		// Add validation for Telegram fields
		if (needTelegram && !telegramChannelId.trim()) {
			toast({
				title: "Telegram Channel Required",
				description: "Please enter Telegram Channel ID",
				variant: "destructive",
			});
			return;
		}

		// if (!validateTelegramChannelId(telegramChannelId)) {
		//   return; // Don't submit if validation fails
		// }

		if (!serviceData.tncFile) {
			toast({
				title: "Error!",
				description: "Terms & Conditions PDF is required.",
				variant: "destructive",
			});
			return;
		}

		const pricingPlansNormalized = serviceData.pricingPlans.map((p) => ({
			validity: p.validity,
			price: p.price,
			purchaseType:
				p.purchaseType === "ONE_TIME" ? "ONE_TIME" : ("RENEWABLE" as const),
		}));
		const derivedPurchaseType = pricingPlansNormalized.some(
			(p) => p.purchaseType === "RENEWABLE",
		)
			? ("RENEWABLE" as const)
			: ("ONE_TIME" as const);

		const data = {
			name: session.data?.user.RegName,
			email: session.data?.user.email,
			id: session.data?.user.id,
			type: session.data?.user.category,
			authorImage: session.data?.user.profileUrl ?? "",
			aboutAuthor: session.data?.user.aboutMe,
			serviceType: isFund ? "fund" : "normal",
			returnsByTime: [
				serviceData.onemonth,
				serviceData.sixmonths,
				serviceData.oneyear,
				serviceData.threeyears,
				serviceData.fiveyears,
			],
			Documents: documents,
			telegramConfig: needTelegram
				? {
					channelId: telegramChannelId,
				}
				: null,
			...serviceData,
			pricingPlans: isFund ? serviceData.pricingPlans : pricingPlansNormalized,
			purchaseType: isFund ? serviceData.purchaseType : derivedPurchaseType,
			shareWithMarketplaces: shareWithMarketplaces,
		};

		const formData = new FormData();

		formData.append("data", JSON.stringify(data));

		if (serviceData.bannerURL) {
			formData.append("bannerURL", serviceData.bannerURL);
		}

		if (serviceData.tncFile) {
			formData.append("tncFile", serviceData.tncFile);
		}

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/createservice`,
				{
					method: "POST",
					body: formData,
				},
			);
			const data = await response.json();

			if (response.status === 200) {
				toast({
					title: "Created",
					description: `Tradebox service created`,
					variant: "default",
				});

				// setTimeout(() => {
				//   window.location.reload();
				// }, 2000);
			} else {
				toast({
					title: "Error!",
					description:
						data.message ||
						"There was an error creating service please try again",
					variant: "destructive",
				});
			}
		} catch (error) {
			toast({
				title: "Error!",
				description: "There was an error creating service please try again",
				variant: "destructive",
			});
		} finally {
			setLoading(false); // stop loader always
		}
	}

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (needTelegram && !validateTelegramChannelId(telegramChannelId)) {
			return; // Stop submission if telegram ID is required and invalid
		}

		// ✅ Pass event to PostService
		PostService(e);
	};

	const inputCls =
		"w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
	const labelCls =
		"block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5";

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 p-4">
			<Toaster />
			<form method="POST" onSubmit={handleSubmit} className="mx-auto max-w-7xl">
				<div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">

					{/* Header */}
					{/* <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
								<Briefcase className="w-5 h-5 text-white" />
							</div>
							<div>
								<h1 className="text-lg font-semibold text-gray-900 dark:text-white">
									{isFund ? "Create Fund" : "Create Plan"}
								</h1>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									{isFund
										? "Set up a new fund / scheme for subscribers"
										: "Set up a new subscription plan for your customers"}
								</p>
							</div>
						</div>
					</div> */}

					{/* Basic Info: title, segment, calls */}
					<div className="px-6 py-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className={labelCls}>
									{isFund ? "Name of Fund / Scheme" : "Plan Title"} <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="title"
									value={serviceData.title}
									onChange={serviceDataChangehandler}
									placeholder={isFund ? "e.g. Equity Growth Fund" : "e.g. Pro Trader Plan"}
									required
									className={inputCls}
								/>
							</div>
							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<Layers className="w-3.5 h-3.5 text-purple-500" />
									Segment <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="segment"
									value={serviceData.segment}
									onChange={serviceDataChangehandler}
									placeholder="e.g. Equity, F&O, Currency"
									required
									className={inputCls}
								/>
							</div>
						</div>

						{/* Approx no of calls + Description in same row on desktop */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<Phone className="w-3.5 h-3.5 text-emerald-500" />
									Approx no of calls <span className="font-normal text-gray-400 ml-1">(optional)</span>
								</label>
								{/* Connected input group: number on the left, period select on the
								    right, sharing a single border so it reads as one control. */}
								<div className="flex h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition overflow-hidden">
									<input
										type="number"
										name="callsQuota"
										min={0}
										placeholder="e.g. 5"
										className="flex-1 min-w-0 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 bg-transparent focus:outline-none"
										value={serviceData.callsQuota === 0 ? "" : serviceData.callsQuota}
										onChange={handleCallsQuotaChange}
									/>
									<span className="self-center text-[11px] uppercase tracking-wider text-gray-400 px-2 select-none">per</span>
									<div className="border-l border-gray-200 dark:border-gray-700" />
									<select
										name="callsPeriod"
										className="w-28 px-3 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/40 focus:outline-none cursor-pointer"
										value={serviceData.callsPeriod}
										onChange={(e) =>
											setServiceData((prev) => ({
												...prev,
												callsPeriod: e.target.value as "DAY" | "WEEK" | "MONTH",
											}))
										}
									>
										<option value="DAY">Day</option>
										<option value="WEEK">Week</option>
										<option value="MONTH">Month</option>
									</select>
								</div>
							</div>
							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<FileText className="w-3.5 h-3.5 text-orange-500" />
									Description
								</label>
								<input
									type="text"
									name="description"
									value={serviceData.description}
									onChange={serviceDataChangehandler}
									placeholder="Brief one-liner describing the offering"
									className={inputCls}
								/>
							</div>
						</div>
					</div>

					<div className="border-t border-gray-100 dark:border-gray-800"></div>

					{/* Media + Marketplaces */}
					<div className="px-6 py-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							{/* Banner */}
							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<ImageIcon className="w-3.5 h-3.5 text-purple-500" />
									Banner Image
								</label>
								{!serviceData.bannerURL ? (
									<label htmlFor="bannerInput" className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition group h-28 bg-gray-50/50 dark:bg-gray-800/30">
										<div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition">
											<ImageIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition" />
										</div>
										<span className="mt-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">Click to upload</span>
										<span className="text-[10px] text-gray-500">PNG/JPG · up to 5MB</span>
									</label>
								) : (
									<div className="relative group h-28">
										<Image src={previewUrl} alt="banner-preview" fill className="rounded-xl object-cover border border-gray-200 dark:border-gray-700" />
										<div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-xl transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
											<button type="button" onClick={() => bannerInputRef.current?.click()} className="bg-white/95 text-gray-900 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-white">Change</button>
											<button type="button" onClick={removeBanner} className="bg-red-500 text-white p-1.5 rounded-md hover:bg-red-600 transition"><X size={13} /></button>
										</div>
									</div>
								)}
								<input type="file" id="bannerInput" ref={bannerInputRef} className="hidden" accept="image/*" name="bannerURL" onChange={bannerChangeHandler} />
							</div>

							{/* T&C PDF */}
							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<FileText className="w-3.5 h-3.5 text-rose-500" />
									Terms & Conditions <span className="text-red-500">*</span>
								</label>
								<label htmlFor="tncFile" className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition group h-28 bg-gray-50/50 dark:bg-gray-800/30">
									<div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-blue-400 transition">
										{serviceData.tncFile ? <Check className="w-4 h-4 text-green-500" /> : <FileText className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition" />}
									</div>
									<span className="mt-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-full px-2">
										{serviceData.tncFile ? serviceData.tncFile.name : "Click to upload PDF"}
									</span>
									<span className="text-[10px] text-gray-500">PDF · up to 5MB</span>
								</label>
								{serviceData.tncFile && (
									<button
										type="button"
										onClick={() => {
											setServiceData((prev) => ({ ...prev, tncFile: null }));
											const fileInput = document.getElementById("tncFile") as HTMLInputElement;
											if (fileInput) fileInput.value = "";
										}}
										className="mt-1 text-[11px] text-red-500 hover:text-red-700 font-medium"
									>
										Remove file
									</button>
								)}
								<input type="file" id="tncFile" name="tncFile" className="hidden" accept="application/pdf" onChange={handleFileChange} required />
								{errorMessage && <p className="mt-1 text-[11px] text-red-500">{errorMessage}</p>}
							</div>

							{/* Marketplaces */}
							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<Store className="w-3.5 h-3.5 text-teal-500" />
									Marketplaces
								</label>
								<MarketPlaceSelect onChange={setShareWithMarketplaces} />
							</div>
						</div>
					</div>

					<div className="border-t border-gray-100 dark:border-gray-800"></div>

					{/* Pricing tiers (non-fund) */}
					{!isFund && (
						<div className="px-6 py-4">
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-2">
									<IndianRupee className="w-4 h-4 text-emerald-600" />
									<h3 className="text-sm font-semibold text-gray-900 dark:text-white">Pricing Tiers</h3>
									<span className="text-xs text-gray-400">• validity & price options</span>
								</div>
								<button
									type="button"
									onClick={addPricingPlan}
									className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
								>
									<Plus className="w-3.5 h-3.5" /> Add Tier
								</button>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
								{serviceData.pricingPlans.map((plan, index) => (
									<div
										key={index}
										className="relative p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800/20 hover:border-blue-300 dark:hover:border-blue-700 transition"
									>
										<div className="flex items-center justify-between mb-2">
											<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-semibold rounded-full uppercase tracking-wide">
												Tier {index + 1}
											</span>
											{serviceData.pricingPlans.length > 1 && (
												<button
													type="button"
													onClick={() => removePricingPlan(index)}
													className="text-gray-400 hover:text-red-500 p-0.5 rounded transition"
												>
													<X size={13} />
												</button>
											)}
										</div>
										<div className="space-y-2">
											<div>
												<label className="block text-[10px] font-medium mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
													Validity
												</label>
												<div className="relative">
													<input
														type="number"
														min={0}
														value={plan.validity || ""}
														onChange={(e) =>
															handlePricingPlanChange(index, "validity", parseInt(e.target.value) || 0)
														}
														className="w-full h-8 pl-2 pr-12 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
													/>
													<span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-medium">days</span>
												</div>
											</div>
											<div>
												<label className="block text-[10px] font-medium mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
													Price (Excl. GST)
												</label>
												<div className="relative">
													<span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">₹</span>
													<input
														type="number"
														min={0}
														value={plan.price || ""}
														onChange={(e) =>
															handlePricingPlanChange(index, "price", parseInt(e.target.value) || 0)
														}
														className="w-full h-8 pl-6 pr-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
													/>
												</div>
											</div>
											<div className="flex gap-3 pt-1">
												<label className="flex items-center gap-1 cursor-pointer text-[11px]">
													<input
														type="radio"
														name={`purchaseType-${index}`}
														value="ONE_TIME"
														checked={plan.purchaseType === "ONE_TIME"}
														onChange={() => handlePricingPlanPurchaseType(index, "ONE_TIME")}
													/>
													One-time
												</label>
												<label className="flex items-center gap-1 cursor-pointer text-[11px]">
													<input
														type="radio"
														name={`purchaseType-${index}`}
														value="RENEWABLE"
														checked={plan.purchaseType === "RENEWABLE"}
														onChange={() => handlePricingPlanPurchaseType(index, "RENEWABLE")}
													/>
													Renewable
												</label>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Fund details */}
					{isFund && (
						<div className="px-6 py-4">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
								<div>
									<label className={`${labelCls} flex items-center gap-1.5`}>
										<Wallet className="w-3.5 h-3.5 text-emerald-500" /> AUM
									</label>
									<input type="number" min={0} name="AUM" value={serviceData.AUM || ""} onChange={serviceDataChangehandler} className={inputCls} />
								</div>
								<div>
									<label className={`${labelCls} flex items-center gap-1.5`}>
										<Users className="w-3.5 h-3.5 text-blue-500" /> No. of Clients
									</label>
									<input type="number" min={0} name="NoOfClients" value={serviceData.NoOfClients || ""} onChange={serviceDataChangehandler} className={inputCls} />
								</div>
								<div>
									<label className={`${labelCls} flex items-center gap-1.5`}>
										<User className="w-3.5 h-3.5 text-purple-500" /> Fund Manager
									</label>
									<input type="text" name="Fundmanager" value={serviceData.Fundmanager} onChange={serviceDataChangehandler} className={inputCls} />
								</div>
								<div>
									<label className={`${labelCls} flex items-center gap-1.5`}>
										<Calendar className="w-3.5 h-3.5 text-emerald-500" /> Inception Date
									</label>
									<input type="date" name="inceptionDate" onChange={serviceDataChangehandler} className={inputCls} />
								</div>
								<div>
									<label className={`${labelCls} flex items-center gap-1.5`}>
										<Calendar className="w-3.5 h-3.5 text-sky-500" /> As On
									</label>
									<input type="date" name="AsOn" onChange={serviceDataChangehandler} className={inputCls} />
								</div>
								<div>
									<label className={`${labelCls} flex items-center gap-1.5`}>
										<FileText className="w-3.5 h-3.5 text-orange-500" /> Documents
									</label>
									<DocumentsListInput onChange={setDocuments} id={session.data?.user.id!} />
								</div>
							</div>

							{/* Returns */}
							<div className="mb-4">
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Returns (%)
								</label>
								<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
									{[
										{ label: "1 Month", name: "onemonth", val: serviceData.onemonth },
										{ label: "6 Months", name: "sixmonths", val: serviceData.sixmonths },
										{ label: "1 Year", name: "oneyear", val: serviceData.oneyear },
										{ label: "3 Years", name: "threeyears", val: serviceData.threeyears },
										{ label: "5 Years", name: "fiveyears", val: serviceData.fiveyears },
									].map((r) => (
										<div key={r.name}>
											<label className="block text-[10px] font-medium mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-wider">{r.label}</label>
											<input
												type="number"
												name={r.name}
												value={Number.isFinite(r.val as number) ? (r.val as number) : ""}
												onChange={serviceDataChangehandler}
												className="w-full h-9 px-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
											/>
										</div>
									))}
								</div>
							</div>

							{/* Fund Purchase Setting */}
							<div>
								<label className={labelCls}>Purchase Setting</label>
								<div className="flex gap-4">
									<label className="flex items-center gap-2 cursor-pointer text-sm">
										<input
											type="radio"
											name="purchaseType"
											value="ONE_TIME"
											checked={serviceData.purchaseType === "ONE_TIME"}
											onChange={() => setServiceData((prev) => ({ ...prev, purchaseType: "ONE_TIME" }))}
										/>
										One-time
									</label>
									<label className="flex items-center gap-2 cursor-pointer text-sm">
										<input
											type="radio"
											name="purchaseType"
											value="RENEWABLE"
											checked={serviceData.purchaseType === "RENEWABLE"}
											onChange={() => setServiceData((prev) => ({ ...prev, purchaseType: "RENEWABLE" }))}
										/>
										Renewable
									</label>
								</div>
							</div>
						</div>
					)}

					<div className="border-t border-gray-100 dark:border-gray-800"></div>

					{/* FAQs + Telegram + Recurring */}
					<div className="px-6 py-4">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* FAQs */}
							{!isFaq && (
								<div>
									<div className="flex items-center justify-between mb-2">
										<label className={`${labelCls} flex items-center gap-1.5 mb-0`}>
											<HelpCircle className="w-3.5 h-3.5 text-blue-500" />
											FAQs <span className="font-normal text-gray-400 ml-1">(optional)</span>
										</label>
										<button
											type="button"
											onClick={addFaq}
											className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
										>
											<Plus className="w-3 h-3" /> Add
										</button>
									</div>
									<div className="space-y-2">
										{serviceData.faqs.map((faq, index) => (
											<div key={index} className="flex gap-2">
												<input
													type="text"
													placeholder="Question"
													value={faq.question}
													onChange={(e) => handleFaqChange(index, "question", e.target.value)}
													className={`${inputCls} flex-1`}
												/>
												<input
													type="text"
													placeholder="Answer"
													value={faq.answer}
													onChange={(e) => handleFaqChange(index, "answer", e.target.value)}
													className={`${inputCls} flex-1`}
												/>
												{serviceData.faqs.length > 1 && (
													<button
														type="button"
														onClick={() => removeFaq(index)}
														className="text-red-500 hover:text-red-700 px-2 flex-shrink-0"
														aria-label="Remove FAQ"
													>
														<X size={16} />
													</button>
												)}
											</div>
										))}
									</div>
								</div>
							)}

							{/* Telegram + Recurring toggles */}
							<div className="space-y-3">
								<div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/30">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-2 min-w-0">
											<MessageSquare className="w-4 h-4 text-sky-500 flex-shrink-0" />
											<div className="min-w-0">
												<p className="text-sm font-medium text-gray-900 dark:text-white">Telegram Channel</p>
												<p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">Link a private channel for subscribers</p>
											</div>
										</div>
										<button
											type="button"
											className={`relative inline-flex h-6 w-11 items-center rounded-full flex-shrink-0 transition-colors ${needTelegram ? "bg-green-600" : "bg-slate-400"}`}
											onClick={() => setNeedTelegram(!needTelegram)}
										>
											<span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${needTelegram ? "translate-x-6" : "translate-x-1"}`} />
										</button>
									</div>
									{needTelegram && (
										<div className="mt-2">
											<input
												type="text"
												name="telegramChannelId"
												value={telegramChannelId}
												onChange={(e: ChangeEvent<HTMLInputElement>) => {
													const value = e.target.value;
													setTelegramChannelId(value);
													validateTelegramChannelId(value);
												}}
												placeholder="Format: -1001234567890"
												className={inputCls}
											/>
											{telegramError && <p className="mt-1 text-[11px] text-red-500">{telegramError}</p>}
										</div>
									)}
								</div>

								{recurringPaymentAllowed && (
									<div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/30">
										<div className="flex items-center justify-between gap-3">
											<div className="flex items-center gap-2 min-w-0">
												<Repeat className="w-4 h-4 text-emerald-500 flex-shrink-0" />
												<div className="min-w-0">
													<p className="text-sm font-medium text-gray-900 dark:text-white">Auto-Renewal (UPI Auto-Pay)</p>
													<p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">Allow customers to auto-renew via UPI Auto-Pay</p>
												</div>
											</div>
											<button
												type="button"
												className={`relative inline-flex h-6 w-11 items-center rounded-full flex-shrink-0 transition-colors ${serviceData.allowRecurringPayment ? "bg-green-600" : "bg-slate-400"}`}
												onClick={() =>
													setServiceData((prev) => ({
														...prev,
														allowRecurringPayment: !prev.allowRecurringPayment,
													}))
												}
											>
												<span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${serviceData.allowRecurringPayment ? "translate-x-6" : "translate-x-1"}`} />
											</button>
										</div>
									</div>
								)}

								{serviceData.isFreeTrial && (
									<div>
										<label className={labelCls}>No. of trial days</label>
										<input
											type="number"
											name="freeTrailDays"
											value={serviceData.freeTrailDays || ""}
											min={0}
											onChange={serviceDataChangehandler}
											className={inputCls}
										/>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Footer */}
					<div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-6 py-3 flex justify-end">
						<button
							type="submit"
							disabled={loading}
							className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 h-10 rounded-lg font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
						>
							{loading ? (
								<>
									<Loader2 className="animate-spin h-4 w-4" />
									Creating...
								</>
							) : (
								<>
									<Send className="h-4 w-4" /> {isFund ? "Create Fund" : "Create Plan"}
								</>
							)}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
