import { Skeleton } from "../ui/skeleton";

type ServiceSkeletonProps = { width: string };

export default function ServiceSkeleton({ width }: ServiceSkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-black flex flex-col ${width} p-4 gap-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm`}
    >
      {/* Banner Image */}
      <Skeleton className="w-full h-40 rounded-lg" />
      
      {/* Header - Service Type, Price, and Status */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-16 rounded-full" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>

      {/* Title and Description */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>

      {/* Stats */}
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-1">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>

      {/* Author Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-6 w-20 rounded-lg" />
      </div>
    </div>
  );
}