import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

interface MapSkeletonProps {
  phase?: 'token' | 'initializing' | 'loading' | 'ready';
}

// Neon dot configurations for cyberpunk aesthetic
const neonDots = [
  { top: '18%', left: '22%', size: 8, type: 'bar', delay: 0 },
  { top: '32%', left: '52%', size: 10, type: 'club', delay: 150 },
  { top: '48%', left: '30%', size: 7, type: 'lounge', delay: 300 },
  { top: '42%', left: '68%', size: 9, type: 'restaurant', delay: 450 },
  { top: '62%', left: '55%', size: 6, type: 'bar', delay: 600 },
  { top: '25%', left: '75%', size: 8, type: 'club', delay: 750 },
  { top: '70%', left: '35%', size: 7, type: 'lounge', delay: 900 },
];

// Path connections between clustered dots
const pathConnections = [
  { from: 0, to: 2 }, // bar to lounge
  { from: 1, to: 3 }, // club to restaurant
  { from: 4, to: 6 }, // bar to lounge
  { from: 1, to: 5 }, // club to club
];

// Neon colors based on venue type
const getNeonColor = (type: string) => {
  switch (type) {
    case 'bar':
      return { color: '280 100% 60%', glow: '280 100% 70%' }; // Purple
    case 'club':
      return { color: '320 100% 55%', glow: '320 100% 65%' }; // Magenta/Pink
    case 'lounge':
      return { color: '190 100% 50%', glow: '190 100% 60%' }; // Cyan
    case 'restaurant':
      return { color: '45 100% 55%', glow: '45 100% 65%' }; // Gold
    default:
      return { color: '280 100% 60%', glow: '280 100% 70%' };
  }
};

