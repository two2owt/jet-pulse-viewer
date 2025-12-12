import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const FavoritesSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" delay={0} />
        <Skeleton className="h-4 w-56" delay={75} />
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <Skeleton className="h-16 flex-1 rounded-xl" delay={150} />
        <Skeleton className="h-16 flex-1 rounded-xl" delay={225} />
      </div>

      {/* Favorites list */}
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden bg-card/90 backdrop-blur-sm">
            <div className="flex gap-4 p-4">
              <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" delay={300 + i * 100} />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" delay={350 + i * 100} />
                <Skeleton className="h-4 w-full" delay={400 + i * 100} />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" delay={450 + i * 100} />
                  <Skeleton className="h-3 w-16" delay={500 + i * 100} />
                </div>
              </div>
              <Skeleton className="w-8 h-8 rounded-lg" delay={550 + i * 100} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
