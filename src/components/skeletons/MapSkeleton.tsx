import { Skeleton } from "@/components/ui/skeleton";
import { Map } from "lucide-react";

interface MapSkeletonProps {
  phase?: 'token' | 'initializing' | 'loading' | 'ready';
}

export const MapSkeleton = ({ phase = 'loading' }: MapSkeletonProps) => {
  const phaseText: Record<string, string> = {
    token: 'Connecting...',
    initializing: 'Initializing...',
    loading: 'Loading map...',
    ready: 'Almost ready...',
  };

  return (
    <div className="relative w-full h-full bg-muted/30 overflow-hidden">
      {/* Subtle animated gradient background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-muted/20 via-background to-muted/40"
        style={{
          animation: 'shimmer 2s ease-in-out infinite',
        }}
      />
      
      {/* Faux map grid lines for visual interest */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>
      
      {/* City selector skeleton */}
      <div 
        className="absolute z-10"
        style={{
          top: 'var(--map-ui-inset-top, 1rem)',
          left: 'var(--map-ui-inset-left, 1rem)',
        }}
      >
        <Skeleton className="h-8 w-36 rounded-lg" />
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
      
      {/* Center loading indicator - subtle and minimal */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-3">
          {/* Pulsing map icon */}
          <div className="relative">
            <div 
              className="absolute inset-0 bg-primary/20 rounded-full animate-ping"
              style={{ animationDuration: '1.5s' }}
            />
            <div className="relative w-12 h-12 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-border/50 shadow-sm">
              <Map className="w-5 h-5 text-primary" />
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground font-medium">
            {phaseText[phase] || 'Loading...'}
          </p>
        </div>
      </div>
      
      {/* Shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};
