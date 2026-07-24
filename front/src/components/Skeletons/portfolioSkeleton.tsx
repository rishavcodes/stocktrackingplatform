import { Skeleton } from "../ui/skeleton";

export default function PortfolioSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300">
      {/* Banner Image */}
      <Skeleton className="w-full h-40" />
      
      <div className="p-4 space-y-3">
        {/* Portfolio Name and Risk Level */}
        <div className="flex justify-between items-start">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-8 rounded-full" />
        </div>

        {/* Theme and Methodology */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />

        {/* Benchmark and Investment Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="flex justify-between items-center py-2">
          <div className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>

        {/* Fees and Minimum Investment */}
        <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-800 pt-3">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        {/* Author Info and CTA */}
        <div className="flex justify-between items-center pt-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}