"use client";

import CourseCardMarketplace, {
  CourseType,
} from "@/components/Cards/CourseCardMarketplace/CourseCardMarketplace";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

async function fetchCourses(id: string): Promise<CourseType[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/allcourses?id=${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const { data } = await response.json();
      return data || [];
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    return [];
  }
}

export default function SPCoursesPage() {
  const params = useParams();
  const id = params?.id as string;
  const [courseData, setCourseData] = useState<CourseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [segmentFilter, setSegmentFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;

    const loadCourses = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchCourses(id);

        if (isMounted) {
          setCourseData(
            data.filter((c: CourseType) => c.status === "published")
          );
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load courses");
          console.error("Error loading courses:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCourses();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const segments = Array.from(
    new Set(courseData.map((c) => c.segment).filter(Boolean))
  ) as string[];

  const filtered = courseData.filter((c) => {
    if (segmentFilter !== "all") {
      if (c.segment !== segmentFilter) return false;
    }
    return true;
  });

  const clearFilters = () => setSegmentFilter("all");
  const hasActiveFilters = segmentFilter !== "all";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 animate-pulse" />
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <CardContent className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-1/2 animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-100 dark:bg-gray-600 rounded w-16 animate-pulse" />
                  <div className="h-6 bg-gray-100 dark:bg-gray-600 rounded w-20 animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#01a6b6] text-white rounded-lg hover:bg-[#018b99] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!courseData.length) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-4">📚</div>
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
            No Courses Found
          </h3>
          <p className="text-gray-500 dark:text-gray-500">
            There are no courses available at the moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Courses ({courseData.length})
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value)}
            className="h-8 px-2.5 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-[#01a6b6] focus:outline-none"
          >
            <option value="all">All segments</option>
            {segments.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2 text-xs text-gray-500 hover:text-[#01a6b6]"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Courses Grid */}
      {filtered.length === 0 ? (
        <Card className="p-12 border border-gray-200 dark:border-gray-700 text-center">
          <GraduationCap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No courses match your filters.
          </p>
          <Button
            variant="outline"
            onClick={clearFilters}
            className="border-[#01a6b6] text-[#01a6b6] hover:bg-[#01a6b6]/10"
          >
            Clear filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((course) => (
            <CourseCardMarketplace
              key={course._id}
              width="w-full"
              _id={course._id}
              title={course.title}
              subtitle={course.subtitle}
              description={course.description}
              language={course.language}
              level={course.level}
              price={course.price}
              currency={course.currency}
              segment={course.segment}
              keyFeatures={course.keyFeatures}
              bonusFeatures={course.bonusFeatures}
              thumbnailUrl={course.thumbnailUrl}
              instructorId={course.instructorId}
              instructorSnapshot={course.instructorSnapshot}
              status={course.status}
              createdAt={course.createdAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
