"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
    Loader2,
    CreditCard,
    Check,
    Users,
    Clock,
    BookOpen,
    Globe,
    Award,
    PlayCircle,
    Download,
    Smartphone,
    Trophy,
    ChevronDown,
    ChevronUp,
    BarChart,
    Infinity,
    BarChart2,
    CameraIcon,
    ClockIcon,
    Shield,
    MicIcon,
    FileCheckIcon,
    MessageCircleIcon,
    BadgeIcon,
    MedalIcon,
    MoveRightIcon,
    ChevronRight
} from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import AuthModal from "@/components/Modal/AuthModal";
import Script from "next/script";
import {
    FiCheck,
    FiClock,
    FiVideo,
    FiShield,
    FiUser,
    FiStar,
} from "react-icons/fi";
import ArrowRightIcon from "@/icons/ArrowRightIcon";
import CoursePricingSection from "@/components/Courses/CoursePricingSection";
import { SPTypes } from "@/app/service-providers/[slug]/page";
import { useEnforceSubdomainOwnership } from "@/hooks/useEnforceSubdomainOwnership";
import { useCanonicalUrl } from "@/hooks/useCanonicalUrl";

/** Extended SP details returned by /api/data/spdetails (includes AboutMe and courseStates) */
type SPDetailsWithExtras = SPTypes & {
    AboutMe?: string;
    stats?: SPTypes["stats"] & {
        courseStates?: { publishedCourses?: number; totalCourses?: number };
    };
};

export type PublicLecture = {
    _id: string;
    title: string;
    duration?: number;
    isPreviewFree?: boolean;
};

export type PublicSection = {
    _id: string;
    title: string;
    order?: number;
    lectures: PublicLecture[];
};

export type PublicCourse = {
    _id: string;
    title: string;
    subtitle?: string;
    description?: string;
    thumbnailUrl?: string;
    price: number;
    currency: string;
    level?: string;
    language?: string;
    instructor: {
        _id: string;
        name: string;
        email?: string;
        profileUrl?: string;
        about?: string;
    } | null;
    faqs?: { question: string; answer: string }[];
    sections: PublicSection[];
    disclaimer?: string;
    createdAt?: string;
    keyFeatures?: string[];
    bonusFeatures?: string[];
};

