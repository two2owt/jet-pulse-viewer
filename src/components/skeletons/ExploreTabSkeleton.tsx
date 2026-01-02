import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const ExploreTabSkeleton = () => {
  return (
    <div 
      className="space-y-6 animate-pulse"
      style={{
        // Containment prevents CLS propagation during hydration
        contain: 'layout style',
        transform: 'translateZ(0)',
      }}
    >
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>

      {/* Search */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* Category filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-full" />
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 text-center">
            <Skeleton className="w-6 h-6 mx-auto mb-2 rounded" />
            <Skeleton className="h-8 w-8 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </Card>
        ))}
      </div>

      {/* Deal cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden bg-card/90">
            <div className="flex gap-4 p-4">
              <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
