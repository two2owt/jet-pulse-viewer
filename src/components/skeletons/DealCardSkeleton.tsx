import { Skeleton } from "@/components/ui/skeleton";

export const DealCardSkeleton = () => {
  return (
    <div className="bg-card/90 backdrop-blur-xl rounded-xl p-4 border border-border space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" delay={0} />
          <Skeleton className="h-4 w-full" delay={75} />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" delay={150} />
      </div>
      
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" delay={225} />
          <Skeleton className="h-3 w-32" delay={300} />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" delay={375} />
      </div>
    </div>
  );
};
