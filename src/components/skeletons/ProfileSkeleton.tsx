import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const ProfileSkeleton = () => {
  return (
    <div 
      className="space-y-6"
      style={{
        // Containment prevents CLS propagation during hydration
        contain: 'layout style',
        transform: 'translateZ(0)',
      }}
    >
      {/* Avatar and Name */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-20 h-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 text-center">
            <Skeleton className="h-8 w-12 mx-auto mb-2" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </Card>
        ))}
      </div>

      {/* Bio Section */}
      <Card className="p-4 space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
      </div>
    </div>
  );
};
