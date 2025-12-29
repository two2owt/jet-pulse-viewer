import { Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

interface MapSkeletonProps {
  phase?: 'token' | 'initializing' | 'loading' | 'ready';
  progress?: number;
}

// Generate deterministic tile positions for the grid
const generateTileGrid = (rows: number, cols: number) => {
  const tiles: { row: number; col: number; delay: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Stagger from center outward for natural loading feel
      const centerRow = rows / 2;
      const centerCol = cols / 2;
      const distance = Math.sqrt(Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2));
      const delay = distance * 0.15; // Delay based on distance from center
      tiles.push({ row, col, delay });
    }
  }
  return tiles;
};

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

  // Memoize tile grid to prevent recalculation
  const tiles = useMemo(() => generateTileGrid(6, 8), []);

  return (
    <div className="relative w-full h-full bg-background overflow-hidden">
      {/* Animated tile-loading grid effect - GPU accelerated */}
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 gap-px opacity-60">
        {tiles.map(({ row, col, delay }) => (
          <div
            key={`${row}-${col}`}
            className="bg-muted/20 relative overflow-hidden will-change-[opacity]"
            style={{
              animation: `tileLoad 2.5s ease-in-out infinite`,
              animationDelay: `${delay}s`,
            }}
          >
            {/* Shimmer overlay per tile - GPU accelerated */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-muted/30 to-transparent will-change-transform"
              style={{
                animation: `tileShimmer 2s ease-in-out infinite`,
                animationDelay: `${delay + 0.5}s`,
              }}
            />
          </div>
        ))}
      </div>
      
      {/* Subtle road-like lines overlay */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
        <svg className="w-full h-full" preserveAspectRatio="none">
          {/* Horizontal roads */}
          <line x1="0" y1="30%" x2="100%" y2="30%" stroke="hsl(var(--foreground))" strokeWidth="2" />
          <line x1="0" y1="55%" x2="100%" y2="55%" stroke="hsl(var(--foreground))" strokeWidth="3" />
          <line x1="0" y1="75%" x2="100%" y2="75%" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
          {/* Vertical roads */}
          <line x1="25%" y1="0" x2="25%" y2="100%" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="hsl(var(--foreground))" strokeWidth="2.5" />
          <line x1="70%" y1="0" x2="70%" y2="100%" stroke="hsl(var(--foreground))" strokeWidth="1" />
          {/* Diagonal */}
          <line x1="10%" y1="80%" x2="40%" y2="20%" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
        </svg>
      </div>
      
      {/* Animated scan line effect - GPU accelerated */}
      <div 
        className="absolute inset-x-0 h-24 bg-gradient-to-b from-primary/5 via-primary/10 to-transparent pointer-events-none will-change-transform"
        style={{
          animation: 'scanLine 3s ease-in-out infinite',
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
        <div className="flex flex-col items-center gap-4 bg-background/80 backdrop-blur-sm px-8 py-6 rounded-2xl">
          {/* JET Logo with animated paper plane */}
          <div className="flex items-center gap-0.5 relative">
            {/* LCP candidate - large text element with elementtiming for tracking */}
            <span 
              className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-foreground"
              style={{
                fontFamily: 'Kanit, sans-serif',
                letterSpacing: '-0.02em',
              }}
              // @ts-expect-error - elementtiming is a valid HTML attribute for LCP tracking
              elementtiming="lcp-brand"
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
              {/* Trail effect - GPU accelerated with scaleX instead of width */}
              <div 
                className="absolute top-1/2 -left-2 w-6 h-0.5 bg-gradient-to-l from-primary/50 to-transparent rounded-full will-change-transform origin-right"
                style={{
                  animation: 'trailPulse 1.5s ease-in-out infinite',
                }}
              />
            </div>
          </div>
          
          {/* Modern progress indicator */}
          <div className="flex flex-col items-center gap-3 mt-2">
            {/* Progress bar - GPU accelerated */}
            <div className="w-32 sm:w-40 h-1 bg-muted rounded-full overflow-hidden relative">
              {/* Progress fill - use scaleX for GPU acceleration */}
              <div 
                className="absolute inset-y-0 left-0 w-full bg-primary/40 rounded-full origin-left"
                style={{
                  transform: `scaleX(${displayProgress / 100})`,
                  transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
              {/* Shimmer effect - GPU accelerated */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent will-change-transform"
                style={{
                  animation: 'shimmerBar 2s linear infinite',
                }}
              />
            </div>
            
            {/* Status text */}
            <div className="flex items-center gap-2">
              <div 
                className="w-1.5 h-1.5 rounded-full bg-primary will-change-[transform,opacity]"
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
      {/* GPU-accelerated animations - only use transform and opacity */}
      <style>{`
        @keyframes tileLoad {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }
        
        @keyframes tileShimmer {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes scanLine {
          0% { transform: translateY(-100%); opacity: 0; }
          10%, 90% { opacity: 1; }
          100% { transform: translateY(calc(100vh + 100%)); opacity: 0; }
        }
        
        @keyframes planeFloat {
          0%, 100% { transform: translateY(0) translateX(0) rotate(-12deg); }
          25% { transform: translateY(-4px) translateX(2px) rotate(-8deg); }
          50% { transform: translateY(-6px) translateX(4px) rotate(-14deg); }
          75% { transform: translateY(-3px) translateX(1px) rotate(-10deg); }
        }
        
        @keyframes trailPulse {
          0%, 100% { opacity: 0.3; transform: scaleX(0.67); }
          50% { opacity: 0.6; transform: scaleX(1); }
        }
        
        @keyframes shimmerBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
};