export const MapSkeleton = ({ phase = 'loading' }: MapSkeletonProps) => {
  const [progress, setProgress] = useState(0);
  const [hoveredDot, setHoveredDot] = useState<number | null>(null);
  
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

  // Calculate dot positions for path drawing
  const getDotPosition = (index: number) => {
    const dot = neonDots[index];
    return {
      x: parseFloat(dot.left),
      y: parseFloat(dot.top),
    };
  };

  return (
    <div className="relative w-full h-full bg-background overflow-hidden">
      {/* Dark cyberpunk background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(240,20%,8%)] via-[hsl(260,15%,12%)] to-[hsl(220,20%,6%)]" />
      
      {/* Animated scanlines overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        }}
      />
      
      {/* Grid pattern with neon tint */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(168,85,247,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,0.15) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Path connections between clustered dots */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          {pathConnections.map((conn, i) => {
            const fromDot = neonDots[conn.from];
            const toDot = neonDots[conn.to];
            const fromColor = getNeonColor(fromDot.type);
            return (
              <linearGradient 
                key={`gradient-${i}`} 
                id={`path-gradient-${i}`}
                x1="0%" y1="0%" x2="100%" y2="0%"
              >
                <stop offset="0%" stopColor={`hsl(${fromColor.color} / 0.4)`} />
                <stop offset="50%" stopColor={`hsl(${fromColor.glow} / 0.2)`} />
                <stop offset="100%" stopColor={`hsl(${getNeonColor(toDot.type).color} / 0.4)`} />
              </linearGradient>
            );
          })}
        </defs>
        
        {pathConnections.map((conn, i) => {
          const from = getDotPosition(conn.from);
          const to = getDotPosition(conn.to);
          return (
            <line
              key={i}
              x1={`${from.x}%`}
              y1={`${from.y}%`}
              x2={`${to.x}%`}
              y2={`${to.y}%`}
              stroke={`url(#path-gradient-${i})`}
              strokeWidth="1"
              strokeDasharray="4 4"
              className="animate-pulse"
              style={{
                animationDuration: '2s',
                animationDelay: `${i * 200}ms`,
              }}
            />
          );
        })}
      </svg>
      
      {/* City selector skeleton */}
      <div 
        className="absolute z-10"
        style={{
          top: 'var(--map-ui-inset-top, 1rem)',
          left: 'var(--map-ui-inset-left, 1rem)',
          contain: 'layout style',
        }}
      >
        <Skeleton className="h-7 sm:h-8 md:h-9 lg:h-10 min-w-[120px] w-36 sm:w-44 rounded-lg bg-white/5 border border-purple-500/20" />
      </div>
      
      {/* Navigation controls skeleton */}
      <div 
        className="absolute z-10 flex flex-col gap-1"
        style={{
          top: 'var(--map-ui-inset-top, 1rem)',
          right: 'var(--map-ui-inset-right, 1rem)',
        }}
      >
        <Skeleton className="h-8 w-8 rounded-md bg-white/5 border border-cyan-500/20" />
        <Skeleton className="h-8 w-8 rounded-md bg-white/5 border border-cyan-500/20" />
        <Skeleton className="h-8 w-8 rounded-md bg-white/5 border border-cyan-500/20" />
      </div>
      
      {/* Neon Dot venue markers */}
      {neonDots.map((dot, i) => {
        const neonColors = getNeonColor(dot.type);
        const isHovered = hoveredDot === i;
        const baseSize = dot.size;
        const displaySize = isHovered ? baseSize * 1.8 : baseSize;
        
        return (
          <div 
            key={i}
            className="absolute opacity-0 cursor-pointer"
            style={{ 
              top: dot.top, 
              left: dot.left,
              transform: 'translate(-50%, -50%)',
              animation: `neonDotIn 0.6s ease-out ${dot.delay}ms forwards`,
            }}
            onMouseEnter={() => setHoveredDot(i)}
            onMouseLeave={() => setHoveredDot(null)}
          >
            {/* Outer glow ring */}
            <div 
              className="absolute rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${displaySize * 4}px`,
                height: `${displaySize * 4}px`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, hsl(${neonColors.glow} / ${isHovered ? 0.4 : 0.2}) 0%, transparent 70%)`,
                filter: `blur(${isHovered ? 8 : 4}px)`,
              }}
            />
            
            {/* Secondary pulse ring */}
            <div 
              className="absolute rounded-full"
              style={{
                width: `${displaySize * 2.5}px`,
                height: `${displaySize * 2.5}px`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                border: `1px solid hsl(${neonColors.color} / 0.3)`,
                animation: 'neonPulse 2s ease-in-out infinite',
                animationDelay: `${dot.delay}ms`,
              }}
            />
            
            {/* Core dot */}
            <div 
              className="relative rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${displaySize}px`,
                height: `${displaySize}px`,
                background: `radial-gradient(circle at 30% 30%, hsl(${neonColors.glow}), hsl(${neonColors.color}))`,
                boxShadow: `
                  0 0 ${isHovered ? 20 : 10}px hsl(${neonColors.glow} / 0.8),
                  0 0 ${isHovered ? 40 : 20}px hsl(${neonColors.color} / 0.5),
                  inset 0 0 ${isHovered ? 8 : 4}px rgba(255,255,255,0.3)
                `,
              }}
            />
          </div>
        );
      })}
      
      {/* Center loading indicator - cyberpunk style */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-4 px-4">
          {/* Hexagonal progress container */}
          <div className="relative">
            {/* Outer rotating ring */}
            <div 
              className="absolute inset-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, hsl(280 100% 60% / 0.3), hsl(320 100% 55% / 0.3), hsl(190 100% 50% / 0.3), hsl(280 100% 60% / 0.3))',
                animation: 'spin 4s linear infinite',
                filter: 'blur(8px)',
              }}
            />
            
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-purple-500/30">
              {/* Progress ring */}
              <svg 
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 100 100"
              >
                {/* Background ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="hsl(280 100% 60% / 0.15)"
                  strokeWidth="2"
                />
                {/* Progress arc with gradient */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="url(#neonProgressGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                  style={{ 
                    transition: 'stroke-dashoffset 0.3s ease-out',
                    filter: 'drop-shadow(0 0 4px hsl(320 100% 60% / 0.8))',
                  }}
                />
                <defs>
                  <linearGradient id="neonProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(280 100% 60%)" />
                    <stop offset="50%" stopColor="hsl(320 100% 55%)" />
                    <stop offset="100%" stopColor="hsl(190 100% 50%)" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Center percentage */}
              <span 
                className="text-lg sm:text-xl font-bold tabular-nums"
                style={{
                  background: 'linear-gradient(135deg, hsl(280 100% 70%), hsl(320 100% 65%))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 20px hsl(320 100% 60% / 0.5)',
                }}
              >
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          
          <div className="text-center space-y-1">
            <p 
              className="text-sm font-medium tracking-wider uppercase"
              style={{
                background: 'linear-gradient(90deg, hsl(190 100% 60%), hsl(280 100% 70%))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {phaseText[phase] || 'Loading Map'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Legend skeleton - cyberpunk style */}
      <div 
        className="absolute z-10"
        style={{
          bottom: 'var(--map-ui-inset-bottom, 1rem)',
          left: 'var(--map-ui-inset-left, 1rem)',
        }}
      >
        <div className="bg-black/60 backdrop-blur-md rounded-lg p-2 border border-purple-500/20">
          <div className="text-[10px] text-purple-300/70 uppercase tracking-wider mb-2">Venues</div>
          {['bar', 'club', 'lounge'].map((type, i) => {
            const colors = getNeonColor(type);
            return (
              <div key={type} className="flex items-center gap-2 mt-1">
                <div 
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: `hsl(${colors.color})`,
                    boxShadow: `0 0 6px hsl(${colors.glow} / 0.8)`,
                  }}
                />
                <span className="text-[10px] text-white/60 capitalize">{type}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      <style>{`
        @keyframes neonDotIn {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.3);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        
        @keyframes neonPulse {
          0%, 100% {
            opacity: 0.3;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1.3);
          }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
