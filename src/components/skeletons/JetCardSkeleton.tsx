import { Skeleton } from "@/components/ui/skeleton";

export const JetCardSkeleton = () => {
  return (
    <div className="bg-card rounded-xl sm:rounded-2xl overflow-hidden border border-border shadow-[var(--shadow-card)]">
      {/* Image Header Skeleton */}
      <div className="relative h-40 sm:h-48 md:h-56 bg-gradient-to-br from-muted via-muted/50 to-muted overflow-hidden">
        <Skeleton className="absolute inset-0 w-full h-full" />
        
        {/* Activity Badge Skeleton */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        {/* Category Badge Skeleton */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
      </div>

      {/* Content Skeleton */}
      <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
        {/* Title Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-7 w-3/4" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-3 w-48 ml-6" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-muted/50 rounded-lg sm:rounded-xl p-2 sm:p-3 flex flex-col items-center gap-1">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>

        {/* Current Offer Skeleton */}
        <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </div>

        {/* Action Buttons Skeleton */}
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      </div>
    </div>
  );
};
