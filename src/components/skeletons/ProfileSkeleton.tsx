import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const ProfileSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Avatar and Name */}
      <div className="flex items-center gap-4">
        <Skeleton className="w-20 h-20 rounded-full" delay={0} />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" delay={100} />
          <Skeleton className="h-4 w-48" delay={200} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 text-center">
            <Skeleton className="h-8 w-12 mx-auto mb-2" delay={200 + i * 100} />
            <Skeleton className="h-4 w-16 mx-auto" delay={250 + i * 100} />
          </Card>
        ))}
      </div>

      {/* Bio Section */}
      <Card className="p-4 space-y-3">
        <Skeleton className="h-5 w-24" delay={600} />
        <Skeleton className="h-4 w-full" delay={700} />
        <Skeleton className="h-4 w-3/4" delay={800} />
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" delay={900} />
        <Skeleton className="h-10 flex-1 rounded-lg" delay={1000} />
      </div>
    </div>
  );
};
