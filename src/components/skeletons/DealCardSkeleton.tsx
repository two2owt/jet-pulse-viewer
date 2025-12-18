import { Skeleton } from "@/components/ui/skeleton";

export const DealCardSkeleton = () => {
  return (
    <div className="bg-card rounded-xl sm:rounded-2xl overflow-hidden border border-border shadow-[var(--shadow-card)]">
      {/* Image Header - matches h-40 sm:h-48 md:h-56 */}
      <div className="relative h-40 sm:h-48 md:h-56 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20">
        {/* Favorite button skeleton */}
        <Skeleton className="absolute top-2 right-2 sm:top-3 sm:right-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
        {/* Deal type badge skeleton */}
        <Skeleton className="absolute top-2 left-2 sm:top-3 sm:left-3 h-6 w-16 sm:h-7 sm:w-20 rounded-full" />
      </div>

      {/* Content - matches p-4 sm:p-5 space-y-3 sm:space-y-4 */}
      <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
        {/* Title & Venue */}
        <div>
          <Skeleton className="h-7 sm:h-8 w-3/4 mb-1" />
          <div className="flex items-center gap-2">
            <Skeleton className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full" />
            <Skeleton className="h-4 sm:h-5 w-32" />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Deal Info box */}
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 rounded-xl p-4 border border-primary/20">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </div>

        {/* Action Buttons - matches grid grid-cols-2 gap-3 */}
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
};