export default function CoursePublicPage() {
    const { courseId } = useParams() as { courseId: string };
    const router = useRouter();
    const { toast } = useToast();
    const { data: session } = useSession();

    const [course, setCourse] = useState<PublicCourse | null>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [showAllSections, setShowAllSections] = useState(false);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [spData, setSpData] = useState<SPDetailsWithExtras | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [previewLectureId, setPreviewLectureId] = useState<string | null>(null);

    // Extract marketplace slug from URL query params
    const marketplaceSlug = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("marketplace") || undefined
        : undefined;
    const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
    const [previewLoadingLectureId, setPreviewLoadingLectureId] = useState<string | null>(null);

    useEffect(() => {
        if (!courseId) return;
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/courses/${courseId}/public`
                );
                const json = await res.json();
                if (!res.ok) {
                    throw new Error(json.message || "Failed to load course");
                }
                setCourse(json.data);
            } catch (err: any) {
                console.error(err);
                toast({
                    title: "Error",
                    description: err.message || "Could not load course",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        })();
    }, [courseId, toast]);

    useEffect(() => {
        if (!session?.user || !courseId) return;

        async function check() {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/enrollment/check?courseId=${courseId}&userId=${session?.user.id}`
                );

                const json = await res.json();
                if (json.success) {
                    setIsEnrolled(json.enrolled);
                }
            } catch (e) {
                console.error("Enrollment check failed", e);
            }
        }

        check();
    }, [session?.user, courseId]);


    const fetchSpData = async (id: string) => {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/spdetails?id=${id}`
            );

            if (res.status === 200) {
                const response = await res.json();
                setSpData(response.data);
                // console.log("provider data", response.data)
            } else {
                setError("Failed to fetch data");
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            setError("Error fetching data");
        } finally {
            setLoading(false);
        }
    };

    async function handlePurchase() {
        if (!course) return;
        setPurchasing(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/checkout/create-session`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        courseId: course._id,
                        price: course.price,
                        currency: course.currency,
                    }),
                }
            );
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || "Failed to create checkout session");

            if (json.url) {
                window.location.href = json.url;
                return;
            }
        } catch (err: any) {
            console.error(err);
            toast({ title: "Error", description: err.message || "Purchase failed", variant: "destructive" });
        } finally {
            setPurchasing(false);
        }
    }
    // console.log(spData)

    const toggleSection = (sectionId: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(sectionId)) {
            newExpanded.delete(sectionId);
        } else {
            newExpanded.add(sectionId);
        }
        setExpandedSections(newExpanded);
    };

    const fetchPreviewUrl = async (lectureId: string) => {
        if (!courseId) return;
        if (previewLectureId === lectureId && previewVideoUrl) {
            return;
        }
        setPreviewLoadingLectureId(lectureId);
        setPreviewVideoUrl(null);
        setPreviewLectureId(lectureId);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/courses/${courseId}/lectures/${lectureId}/preview-stream`
            );
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.message || "Preview not available");
            }
            const url = json.data?.videoUrl;
            if (url) {
                setPreviewVideoUrl(url);
            } else {
                throw new Error("No video URL returned");
            }
        } catch (err: any) {
            toast({
                title: "Preview not available",
                description: err.message || "Could not load preview.",
                variant: "destructive",
            });
            setPreviewLectureId(null);
        } finally {
            setPreviewLoadingLectureId(null);
        }
    };

    const closePreview = () => {
        setPreviewLectureId(null);
        setPreviewVideoUrl(null);
    };

    // console.log(course)

    useEffect(() => {
        if (course) {
            fetchSpData(course?.instructor?._id!);
        }
    }, [course?.instructor?._id]);

    useEnforceSubdomainOwnership(course?.instructor?._id);
    useCanonicalUrl();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
                    <span className="mt-3 block text-gray-600 dark:text-gray-400">Loading course...</span>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center p-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Course not found</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">This course doesn&apos;t exist or is not published.</p>
                </div>
            </div>
        );
    }

    const totalLectures = course.sections.reduce((acc, s) => acc + (s.lectures?.length || 0), 0);
    const totalMinutes = course.sections.reduce((acc, s) => acc + s.lectures.reduce((a, l) => a + (l.duration || 0), 0), 0);
    const displaySections = showAllSections ? course.sections : course.sections.slice(0, 5);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Toaster />

            {/* Hero Section - Dark Background */}
            <div className="mt-24">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <section className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                            {/* Title + Subtitle */}
                            <div className="flex flex-col">
                                <div className="bg-blue-100 dark:bg-blue-900/30 px-4 py-1.5 rounded-xl text-blue-700 dark:text-blue-300 font-medium text-sm w-fit mb-2">
                                    {course.subtitle}
                                </div>

                                <h1 className="text-6xl font-bold text-gray-900 dark:text-white text-left">
                                    {course?.title}
                                </h1>
                            </div>
                        </div>

                        {/* <div className="border-t border-gray-200 dark:border-gray-700 mb-8"></div> */}

                        {/* Content Layout */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
                            <div className="sm:col-span-2">
                                <img
                                    src={course.thumbnailUrl}
                                    alt="Service banner"
                                    className="w-full h-auto rounded-2xl shadow-md object-cover"
                                />
                            </div>

                            <div className="sm:col-span-1">
                                <CoursePricingSection
                                    course={course}
                                    purchasing={purchasing}
                                    handlePurchase={handlePurchase}
                                    totalLectures={totalLectures}
                                    totalMinutes={totalMinutes}
                                    isEnrolled={isEnrolled}
                                    spData={spData!}
                                    marketplaceSlug={marketplaceSlug}
                                />
                            </div>
                        </div>
                    </section>

                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* What you'll learn */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">What you&apos;ll learn</h2>
                            {course.keyFeatures && course.keyFeatures.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {course.keyFeatures.map((kf, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <Check className="w-5 h-5 text-gray-900 dark:text-white flex-shrink-0 mt-0.5" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{kf}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                        "Master the fundamentals and advanced concepts",
                                        "Build real-world projects from scratch",
                                        "Understand best practices and industry standards",
                                        "Get hands-on experience with practical examples"
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <Check className="w-5 h-5 text-gray-900 dark:text-white flex-shrink-0 mt-0.5" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* This course includes */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">This course includes:</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                                    <PlayCircle className="w-5 h-5" />
                                    <span>{Math.ceil(totalMinutes / 60)} hours on-demand video</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                                    <Download className="w-5 h-5" />
                                    <span>Downloadable resources</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                                    <Infinity className="w-5 h-5" />
                                    <span>Full lifetime access</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                                    <Smartphone className="w-5 h-5" />
                                    <span>Access on mobile and TV</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                                    <Trophy className="w-5 h-5" />
                                    <span>Certificate of completion</span>
                                </div>
                            </div>
                        </div>

                        {/* Course Content */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Course content</h2>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                {course.sections.length} sections • {totalLectures} lectures • {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m total length
                            </div>

                            <div className="space-y-2">
                                {displaySections.map((section, idx) => (
                                    <div key={section._id} className="border border-gray-200 dark:border-gray-700 rounded">
                                        <button
                                            onClick={() => toggleSection(section._id)}
                                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 text-left">
                                                {expandedSections.has(section._id) ? (
                                                    <ChevronUp className="w-5 h-5 flex-shrink-0" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 flex-shrink-0" />
                                                )}
                                                <div>
                                                    <div className="font-semibold text-gray-900 dark:text-white">
                                                        {section.title}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                        {section.lectures.length} lectures • {section.lectures.reduce((a, l) => a + (l.duration || 0), 0)} min
                                                    </div>
                                                </div>
                                            </div>
                                        </button>

                                        {expandedSections.has(section._id) && (
                                            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                                                {section.lectures.map((lec) => (
                                                    <div key={lec._id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                                        <div className="flex items-center justify-between p-4 text-sm">
                                                            <div className="flex items-center gap-3 flex-wrap">
                                                                <PlayCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                                <span className="text-gray-700 dark:text-gray-300">{lec.title}</span>
                                                                {lec.isPreviewFree && (
                                                                    <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">Preview</span>
                                                                )}
                                                                {lec.isPreviewFree && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => fetchPreviewUrl(lec._id)}
                                                                        disabled={previewLoadingLectureId === lec._id}
                                                                        className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50"
                                                                    >
                                                                        {previewLoadingLectureId === lec._id ? "Loading..." : "Play preview"}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <span className="text-gray-500 dark:text-gray-400">{lec.duration || 0} min</span>
                                                        </div>
                                                        {previewLectureId === lec._id && (
                                                            <div className="px-4 pb-4">
                                                                {previewLoadingLectureId === lec._id && !previewVideoUrl && (
                                                                    <div className="text-sm text-gray-500 dark:text-gray-400 py-4">Loading preview...</div>
                                                                )}
                                                                {previewVideoUrl && previewLectureId === lec._id && (
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-xs text-gray-500 dark:text-gray-400">Free preview</span>
                                                                            <button type="button" onClick={closePreview} className="text-xs text-gray-600 dark:text-gray-400 hover:underline">Close preview</button>
                                                                        </div>
                                                                        <video
                                                                            src={previewVideoUrl}
                                                                            title={lec.title}
                                                                            controls
                                                                            controlsList="nodownload"
                                                                            className="w-full aspect-video rounded border border-gray-200 dark:border-gray-700 bg-black"
                                                                            playsInline
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {course.sections.length > 5 && (
                                <button
                                    onClick={() => setShowAllSections(!showAllSections)}
                                    className="mt-4 w-full py-3 border border-gray-300 dark:border-gray-600 rounded font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                                >
                                    {showAllSections ? 'Show less' : `Show ${course.sections.length - 5} more sections`}
                                </button>
                            )}
                        </div>

                        {/* Requirements */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Requirements</h2>
                            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                <li>• No prior experience necessary</li>
                                <li>• A computer with internet connection</li>
                                <li>• Willingness to learn and practice</li>
                            </ul>
                        </div>

                        {/* Description */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Description</h2>
                            <div
                                className="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300"
                                dangerouslySetInnerHTML={{ __html: course.description || "No description available." }}
                            />
                        </div>

                        {/* Instructor */}
                        {course.instructor && (
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Instructor</h2>
                                <div className="flex items-start gap-4">
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                                        {(spData?.profileUrl ?? course.instructor.profileUrl) ? (
                                            <Image src={spData?.profileUrl ?? course.instructor.profileUrl!} width={96} height={96} alt={spData?.RegName ?? course.instructor.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">
                                                {(spData?.RegName ?? course.instructor.name).charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                                            {spData?.RegName ?? course.instructor.name}
                                        </h3>
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                            {spData?.category ?? "Instructor"}
                                        </div>
                                        {spData?.regNumber && (
                                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                <span className="font-medium">SEBI Registration No.:</span>{" "}
                                                {String(spData.regNumber)}
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4" />
                                                <span>
                                                    {(spData?.stats?.Subscribers?.length ?? 0).toLocaleString()} Students
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <PlayCircle className="w-4 h-4" />
                                                <span>
                                                    {spData?.stats?.courseStates?.publishedCourses ?? spData?.stats?.courseStates?.totalCourses ?? 0} Courses
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* FAQ */}
                        {course.faqs && course.faqs.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Frequently Asked Questions</h2>
                                <div className="space-y-4">
                                    {course.faqs.map((faq, i) => (
                                        <div key={i}>
                                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{faq.question}</h3>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{faq.answer}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sticky Sidebar */}
                    <div className="hidden lg:block">
                        <div className="sticky top-6">
                            {/* Empty space as card is in hero on desktop */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

