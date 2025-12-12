import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const ExploreTabSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" delay={0} />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-40" delay={75} />
          <Skeleton className="h-6 w-24 rounded-full" delay={100} />
        </div>
      </div>

      {/* Search */}
      <Skeleton className="h-10 w-full rounded-lg" delay={150} />

      {/* Category filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" delay={200} />
          <Skeleton className="h-8 w-20" delay={225} />
        </div>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-full" delay={250 + i * 50} />
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="p-4 text-center bg-card/90 backdrop-blur-sm">
            <Skeleton className="w-6 h-6 mx-auto mb-2 rounded" delay={500 + i * 75} />
            <Skeleton className="h-8 w-8 mx-auto mb-1" delay={550 + i * 75} />
            <Skeleton className="h-3 w-16 mx-auto" delay={600 + i * 75} />
          </Card>
        ))}
      </div>

      {/* Deal cards */}
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden bg-card/90 backdrop-blur-sm">
            <div className="flex gap-4 p-4">
              <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" delay={750 + i * 100} />
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-5 w-3/4" delay={800 + i * 100} />
                  <Skeleton className="h-6 w-16 rounded-full" delay={850 + i * 100} />
                </div>
                <Skeleton className="h-4 w-full" delay={900 + i * 100} />
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-3 w-24" delay={950 + i * 100} />
                  <Skeleton className="h-3 w-20" delay={1000 + i * 100} />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
