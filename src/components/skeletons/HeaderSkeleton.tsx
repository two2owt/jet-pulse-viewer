import { Skeleton } from "@/components/ui/skeleton";

export const HeaderSkeleton = () => {
  return (
    <header 
      className="bg-card/98 backdrop-blur-xl border-b border-border/50 sticky top-0 z-[60] header-contained"
      role="banner"
      style={{
        paddingTop: 'var(--safe-area-inset-top)',
        // FIXED dimensions - must match Header.tsx exactly
        height: 'var(--header-total-height)',
        minHeight: 'var(--header-total-height)',
        maxHeight: 'var(--header-total-height)',
        flexShrink: 0,
        // Containment prevents CLS propagation during hydration
        contain: 'strict',
        transform: 'translateZ(0)',
        overflow: 'hidden',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-4 md:px-5 lg:px-6 h-full flex items-center">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 w-full">
          {/* Logo skeleton - MUST match Header logo dimensions */}
          <div 
            className="flex items-center flex-shrink-0"
            style={{
              minWidth: '36px',
              height: '24px',
            }}
          >
            <Skeleton className="w-9 h-5 sm:w-10 sm:h-6 md:w-12 md:h-7 rounded-md" />
          </div>
          
          {/* Search bar skeleton - MUST match Header search dimensions */}
          <div 
            className="flex-shrink-0"
            style={{
              width: 'clamp(100px, 20vw, 280px)',
              minWidth: '100px',
            }}
          >
            <Skeleton className="w-full h-8 sm:h-9 md:h-10 rounded-full" />
          </div>
          
          {/* Sync status skeleton - flexible width */}
          <div className="flex-1 min-w-0 px-1 sm:px-2 md:px-3 flex items-center gap-1.5">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-3 w-16 sm:w-20 rounded" />
          </div>
          
          {/* Avatar skeleton - MUST match Header avatar dimensions */}
          <div 
            className="flex-shrink-0"
            style={{
              width: 'clamp(32px, 8vw, 44px)',
              height: 'clamp(32px, 8vw, 44px)',
            }}
          >
            <Skeleton className="w-full h-full rounded-full" />
          </div>
        </div>
      </div>
    </header>
  );
};
