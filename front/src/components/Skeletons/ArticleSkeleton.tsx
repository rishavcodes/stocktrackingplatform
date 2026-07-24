import { Skeleton } from "../ui/skeleton";

type ArticleSkeletonProps = { width: string };

export default function ArticleSkeleton({ width }: ArticleSkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-black flex xs:justify-between max-xs:mx-auto flex-col ${width} p-3 gap-2 rounded-xl`}
    >
      <div className="flex flex-col">
        <Skeleton className="w-full border-none h-auto aspect-video rounded-xl">
          <Skeleton className="object-cover" />
        </Skeleton>
        <Skeleton className="h-2 w-[20%] mt-2" />

        <Skeleton className="h-4 w-full mt-2" />

        <Skeleton className="h-2 w-[20%] mt-2" />

        <Skeleton className="h-20 w-full mt-2" />
      </div>

      <div className="">
        <Skeleton className="h-5 w-[20%] mt-2" />

        <Skeleton className="h-10 w-[40%] mt-5" />

        <div className="flex flex-wrap gap-3 text-indigo dark:text-blue mt-3">
          {["equity", "commodity", "bonds", "forex"].map((tag) => (
            <Skeleton key={tag} className="h-5 w-10" />
          ))}
        </div>
      </div>
    </div>
  );
}
