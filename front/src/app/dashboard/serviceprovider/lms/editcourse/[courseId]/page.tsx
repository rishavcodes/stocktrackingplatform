"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";

import { Input } from "@/components";
import MarketPlaceSelect from "@/components/MultiSelect/MarketPlaceSelect";
import MultiSelectKeyFeatures from "@/components/MultiSelect/MultiSelectKeyFeatures";
import MultiSelectBonusFeatures from "@/components/MultiSelect/MultiSelectBonusFeatures";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";

type CourseLevel = "beginner" | "intermediate" | "advanced";
type CourseLanguage = "en" | "hi";

type EditCourseForm = {
  title: string;
  subtitle: string;
  description: string;
  language: CourseLanguage;
  level: CourseLevel;
  price: number;
  currency: string;
  segment: string;
  thumbnailFile: File | null;
};

export default function EditCoursePage() {
  const { courseId } = useParams() as { courseId: string };
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();

  const [fetchLoading, setFetchLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string>("");

  const [form, setForm] = useState<EditCourseForm>({
    title: "",
    subtitle: "",
    description: "",
    language: "en",
    level: "beginner",
    price: 0,
    currency: "INR",
    segment: "",
    thumbnailFile: null,
  });

  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [bonusFeatures, setBonusFeatures] = useState<string[]>([]);
  const [shareWithMarketplaces, setShareWithMarketplaces] = useState<string[]>([]);

  const TITLE_REGEX = /^[a-zA-Z0-9\s.,&()-]{5,100}$/;
  const SUBTITLE_REGEX = /^[a-zA-Z0-9\s.,&()-]{10,150}$/;
  const SEGMENT_REGEX = /^[a-zA-Z\s,&()-]{3,50}$/;
  const MIN_DESCRIPTION_WORDS = 100;

  function wordCount(text: string) {
    return text.trim().split(/\s+/).length;
  }

  useEffect(() => {
    if (!courseId) return;
    const fetchCourse = async () => {
      setFetchLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/courses/${courseId}/edit`,
          { credentials: "include" }
        );
        const json = await res.json();
        if (!res.ok) {
          toast({ title: "Error", description: json.message || "Failed to load course.", variant: "destructive" });
          return;
        }
        const data = json.data;
        setForm({
          title: data.title || "",
          subtitle: data.subtitle || "",
          description: data.description || "",
          language: (data.language as CourseLanguage) || "en",
          level: (data.level as CourseLevel) || "beginner",
          price: data.price ?? 0,
          currency: data.currency || "INR",
          segment: data.segment || "",
          thumbnailFile: null,
        });
        setKeyFeatures(data.keyFeatures || []);
        setBonusFeatures(data.bonusFeatures || []);
        setShareWithMarketplaces(data.shareWithMarketplaces || []);
        if (data.thumbnailUrl) setExistingThumbnailUrl(data.thumbnailUrl);
      } catch (err) {
        console.error(err);
        toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
      } finally {
        setFetchLoading(false);
      }
    };
    fetchCourse();
  }, [courseId, toast]);

  function handleInputChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? 0 : Number(value)) : value,
    }));
  }

  function handleThumbnailChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Thumbnail must be an image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Thumbnail must be less than 5MB.", variant: "destructive" });
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setForm((prev) => ({ ...prev, thumbnailFile: file }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!courseId) return;
    setLoading(true);
    try {
      if (!TITLE_REGEX.test(form.title.trim())) {
        toast({ title: "Invalid title", description: "Title must be 5–100 characters.", variant: "destructive" });
        return;
      }
      if (form.subtitle && !SUBTITLE_REGEX.test(form.subtitle.trim())) {
        toast({ title: "Invalid subtitle", description: "Subtitle must be 10–150 characters.", variant: "destructive" });
        return;
      }
      if (!SEGMENT_REGEX.test(form.segment.trim())) {
        toast({ title: "Invalid segment", description: "Segment must be 3–50 characters.", variant: "destructive" });
        return;
      }
      if (wordCount(form.description) < MIN_DESCRIPTION_WORDS) {
        toast({ title: "Description too short", description: "At least 100 words required.", variant: "destructive" });
        return;
      }
      if (form.price < 0) {
        toast({ title: "Invalid price", description: "Price cannot be negative.", variant: "destructive" });
        return;
      }

      const instructor = session?.user;
      const payload = {
        title: form.title,
        subtitle: form.subtitle,
        description: form.description,
        language: form.language,
        level: form.level,
        price: form.price,
        currency: form.currency,
        segment: form.segment,
        keyFeatures,
        bonusFeatures,
        shareWithMarketplaces,
        instructorName: instructor?.RegName ?? instructor?.name,
        instructorEmail: instructor?.email,
        instructorAvatar: instructor?.profileUrl,
      };

      const formData = new FormData();
      formData.append("data", JSON.stringify(payload));
      if (form.thumbnailFile) formData.append("thumbnail", form.thumbnailFile);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/courses/${courseId}/update`,
        { method: "PUT", body: formData, credentials: "include" }
      );
      const json = await res.json();

      if (!res.ok) {
        toast({ title: "Error", description: json.message || "Failed to update course.", variant: "destructive" });
        return;
      }
      toast({ title: "Course updated", description: "Your course has been updated successfully." });
      router.push("/dashboard/serviceprovider/lms/mycourses");
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Unable to update course.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const thumbnailDisplayUrl = previewUrl || (existingThumbnailUrl && !form.thumbnailFile ? existingThumbnailUrl : "");

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <Toaster />
      <div className="mx-auto bg-white dark:bg-gray-900 p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/dashboard/serviceprovider/lms/mycourses"
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-green-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back to My Courses
          </Link>
          <h1 className="text-xl font-semibold">Modify Course</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-6">
            <h2 className="text-lg font-semibold border-b pb-2">Basic Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                title="Course Title"
                type="text"
                name="title"
                value={form.title}
                height="py-2"
                paddingRight="pr-2"
                roundness="rounded-md"
                labelStyle="text-black font-semibold dark:text-white/70"
                onChange={handleInputChange}
                placeholder="e.g. Learn Basics of Stock Market"
              />
              <Input
                title="Subtitle"
                type="text"
                name="subtitle"
                value={form.subtitle}
                height="py-2"
                paddingRight="pr-2"
                roundness="rounded-md"
                labelStyle="text-black font-semibold dark:text-white/70"
                onChange={handleInputChange}
                placeholder="Short subtitle"
              />
              <Input
                title="Segment"
                type="text"
                name="segment"
                value={form.segment}
                height="py-2"
                paddingRight="pr-2"
                roundness="rounded-md"
                labelStyle="text-black font-semibold dark:text-white/70"
                onChange={handleInputChange}
                placeholder="e.g. Equity Cash, Options Buying"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleInputChange}
                className="w-full border rounded-md p-3 dark:bg-gray-800 min-h-[120px]"
                placeholder="What will students learn?"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                <select name="language" value={form.language} onChange={handleInputChange} className="w-full border rounded-md p-2.5 dark:bg-gray-800">
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Level</label>
                <select name="level" value={form.level} onChange={handleInputChange} className="w-full border rounded-md p-2.5 dark:bg-gray-800">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    name="price"
                    value={form.price === 0 ? "" : form.price}
                    onChange={handleInputChange}
                    className="w-full border rounded-md p-2.5 pl-8 dark:bg-gray-800"
                    min={0}
                    placeholder="2499"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-lg font-semibold border-b pb-2">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Key Features</label>
                <MultiSelectKeyFeatures onChange={setKeyFeatures} initialFeatures={keyFeatures} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bonus Features</label>
                <MultiSelectBonusFeatures onChange={setBonusFeatures} initialFeatures={bonusFeatures} />
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-lg font-semibold border-b pb-2">Marketplaces</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Share with Marketplaces</label>
              <MarketPlaceSelect onChange={setShareWithMarketplaces} initialValues={shareWithMarketplaces} />
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-lg font-semibold border-b pb-2">Thumbnail</h2>
            <div className="space-y-2">
              {thumbnailDisplayUrl ? (
                <div className="space-y-2">
                  <Image
                    src={thumbnailDisplayUrl}
                    alt="Thumbnail"
                    width={800}
                    height={450}
                    className="w-full max-h-64 object-cover rounded-md"
                    unoptimized
                  />
                  <label className="inline-block text-sm text-green-600 hover:underline cursor-pointer">
                    Change thumbnail
                    <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                  </label>
                </div>
              ) : (
                <label htmlFor="thumbnail" className="block border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-green-500">
                  <span className="text-sm text-gray-500">Click to upload thumbnail (PNG, JPG, 5MB)</span>
                  <input id="thumbnail" type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                </label>
              )}
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <Link
              href="/dashboard/serviceprovider/lms/mycourses"
              className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-md ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {loading ? "Updating..." : "Update Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
