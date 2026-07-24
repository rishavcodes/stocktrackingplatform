"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { isReadOnlySubProfile } from "@/lib/subProfilePermissions";
import {
	LanguagesInput,
	MultiSelect,
	PlansListSelect,
	ShareWithSelect,
} from "@/components";
import MarketPlaceSelect from "@/components/MultiSelect/MarketPlaceSelect";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import {
	FileText,
	Image as ImageIcon,
	Languages,
	Link2,
	Loader2,
	Newspaper,
	Send,
	Store,
	Tag,
	Users,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";

/** Local calendar date YYYY-MM-DD (avoid mixing UTC date from ISO with local time — breaks after midnight IST, etc.) */
function getLocalDateYYYYMMDD(d: Date) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

function getLocalTimeHHMM(d: Date) {
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export type articleDataProps = {
	title: string;
	content: string;
	schedule: boolean;
	scheduleDate: string;
	scheduleTime: string;
	image: File | null;
	articlePDF: File | null;
	link: string;
	language: string;
};

export default function PostResearchReport() {
	const session = useSession();

	const [previewUrl, setPreviewUrl] = useState<string>("");

	const [categories, setCategories] = useState<string[]>([]);
	const [shareWith, setShareWith] = useState<string[]>(["subscribers"]);
	const [shareWithPlans, setShareWithPlans] = useState<string[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [shareWithMarketplaces, setShareWithMarketplaces] = useState<string[]>(
		[],
	);

	const { toast } = useToast();
  const router = useRouter();

	// View-only admin sub profiles can't post research reports. Bounce them to
	// the read-only list if they reach this form via a direct URL (the backend
	// also rejects the create call). No early return here — that would skip the
	// hooks declared below and break the Rules of Hooks; the redirect fires on
	// mount instead.
	const readOnly = isReadOnlySubProfile(session?.data);
	useEffect(() => {
		if (readOnly) {
			router.replace(
				"/dashboard/serviceprovider/content/researchreports/postedresearchreports",
			);
		}
	}, [readOnly, router]);
	const [articleData, SetArticleData] = useState<articleDataProps>({
		title: "",
		content: "",
		schedule: false,
		scheduleDate: "",
		scheduleTime: "",
		image: null,
		articlePDF: null,
		link: "",
		language: "english",
	});

	function PostArticleChangehandler(
		event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) {
		const { name, value, type } = event.target;

		// Handle checkbox separately with proper type checking
		if (type === "checkbox") {
			const target = event.target as HTMLInputElement;
			SetArticleData((prev) => ({
				...prev,
				[name]: target.checked,
			}));
		} else {
			SetArticleData((prev) => ({
				...prev,
				[name]: value,
			}));
		}
	}

	function articleImageChangeHandler(event: ChangeEvent<HTMLInputElement>) {
		const { files } = event.target;

		if (files && files?.length > 0) {
			const file = files[0];
			const url = URL.createObjectURL(file);
			setPreviewUrl(url);
			SetArticleData((prev) => ({ ...prev, image: file }));
		}
	}

	function articlPDFChangeHandler(event: ChangeEvent<HTMLInputElement>) {
		const { files } = event.target;

		if (files && files?.length > 0) {
			const file = files[0];
			if (file.type !== "application/pdf") {
				toast({
					title: "Wrong file type",
					description: "Research report attachment must be a PDF.",
					variant: "destructive",
				});
				event.target.value = "";
				return;
			}
			SetArticleData((prev) => ({ ...prev, articlePDF: file }));
		}
	}

	async function PostSubmitHandler(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (isSubmitting) return;
  setIsSubmitting(true);

  try {
    // ❗ IMAGE CHECK
    if (!articleData.image) {
      toast({
        title: "Image Required",
        description: "Please upload an image before posting the research report.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // ❗ CATEGORY CHECK
    if (categories.length === 0) {
      toast({
        title: "No Category selected",
        description: "Please select at least one category",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // ⏱ CURRENT DATE & TIME (all local — matches user’s “post now” and schedule UI)
    const now = new Date();
    const currentDate = getLocalDateYYYYMMDD(now);
    const currentTime = getLocalTimeHHMM(now);

    const scheduleDate = articleData.schedule
      ? articleData.scheduleDate || currentDate
      : currentDate;

    const scheduleTime = articleData.schedule
      ? articleData.scheduleTime || currentTime
      : currentTime;

    const data = {
      name: session.data?.user.RegName,
      email: session.data?.user.email,
      id: session.data?.user.id,
      type: session.data?.user.category,
      authorImage: session.data?.user.profileUrl ?? "",
      title: articleData.title,
      category: categories,
      content: articleData.content,
      scheduleDate,
      scheduleTime,
      language: articleData.language,
      link: articleData.link,
      shareWith,
      shareWithPlans,
      shareWithMarketplaces,
    };

    const formData = new FormData();
    formData.append("data", JSON.stringify(data));
    formData.append("image", articleData.image);

    if (articleData.articlePDF) {
      formData.append("articlePDF", articleData.articlePDF);
    }

    let response: Response;
    try {
      response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/postarticle`,
        {
          method: "POST",
          body: formData,
        }
      );
    } catch (networkErr) {
      throw new Error(
        "Upload failed — the server didn't respond. Please check your connection and try again. If it keeps failing, contact support."
      );
    }

    let result: { success?: boolean; message?: string } = {};
    try {
      result = await response.json();
    } catch {
      /* non-JSON body, e.g. nginx HTML error page */
    }

    if (!response.ok) {
      if (response.status === 413) {
        throw new Error(
          "Upload was rejected by the server — the file may be too large for the proxy. Contact support."
        );
      }
      throw new Error(
        typeof result.message === "string" && result.message
          ? result.message
          : `Upload failed (${response.status})`
      );
    }

    toast({
      title: "Research report uploaded",
      description: "Research report successfully uploaded",
			variant: "success",
    });

    // ✅ RESET FORM
    SetArticleData({
      title: "",
      content: "",
      schedule: false,
      scheduleDate: "",
      scheduleTime: "",
      image: null,
      articlePDF: null,
      link: "",
      language: "english",
    });

    setPreviewUrl("");
    setCategories([]);
		router.push("/dashboard/serviceprovider/content/researchreports/postedresearchreports");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "There was an error uploading the research report. Please try again.";
    toast({
      title: "Error!",
      description: message,
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
			<form
				method="POST"
				onSubmit={PostSubmitHandler}
				className="mx-auto max-w-7xl"
			>
				<div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">

					

					{/* Basic Info: title, category, language */}
					<div className="px-6 py-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label className={labelCls}>
									Research Report Title <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="title"
									value={articleData.title}
									onChange={PostArticleChangehandler}
									placeholder="Enter an engaging headline"
									required
									className={inputCls}
								/>
							</div>

							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<Tag className="w-3.5 h-3.5 text-teal-500" />
									Category <span className="text-red-500">*</span>
								</label>
								<MultiSelect onChange={setCategories} value={categories} />
							</div>

							
						</div>
					</div>

					<div className="border-t border-gray-100 dark:border-gray-800"></div>

					{/* Content: image + body */}
					<div className="px-6 py-4">
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
							{/* Image */}
							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<ImageIcon className="w-3.5 h-3.5 text-purple-500" />
									Featured Image <span className="text-red-500">*</span>
								</label>
								{!articleData.image ? (
									<label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition group h-40 bg-gray-50/50 dark:bg-gray-800/30">
										<div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition">
											<ImageIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition" />
										</div>
										<span className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300">
											Click to upload
										</span>
										<span className="text-[10px] text-gray-500">PNG / JPG</span>
										<input
											type="file"
											className="hidden"
											accept="image/*"
											name="image"
											onChange={articleImageChangeHandler}
										/>
									</label>
								) : (
									<div className="relative group h-40">
										<Image
											src={previewUrl}
											alt="research-report-preview"
											fill
											className="rounded-xl object-cover border border-gray-200 dark:border-gray-700"
										/>
										<div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-xl transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
											<label className="bg-white/95 text-gray-900 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer hover:bg-white">
												Change
												<input
													type="file"
													className="hidden"
													accept="image/*"
													name="image"
													onChange={articleImageChangeHandler}
												/>
											</label>
											<button
												type="button"
												onClick={() => {
													setPreviewUrl("");
													SetArticleData((prev) => ({ ...prev, image: null }));
												}}
												className="bg-red-500 text-white p-1.5 rounded-md hover:bg-red-600 transition"
											>
												<X size={13} />
											</button>
										</div>
									</div>
								)}
							</div>

							{/* Content body */}
							<div className="lg:col-span-2">
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<FileText className="w-3.5 h-3.5 text-orange-500" />
									Content {!articleData.articlePDF && <span className="text-red-500">*</span>}
								</label>
								<textarea
									className="w-full h-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
									value={articleData.content}
									name="content"
									required={!articleData.articlePDF}
									onChange={PostArticleChangehandler}
									placeholder="Write your research report content here…"
								/>
							</div>
						</div>
					</div>

					<div className="border-t border-gray-100 dark:border-gray-800"></div>


<div className="px-6 py-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							

							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<Tag className="w-3.5 h-3.5 text-emerald-500" />
									Select Plans
								</label>
								<PlansListSelect
									onChange={setShareWithPlans}
									id={session.data?.user.id!}
								/>
							</div>

							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<Store className="w-3.5 h-3.5 text-teal-500" />
									Marketplaces
								</label>
								<MarketPlaceSelect onChange={setShareWithMarketplaces} />
							</div>
						</div>
					</div>
					{/* Attachments: link or PDF */}
					<div className="px-6 py-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<Link2 className="w-3.5 h-3.5 text-indigo-500" />
									Research Report Link <span className="font-normal text-gray-400 ml-1">(optional)</span>
								</label>
								<input
									type="text"
									name="link"
									value={articleData.link}
									onChange={PostArticleChangehandler}
									placeholder="https://…"
									className={inputCls}
								/>
								<p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
									Provide a link to an external research report, or upload a PDF on the right.
								</p>
							</div>

							<div>
								<label className={`${labelCls} flex items-center gap-1.5`}>
									<FileText className="w-3.5 h-3.5 text-rose-500" />
									Research Report PDF <span className="font-normal text-gray-400 ml-1">(optional)</span>
								</label>
								<label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition group h-[76px] bg-gray-50/50 dark:bg-gray-800/30">
									<div className="flex items-center gap-2">
										<div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition">
											<FileText className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition" />
										</div>
										<div className="text-left">
											<div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[220px]">
												{articleData.articlePDF?.name || "Click to upload PDF"}
											</div>
											<div className="text-[10px] text-gray-500">PDF</div>
										</div>
									</div>
									<input
										type="file"
										className="hidden"
										accept="application/pdf"
										name="articlePDF"
										onChange={articlPDFChangeHandler}
									/>
								</label>
								{articleData.articlePDF && (
									<button
										type="button"
										onClick={() =>
											SetArticleData((prev) => ({ ...prev, articlePDF: null }))
										}
										className="mt-1 text-[11px] text-red-500 hover:text-red-700 font-medium"
									>
										Remove file
									</button>
								)}
							</div>
						</div>
					</div>

					<div className="border-t border-gray-100 dark:border-gray-800"></div>

					

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
									Posting...
								</>
							) : (
								<>
									<Send className="h-4 w-4" /> Post Research Report
								</>
							)}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
