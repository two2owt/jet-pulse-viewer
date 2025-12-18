import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

interface MapSkeletonProps {
  phase?: 'token' | 'initializing' | 'loading' | 'ready';
}

export const MapSkeleton = ({ phase = 'loading' }: MapSkeletonProps) => {
  const [progress, setProgress] = useState(0);
  
  // Animate progress based on phase
  useEffect(() => {
    const targets: Record<string, number> = {
      token: 20,
      initializing: 50,
      loading: 80,
      ready: 100,
    };
    
    const target = targets[phase] || 50;
    const duration = phase === 'token' ? 500 : 800;
    const startTime = performance.now();
    const startProgress = progress;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(startProgress + (target - startProgress) * eased);
      
      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [phase]);

  const phaseText: Record<string, string> = {
    token: 'Authenticating...',
    initializing: 'Initializing map...',
    loading: 'Loading tiles...',
    ready: 'Almost ready...',
  };

  return (
    <div className="relative w-full h-full bg-background overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-background to-muted/30" />
      
      {/* City selector skeleton */}
      <div 
        className="absolute z-10"
        style={{
          top: 'var(--map-ui-inset-top, 1rem)',
          left: 'var(--map-ui-inset-left, 1rem)',
          contain: 'layout style',
        }}
      >
        <Skeleton className="h-7 sm:h-8 md:h-9 lg:h-10 min-w-[120px] w-36 sm:w-44 rounded-lg" />
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
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      
      {/* Center loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-4 px-4">
          {/* Progress ring */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20">
            <svg 
              className="w-full h-full -rotate-90"
              viewBox="0 0 100 100"
            >
              {/* Background ring */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="4"
              />
              {/* Progress arc */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                style={{ 
                  transition: 'stroke-dashoffset 0.3s ease-out',
                }}
              />
            </svg>
            
            {/* Center percentage */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base sm:text-lg font-semibold text-foreground tabular-nums">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground font-medium">
            {phaseText[phase] || 'Loading Map'}
          </p>
        </div>
      </div>
    </div>
  );
};
