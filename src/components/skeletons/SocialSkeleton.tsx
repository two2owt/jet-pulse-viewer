import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const SocialCardSkeleton = ({ baseDelay = 0 }: { baseDelay?: number }) => {
  return (
    <Card className="p-4 bg-card/90 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" delay={baseDelay} />
        
        {/* Content */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" delay={baseDelay + 75} />
          <Skeleton className="h-4 w-24" delay={baseDelay + 150} />
        </div>
        
        {/* Action button */}
        <Skeleton className="h-9 w-20 rounded-lg" delay={baseDelay + 225} />
      </div>
    </Card>
  );
};

export const SocialListSkeleton = ({ count = 5 }: { count?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SocialCardSkeleton key={i} baseDelay={i * 150} />
      ))}
    </div>
  );
};

export const SocialPageSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" delay={0} />
        <Skeleton className="h-4 w-64" delay={100} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-28 rounded-lg" delay={200} />
        <Skeleton className="h-10 w-28 rounded-lg" delay={275} />
        <Skeleton className="h-10 w-28 rounded-lg" delay={350} />
      </div>

      {/* Search */}
      <Skeleton className="h-10 w-full rounded-lg" delay={425} />

      {/* List */}
      <SocialListSkeleton count={4} />
    </div>
  );
};
