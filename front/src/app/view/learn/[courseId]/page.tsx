"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    Play,
    Lock,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    FormInputIcon,
} from "lucide-react";

/* ================= TYPES ================= */

type Lecture = {
    _id: string;
    title: string;
    duration: number;
    isPreviewFree: boolean;
    resourceAttachments?: { key: string; url: string; type: string; name: string }[];
};

type Section = {
    _id: string;
    title: string;
    lectures: Lecture[];
};

type Course = {
    _id: string;
    title: string;
    sections: Section[];
};

type CourseProgressResponse = {
    completedLectureIds: string[];
    resume: {
        lectureId: string;
        seconds: number;
    } | null;
};

/* ================= COMPONENT ================= */

export default function LearnPage() {
    const { courseId } = useParams() as { courseId: string };
    const { data: session } = useSession();
    const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL!;

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const autoAdvancedRef = useRef(false);

    const [course, setCourse] = useState<Course | null>(null);
    const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [resumeTime, setResumeTime] = useState(0);
    const [completedLectures, setCompletedLectures] = useState<Set<string>>(
        new Set()
    );

    const [expandedSections, setExpandedSections] = useState<Set<string>>(
        new Set()
    );
    const [loading, setLoading] = useState(true);
    const [videoLoading, setVideoLoading] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

    /* ================= HELPERS ================= */

    async function handleDownloadResource(att: { key: string; url: string; type: string; name: string }) {
        if (!activeLecture || !courseId || downloadingKey) return;
        setDownloadingKey(att.key);
        try {
            const url = `${BACKEND}/api/v1/courses/${courseId}/lectures/${activeLecture._id}/resources/download?key=${encodeURIComponent(att.key)}`;
            const res = await fetch(url, {
                credentials: "include",
                headers: { Authorization: `Bearer ${(session as any)?.backendToken}` },
            });
            if (!res.ok) throw new Error(res.status === 403 ? "Not enrolled" : "Download failed");
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = att.name;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (e) {
            console.error(e);
        } finally {
            setDownloadingKey(null);
        }
    }

    function findLecture(course: Course, lectureId: string): Lecture | null {
        for (const section of course.sections) {
            const lecture = section.lectures.find((l) => l._id === lectureId);
            if (lecture) return lecture;
        }
        return null;
    }

    function getNextLecture(
        course: Course,
        currentLectureId: string
    ): Lecture | null {
        for (let s = 0; s < course.sections.length; s++) {
            const lectures = course.sections[s].lectures;

            for (let l = 0; l < lectures.length; l++) {
                if (lectures[l]._id === currentLectureId) {
                    if (l + 1 < lectures.length) return lectures[l + 1];
                    if (s + 1 < course.sections.length)
                        return course.sections[s + 1].lectures[0] || null;
                    return null;
                }
            }
        }
        return null;
    }

    function formatDuration(seconds: number) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    /* ================= INITIAL LOAD ================= */

    useEffect(() => {
        async function init() {
            try {
                const [courseRes, progressRes] = await Promise.all([
                    fetch(`${BACKEND}/api/v1/courses/${courseId}/learn`, {
                        credentials: "include",
                    }),
                    fetch(`${BACKEND}/api/v1/courses/${courseId}/progress`, {
                        headers: {
                            Authorization: `Bearer ${session?.backendToken}`,
                        },
                    }),
                ]);

                const courseData: Course = await courseRes.json();
                const progressData: CourseProgressResponse =
                    await progressRes.json();

                setCourse(courseData);
                setCompletedLectures(
                    new Set(progressData.completedLectureIds || [])
                );

                // expand first section
                if (courseData.sections[0]) {
                    setExpandedSections(new Set([courseData.sections[0]._id]));
                }

                // resume logic
                if (progressData.resume?.lectureId) {
                    const lecture = findLecture(
                        courseData,
                        progressData.resume.lectureId
                    );
                    if (lecture) {
                        setResumeTime(progressData.resume.seconds || 0);
                        await loadLecture(lecture);
                        return;
                    }
                }

                // fallback → first lecture
                const firstLecture = courseData.sections[0]?.lectures[0];
                if (firstLecture) await loadLecture(firstLecture);
            } catch (err) {
                console.error("Learn page init failed", err);
            } finally {
                setLoading(false);
            }
        }

        init();
    }, [courseId]);

    /* ================= LOAD LECTURE ================= */

    async function loadLecture(lecture: Lecture) {
        autoAdvancedRef.current = false;
        setActiveLecture(lecture);
        setVideoUrl(null);
        setVideoReady(false);
        setVideoLoading(true);

        try {
            const res = await fetch(
                `${BACKEND}/api/v1/lectures/${lecture._id}/stream`,
                {
                    headers: {
                        Authorization: `Bearer ${session?.backendToken}`,
                    },
                }
            );

            const data = await res.json();
            setVideoUrl(data.videoUrl);
        } catch (err) {
            console.error("Video load failed", err);
        } finally {
            setVideoLoading(false);
        }
    }

    /* ================= SAVE PROGRESS (POLLING) ================= */

    useEffect(() => {
        if (!activeLecture || !videoReady || !videoRef.current || !course)
            return;

        const interval = setInterval(async () => {
            const video = videoRef.current!;
            if (!video.duration) return;

            const watchedSeconds = Math.floor(video.currentTime);
            const duration = Math.floor(video.duration);
            const completed = watchedSeconds / duration >= 0.9;

            if (watchedSeconds < 5) return;

            try {
                await fetch(
                    `${BACKEND}/api/v1/lectures/${activeLecture._id}/progress`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${session?.backendToken}`,
                        },
                        body: JSON.stringify({
                            watchedSeconds,
                            duration,
                            completed,
                        }),
                    }
                );

                if (completed) {
                    setCompletedLectures((prev) => {
                        const next = new Set(prev);
                        next.add(activeLecture._id);
                        return next;
                    });

                    if (!autoAdvancedRef.current) {
                        autoAdvancedRef.current = true;
                        const nextLecture = getNextLecture(course, activeLecture._id);
                        if (nextLecture) {
                            setTimeout(() => loadLecture(nextLecture), 1200);
                        }
                    }
                }
            } catch (err) {
                console.error("Progress save failed", err);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [activeLecture, videoReady, course]);

    /* ================= UI ================= */

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                Loading course...
            </div>
        );
    }

    if (!course) {
        return <div className="h-screen flex items-center justify-center">Course not found</div>;
    }

    return (
        <div className="flex flex-col lg:flex-row h-screen mt-24 bg-white">
            {/* VIDEO */}
            <div className="flex-1 bg-black flex flex-col">
                <div className="flex-1 flex items-center justify-center">
                    {videoLoading ? (
                        <div className="text-white">Loading video…</div>
                    ) : videoUrl ? (
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            controls
                            controlsList="nodownload"
                            autoPlay
                            className="w-full h-full object-contain"
                            onLoadedMetadata={() => {
                                setVideoReady(true);
                                if (resumeTime && videoRef.current) {
                                    videoRef.current.currentTime = resumeTime;
                                }
                            }}
                        />
                    ) : (
                        <div className="text-gray-400">Select a lecture</div>
                    )}
                </div>

                <div className="p-4 bg-gray-900 text-white">
                    {activeLecture?.title}
                </div>

                {activeLecture?.resourceAttachments && activeLecture.resourceAttachments.length > 0 && (
                    <div className="px-4 py-3 bg-gray-800 text-white border-t border-gray-700">
                        <p className="text-sm font-semibold text-gray-300 mb-2">Resources (download only)</p>
                        <ul className="space-y-1.5">
                            {activeLecture.resourceAttachments.map((att, i) => (
                                <li key={att.key || i}>
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadResource(att)}
                                        disabled={downloadingKey === att.key}
                                        className="text-sm text-blue-300 hover:underline disabled:opacity-50 text-left"
                                    >
                                        {downloadingKey === att.key ? "Downloading…" : `Download ${att.name}`}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* SIDEBAR */}
            <div className="w-full lg:w-[420px] bg-white border-l overflow-y-auto p-4">
                <div className="rounded-md shadow-md py-2 bg-gray-100 mb-3">
                    <p className="border-b-8 border-green-500 py-1 text-2xl font-bold pl-4 rounded-l-md">Course Content</p>
                </div>
                {course.sections.map((section) => {
                    const open = expandedSections.has(section._id);
                    return (
                        <div key={section._id} className="rounded-md shadow-md py-2 bg-gray-100 mb-3">
                            <button
                                className="w-full px-4 py-3 flex justify-between"
                                onClick={() =>
                                    setExpandedSections((prev) => {
                                        const next = new Set(prev);
                                        next.has(section._id)
                                            ? next.delete(section._id)
                                            : next.add(section._id);
                                        return next;
                                    })
                                }
                            >
                                <span className="border-l-8 border-green-500 py-1 text-2xl font-bold pl-4 rounded-l-md">{section.title}</span>
                                {open ? <ChevronUp /> : <ChevronDown />}
                            </button>

                            {open &&
                                section.lectures.map((lec, li) => (
                                    <div key={lec._id} className={`mx-6 text-left px-6 py-2 flex gap-2 rounded-md my-2 text-lg ${activeLecture?._id === lec._id
                                        ? "bg-blue-500 text-white"
                                        : "bg-white"
                                                }`}>
                                        <button
                                            key={lec._id}
                                            onClick={() => loadLecture(lec)}
                                            className={`flex items-center gap-x-4 `}
                                        >
                                            {completedLectures.has(lec._id) ? (
                                                <CheckCircle className={`text-green-600 ${activeLecture?._id === lec._id
                                                    ? "text-white"
                                                    : ""
                                                }`} size={16} />
                                            ) : (
                                                <FormInputIcon className="text-gray-400" size={16} />
                                            )}
                                            <span className="w-fit">{lec.title}</span>
                                        </button>
                                    </div>
                                ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
