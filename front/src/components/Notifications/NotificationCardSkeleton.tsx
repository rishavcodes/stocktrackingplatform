import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationCardSkeleton() {
  return (
    <Skeleton className="w-full flex justify-between p-5 bg-blueShade">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-full bg-lightGrey" />
      </div>
    </Skeleton>
  );
}
