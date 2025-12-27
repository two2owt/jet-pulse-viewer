import { Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MapSkeletonProps {
  phase?: 'token' | 'initializing' | 'loading' | 'ready';
  progress?: number;
}

export const MapSkeleton = ({ phase = 'loading', progress }: MapSkeletonProps) => {
  const phaseText: Record<string, string> = {
    token: 'Connecting...',
    initializing: 'Initializing...',
    loading: 'Loading map...',
    ready: 'Almost ready...',
  };

  const displayProgress = progress ?? {
    token: 10,
    initializing: 30,
    loading: 60,
    ready: 90,
  }[phase] ?? 50;

  return (
    <div className="relative w-full h-full bg-background overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-muted/30 via-background to-muted/50 animate-pulse" />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
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
        <Skeleton className="h-8 w-32 rounded-lg" />
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
      
      {/* Center branding & loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-4">
          {/* JET Logo with animated paper plane */}
          <div className="flex items-center gap-0.5 relative">
            <span 
              className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-foreground"
              style={{
                fontFamily: 'Kanit, sans-serif',
                letterSpacing: '-0.02em',
              }}
            >
              JET
            </span>
            {/* Animated paper plane icon */}
            <div 
              className="relative -top-1 sm:-top-2"
              style={{
                animation: 'planeFloat 2s ease-in-out infinite',
              }}
            >
              <Send 
                className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-primary -rotate-12"
                strokeWidth={2.5}
                fill="hsl(var(--primary))"
              />
              {/* Trail effect */}
              <div 
                className="absolute top-1/2 -left-2 w-4 h-0.5 bg-gradient-to-l from-primary/50 to-transparent rounded-full"
                style={{
                  animation: 'trailPulse 1.5s ease-in-out infinite',
                }}
              />
            </div>
          </div>
          
          {/* Modern progress indicator */}
          <div className="flex flex-col items-center gap-3 mt-2">
            {/* Progress bar */}
            <div className="w-32 sm:w-40 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full"
                style={{
                  width: `${displayProgress}%`,
                  transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmerBar 2s linear infinite',
                }}
              />
            </div>
            
            {/* Status text */}
            <div className="flex items-center gap-2">
              <div 
                className="w-1.5 h-1.5 rounded-full bg-primary"
                style={{
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              <p className="text-xs sm:text-sm text-muted-foreground font-medium tracking-wide">
                {phaseText[phase] || 'Loading...'}
              </p>
            </div>
            
            {progress !== undefined && (
              <p className="text-[10px] sm:text-xs text-muted-foreground/60 tabular-nums font-medium">
                {Math.round(progress)}%
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Keyframe animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        
        @keyframes planeFloat {
          0%, 100% { 
            transform: translateY(0) translateX(0) rotate(-12deg); 
          }
          25% { 
            transform: translateY(-4px) translateX(2px) rotate(-8deg); 
          }
          50% { 
            transform: translateY(-6px) translateX(4px) rotate(-14deg); 
          }
          75% { 
            transform: translateY(-3px) translateX(1px) rotate(-10deg); 
          }
        }
        
        @keyframes trailPulse {
          0%, 100% { 
            opacity: 0.3; 
            width: 16px; 
          }
          50% { 
            opacity: 0.6; 
            width: 24px; 
          }
        }
        
        @keyframes shimmerBar {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        @keyframes pulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.5; 
            transform: scale(0.8); 
          }
        }
      `}</style>
    </div>
  );
};
