import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Plane } from "lucide-react";
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
      {/* Map placeholder with gradient shimmer */}
      <div className="absolute inset-0 bg-gradient-to-br from-card via-muted/50 to-card" />
      
      {/* Animated gradient overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(135deg, transparent 0%, hsl(var(--primary) / 0.1) 50%, transparent 100%)',
          backgroundSize: '200% 200%',
          animation: 'shimmer 2s ease-in-out infinite',
        }}
      />
      
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
      
      {/* Mock venue markers with staggered fade-in */}
      {[
        { top: '20%', left: '25%', size: 10, color: 'primary', delay: 0 },
        { top: '35%', left: '55%', size: 12, color: 'warm', delay: 100 },
        { top: '55%', left: '35%', size: 9, color: 'cool', delay: 200 },
        { top: '45%', left: '70%', size: 11, color: 'hot', delay: 300 },
        { top: '65%', left: '60%', size: 8, color: 'primary', delay: 400 },
      ].map((marker, i) => (
        <div 
          key={i}
          className={`absolute opacity-0 animate-fade-in`}
          style={{ 
            top: marker.top, 
            left: marker.left,
            animationDelay: `${marker.delay}ms`,
            animationFillMode: 'forwards',
          }}
        >
          <div 
            className={`rounded-full bg-${marker.color}/20 flex items-center justify-center backdrop-blur-sm border border-${marker.color}/30`}
            style={{ width: `${marker.size * 4}px`, height: `${marker.size * 4}px` }}
          >
            <MapPin className={`text-${marker.color}/50`} style={{ width: `${marker.size * 2}px`, height: `${marker.size * 2}px` }} />
          </div>
        </div>
      ))}
      
      {/* Center loading indicator with progress */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 px-4">
          {/* Animated plane icon */}
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Plane 
                className="w-8 h-8 sm:w-10 sm:h-10 text-primary animate-bounce"
                style={{ 
                  animationDuration: '1.5s',
                  transform: 'rotate(-45deg)',
                }}
              />
            </div>
            {/* Progress ring */}
            <svg 
              className="absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="hsl(var(--primary) / 0.2)"
                strokeWidth="4"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
              />
            </svg>
          </div>
          
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">
              {phaseText[phase] || 'Loading Map'}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {Math.round(progress)}%
            </p>
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
      
      <style>{`
        @keyframes shimmer {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
        }
      `}</style>
    </div>
  );
};
