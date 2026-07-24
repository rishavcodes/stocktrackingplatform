"use client";

import React, {
    useEffect,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, UploadCloud, FileText, Presentation, FileSpreadsheet, X, PlayCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components";

type ResourceAttachment = { key: string; url: string; type: string; name: string };

type LectureForm = {
    _id?: string;
    tempId: string;
    title: string;
    duration: number; // minutes (MVP)
    isPreviewFree: boolean;
    videoKey?: string | null; // Spaces object key
    videoUrl?: string | null; // public CDN url (if available)
    resourceAttachments?: ResourceAttachment[]; // PDF, PPT, Excel
};

type SectionForm = {
    _id?: string;
    tempId: string;
    title: string;
    order: number;
    lectures: LectureForm[];
};

export default function CurriculumPage() {
    const { courseId } = useParams() as { courseId: string };
    const router = useRouter();
    const { data: session } = useSession();
    const { toast } = useToast();

    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [publishing, setPublishing] = useState<boolean>(false);
    const [sections, setSections] = useState<SectionForm[]>([]);
    const [courseTitle, setCourseTitle] = useState<string>("");

    // upload state: map lectureTempId -> progress (0..100) or "idle" | "uploading" | "done" | "error"
    const [uploadState, setUploadState] = useState<Record<string, { status: string; progress: number }>>({});

    // preview state: when provider clicks Preview, show iframe with signed URL
    const [previewForLectureTempId, setPreviewForLectureTempId] = useState<string | null>(null);
    const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
    const [previewLoadingLectureTempId, setPreviewLoadingLectureTempId] = useState<string | null>(null);

    const createTempId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    useEffect(() => {
        if (!courseId) return;

        const fetchCurriculum = async () => {
            setLoading(true);
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/courses/${courseId}/getcurriculum`,
                    { credentials: "include" }
                );
                const json = await res.json();

                if (!res.ok) {
                    toast({
                        title: "Error loading curriculum",
                        description: json.message || "Could not load curriculum.",
                        variant: "destructive",
                    });
                    return;
                }

                // Backend returns { data: { courseId, sections: [...] } } or similar
                const payload = json.data ?? json;
                setCourseTitle(payload.course?.title ?? "");
                const mapped: SectionForm[] = (payload.sections || []).map((s: any, sIdx: number) => ({
                    _id: s._id,
                    tempId: createTempId(),
                    title: s.title,
                    order: s.order ?? sIdx,
                    lectures: (s.lectures || []).map((l: any, lIdx: number) => ({
                        _id: l._id,
                        tempId: createTempId(),
                        title: l.title,
                        duration: l.duration ?? 0,
                        isPreviewFree: !!l.isPreviewFree,
                        videoKey: l.videoKey ?? null,
                        videoUrl: l.videoUrl ?? null,
                        resourceAttachments: Array.isArray(l.resourceAttachments) ? l.resourceAttachments : [],
                    })),
                }));

                setSections(mapped);
            } catch (err) {
                console.error(err);
                toast({
                    title: "Error",
                    description: "Something went wrong while loading curriculum.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchCurriculum();
    }, [courseId, toast]);

    // Section handlers
    function addSection() {
        setSections((prev) => [
            ...prev,
            {
                tempId: createTempId(),
                title: "",
                order: prev.length,
                lectures: [],
            },
        ]);
    }

    function updateSectionTitle(tempId: string, value: string) {
        setSections((prev) => prev.map((s) => (s.tempId === tempId ? { ...s, title: value } : s)));
    }

    function removeSection(tempId: string) {
        setSections((prev) => prev.filter((s) => s.tempId !== tempId).map((s, i) => ({ ...s, order: i })));
    }

    function moveSection(index: number, direction: "up" | "down") {
        setSections((prev) => {
            const arr = [...prev];
            const target = direction === "up" ? index - 1 : index + 1;
            if (target < 0 || target >= arr.length) return prev;
            [arr[index], arr[target]] = [arr[target], arr[index]];
            return arr.map((s, i) => ({ ...s, order: i }));
        });
    }

    // Lecture handlers
    function addLecture(sectionTempId: string) {
        setSections((prev) =>
            prev.map((s) =>
                s.tempId === sectionTempId
                    ? { ...s, lectures: [...s.lectures, { tempId: createTempId(), title: "", duration: 0, isPreviewFree: false, resourceAttachments: [] }] }
                    : s
            )
        );
    }

    function updateLectureField(sectionTempId: string, lectureTempId: string, field: keyof LectureForm, value: any) {
        setSections((prev) =>
            prev.map((s) =>
                s.tempId !== sectionTempId
                    ? s
                    : { ...s, lectures: s.lectures.map((l) => (l.tempId === lectureTempId ? { ...l, [field]: value } : l)) }
            )
        );
    }

    function removeLecture(sectionTempId: string, lectureTempId: string) {
        setSections((prev) =>
            prev.map((s) =>
                s.tempId === sectionTempId ? { ...s, lectures: s.lectures.filter((l) => l.tempId !== lectureTempId) } : s
            )
        );
    }

    function moveLecture(sectionTempId: string, index: number, direction: "up" | "down") {
        setSections((prev) =>
            prev.map((s) => {
                if (s.tempId !== sectionTempId) return s;
                const arr = [...s.lectures];
                const target = direction === "up" ? index - 1 : index + 1;
                if (target < 0 || target >= arr.length) return s;
                [arr[index], arr[target]] = [arr[target], arr[index]];
                return { ...s, lectures: arr };
            })
        );
    }

    // Save curriculum (PUT)
    const saveCurriculum = async () => {
        setSaving(true);
        try {
            // Build payload in shape backend expects: sections: [{ _id?, title, order, lectures: [{ _id?, title, order, duration, isPreviewFree, videoKey, videoUrl }] }]
            const payload = {
                sections: sections.map((s, si) => ({
                    _id: s._id,
                    title: s.title,
                    order: si,
                    lectures: s.lectures.map((l, li) => ({
                        _id: l._id,
                        title: l.title,
                        order: li,
                        duration: l.duration,
                        isPreviewFree: l.isPreviewFree,
                        videoKey: l.videoKey,
                        videoUrl: l.videoUrl,
                        resourceAttachments: l.resourceAttachments ?? [],
                    })),
                })),
            };

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/courses/${courseId}/upsertcurriculum`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(payload),
                }
            );

            const json = await res.json();
            if (!res.ok) {
                console.error(json);
                toast({ title: "Error", description: json.message || "Failed to save curriculum", variant: "destructive" });
                return;
            }

            toast({ title: "Saved", description: "Curriculum saved successfully." });
            // Optionally refresh from server to pick up any DB-generated IDs
            // or keep optimistic update (we already updated local state)
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Unable to save curriculum", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    // Get video duration in seconds from file (uses HTML5 video metadata)
    function getVideoDurationSeconds(file: File): Promise<number> {
        return new Promise((resolve, reject) => {
            const video = document.createElement("video");
            video.preload = "metadata";
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                resolve(video.duration);
            };
            video.onerror = () => {
                window.URL.revokeObjectURL(video.src);
                reject(new Error("Could not read video duration"));
            };
            video.src = URL.createObjectURL(file);
        });
    }

    // Presign flow + upload
    async function presignAndUploadFile(sectionTempId: string, lectureTempId: string, file: File) {
        // set upload status
        setUploadState((prev) => ({ ...prev, [lectureTempId]: { status: "uploading", progress: 0 } }));

        try {
            // 1) request presign from backend
            const presignRes = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/courses/${courseId}/lectures/presign`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ filename: file.name, contentType: file.type }),
                }
            );

            const presignJson = await presignRes.json();
            if (!presignRes.ok) {
                throw new Error(presignJson.message || "Failed to get presigned URL");
            }

            const { uploadUrl, objectKey, publicUrl } = presignJson.data;

            // 2) upload directly to DO Spaces using PUT
            // Use fetch with streaming; we can report progress using XMLHttpRequest (fetch doesn't expose progress easily).
            // We'll use XHR for progress updates.

            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("PUT", uploadUrl, true);
                xhr.setRequestHeader("Content-Type", file.type);

                xhr.upload.onprogress = function (event) {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        setUploadState((prev) => ({ ...prev, [lectureTempId]: { status: "uploading", progress: percent } }));
                    }
                };

                xhr.onload = function () {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        setUploadState((prev) => ({ ...prev, [lectureTempId]: { status: "done", progress: 100 } }));
                        resolve();
                    } else {
                        reject(new Error("Upload failed with status " + xhr.status));
                    }
                };

                xhr.onerror = function () {
                    reject(new Error("Upload failed due to network error"));
                };

                xhr.send(file);
            });

            // 3) On success, update the lecture in local state with videoKey & videoUrl
            setSections((prev) =>
                prev.map((s) =>
                    s.tempId !== sectionTempId
                        ? s
                        : {
                            ...s,
                            lectures: s.lectures.map((l) =>
                                l.tempId === lectureTempId ? { ...l, videoKey: objectKey, videoUrl: publicUrl } : l
                            ),
                        }
                )
            );

            toast({ title: "Uploaded", description: "Video uploaded successfully. Remember to save curriculum." });
        } catch (err: any) {
            console.error(err);
            setUploadState((prev) => ({ ...prev, [lectureTempId]: { status: "error", progress: 0 } }));
            toast({ title: "Upload error", description: err.message || "Upload failed", variant: "destructive" });
        }
    }

    // Handler for file input change per lecture
    const handleFileInput = async (e: ChangeEvent<HTMLInputElement>, sectionTempId: string, lectureTempId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic client-side validations
        if (!file.type.startsWith("video/")) {
            toast({ title: "Invalid file", description: "Please upload a video file.", variant: "destructive" });
            return;
        }

        // Optionally limit size (e.g., 2GB etc.)
        const maxBytes = 4 * 1024 * 1024 * 1024; // 4GB safe limit example
        if (file.size > maxBytes) {
            toast({ title: "File too large", description: "File exceeds allowed size.", variant: "destructive" });
            return;
        }

        // Auto-fill duration from video metadata (duration field is in minutes, exact)
        try {
            const durationSeconds = await getVideoDurationSeconds(file);
            const durationMinutes = Math.round((durationSeconds / 60) * 100) / 100; // 2 decimal places for exact duration
            updateLectureField(sectionTempId, lectureTempId, "duration", durationMinutes);
        } catch {
            // Non-blocking: if we can't read duration, leave field as-is
        }

        // Kick off presign+upload
        presignAndUploadFile(sectionTempId, lectureTempId, file);
        // Reset input value so same file can be picked again if needed
        (e.target as HTMLInputElement).value = "";
    };

    async function fetchPreviewUrl(lectureTempId: string, videoKey: string) {
        if (previewForLectureTempId === lectureTempId && previewVideoUrl) return;
        setPreviewLoadingLectureTempId(lectureTempId);
        setPreviewVideoUrl(null);
        setPreviewForLectureTempId(lectureTempId);
        const token = (session as any)?.backendToken ?? (session as any)?.user?.backendToken;
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/courses/${courseId}/lectures/preview?objectKey=${encodeURIComponent(videoKey)}`,
                {
                    credentials: "include",
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                }
            );
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || "Preview not available");
            const url = json.data?.url;
            if (url) setPreviewVideoUrl(url);
            else throw new Error("No URL returned");
        } catch (e: any) {
            toast({ title: "Preview failed", description: e.message || "Could not load preview", variant: "destructive" });
            setPreviewForLectureTempId(null);
        } finally {
            setPreviewLoadingLectureTempId(null);
        }
    }

    function closePreview() {
        setPreviewForLectureTempId(null);
        setPreviewVideoUrl(null);
    }

    function removeVideo(sectionTempId: string, lectureTempId: string) {
        updateLectureField(sectionTempId, lectureTempId, "videoKey", null);
        updateLectureField(sectionTempId, lectureTempId, "videoUrl", null);
        setUploadState((prev) => {
            const next = { ...prev };
            delete next[lectureTempId];
            return next;
        });
        if (previewForLectureTempId === lectureTempId) closePreview();
    }

    const ATTACHMENT_MAX_MB = 50;
    const attachmentAccept: Record<string, string> = {
        pdf: "application/pdf,.pdf",
        ppt: "application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,.ppt,.pptx",
        xlsx: "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,.xlsx",
    };
    const attachmentTypeFromMime = (mime: string): "pdf" | "ppt" | "xlsx" => {
        if (mime.includes("pdf")) return "pdf";
        if (mime.includes("presentation") || mime.includes("powerpoint") || mime.includes("ppt")) return "ppt";
        return "xlsx";
    };

    async function presignAndUploadAttachment(
        sectionTempId: string,
        lectureTempId: string,
        file: File,
        type: "pdf" | "ppt" | "xlsx"
    ) {
        const stateKey = `att-${lectureTempId}-${type}`;
        setUploadState((prev) => ({ ...prev, [stateKey]: { status: "uploading", progress: 0 } }));

        try {
            const presignRes = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/courses/${courseId}/lectures/presign`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        filename: file.name,
                        contentType: file.type,
                        kind: "attachment",
                    }),
                }
            );
            const presignJson = await presignRes.json();
            if (!presignRes.ok) throw new Error(presignJson.message || "Failed to get presigned URL");
            const { uploadUrl, objectKey, publicUrl } = presignJson.data;

            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("PUT", uploadUrl, true);
                xhr.setRequestHeader("Content-Type", file.type);
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        setUploadState((prev) => ({ ...prev, [stateKey]: { status: "uploading", progress: percent } }));
                    }
                };
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        setUploadState((prev) => ({ ...prev, [stateKey]: { status: "done", progress: 100 } }));
                        resolve();
                    } else reject(new Error("Upload failed with status " + xhr.status));
                };
                xhr.onerror = () => reject(new Error("Upload failed"));
                xhr.send(file);
            });

            const newAtt: ResourceAttachment = { key: objectKey, url: publicUrl, type, name: file.name };
            setSections((prev) =>
                prev.map((s) =>
                    s.tempId !== sectionTempId
                        ? s
                        : {
                            ...s,
                            lectures: s.lectures.map((l) =>
                                l.tempId === lectureTempId
                                    ? { ...l, resourceAttachments: [...(l.resourceAttachments ?? []), newAtt] }
                                    : l
                            ),
                        }
                )
            );
            toast({ title: "Uploaded", description: `${type.toUpperCase()} uploaded. Save curriculum to persist.` });
        } catch (err: any) {
            setUploadState((prev) => ({ ...prev, [stateKey]: { status: "error", progress: 0 } }));
            toast({ title: "Upload error", description: err.message || "Upload failed", variant: "destructive" });
        }
    }

    function handleAttachmentInput(
        e: ChangeEvent<HTMLInputElement>,
        sectionTempId: string,
        lectureTempId: string,
        type: "pdf" | "ppt" | "xlsx"
    ) {
        const file = e.target.files?.[0];
        if (!file) return;
        const detected = attachmentTypeFromMime(file.type);
        if (detected !== type) {
            toast({ title: "Invalid file", description: `Please upload a ${type.toUpperCase()} file.`, variant: "destructive" });
            return;
        }
        const maxBytes = ATTACHMENT_MAX_MB * 1024 * 1024;
        if (file.size > maxBytes) {
            toast({ title: "File too large", description: `Max ${ATTACHMENT_MAX_MB}MB per file.`, variant: "destructive" });
            return;
        }
        presignAndUploadAttachment(sectionTempId, lectureTempId, file, type);
        (e.target as HTMLInputElement).value = "";
    }

    function removeAttachment(sectionTempId: string, lectureTempId: string, index: number) {
        setSections((prev) =>
            prev.map((s) =>
                s.tempId !== sectionTempId
                    ? s
                    : {
                        ...s,
                        lectures: s.lectures.map((l) =>
                            l.tempId === lectureTempId
                                ? { ...l, resourceAttachments: (l.resourceAttachments ?? []).filter((_, i) => i !== index) }
                                : l
                        ),
                    }
            )
        );
    }

    const handleGoBack = () => {
        router.push("/dashboard/serviceprovider/lms/mycourses");
    };

    async function handlePreview(courseId: string, lectureId?: string, objectKey?: string) {
        const token = (session as any)?.backendToken ?? (session as any)?.user?.backendToken;
        try {
            const q = lectureId ? `?lectureId=${lectureId}` : `?objectKey=${encodeURIComponent(objectKey!)}`;
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/courses/${courseId}/lectures/preview${q}`, {
                method: "GET",
                credentials: "include",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.message || "Failed to fetch preview URL");
            }
            const url = json.data.url;
            // Open in new tab (or attach to video player src)
            window.open(url, "_blank");
        } catch (err: any) {
            console.error(err);
            // show toast
        }
    }

    async function handlePublishCourse() {
        setPublishing(true);

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/courses/${courseId}/publish`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                }
            );

            const json = await res.json();

            if (!res.ok) {
                toast({
                    title: "Publish failed",
                    description: json.message || "Unable to publish course.",
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "Course Published 🎉",
                description: "Your course is now live for students.",
            });

            // Redirect to My Courses page
            // router.push("/dashboard/instructor/my-courses");
        } catch (err) {
            toast({
                title: "Error",
                description: "Unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setPublishing(false);
        }
    }


    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black py-6">
            <Toaster />
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    saveCurriculum();
                }}
                className="mx-auto max-w-5xl bg-white dark:bg-gray-900 p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
            >
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">Curriculum Builder</h1>
                        {courseTitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Course: {courseTitle}</p>}
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={handleGoBack} className="text-sm text-gray-600 dark:text-gray-300 hover:underline">
                            Back to My Courses
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className={`flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-md transition-colors ${saving ? "opacity-70 cursor-not-allowed" : ""}`}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Curriculum"}
                        </button>
                        <button
                            onClick={handlePublishCourse}
                            disabled={publishing}
                            className={`px-6 py-2 rounded-md font-semibold bg-green-600 text-white hover:bg-green-700 transition ${publishing ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                        >
                            {publishing ? "Publishing..." : "Publish Course"}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2 text-sm text-gray-500">Loading curriculum...</span>
                    </div>
                ) : (
                    <>
                        {/* Sections */}
                        <div className="space-y-6 mb-8">
                            {sections.map((section, secIndex) => (
                                <div key={section.tempId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/60">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                                        <div className="flex-1">
                                            <Input
                                                title={`Section ${secIndex + 1} Title`}
                                                type="text"
                                                name={`section-title-${section.tempId}`}
                                                value={section.title}
                                                height="py-2"
                                                paddingRight="pr-2"
                                                roundness="rounded-md"
                                                labelStyle="text-black font-semibold dark:text-white/70"
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => updateSectionTitle(section.tempId, e.target.value)}
                                                placeholder="e.g. Getting Started"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2 self-start">
                                            <button type="button" onClick={() => moveSection(secIndex, "up")} className="p-2 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                                                <ArrowUp className="h-4 w-4" />
                                            </button>
                                            <button type="button" onClick={() => moveSection(secIndex, "down")} className="p-2 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                                                <ArrowDown className="h-4 w-4" />
                                            </button>
                                            <button type="button" onClick={() => removeSection(section.tempId)} className="p-2 rounded-md border border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/40 text-red-600 dark:text-red-300">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Lectures */}
                                    <div className="space-y-3">
                                        {section.lectures.map((lecture, lecIndex) => {
                                            const uState = uploadState[lecture.tempId] ?? { status: "idle", progress: 0 };
                                            const attState = (t: "pdf" | "ppt" | "xlsx") => uploadState[`att-${lecture.tempId}-${t}`] ?? { status: "idle", progress: 0 };
                                            const resources = lecture.resourceAttachments ?? [];
                                            return (
                                                <div key={lecture.tempId} className="flex flex-col gap-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-md p-3">
                                                    <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                                                        <div className="flex-1">
                                                            <Input
                                                                title={`Lecture ${lecIndex + 1} Title`}
                                                                type="text"
                                                                name={`lecture-title-${lecture.tempId}`}
                                                                value={lecture.title}
                                                                height="py-2"
                                                                paddingRight="pr-2"
                                                                roundness="rounded-md"
                                                                labelStyle="text-black font-semibold dark:text-white/70"
                                                                onChange={(e: ChangeEvent<HTMLInputElement>) => updateLectureField(section.tempId, lecture.tempId, "title", e.target.value)}
                                                                placeholder="e.g. Introduction to the course"
                                                            />
                                                        </div>

                                                        <div className="flex flex-col gap-2">
                                                            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Duration (mins)</label>
                                                            <input type="number" min={0} step={0.01} value={lecture.duration} onChange={(e) => updateLectureField(section.tempId, lecture.tempId, "duration", Number(e.target.value || 0))} className="w-24 border rounded-md p-2 text-sm dark:bg-gray-800" />
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <input id={`preview-${lecture.tempId}`} type="checkbox" checked={lecture.isPreviewFree} onChange={(e) => updateLectureField(section.tempId, lecture.tempId, "isPreviewFree", e.target.checked)} className="cursor-pointer" />
                                                            <label htmlFor={`preview-${lecture.tempId}`} className="text-xs text-gray-700 dark:text-gray-300">Free preview</label>
                                                        </div>

                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {lecture.videoKey || lecture.videoUrl ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => lecture.videoKey && fetchPreviewUrl(lecture.tempId, lecture.videoKey)}
                                                                        disabled={!!previewLoadingLectureTempId}
                                                                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                                    >
                                                                        <PlayCircle className="w-4 h-4" />
                                                                        {previewLoadingLectureTempId === lecture.tempId ? "Loading…" : "Preview"}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeVideo(section.tempId, lecture.tempId)}
                                                                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                                                                    >
                                                                        Remove or update video
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                                                                        <UploadCloud className="w-4 h-4" />
                                                                        <span>Upload Video</span>
                                                                        <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileInput(e, section.tempId, lecture.tempId)} />
                                                                    </label>
                                                                    <div className="w-28 text-xs">
                                                                        {uState.status === "uploading" && <span className="text-gray-700">Video {uState.progress}%</span>}
                                                                        {uState.status === "done" && <span className="text-green-600">Video uploaded</span>}
                                                                        {uState.status === "error" && <span className="text-red-600">Video failed</span>}
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div className="flex items-center gap-2">
                                                                <button type="button" onClick={() => moveLecture(section.tempId, lecIndex, "up")} className="p-1 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                                                                    <ArrowUp className="h-3 w-3" />
                                                                </button>
                                                                <button type="button" onClick={() => moveLecture(section.tempId, lecIndex, "down")} className="p-1 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                                                                    <ArrowDown className="h-3 w-3" />
                                                                </button>
                                                                <button type="button" onClick={() => removeLecture(section.tempId, lecture.tempId)} className="p-1 rounded-md border border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/40 text-red-600 dark:text-red-300">
                                                                    <Trash2 className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {previewForLectureTempId === lecture.tempId && previewVideoUrl && (
                                                        <div className="mt-2 rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                            <div className="flex items-center justify-between px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs">
                                                                <span className="text-gray-600 dark:text-gray-400">Video preview</span>
                                                                <button type="button" onClick={closePreview} className="text-gray-600 dark:text-gray-400 hover:underline">Close preview</button>
                                                            </div>
                                                            <iframe
                                                                src={previewVideoUrl}
                                                                title="Video preview"
                                                                className="w-full aspect-video bg-black"
                                                                allow="fullscreen"
                                                                allowFullScreen
                                                            />
                                                        </div>
                                                    )}

                                                    {/* PDF, PPT, Excel uploads */}
                                                    <div className="flex flex-wrap items-center gap-2 pl-0 md:pl-4 border-t border-gray-200 dark:border-gray-700 pt-2">
                                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">Resources:</span>
                                                        <label className="inline-flex items-center gap-1.5 cursor-pointer px-2.5 py-1 text-xs rounded-md border border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                                                            <FileText className="w-3.5 h-3.5" />
                                                            <span>PDF</span>
                                                            <input type="file" accept={attachmentAccept.pdf} className="hidden" onChange={(e) => handleAttachmentInput(e, section.tempId, lecture.tempId, "pdf")} />
                                                        </label>
                                                        {attState("pdf").status === "uploading" && <span className="text-xs text-gray-600">{attState("pdf").progress}%</span>}
                                                        <label className="inline-flex items-center gap-1.5 cursor-pointer px-2.5 py-1 text-xs rounded-md border border-orange-200 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/30 text-orange-800 dark:text-orange-200">
                                                            <Presentation className="w-3.5 h-3.5" />
                                                            <span>PPT</span>
                                                            <input type="file" accept={attachmentAccept.ppt} className="hidden" onChange={(e) => handleAttachmentInput(e, section.tempId, lecture.tempId, "ppt")} />
                                                        </label>
                                                        {attState("ppt").status === "uploading" && <span className="text-xs text-gray-600">{attState("ppt").progress}%</span>}
                                                        <label className="inline-flex items-center gap-1.5 cursor-pointer px-2.5 py-1 text-xs rounded-md border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200">
                                                            <FileSpreadsheet className="w-3.5 h-3.5" />
                                                            <span>Excel</span>
                                                            <input type="file" accept={attachmentAccept.xlsx} className="hidden" onChange={(e) => handleAttachmentInput(e, section.tempId, lecture.tempId, "xlsx")} />
                                                        </label>
                                                        {attState("xlsx").status === "uploading" && <span className="text-xs text-gray-600">{attState("xlsx").progress}%</span>}
                                                        {resources.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5 ml-2">
                                                                {resources.map((r, idx) => (
                                                                    <span key={r.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                                                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 truncate max-w-[120px]" title={r.name}>{r.name}</a>
                                                                        <button type="button" onClick={() => removeAttachment(section.tempId, lecture.tempId, idx)} className="text-red-500 hover:text-red-700 p-0.5" aria-label="Remove">
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <button type="button" onClick={() => addLecture(section.tempId)} className="mt-2 inline-flex items-center gap-1 text-sm text-green-700 dark:text-green-400 hover:underline">
                                            <Plus className="h-4 w-4" /> Add Lecture
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <button type="button" onClick={addSection} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-dashed border-gray-400 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <Plus className="h-4 w-4" /> Add Section
                            </button>
                        </div>

                        {/* Save */}
                        <div className="flex justify-end mt-6">
                            <button type="submit" disabled={saving} className={`flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-md transition-colors ${saving ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}>
                                {saving ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Curriculum"
                                )}
                            </button>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
}
