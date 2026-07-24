"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { useSession } from "next-auth/react";
import { Search } from "lucide-react";

import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import CoursesCard from "@/components/Courses/CourseCard";

export type CourseListItem = {
    _id: string;
    title: string;
    subtitle?: string;
    thumbnailUrl?: string;
    status: "draft" | "published";
    price: number;
    currency: string;
    createdAt: string;
};

export default function MyCoursesPage() {
    const { data: session } = useSession();
    const { toast } = useToast();

    const [courses, setCourses] = useState<CourseListItem[]>([]);
    const [filteredCourses, setFilteredCourses] = useState<CourseListItem[]>([]);
    const [search, setSearch] = useState<string>("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!session?.user?.id) return;

        const fetchCourses = async () => {
            setLoading(true);
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/courses/get-all-courses-by-instructorid?instructorId=${session.user.id}`,
                );
                const json = await res.json();

                if (res.ok && json.success) {
                    setCourses(json.data || []);
                    setFilteredCourses(json.data || []);
                } else {
                    console.error(json);
                    toast({
                        title: "Error",
                        description:
                            json.message || "Failed to load your courses. Please try again.",
                        variant: "destructive",
                    });
                }
            } catch (err) {
                console.error(err);
                toast({
                    title: "Error",
                    description: "Something went wrong while fetching courses.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, [session?.user?.id, toast]);

    function showToast({
        title,
        description,
        variant,
    }: {
        title: string;
        description: string;
        variant: "default" | "destructive" | null | undefined;
    }) {
        toast({ title, description, variant });
    }

    function handleSearchUpdate(event: ChangeEvent<HTMLInputElement>) {
        const searchText = event.target.value.toLowerCase();
        setSearch(searchText);

        if (!courses) return;

        if (searchText === "") {
            setFilteredCourses(courses);
            return;
        }

        const filtered = courses.filter((course) =>
            course.title.toLowerCase().includes(searchText),
        );
        setFilteredCourses(filtered);
    }

    return (
        <div className="w-full h-screen bg-white dark:bg-black flex flex-col gap-5 p-5">
            <Toaster />

            {/* Search bar */}
            <div className="bg-lightGrey dark:bg-blackShade rounded-lg flex px-4 py-2 max-w-sm items-center border border-gray-200 dark:border-gray-700">
                <input
                    placeholder="Search courses..."
                    className="flex-1 bg-transparent focus:outline-none text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
                    onChange={handleSearchUpdate}
                    value={search}
                />
                <Search className="w-4 h-4 text-gray-500" />
            </div>

            {loading && (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
            )}

            {!loading && filteredCourses.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    You haven&apos;t created any courses yet.
                </p>
            )}

            {!loading && filteredCourses.length > 0 && (
                <CoursesCard
                    courses={filteredCourses}
                    gridLayout="md:p-5 p-3 grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-5 gap-y-8"
                    setCourses={setFilteredCourses}
                    showToast={showToast}
                />
            )}
        </div>
    );
}
