import { Skeleton } from "@/components/ui/skeleton";

export const MapSkeleton = () => {
  return (
    <div className="relative w-full h-full bg-card/50 rounded-2xl overflow-hidden">
      {/* Map placeholder */}
      <Skeleton className="absolute inset-0" />
      
      {/* City selector skeleton */}
      <div className="absolute top-4 left-4 z-10">
        <Skeleton className="h-10 w-48 rounded-full" />
      </div>
      
      {/* Live indicator skeleton */}
      <div className="absolute top-4 right-4 z-10">
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
      
      {/* Mock venue markers */}
      <div className="absolute top-1/4 left-1/3">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
      <div className="absolute top-1/2 left-1/2">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
      <div className="absolute top-2/3 left-2/3">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </div>
  );
};
