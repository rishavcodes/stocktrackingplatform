import { Skeleton } from "../ui/skeleton";

export default function EventSkeleton() {
  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
      {/* Image Skeleton */}
      <Skeleton className="w-full h-48 rounded-lg mb-4" />
      
      {/* Date and Time */}
      <div className="flex gap-2 mb-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      
      {/* Title */}
      <Skeleton className="h-6 w-full mb-2" />
      <Skeleton className="h-5 w-3/4 mb-3" />
      
      {/* Description */}
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-4/5 mb-3" />
      
      {/* Categories */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      
      {/* Author and Price */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
}