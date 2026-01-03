import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const SocialCardSkeleton = () => {
  return (
    <Card 
      className="p-4 bg-card/90 backdrop-blur-sm"
      style={{
        // Containment prevents CLS propagation during hydration
        contain: 'layout style',
        transform: 'translateZ(0)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        
        {/* Content */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        
        {/* Action button */}
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
    </Card>
  );
};

export const SocialListSkeleton = ({ count = 5 }: { count?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SocialCardSkeleton key={i} />
      ))}
    </div>
  );
};

export const SocialPageSkeleton = () => {
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
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Search */}
      <Skeleton className="h-10 w-full rounded-lg" />

      {/* List */}
      <SocialListSkeleton count={4} />
    </div>
  );
};
