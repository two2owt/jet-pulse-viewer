import { Skeleton } from "@/components/ui/skeleton";

export const NotificationSkeleton = () => {
  return (
    <div className="bg-card/90 backdrop-blur-xl rounded-xl p-4 border border-border space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-4 w-12" />
      </div>
      
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
};
