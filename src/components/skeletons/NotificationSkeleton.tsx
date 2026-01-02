import { Skeleton } from "@/components/ui/skeleton";

export const NotificationSkeleton = () => {
  return (
    // Matches NotificationCard: rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border/50
    <div 
      className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border/50"
      style={{
        // Containment prevents CLS propagation during hydration
        contain: 'layout style',
        transform: 'translateZ(0)',
      }}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Icon container - matches w-8 h-8 sm:w-10 sm:h-10 */}
        <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0" />
        
        <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5">
          {/* Title - matches text-xs sm:text-sm */}
          <Skeleton className="h-4 sm:h-5 w-3/4" />
          {/* Message - matches text-[10px] sm:text-xs */}
          <Skeleton className="h-3 sm:h-4 w-full" />
          
          {/* Venue and distance row */}
          <div className="flex items-center gap-2 sm:gap-3 pt-0.5">
            <Skeleton className="h-3 sm:h-4 w-24" />
            <Skeleton className="h-3 sm:h-4 w-12" />
          </div>
        </div>
        
        {/* Timestamp - matches text-[10px] sm:text-xs */}
        <Skeleton className="h-3 sm:h-4 w-10 flex-shrink-0" />
      </div>
    </div>
  );
};

export const NotificationListSkeleton = ({ count = 5 }: { count?: number }) => {
  return (
    <div className="space-y-2 sm:space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <NotificationSkeleton key={i} />
      ))}
    </div>
  );
};
