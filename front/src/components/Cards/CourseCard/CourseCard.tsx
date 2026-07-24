"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";

type CourseCardProps = {
    courses: any[];
    gridLayout?: string;
    variant?: "default" | "featured";
};

export default function CourseCard({
    courses,
    gridLayout,
    variant = "default",
}: CourseCardProps) {
    const router = useRouter();
    const isFeatured = variant === "featured";

    return (
        <div className={gridLayout}>
            {courses.map((course, idx) => (
                <motion.div
                    key={course._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => router.push(`/view/learn/${course._id}`)}
                    className={
                        isFeatured
                            ? "group bg-white dark:bg-[#161616] rounded-2xl border border-gray-200/90 dark:border-gray-800 shadow-md hover:shadow-xl hover:border-indigo-300/60 dark:hover:border-indigo-800/80 transition-all duration-300 cursor-pointer overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.04]"
                            : "bg-white dark:bg-[#1E1E1E] rounded-xl shadow-md hover:shadow-xl transition cursor-pointer overflow-hidden"
                    }
                >
                    {/* Thumbnail */}
                    <div className="relative h-[160px] w-full overflow-hidden bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 dark:from-slate-800 dark:via-slate-700 dark:to-slate-900">
                        {course.thumbnailUrl ? (
                            <Image
                                src={course.thumbnailUrl}
                                alt={course.title}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                        ) : null}
                        {isFeatured && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                        )}
                        <span
                            className={
                                isFeatured
                                    ? "absolute top-3 right-3 bg-white/95 dark:bg-gray-900/90 text-gray-900 dark:text-gray-100 text-xs font-semibold px-3 py-1 rounded-full shadow-sm border border-white/20"
                                    : "absolute top-3 right-3 bg-black/70 text-white text-xs px-3 py-1 rounded-full"
                            }
                        >
                            {course.level || "Beginner"}
                        </span>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                        <h2
                            className={
                                isFeatured
                                    ? "text-lg font-semibold line-clamp-2 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                                    : "text-lg font-semibold line-clamp-2 dark:text-white"
                            }
                        >
                            {course.title}
                        </h2>

                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                            {course.description}
                        </p>

                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Instructor: {course.instructor}</span>
                            <span>{course.duration} hrs</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div
                        className={
                            isFeatured
                                ? "border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-black/20 p-4 flex items-center justify-between"
                                : "border-t dark:border-gray-700 p-4"
                        }
                    >
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">Enrolled</span>
                        {isFeatured && (
                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Continue →</span>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
