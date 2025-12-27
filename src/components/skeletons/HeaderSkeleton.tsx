import { Skeleton } from "@/components/ui/skeleton";

export const HeaderSkeleton = () => {
  return (
    <header 
      className="bg-card/98 backdrop-blur-xl border-b border-border/50 sticky top-0 z-[60]"
      style={{
        paddingTop: 'var(--safe-area-inset-top)',
        height: 'var(--header-total-height)',
        minHeight: 'var(--header-total-height)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-4 md:px-5 lg:px-6 h-full flex items-center">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 w-full">
          {/* Logo skeleton */}
          <Skeleton className="h-6 sm:h-7 md:h-8 w-12 sm:w-14 md:w-16 rounded-md flex-shrink-0" />
          
          {/* Search bar skeleton */}
          <Skeleton className="h-8 sm:h-9 md:h-10 w-[100px] sm:w-[140px] md:w-[180px] lg:w-[220px] xl:w-[280px] rounded-full flex-shrink-0" />
          
          {/* Sync status skeleton */}
          <div className="flex-1 min-w-0 px-1 sm:px-2 md:px-3 flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-3 w-16 sm:w-20 md:w-24 rounded" />
          </div>
          
          {/* Avatar skeleton */}
          <Skeleton className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full flex-shrink-0" />
        </div>
      </div>
    </header>
  );
};
