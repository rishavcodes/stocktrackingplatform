"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import CourseCard from "@/components/Cards/CourseCard/CourseCard";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

export default function SubscribedCourses() {
    const { data: session } = useSession();
    const [search, setSearch] = useState("");
    const [level, setLevel] = useState<string>("all");
    const [instructor, setInstructor] = useState<string>("all");
    const [sort, setSort] = useState<"recent" | "title">("recent");

    const { data, isLoading } = useSWR<{ data: any[] }>(
        session?.user?.id
            ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/subscribedcourses?id=${session.user.id}`
            : null,
        fetcher
    );

    const rawCourses = data?.data ?? [];

    const levelOptions = useMemo(() => {
        const set = new Set<string>();
        rawCourses.forEach((c) => {
            if (typeof c?.level === "string" && c.level.trim()) {
                set.add(c.level.trim());
            }
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [rawCourses]);

    const instructorOptions = useMemo(() => {
        const set = new Set<string>();
        rawCourses.forEach((c) => {
            if (typeof c?.instructor === "string" && c.instructor.trim()) {
                set.add(c.instructor.trim());
            }
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [rawCourses]);

    const filteredCourses = useMemo(() => {
        const q = search.trim().toLowerCase();
        let list = rawCourses.filter((course) => {
            if (q) {
                const inTitle = String(course?.title || "")
                    .toLowerCase()
                    .includes(q);
                const inDesc = String(course?.description || "")
                    .toLowerCase()
                    .includes(q);
                if (!inTitle && !inDesc) return false;
            }
            if (level !== "all" && String(course?.level || "").trim() !== level) {
                return false;
            }
            if (
                instructor !== "all" &&
                String(course?.instructor || "").trim() !== instructor
            ) {
                return false;
            }
            return true;
        });

        if (sort === "title") {
            list = [...list].sort((a, b) =>
                String(a?.title || "").localeCompare(String(b?.title || ""), undefined, {
                    sensitivity: "base",
                })
            );
        } else {
            list = [...list].sort((a, b) => {
                const ta = new Date(String(a?.createdAt || 0)).getTime();
                const tb = new Date(String(b?.createdAt || 0)).getTime();
                return tb - ta;
            });
        }
        return list;
    }, [rawCourses, search, level, instructor, sort]);

    const hasFilters =
        search.trim() !== "" ||
        level !== "all" ||
        instructor !== "all" ||
        sort !== "recent";

    const clearFilters = () => {
        setSearch("");
        setLevel("all");
        setInstructor("all");
        setSort("recent");
    };

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
            {/* Content Card */}
            <div className="bg-white dark:bg-black rounded-xl border shadow-sm p-3 sm:p-5 md:p-6">
                {!isLoading && rawCourses.length > 0 && (
                    <div className="mb-4 md:mb-6 flex flex-col gap-3 md:gap-4">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder="Search by title or description..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        {/* <div className="flex flex-wrap gap-2 sm:gap-3 items-end">
                            <div className="min-w-[140px] flex-1 sm:flex-initial sm:w-[180px]">
                                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                    Level
                                </label>
                                <Select value={level} onValueChange={setLevel}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All levels</SelectItem>
                                        {levelOptions.map((item) => (
                                            <SelectItem key={item} value={item}>
                                                {item}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="min-w-[140px] flex-1 sm:flex-initial sm:w-[200px]">
                                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                    Expert name
                                </label>
                                <Select value={instructor} onValueChange={setInstructor}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Instructor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All instructors</SelectItem>
                                        {instructorOptions.map((item) => (
                                            <SelectItem key={item} value={item}>
                                                {item}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="min-w-[140px] flex-1 sm:flex-initial sm:w-[180px]">
                                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                    Sort
                                </label>
                                <Select
                                    value={sort}
                                    onValueChange={(v) => setSort(v as "recent" | "title")}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sort" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="recent">Newest first</SelectItem>
                                        <SelectItem value="title">Title (A-Z)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {hasFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline px-1 h-10 self-end"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div> */}

                        <p className="text-sm text-muted-foreground">
                            Showing{" "}
                            <span className="font-medium text-foreground">
                                {filteredCourses.length}
                            </span>{" "}
                            of {rawCourses.length} course
                            {rawCourses.length === 1 ? "" : "s"}
                        </p>
                    </div>
                )}

                {isLoading ? (
                    <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3 sm:gap-4 md:gap-5">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-44 sm:h-48 rounded-lg bg-muted animate-pulse"
                            />
                        ))}
                    </div>
                ) : rawCourses.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center px-4">
                        <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📚</div>
                        <h3 className="text-base sm:text-lg font-semibold">
                            No courses yet
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                            You haven&rsquo;t subscribed to any courses yet.
                            Once you enroll, they&rsquo;ll appear here.
                        </p>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center border border-dashed rounded-xl px-4">
                        <p className="text-sm text-muted-foreground mb-3">
                            No courses match your filters.
                        </p>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <CourseCard
                        courses={filteredCourses}
                        gridLayout="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3 sm:gap-4 md:gap-6"
                        variant="featured"
                    />
                )}
            </div>
        </div>
    );
}
