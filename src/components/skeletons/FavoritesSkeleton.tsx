import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const FavoritesSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <Skeleton className="h-16 flex-1 rounded-xl" />
        <Skeleton className="h-16 flex-1 rounded-xl" />
      </div>

      {/* Favorites list */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="overflow-hidden">
            <div className="flex gap-4 p-4">
              <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
