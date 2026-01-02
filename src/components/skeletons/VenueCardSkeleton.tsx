import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const VenueCardSkeleton = () => {
  return (
    <Card 
      className="overflow-hidden bg-card/90 backdrop-blur-sm"
      style={{
        // Containment prevents CLS propagation during hydration
        contain: 'layout style',
        transform: 'translateZ(0)',
      }}
    >
      <div className="flex gap-4 p-4">
        {/* Image placeholder */}
        <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
        
        {/* Content */}
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </Card>
  );
};

export const VenueListSkeleton = ({ count = 5 }: { count?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <VenueCardSkeleton key={i} />
      ))}
    </div>
  );
};
