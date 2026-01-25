import { Skeleton } from "@/components/ui/skeleton";

interface MapSkeletonProps {
  phase?: 'token' | 'initializing' | 'loading' | 'ready';
  progress?: number;
  isTokenLoading?: boolean;
}

export const MapSkeleton = ({ 
  phase = 'loading', 
  progress: externalProgress,
  isTokenLoading = false,
}: MapSkeletonProps) => {
  return (
    <div 
      className="bg-background overflow-hidden"
      style={{
        // Match LazyMapboxHeatmap container exactly to prevent CLS
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        minHeight: '100%',
        // Containment prevents CLS propagation during hydration
        contain: 'strict',
        transform: 'translateZ(0)',
        isolation: 'isolate',
      }}
    >
      {/* Static loading background */}
      <div className="absolute inset-0 bg-muted/20" />
      
      {/* City selector skeleton */}
      <div 
        className="absolute z-10"
        style={{
          top: 'var(--map-ui-inset-top, 1rem)',
          left: 'var(--map-ui-inset-left, 1rem)',
        }}
      >
        <Skeleton className="h-9 w-40 rounded-xl" />
      </div>
      
      {/* Navigation controls skeleton */}
      <div 
        className="absolute z-10 flex flex-col gap-1"
        style={{
          top: 'var(--map-ui-inset-top, 1rem)',
          right: 'var(--map-ui-inset-right, 1rem)',
        }}
      >
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      
    </div>
  );
};
