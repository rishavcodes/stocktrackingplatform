"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Toaster } from "@/components/ui/toaster";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import Image from "next/image";

interface CourseType {
  _id: string;
  title: string;
  subtitle?: string;
  description: string;
  thumbnailUrl: string;
  price: number;
  currency: string;
  language: "en" | "hi" | "other";
  level: "beginner" | "intermediate" | "advanced";
  segment?: string;
  keyFeatures: string[];
  bonusFeatures: string[];
  status: "draft" | "published";
  instructorSnapshot: {
    name: string;
    email: string;
    profileUrl?: string;
  };
  createdAt: string;
}

export default function Coursespage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");

  useEffect(() => {
    const getId = async () => {
      const { id } = await params;
      setId(id);
    };
    getId();
  }, [params]);

  const { data, isLoading, error } = useSWR<{
    data: CourseType[];
  }>(
    id ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/allcourses?id=${id}` : null,
    fetcher
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return { text: 'Published', class: 'bg-green-100 text-green-800 border border-green-200' };
      case 'draft':
        return { text: 'Draft', class: 'bg-yellow-100 text-yellow-800 border border-yellow-200' };
      default:
        return { text: status, class: 'bg-gray-100 text-gray-800 border border-gray-200' };
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'beginner':
        return { text: 'Beginner', class: 'bg-blue-50 text-blue-700 border border-blue-100' };
      case 'intermediate':
        return { text: 'Intermediate', class: 'bg-purple-50 text-purple-700 border border-purple-100' };
      case 'advanced':
        return { text: 'Advanced', class: 'bg-red-50 text-red-700 border border-red-100' };
      default:
        return { text: level, class: 'bg-gray-50 text-gray-700 border border-gray-100' };
    }
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'en': return 'English';
      case 'hi': return 'Hindi';
      case 'other': return 'Other';
      default: return lang.toUpperCase();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Link
          href={`/dashboard/admin/serviceprovider/${id}`}
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Provider
        </Link>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading courses...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Link
          href={`/dashboard/admin/serviceprovider/${id}`}
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Provider
        </Link>
        <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Error loading courses</span>
          </div>
          <p className="mt-2 text-sm">Please try again later.</p>
        </div>
      </div>
    );
  }

  const courses = data?.data || [];

  return (
    <div className="p-6">
      <Toaster />
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link
            href={`/dashboard/admin/serviceprovider/${id}`}
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-lg transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Provider
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Courses</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {courses.length} course{courses.length !== 1 ? 's' : ''} found
          </p>
        </div>
        
        {courses.length > 0 && (
          <div className="flex items-center gap-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {courses.filter(c => c.status === 'published').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Published</div>
            </div>
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {courses.filter(c => c.status === 'draft').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Draft</div>
            </div>
          </div>
        )}
      </div>

      {/* Courses Grid */}
      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const statusBadge = getStatusBadge(course.status);
            const levelBadge = getLevelBadge(course.level);
            
            return (
              <div
                key={course._id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
              >
                {/* Thumbnail with Status */}
                <div className="relative h-48">
                  <Image
                    src={course.thumbnailUrl}
                    alt={course.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute top-3 right-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge.class}`}>
                      {statusBadge.text}
                    </span>
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${levelBadge.class}`}>
                      {levelBadge.text}
                    </span>
                  </div>
                </div>

                {/* Course Content */}
                <div className="p-5">
                  {/* Title and Price */}
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white line-clamp-2 flex-1 pr-2">
                      {course.title}
                    </h3>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      ₹{course.price.toLocaleString()}
                    </div>
                  </div>

                  {/* Subtitle */}
                  {course.subtitle && (
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                      {course.subtitle}
                    </p>
                  )}

                  {/* Description */}
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 line-clamp-3">
                    {course.description}
                  </p>

                  {/* Language and Date */}
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                      {getLanguageLabel(course.language)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(course.createdAt)}
                    </span>
                  </div>

                  {/* Features Preview */}
                  {(course.keyFeatures.length > 0 || course.bonusFeatures.length > 0) && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {course.keyFeatures.slice(0, 2).map((feature, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-3 py-1 rounded-full"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            {feature}
                          </span>
                        ))}
                        {course.bonusFeatures.slice(0, 1).map((feature, index) => (
                          <span
                            key={`bonus-${index}`}
                            className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs px-3 py-1 rounded-full"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            {feature}
                          </span>
                        ))}
                        {(course.keyFeatures.length > 2 || course.bonusFeatures.length > 1) && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
                            +{Math.max(0, course.keyFeatures.length - 2) + Math.max(0, course.bonusFeatures.length - 1)} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Segment */}
                  {course.segment && (
                    <div className="mb-4">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Segment:</span>
                      <span className="text-xs ml-2 text-gray-700 dark:text-gray-300">{course.segment}</span>
                    </div>
                  )}

                  {/* Instructor */}
                  {course.instructorSnapshot && (
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                      {course.instructorSnapshot.profileUrl ? (
                        <div className="relative w-10 h-10">
                          <Image
                            src={course.instructorSnapshot.profileUrl}
                            alt={course.instructorSnapshot.name}
                            fill
                            className="rounded-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-300 font-semibold text-sm">
                            {course.instructorSnapshot.name?.charAt(0) || 'I'}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                          {course.instructorSnapshot.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {course.instructorSnapshot.email}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <div className="text-blue-400 dark:text-blue-300 mb-4">
            <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-3">
            No Courses Available
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
            This service provider hasn&apos;t created any courses yet. Courses will appear here once they&apos;re created.
          </p>
          <div className="text-gray-400 text-sm">
            <svg className="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Check back later
          </div>
        </div>
      )}
    </div>
  );
}