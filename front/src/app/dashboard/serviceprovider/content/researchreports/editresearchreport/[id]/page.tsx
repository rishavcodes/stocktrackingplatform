"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import {
  MultiSelect,
  PlansListSelect,
} from "@/components";
import MarketPlaceSelect from "@/components/MultiSelect/MarketPlaceSelect";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { useParams, useRouter } from "next/navigation";
import {
  FileText,
  Image as ImageIcon,
  Link2,
  Loader2,
  Save,
  Store,
  Tag,
  X,
} from "lucide-react";

export type articleDataProps = {
  title: string;
  content: string;
  scheduleDate: string;
  scheduleTime: string;
  image: File | null;
  imageUrl: string;
  articlePDF: File | null;
  articlePDFUrl: string;
  link: string;
  language: string;
};

export default function EditArticlePage() {
  const session = useSession();
  const params = useParams();
  const router = useRouter();
  const articleId = params?.id as string;

  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [shareWith, setShareWith] = useState<string[]>([]);
  const [shareWithPlans, setShareWithPlans] = useState<string[]>([]);
  const [shareWithMarketplaces, setShareWithMarketplaces] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();
  const [articleData, setArticleData] = useState<articleDataProps>({
    title: "",
    content: "",
    scheduleDate: "",
    scheduleTime: "",
    image: null,
    imageUrl: "",
    articlePDF: null,
    articlePDFUrl: "",
    link: "",
    language: "english",
  });

  useEffect(() => {
    if (!articleId || !session.data?.user?.id) return;
    const fetchArticle = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/article?id=${articleId}`
        );
        if (!res.ok) {
          toast({
            title: "Error",
            description: "Research report not found",
            variant: "destructive",
          });
          router.push("/dashboard/serviceprovider/content/researchreports/postedresearchreports");
          return;
        }
        const json = await res.json();
        const a = json.data;
        if (!a) {
          toast({
            title: "Error",
            description: "Research report not found",
            variant: "destructive",
          });
          router.push("/dashboard/serviceprovider/content/researchreports/postedresearchreports");
          return;
        }
        const scheduleDate = new Date(a.schedule);
        const dateStr = scheduleDate.toISOString().split("T")[0];
        const timeStr = scheduleDate.toTimeString().slice(0, 5);
        setArticleData({
          title: a.title ?? "",
          content: a.content ?? "",
          scheduleDate: dateStr,
          scheduleTime: timeStr,
          image: null,
          imageUrl: a.image ?? "",
          articlePDF: null,
          // We no longer expose the raw S3 URL on the API response — this
          // marker just preserves the "Current PDF attached" status text so
          // the provider knows there's an existing PDF they can replace.
          articlePDFUrl: a.hasArticlePDF ? "existing" : "",
          link: a.articleLink ?? "",
          language: a.language ?? "english",
        });
        setCategories(Array.isArray(a.category) ? a.category : []);
        setShareWith(Array.isArray(a.shareWith) ? a.shareWith : ["Subscribers"]);
        setShareWithPlans(Array.isArray(a.shareWithPlans) ? a.shareWithPlans : []);
        setShareWithMarketplaces(
          Array.isArray(a.shareWithMarketplaces)
            ? a.shareWithMarketplaces.map((m: unknown) =>
                typeof m === "string" ? m : (m as { _id?: string })?._id
              ).filter(Boolean) as string[]
            : []
        );
        if (a.image) setPreviewUrl(a.image);
      } catch (e) {
        toast({
          title: "Error",
          description: "Failed to load research report",
          variant: "destructive",
        });
        router.push("/dashboard/serviceprovider/content/researchreports/postedresearchreports");
      } finally {
        setIsLoading(false);
      }
    };
    fetchArticle();
  }, [articleId, session.data?.user?.id, router, toast]);

  function changeHandler(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setArticleData((prev) => ({ ...prev, [name]: value }));
  }

  function articleImageChangeHandler(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    if (files?.length) {
      const file = files[0];
      setPreviewUrl(URL.createObjectURL(file));
      setArticleData((prev) => ({ ...prev, image: file }));
    }
  }

  function articlePDFChangeHandler(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    if (files?.length) {
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
      setArticleData((prev) => ({ ...prev, articlePDF: file }));
    }
  }

  async function submitHandler(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (categories.length === 0) {
        toast({
          title: "No category selected",
          description: "Please select at least one category",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      const user = session.data?.user as { id?: string; email?: string; RegName?: string };
      const data = {
        id: articleId,
        name: user?.RegName,
        email: user?.email ?? "",
        title: articleData.title,
        category: categories,
        content: articleData.content,
        scheduleDate: articleData.scheduleDate,
        scheduleTime: articleData.scheduleTime,
        language: articleData.language,
        link: articleData.link,
        shareWith,
        shareWithPlans,
        shareWithMarketplaces,
      };

      const formData = new FormData();
      formData.append("data", JSON.stringify(data));
      if (articleData.image) formData.append("image", articleData.image);
      if (articleData.articlePDF) formData.append("articlePDF", articleData.articlePDF);

      let response: Response;
      try {
        response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/updatearticle`,
          { method: "PUT", body: formData }
        );
      } catch (networkErr) {
        toast({
          title: "Upload failed",
          description: "The server didn't respond. Please check your connection and try again. If it keeps failing, contact support.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      let result: { success?: boolean; message?: string } = {};
      try {
        result = await response.json();
      } catch {
        /* non-JSON body, e.g. nginx HTML error page */
      }

      if (!response.ok || !result.success) {
        const description =
          response.status === 413
            ? "Upload was rejected by the server — the file may be too large for the proxy. Contact support."
            : result.message || `Failed to update article (${response.status}).`;
        toast({
          title: "Error",
          description,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: "Research report updated",
        description: "Research report updated successfully",
        variant: "success",
      });
      router.push("/dashboard/serviceprovider/content/researchreports/postedresearchreports");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  const inputCls =
    "w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
  const labelCls =
    "block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5";

  // Pick the best preview source: a freshly-picked file → existing server image → none.
  const displayedImage = articleData.image
    ? previewUrl
    : articleData.imageUrl || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 p-4">
      <Toaster />
      <form
        method="POST"
        onSubmit={submitHandler}
        className="mx-auto max-w-7xl"
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">

          

          {/* Basic Info: title, category */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  Research Report Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={articleData.title}
                  onChange={changeHandler}
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
                <MultiSelect value={categories} onChange={setCategories} />
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
                  Featured Image
                </label>
                {!displayedImage ? (
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
                      src={displayedImage}
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
                          setArticleData((prev) => ({ ...prev, image: null, imageUrl: "" }));
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
                  Research Report Content
                </label>
                <textarea
                  className="w-full h-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  value={articleData.content}
                  name="content"
                  onChange={changeHandler}
                  placeholder="Write your research report content here…"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800"></div>

          {/* Link + PDF */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <label className={`${labelCls} flex items-center gap-1.5`}>
                  <Tag className="w-3.5 h-3.5 text-emerald-500" />
                  Select Plans
                </label>
                <PlansListSelect
                  id={session.data?.user?.id!}
                  onChange={setShareWithPlans}
                  initialValues={shareWithPlans}
                />
              </div>
              <div>
                <label className={`${labelCls} flex items-center gap-1.5`}>
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                  Research Report PDF <span className="font-normal text-gray-400 ml-1">(optional)</span>
                </label>
                <label className="flex items-center gap-2 h-10 px-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition group bg-gray-50/50 dark:bg-gray-800/30">
                  <FileText className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    {articleData.articlePDF?.name ||
                      (articleData.articlePDFUrl ? "Current PDF attached" : "Click to upload PDF")}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="application/pdf"
                    name="articlePDF"
                    onChange={articlePDFChangeHandler}
                  />
                </label>
                {(articleData.articlePDF || articleData.articlePDFUrl) && (
                  <button
                    type="button"
                    onClick={() =>
                      setArticleData((prev) => ({ ...prev, articlePDF: null, articlePDFUrl: "" }))
                    }
                    className="mt-1 text-[11px] text-red-500 hover:text-red-700 font-medium"
                  >
                    Remove PDF
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800"></div>

          {/* Audience */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`${labelCls} flex items-center gap-1.5`}>
                  <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                  Research Report Link <span className="font-normal text-gray-400 ml-1">(optional)</span>
                </label>
                <input
                  type="text"
                  name="link"
                  value={articleData.link}
                  onChange={changeHandler}
                  placeholder="https://…"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={`${labelCls} flex items-center gap-1.5`}>
                  <Store className="w-3.5 h-3.5 text-teal-500" />
                  Marketplaces
                </label>
                <MarketPlaceSelect
                  initialValues={shareWithMarketplaces}
                  onChange={setShareWithMarketplaces}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-6 py-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() =>
                router.push("/dashboard/serviceprovider/content/researchreports/postedresearchreports")
              }
              disabled={isSubmitting}
              className="px-5 h-10 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-6 h-10 rounded-lg font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Update Research Report
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
