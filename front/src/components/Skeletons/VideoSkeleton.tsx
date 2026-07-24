import { Skeleton } from "../ui/skeleton";

type VideoSkeletonProps = { width?: string };

export default function VideoSkeleton({ width = "w-80" }: VideoSkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-black flex flex-col ${width} p-3 gap-3 rounded-xl`}
    >
      {/* Video Thumbnail */}
      <Skeleton className="w-full aspect-video rounded-xl" />
      
      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton key={i} className="h-4 w-12 rounded-full" />
        ))}
      </div>

      {/* Title */}
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-4 w-3/4" />

      {/* Description */}
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />

      {/* Author Info and Stats */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
    </div>
  );
}