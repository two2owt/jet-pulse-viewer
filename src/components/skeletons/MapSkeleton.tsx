import { Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useEffect, useState, useCallback } from "react";

interface MapSkeletonProps {
  phase?: 'token' | 'initializing' | 'loading' | 'ready';
  progress?: number;
  isTokenLoading?: boolean;
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

// Loading phases with associated progress ranges
const LOADING_PHASES = {
  token: { min: 0, max: 25, label: 'Connecting...' },
  initializing: { min: 25, max: 50, label: 'Initializing map...' },
  loading: { min: 50, max: 85, label: 'Loading tiles...' },
  ready: { min: 85, max: 100, label: 'Almost ready...' },
} as const;

export const MapSkeleton = ({ 
  phase = 'loading', 
  progress: externalProgress,
  isTokenLoading = false,
}: MapSkeletonProps) => {
  // Internal progress state for smooth animations
  const [internalProgress, setInternalProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<keyof typeof LOADING_PHASES>('token');
  const [tilesLoaded, setTilesLoaded] = useState(0);
  
  // Determine phase based on token loading state
  useEffect(() => {
    if (isTokenLoading) {
      setCurrentPhase('token');
    } else if (phase) {
      setCurrentPhase(phase);
    }
  }, [isTokenLoading, phase]);

  // Simulate progressive loading with natural easing
  useEffect(() => {
    if (externalProgress !== undefined) {
      setInternalProgress(externalProgress);
      return;
    }

    const phaseConfig = LOADING_PHASES[currentPhase];
    let animationFrame: number;
    let startTime = Date.now();
    const duration = currentPhase === 'token' ? 2000 : 3000; // Token phase is faster
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic for natural deceleration
      const easedProgress = 1 - Math.pow(1 - rawProgress, 3);
      
      const newProgress = phaseConfig.min + (phaseConfig.max - phaseConfig.min) * easedProgress;
      setInternalProgress(newProgress);
      
      // Simulate tiles loading based on progress
      const totalTiles = 48; // 6 rows x 8 cols
      const loadedTiles = Math.floor((newProgress / 100) * totalTiles);
      setTilesLoaded(loadedTiles);
      
      if (rawProgress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [currentPhase, externalProgress]);

  const displayProgress = externalProgress ?? internalProgress;
  const phaseLabel = LOADING_PHASES[currentPhase]?.label || 'Loading...';

  // Memoize tile grid to prevent recalculation
  const tiles = useMemo(() => generateTileGrid(6, 8), []);

  // Calculate which tiles should appear "loaded" based on progress
  const getTileOpacity = useCallback((index: number) => {
    const loadThreshold = (index / tiles.length) * 100;
    if (displayProgress >= loadThreshold) {
      return 0.6; // Loaded tile
    }
    return 0.15; // Unloaded tile
  }, [displayProgress, tiles.length]);

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
      {/* Animated tile-loading grid effect - GPU accelerated */}
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 gap-px">
        {tiles.map(({ row, col, delay }, index) => {
          const isLoaded = index < tilesLoaded;
          return (
            <div
              key={`${row}-${col}`}
              className="bg-muted/20 relative overflow-hidden will-change-[opacity]"
              style={{
                opacity: isLoaded ? 0.5 : 0.2,
                transition: 'opacity 0.3s ease-out',
                animation: isLoaded ? 'none' : `tileLoad 2.5s ease-in-out infinite`,
                animationDelay: `${delay}s`,
              }}
            >
              {/* Shimmer overlay per tile - GPU accelerated */}
              {!isLoaded && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-muted/30 to-transparent will-change-transform"
                  style={{
                    animation: `tileShimmer 2s ease-in-out infinite`,
                    animationDelay: `${delay + 0.5}s`,
                  }}
                />
              )}
              {/* Loaded indicator */}
              {isLoaded && (
                <div 
                  className="absolute inset-0 bg-primary/5"
                  style={{
                    animation: 'fadeIn 0.3s ease-out',
                  }}
                />
              )}
            </div>
          );
        })}
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
          
          {/* Enhanced progress indicator */}
          <div className="flex flex-col items-center gap-3 mt-2">
            {/* Progress bar with segmented appearance */}
            <div className="w-40 sm:w-48 h-1.5 bg-muted rounded-full overflow-hidden relative">
              {/* Background segments to show total capacity */}
              <div className="absolute inset-0 flex gap-px">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex-1 bg-muted-foreground/10 first:rounded-l-full last:rounded-r-full" />
                ))}
              </div>
              
              {/* Progress fill - use scaleX for GPU acceleration */}
              <div 
                className="absolute inset-y-0 left-0 w-full bg-primary rounded-full origin-left"
                style={{
                  transform: `scaleX(${displayProgress / 100})`,
                  transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
              
              {/* Leading edge glow effect */}
              <div 
                className="absolute top-0 bottom-0 w-4 bg-gradient-to-r from-transparent via-primary to-primary/50 rounded-full blur-sm"
                style={{
                  left: `calc(${displayProgress}% - 1rem)`,
                  opacity: displayProgress < 100 ? 1 : 0,
                  transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s',
                }}
              />
              
              {/* Shimmer effect - GPU accelerated */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent will-change-transform"
                style={{
                  animation: displayProgress < 100 ? 'shimmerBar 1.5s linear infinite' : 'none',
                }}
              />
            </div>
            
            {/* Status text with phase indicator */}
            <div className="flex items-center gap-2">
              <div 
                className="w-1.5 h-1.5 rounded-full bg-primary will-change-[transform,opacity]"
                style={{
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              <p className="text-xs sm:text-sm text-muted-foreground font-medium tracking-wide">
                {phaseLabel}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Keyframe animations */}
      {/* GPU-accelerated animations - only use transform and opacity */}
      <style>{`
        @keyframes tileLoad {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.35; }
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
        
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
