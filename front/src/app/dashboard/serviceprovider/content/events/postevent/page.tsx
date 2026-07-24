"use client";

import { Calendar, CalendarDays, Clock, FileText, Image as ImageIcon, IndianRupee, Languages, Link2, Loader2, Mail, MapPin, Send, Store, Tag, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { isReadOnlySubProfile } from "@/lib/subProfilePermissions";
import { LanguagesInput, MultiSelect } from "@/components";
import MarketPlaceSelect from "@/components/MultiSelect/MarketPlaceSelect";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";

export type eventDataProps = {
	title: string;
	eventEmail: string;
	scheduleDate: string;
	scheduleTime: string;
	link: string;
	location: string;
	description: string;
	disclaimer: string;
	eventType: string;
	image: File | null;
	language: string;
	eventCostType: string;
	price: number;
};

export default function PostEvent() {
	const [categories, setCategories] = useState<string[]>([]);
	const [previewUrl, setPreviewUrl] = useState<string>("");
	const [eventCostType, setEventCostType] = useState("Free");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [shareWithMarketplaces, setShareWithMarketplaces] = useState<string[]>(
		[],
	);

	const { toast } = useToast();
	const session = useSession();
	const router = useRouter();

	// View-only admin sub profiles can't post events. Bounce them to the
	// read-only list if they reach this form via a direct URL (the backend also
	// rejects the create call). No early return — that would skip the hooks
	// declared below and break the Rules of Hooks.
	const readOnly = isReadOnlySubProfile(session?.data);
	useEffect(() => {
		if (readOnly) {
			router.replace(
				"/dashboard/serviceprovider/content/events/upcomingevents",
			);
		}
	}, [readOnly, router]);

	const [eventData, SeteventData] = useState<eventDataProps>({
		title: "",
		scheduleDate: "",
		scheduleTime: "",
		link: "",
		location: "",
		eventEmail: "",
		description: "",
		disclaimer: "",
		eventType: "",
		image: null,
		language: "english",
		eventCostType: "Free",
		price: 0,
	});

	function PosteventChangehandler(
		event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) {
		const { name, value, type } = event.target;

		if (name === "price") {
			SeteventData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
		} else {
			SeteventData((prev) => ({
				...prev,
				[name]:
					type === "checkbox"
						? (event.target as HTMLInputElement).checked
						: value,
			}));
		}
	}

	function eventImageChangeHandler(event: ChangeEvent<HTMLInputElement>) {
		const { files } = event.target;

		if (files && files?.length > 0) {
			const file = files[0];
			const url = URL.createObjectURL(file);
			setPreviewUrl(url);
			SeteventData((prev) => ({ ...prev, image: file }));
		}
	}

	function eventCostTypeChangeHandler(event: ChangeEvent<HTMLInputElement>) {
		const { value } = event.target;
		setEventCostType(value);
	}

	async function PostSubmitHandler(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSubmitting(true);

		if (eventData.eventType === "") {
			toast({
				title: "No event type selected",
				description: "Please select event type",
				variant: "destructive",
			});
			setIsSubmitting(false);
			return;
		}

		if (categories.length === 0) {
			toast({
				title: "No Category selected",
				description: "Please select at least one category",
				variant: "destructive",
			});
			setIsSubmitting(false);
			return;
		}

		if (!eventData.image) {
			toast({
				title: "No Image selected",
				description: "Please select an image",
				variant: "destructive",
			});
			setIsSubmitting(false);
			return;
		}

		const combinedDateTime = new Date(
			`${eventData.scheduleDate}T${eventData.scheduleTime}`,
		);
		const ISTOffset = 5.5 * 60;
		const utcDateTime =
			combinedDateTime.getTime() + combinedDateTime.getTimezoneOffset() * 60000;
		const istDateTime = new Date(utcDateTime + ISTOffset * 60000);
		const scheduledDateTime = istDateTime.toISOString();

		const data = {
			name: session.data?.user.RegName,
			email: session.data?.user.email,
			id: session.data?.user.id,
			type: session.data?.user.category,
			// Fall back to "" so JSON.stringify keeps the key. A sub-profile has
			// no profile picture, so profileUrl is undefined — and undefined
			// values are dropped by JSON.stringify, which made the backend's
			// "all fields required" check fail with a 400 ("Upload failed").
			authorImage: session.data?.user.profileUrl ?? "",
			aboutAuthor: session.data?.user.aboutMe ?? "",
			title: eventData.title,
			location: eventData.location,
			category: categories,
			scheduledDateTime: scheduledDateTime,
			description: eventData.description,
			disclaimer: eventData.disclaimer,
			link: eventData.link,
			eventEmail: eventData.eventEmail,
			eventType: eventData.eventType,
			language: eventData.language,
			eventCostType: eventCostType,
			price: eventData.price,
			targetAudience: "user",
			shareWithMarketplaces: shareWithMarketplaces,
		};

		const formData = new FormData();
		formData.append("data", JSON.stringify(data));

		if (eventData.image) {
			formData.append("image", eventData.image);
		}

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/postevent`,
				{
					method: "POST",
					body: formData,
				},
			);

			if (response.status === 200) {
				toast({
					title: "Event uploaded successfully!",
					description: "Your event has been published.",
					variant: "default",
				});
				// Reset form
				SeteventData({
					title: "",
					scheduleDate: "",
					scheduleTime: "",
					link: "",
					location: "",
					eventEmail: "",
					description: "",
					disclaimer: "",
					eventType: "",
					image: null,
					language: "english",
					eventCostType: "Free",
					price: 0,
				});
				setCategories([]);
				setPreviewUrl("");
				setEventCostType("Free");
			} else {
				throw new Error("Upload failed");
			}
		} catch (error) {
			toast({
				title: "Upload failed!",
				description:
					"There was an error uploading your event. Please try again.",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	}

	const inputCls =
		"w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
	const labelCls =
		"block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5";

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 p-4">
			<Toaster />
			<form onSubmit={PostSubmitHandler} className="mx-auto max-w-7xl">
				<div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">

					

					{/* Basic Info */}
					<div className="px-6 py-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="md:col-span-2">
								<label className={labelCls}>
									Event Title <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="title"
									value={eventData.title}
									onChange={PosteventChangehandler}
									placeholder="Enter a compelling event title"
									required
									className={inputCls}
								/>
							</div>

							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<Tag className="w-3.5 h-3.5 text-purple-500" />
									Event Type <span className="text-red-500">*</span>
								</label>
								<div className="flex gap-1 h-10 p-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
									{["Online", "Offline", "Hybrid"].map((type) => (
										<label
											key={type}
											className={`flex-1 flex items-center justify-center text-xs font-medium rounded-md cursor-pointer transition ${eventData.eventType === type
												? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
												: "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`}
										>
											<input
												type="radio"
												name="eventType"
												value={type}
												checked={eventData.eventType === type}
												onChange={PosteventChangehandler}
												className="hidden"
											/>
											{type}
										</label>
									))}
								</div>
							</div>
						</div>

						{/* Row 2: Category + Language + Contact Email */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<Tag className="w-3.5 h-3.5 text-teal-500" />
									Category <span className="text-red-500">*</span>
								</label>
								<MultiSelect onChange={setCategories} value={categories} />
							</div>

							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<Languages className="w-3.5 h-3.5 text-amber-500" />
									Language
								</label>
								<LanguagesInput
									title=""
									name="language"
									onChange={SeteventData}
									value={eventData.language}
								/>
							</div>

							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<Mail className="w-3.5 h-3.5 text-blue-500" />
									Contact Email <span className="text-red-500">*</span>
								</label>
								<input
									type="email"
									name="eventEmail"
									placeholder="contact@example.com"
									onChange={PosteventChangehandler}
									value={eventData.eventEmail}
									required
									className={inputCls}
								/>
							</div>
						</div>
					</div>

					<div className="border-t border-gray-100 dark:border-gray-800"></div>

					{/* Schedule + Pricing */}
					<div className="px-6 py-4">
						<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<Calendar className="w-3.5 h-3.5 text-emerald-500" />
									Date <span className="text-red-500">*</span>
								</label>
								<input
									type="date"
									name="scheduleDate"
									min={new Date().toISOString().split("T")[0]}
									onChange={PosteventChangehandler}
									value={eventData.scheduleDate}
									required
									className={inputCls}
								/>
							</div>

							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<Clock className="w-3.5 h-3.5 text-sky-500" />
									Time <span className="text-red-500">*</span>
								</label>
								<input
									type="time"
									name="scheduleTime"
									onChange={PosteventChangehandler}
									value={eventData.scheduleTime}
									required
									className={inputCls}
								/>
							</div>

							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
									Pricing <span className="text-red-500">*</span>
								</label>
								<div className="flex gap-1 h-10 p-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
									{["Free", "Paid"].map((type) => (
										<label
											key={type}
											className={`flex-1 flex items-center justify-center text-xs font-medium rounded-md cursor-pointer transition ${eventCostType === type
												? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
												: "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`}
										>
											<input
												type="radio"
												name="eventCostType"
												value={type}
												checked={eventCostType === type}
												onChange={eventCostTypeChangeHandler}
												className="hidden"
											/>
											{type}
										</label>
									))}
								</div>
							</div>

							<div>
								<label className={labelCls}>
									Price {eventCostType === "Paid" && <span className="text-red-500">*</span>}
								</label>
								<div className="relative">
									<span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">₹</span>
									<input
										type="number"
										name="price"
										value={eventData.price || ""}
										placeholder="0.00"
										min="0"
										disabled={eventCostType !== "Paid"}
										onChange={PosteventChangehandler}
										required={eventCostType === "Paid"}
										className={`${inputCls} pl-7 disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:text-gray-400 disabled:cursor-not-allowed`}
									/>
								</div>
							</div>
						</div>

						{/* Conditional link / location */}
						{(eventData.eventType === "Online" || eventData.eventType === "Hybrid" || eventData.eventType === "Offline") && (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
								{(eventData.eventType === "Online" || eventData.eventType === "Hybrid") && (
									<div>
										<label className={`${labelCls} flex items-center gap-1.5`}>
											<Link2 className="w-3.5 h-3.5 text-indigo-500" />
											Event Link <span className="text-red-500">*</span>
										</label>
										<input
											type="url"
											name="link"
											onChange={PosteventChangehandler}
											value={eventData.link}
											placeholder="https://..."
											required
											className={inputCls}
										/>
									</div>
								)}
								{(eventData.eventType === "Offline" || eventData.eventType === "Hybrid") && (
									<div>
										<label className={`${labelCls} flex items-center gap-1.5`}>
											<MapPin className="w-3.5 h-3.5 text-rose-500" />
											Event Location <span className="text-red-500">*</span>
										</label>
										<input
											type="text"
											name="location"
											onChange={PosteventChangehandler}
											value={eventData.location}
											placeholder="Enter venue address"
											required
											className={inputCls}
										/>
									</div>
								)}
							</div>
						)}
					</div>

					<div className="border-t border-gray-100 dark:border-gray-800"></div>

					{/* Media + Description + Marketplace */}
					<div className="px-6 py-4">
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
							{/* Image upload */}
							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<ImageIcon className="w-3.5 h-3.5 text-purple-500" />
									Event Image <span className="text-red-500">*</span>
								</label>
								{!eventData.image ? (
									<label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition group h-36 bg-gray-50/50 dark:bg-gray-800/30">
										<div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition">
											<ImageIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition" />
										</div>
										<span className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300">
											Click to upload
										</span>
										<span className="text-[10px] text-gray-500">PNG/JPG/GIF · up to 10MB</span>
										<input
											type="file"
											className="hidden"
											accept="image/apng, image/avif, image/gif, image/jpeg, image/png, image/svg+xml, image/webp"
											name="image"
											onChange={eventImageChangeHandler}
											required
										/>
									</label>
								) : (
									<div className="relative group h-36">
										<Image
											src={previewUrl}
											alt="event-preview"
											fill
											className="rounded-xl object-cover border border-gray-200 dark:border-gray-700"
										/>
										<div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-xl transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
											<label className="bg-white/95 text-gray-900 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:bg-white">
												Change
												<input
													type="file"
													className="hidden"
													accept="image/apng, image/avif, image/gif, image/jpeg, image/png, image/svg+xml, image/webp"
													name="image"
													onChange={eventImageChangeHandler}
												/>
											</label>
											<button
												type="button"
												onClick={() => {
													setPreviewUrl("");
													SeteventData(prev => ({ ...prev, image: null }));
												}}
												className="bg-red-500 text-white p-1.5 rounded-md hover:bg-red-600 transition"
											>
												<X size={13} />
											</button>
										</div>
									</div>
								)}
							</div>

							{/* Description */}
							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<FileText className="w-3.5 h-3.5 text-orange-500" />
									Description <span className="text-red-500">*</span>
								</label>
								<textarea
									className="w-full h-36 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
									value={eventData.description}
									name="description"
									onChange={PosteventChangehandler}
									placeholder="Describe your event in detail..."
									required
								/>
							</div>

							{/* Disclaimer */}
							{/* <div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<FileText className="w-3.5 h-3.5 text-red-500" />
									Disclaimer <span className="text-red-500">*</span>
								</label>
								<textarea
									className="w-full h-36 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
									value={eventData.disclaimer}
									name="disclaimer"
									required
									onChange={PosteventChangehandler}
									placeholder="Important disclaimers, terms, or conditions..."
								/>
							</div> */}
						</div>

						{/* Marketplaces */}
						<div className="mt-4">
							<label className={`${labelCls} flex items-center gap-1.5`}>
								<Store className="w-3.5 h-3.5 text-teal-500" />
								Marketplace Distribution
							</label>
							<MarketPlaceSelect onChange={setShareWithMarketplaces} />
						</div>
					</div>

					{/* Footer */}
					<div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-6 py-3 flex justify-end">
						<button
							type="submit"
							disabled={isSubmitting}
							className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 h-10 rounded-lg font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="animate-spin h-4 w-4" />
									Publishing...
								</>
							) : (
								<>
									<Send className="h-4 w-4" /> Publish Event
								</>
							)}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
