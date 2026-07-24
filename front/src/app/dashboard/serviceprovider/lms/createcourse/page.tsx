"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

import { Input } from "@/components";
import MarketPlaceSelect from "@/components/MultiSelect/MarketPlaceSelect";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";

// ⬇️ NEW imports for features
import MultiSelectKeyFeatures from "@/components/MultiSelect/MultiSelectKeyFeatures";
import MultiSelectBonusFeatures from "@/components/MultiSelect/MultiSelectBonusFeatures";

type CourseLevel = "beginner" | "intermediate" | "advanced";
type CourseLanguage = "en" | "hi";

type CreateCourseForm = {
    title: string;
    subtitle: string;
    description: string;
    language: CourseLanguage;
    level: CourseLevel;
    price: number;
    currency: string;
    segment: string;             // ⬅️ NEW
    thumbnailFile: File | null;
};

export default function CreateCoursePage() {
    const { data: session } = useSession();
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>("");

    // main form
    const [form, setForm] = useState<CreateCourseForm>({
        title: "",
        subtitle: "",
        description: "",
        language: "en",
        level: "beginner",
        price: 0,
        currency: "INR",
        segment: "",              // ⬅️ NEW
        thumbnailFile: null,
    });

    // ⬇️ NEW: features state
    const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
    const [bonusFeatures, setBonusFeatures] = useState<string[]>([]);
    const [shareWithMarketplaces, setShareWithMarketplaces] = useState<string[]>([]);

    // ✅ Regex rules (title: allowed chars only; word count 15–20 validated separately)
    const TITLE_REGEX = /^[a-zA-Z0-9\s.,&()-]+$/;
    const TITLE_MIN_WORDS = 2;
    const TITLE_MAX_WORDS = 20;
    const SUBTITLE_REGEX = /^[a-zA-Z0-9\s.,&()-]{1,50}$/;
    const SEGMENT_REGEX = /^[a-zA-Z\s,&()-]{3,502}$/;

    // min 100 words description 
    const MIN_DESCRIPTION_WORDS = 10;

    function wordCount(text: string) {
        return text.trim().split(/\s+/).length;
    }

    // --- Handlers ---

    function handleInputChange(
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) {
        const { name, value, type } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]:
                type === "number"
                    ? value === ""
                        ? 0
                        : Number(value)
                    : value,
        }));
    }


    function handleThumbnailChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast({
                title: "Invalid file",
                description: "Thumbnail must be an image file.",
                variant: "destructive",
            });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "File too large",
                description: "Thumbnail must be less than 5MB.",
                variant: "destructive",
            });
            return;
        }

        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setForm((prev) => ({ ...prev, thumbnailFile: file }));
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        try {
            // ✅ Title validation (15–20 words, allowed chars only)
            const titleTrimmed = form.title.trim();
            const titleWords = wordCount(titleTrimmed);
            if (!TITLE_REGEX.test(titleTrimmed) || titleWords < TITLE_MIN_WORDS || titleWords > TITLE_MAX_WORDS) {
                toast({
                    title: "Invalid title",
                    description: "Title must be 15–20 words and contain only letters, numbers & basic symbols.",
                    variant: "destructive",
                });
                return;
            }

            // ✅ Subtitle validation (optional but recommended)
            if (form.subtitle && !SUBTITLE_REGEX.test(form.subtitle.trim())) {
                toast({
                    title: "Invalid subtitle",
                    description: "Subtitle must be 1–50 characters.",
                    variant: "destructive",
                });
                return;
            }

            // ✅ Segment validation
            if (!SEGMENT_REGEX.test(form.segment.trim())) {
                toast({
                    title: "Invalid segment",
                    description: "Segment must be 3–50 characters and contain only text.",
                    variant: "destructive",
                });
                return;
            }

            // ✅ Description min 100 words
            if (wordCount(form.description) < MIN_DESCRIPTION_WORDS) {
                toast({
                    title: "Description too short",
                    description: "Description must be at least 10 words.",
                    variant: "destructive",
                });
                return;
            }

            // ✅ Negative price check (strong)
            if (form.price < 0) {
                toast({
                    title: "Invalid price",
                    description: "Course price cannot be negative.",
                    variant: "destructive",
                });
                return;
            }

            if (!form.thumbnailFile) {
                toast({
                    title: "Thumbnail required",
                    description: "Please upload a course thumbnail image.",
                    variant: "destructive",
                });
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
                instructorId: instructor?.id,
                instructorName: instructor?.RegName ?? instructor?.name,
                instructorEmail: instructor?.email,
                instructorAvatar: instructor?.profileUrl,
            };

            const formData = new FormData();
            formData.append("data", JSON.stringify(payload));
            formData.append("thumbnail", form.thumbnailFile);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/courses/create`,
                {
                    method: "POST",
                    body: formData,
                },
            );

            const json = await res.json();

            if (!res.ok) {
                toast({
                    title: "Error creating course",
                    description:
                        json.message || "Something went wrong while creating the course.",
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "Course created 🎉",
                description: "Your course has been created successfully.",
            });

            // reset
            setForm({
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
            setPreviewUrl("");
            setKeyFeatures([]);
            setBonusFeatures([]);
            setShareWithMarketplaces([]);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Unable to create course, please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    // --- UI ---

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black">
            <Toaster />
            <form
                onSubmit={handleSubmit}
                className="mx-auto bg-white dark:bg-gray-900 p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
            >
                {/* Basic Info */}
                <section className="space-y-6 mb-8">

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
                            placeholder="A practical course to teach basics of stock market"
                        />
                        {/* ⬇️ NEW: Segment input */}
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
                            placeholder="e.g. Equity Cash, Options Buying, etc."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleInputChange}
                            className="w-full border rounded-md p-3 dark:bg-gray-800 min-h-[120px]"
                            placeholder="What will students learn? Who is this course for?"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Language
                            </label>
                            <select
                                name="language"
                                value={form.language}
                                onChange={handleInputChange}
                                className="w-full border rounded-md p-2.5 dark:bg-gray-800"
                            >
                                <option value="en">English</option>
                                <option value="hi">Hindi</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Level
                            </label>
                            <select
                                name="level"
                                value={form.level}
                                onChange={handleInputChange}
                                className="w-full border rounded-md p-2.5 dark:bg-gray-800"
                            >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Price
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                    ₹
                                </span>
                                <input
                                    type="number"
                                    name="price"
                                    value={form.price === 0 ? "" : form.price}
                                    onChange={handleInputChange}
                                    className="w-full border rounded-md p-2.5 pl-8 dark:bg-gray-800"
                                    min={0}
                                    placeholder="e.g. 2499"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ⬇️ NEW: Features Section (same idea as create service) */}
                <section className="space-y-6 mb-8">
                    <h2 className="text-xl font-semibold border-b pb-2">Features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Key Features
                            </label>
                            <MultiSelectKeyFeatures onChange={setKeyFeatures} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Bonus Features
                            </label>
                            <MultiSelectBonusFeatures onChange={setBonusFeatures} />
                        </div>
                    </div>
                </section>

                {/* Marketplaces: share course with selected marketplaces */}
                <section className="space-y-6 mb-8">
                    <h2 className="text-xl font-semibold border-b pb-2">Marketplaces</h2>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Share with Marketplaces
                        </label>
                        <MarketPlaceSelect onChange={setShareWithMarketplaces} />
                    </div>
                </section>

                {/* Thumbnail */}
                <section className="space-y-6 mb-8">
                    <h2 className="text-xl font-semibold border-b pb-2">Thumbnail</h2>
                    <div className="space-y-2">
                        {form.thumbnailFile ? (
                            <div className="space-y-2">
                                <Image
                                    src={previewUrl}
                                    alt="Course thumbnail preview"
                                    width={800}
                                    height={450}
                                    className="w-full max-h-64 object-cover rounded-md"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setForm((prev) => ({ ...prev, thumbnailFile: null }));
                                        setPreviewUrl("");
                                    }}
                                    className="text-sm text-red-500 hover:text-red-700"
                                >
                                    Remove thumbnail
                                </button>
                            </div>
                        ) : (
                            <label
                                htmlFor="thumbnail"
                                className="block space-y-2 cursor-pointer"
                            >
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Upload Course Thumbnail
                                </span>
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center hover:border-green-500 transition-colors">
                                    <p className="text-gray-500 dark:text-gray-400">
                                        Click to upload thumbnail image
                                    </p>
                                    <p className="text-sm text-gray-400 mt-1">
                                        PNG, JPG up to 5MB
                                    </p>
                                </div>
                            </label>
                        )}
                        <input
                            id="thumbnail"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleThumbnailChange}
                        />
                    </div>
                </section>

                {/* Submit */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-md transition-colors ${loading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
                            }`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Course"
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
