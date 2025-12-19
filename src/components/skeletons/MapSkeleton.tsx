import { Skeleton } from "@/components/ui/skeleton";
import { Map } from "lucide-react";

interface MapSkeletonProps {
  phase?: 'token' | 'initializing' | 'loading' | 'ready';
  progress?: number; // 0-100 for actual tile loading progress
}

export const MapSkeleton = ({ phase = 'loading', progress }: MapSkeletonProps) => {
  const phaseText: Record<string, string> = {
    token: 'Connecting...',
    initializing: 'Initializing...',
    loading: 'Loading tiles...',
    ready: 'Almost ready...',
  };

  // Use actual progress if provided, otherwise estimate based on phase
  const displayProgress = progress ?? {
    token: 10,
    initializing: 30,
    loading: 60,
    ready: 90,
  }[phase] ?? 50;

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
      
      {/* Center loading indicator with progress */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-3">
          {/* Progress ring */}
          <div className="relative w-14 h-14">
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
                strokeWidth="6"
              />
              {/* Progress arc */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - displayProgress / 100)}`}
                style={{ 
                  transition: 'stroke-dashoffset 0.3s ease-out',
                }}
              />
            </svg>
            
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Map className="w-5 h-5 text-primary" />
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs text-muted-foreground font-medium">
              {phaseText[phase] || 'Loading...'}
            </p>
            {progress !== undefined && (
              <p className="text-[10px] text-muted-foreground/70 tabular-nums">
                {Math.round(progress)}%
              </p>
            )}
          </div>
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
