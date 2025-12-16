import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";

export const MapSkeleton = () => {
  return (
    <div className="relative w-full h-full bg-background overflow-hidden">
      {/* Map placeholder with gradient shimmer */}
      <div className="absolute inset-0 bg-gradient-to-br from-card via-muted/50 to-card animate-pulse" />
      
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* City selector skeleton */}
      <div 
        className="absolute z-10"
        style={{
          top: 'var(--map-ui-inset-top, 1rem)',
          left: 'var(--map-ui-inset-left, 1rem)',
        }}
      >
        <Skeleton className="h-8 sm:h-9 w-36 sm:w-44 rounded-lg" />
      </div>
      
      {/* Navigation controls skeleton (top-right) */}
      <div 
        className="absolute z-10 flex flex-col gap-1"
        style={{
          top: 'var(--map-ui-inset-top, 1rem)',
          right: 'var(--map-ui-inset-right, 1rem)',
        }}
      >
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      
      {/* Mock venue markers with staggered animation */}
      <div className="absolute top-[20%] left-[25%] animate-pulse" style={{ animationDelay: '0ms' }}>
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center backdrop-blur-sm border border-primary/30">
          <MapPin className="w-5 h-5 text-primary/50" />
        </div>
      </div>
      <div className="absolute top-[35%] left-[55%] animate-pulse" style={{ animationDelay: '150ms' }}>
        <div className="w-12 h-12 rounded-full bg-warm/20 flex items-center justify-center backdrop-blur-sm border border-warm/30">
          <MapPin className="w-6 h-6 text-warm/50" />
        </div>
      </div>
      <div className="absolute top-[55%] left-[35%] animate-pulse" style={{ animationDelay: '300ms' }}>
        <div className="w-9 h-9 rounded-full bg-cool/20 flex items-center justify-center backdrop-blur-sm border border-cool/30">
          <MapPin className="w-4 h-4 text-cool/50" />
        </div>
      </div>
      <div className="absolute top-[45%] left-[70%] animate-pulse" style={{ animationDelay: '450ms' }}>
        <div className="w-11 h-11 rounded-full bg-hot/20 flex items-center justify-center backdrop-blur-sm border border-hot/30">
          <MapPin className="w-5 h-5 text-hot/50" />
        </div>
      </div>
      <div className="absolute top-[65%] left-[60%] animate-pulse" style={{ animationDelay: '600ms' }}>
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center backdrop-blur-sm border border-primary/30">
          <MapPin className="w-4 h-4 text-primary/50" />
        </div>
      </div>
      
      {/* Center loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 px-4">
          <div className="relative">
            <div className="w-12 h-12 sm:w-14 sm:h-14 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 w-12 h-12 sm:w-14 sm:h-14 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground mb-0.5">Loading Map</p>
            <p className="text-xs text-muted-foreground">Preparing your view...</p>
          </div>
        </div>
      </div>
      
      {/* Legend skeleton (bottom-left) */}
      <div 
        className="absolute z-10"
        style={{
          bottom: 'var(--map-ui-inset-bottom, 1rem)',
          left: 'var(--map-ui-inset-left, 1rem)',
        }}
      >
        <div className="bg-card/80 backdrop-blur-sm rounded-lg p-2 border border-border/50">
          <Skeleton className="h-3 w-16 mb-2" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-2 w-8" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-2 w-10" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-2 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
};
