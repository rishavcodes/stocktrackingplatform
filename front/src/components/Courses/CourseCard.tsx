"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence } from "framer-motion";
import { Trash2, Edit3, Eye, Pencil } from "lucide-react";

import { CourseListItem } from "@/app/dashboard/serviceprovider/lms/mycourses/page";
import ShareIcon from "@/icons/ShareIcon";
import { ShareCard } from "@/components";
import { useToast } from "@/components/ui/use-toast";
import { buildProductUrl } from "@/lib/customDomain";

type ToastOptions = {
    title: string;
    description: string;
    variant: "default" | "destructive" | null | undefined;
};

type CoursesCardProps = {
    courses: CourseListItem[];
    gridLayout: string;
    setCourses: React.Dispatch<React.SetStateAction<CourseListItem[]>>;
    showToast: (options: ToastOptions) => void;
};

export default function CoursesCard({
    courses,
    gridLayout,
    setCourses,
    showToast,
}: CoursesCardProps) {
    const { toast } = useToast();

    const hostname =
        typeof window !== "undefined" && window.location.hostname
            ? window.location.hostname
            : "";

    const [isVisible, setIsVisible] = useState<string>("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

    const openDeleteModal = (courseId: string) => {
        setCourseToDelete(courseId);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setCourseToDelete(null);
    };

    const handleDeleteCourse = async () => {
        if (!courseToDelete) return;

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/courses/delete/${courseToDelete}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to delete course");
            }

            setCourses((prev) =>
                prev.filter((course) => course._id !== courseToDelete),
            );

            toast({
                title: "Success",
                description: "Course deleted successfully",
                variant: "default",
            });
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Error",
                description: err.message || "Failed to delete course",
                variant: "destructive",
            });
        } finally {
            closeDeleteModal();
        }
    };

    return (
        <div className="space-y-4">
            <div className={`md:p-5 p-3 grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-5 gap-y-8 ${showDeleteModal ? "blur-sm" : ""}`}>
                {courses.map((course) => (
                    <div key={course._id} className="">
                        <div
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                        >
                            <div className="flex flex-wrap items-center flex-row p-2">
                                {/* Thumbnail */}
                                {course.thumbnailUrl && (
                                    <div className="relative h-40 w-64 object-cover">
                                        <Image
                                            src={course.thumbnailUrl}
                                            alt={course.title}
                                            fill
                                            className="object-cover rounded-md"
                                        />
                                    </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 flex flex-col p-4 gap-3">
                                    {/* Title / subtitle */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
                                            {course.title}
                                        </h3>
                                        {course.subtitle && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                                {course.subtitle}
                                            </p>
                                        )}
                                    </div>


                                    {/* Status, price, createdAt */}
                                    <div className="flex items-center justify-between text-xs mt-1">
                                        <span
                                            className={`px-2 py-1 rounded-full ${course.status === "published"
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                                : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                                                }`}
                                        >
                                            {course.status.toUpperCase()}
                                        </span>
                                        <span className="text-gray-700 dark:text-gray-200 font-semibold">
                                            ₹ {course.price}
                                        </span>
                                    </div>

                                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                        Created on{" "}
                                        {new Date(course.createdAt).toLocaleDateString("en-IN", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-3 flex flex-col gap-2">
                                        <div className="flex flex-wrap gap-2">
                                            
                                            <Link
                                                href={`/dashboard/serviceprovider/lms/courses/${course._id}/curriculum`}
                                                className="flex items-center justify-center gap-1 px-3 py-2 bg-green-700 hover:bg-green-800 text-white text-xs rounded-md transition-colors"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                                Edit Curriculum
                                            </Link>
                                            <Link
                                                href={`/dashboard/serviceprovider/lms/editcourse/${course._id}`}
                                                className="flex items-center justify-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-md transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                                Modify
                                            </Link>
                                            <Link
                                                href={buildProductUrl("courses", course._id, (course as any).instructorSnapshot)}
                                                className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs rounded-md transition-colors"
                                            >
                                                <Eye className="w-4 h-4" />
                                                View
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => openDeleteModal(course._id)}
                                                className="flex items-center justify-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete
                                            </button>
                                            <div
                                                className="relative group"
                                                onMouseEnter={() => setIsVisible(course._id)}
                                                onMouseLeave={() => setIsVisible("")}
                                            >
                                                <button className="w-full px-3 py-2 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors text-xs text-gray-800 dark:text-gray-100">
                                                    <ShareIcon className="w-4 h-4" />
                                                    Share
                                                </button>

                                                <AnimatePresence>
                                                    {course._id === isVisible && (
                                                        <div className="absolute right-0 bottom-full mb-2 z-10">
                                                            <ShareCard
                                                                title={`${course.title} - `}
                                                                separator="Check out this course at:"
                                                                url={`https://${hostname}/view/courses/${course._id}`}
                                                            />
                                                        </div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        {/* Share */}

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Delete confirmation modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                        onClick={closeDeleteModal}
                    />
                    <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Delete Course
                        </h3>
                        <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm">
                            Are you sure you want to delete this course? This action cannot be
                            undone.
                        </p>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                onClick={closeDeleteModal}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteCourse}
                                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
