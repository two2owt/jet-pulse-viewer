import { memo } from "react";
import { Send } from "lucide-react";

/**
 * Full-page loading fallback that matches the app shell design
 * Used as Suspense fallback throughout the app
 */
export const LoadingFallback = memo(function LoadingFallback() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header skeleton - uses CSS variables for exact match with app shell */}
      <header 
        className="px-3 flex items-center justify-between bg-card border-b border-border flex-shrink-0"
        style={{
          height: 'var(--header-total-height, 52px)',
          minHeight: 'var(--header-total-height, 52px)',
          maxHeight: 'var(--header-total-height, 52px)',
          paddingTop: 'var(--safe-area-inset-top, 0px)',
          contain: 'strict',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
          <div className="w-12 h-5 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex-1 max-w-[300px] h-9 mx-4 rounded-lg bg-muted animate-pulse" />
        <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
      </header>
      
      {/* Main content with JET branding loader */}
      <main className="flex-1 flex items-center justify-center bg-background relative overflow-hidden">
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
        
        <div className="flex flex-col items-center gap-4 z-10">
          {/* JET Logo with animated paper plane */}
          <div className="flex items-center gap-0.5 relative">
            <span 
              className="text-3xl sm:text-4xl font-black tracking-tight text-foreground"
              style={{
                fontFamily: 'Kanit, sans-serif',
                letterSpacing: '-0.02em',
              }}
            >
              JET
            </span>
            {/* Animated paper plane icon */}
            <div 
              className="relative -top-1"
              style={{
                animation: 'planeFloat 2s ease-in-out infinite',
              }}
            >
              <Send 
                className="w-5 h-5 sm:w-6 sm:h-6 text-primary -rotate-12"
                strokeWidth={2.5}
                fill="hsl(var(--primary))"
              />
              {/* Trail effect */}
              <div 
                className="absolute top-1/2 -left-1.5 w-3 h-0.5 bg-gradient-to-l from-primary/50 to-transparent rounded-full"
                style={{
                  animation: 'trailPulse 1.5s ease-in-out infinite',
                }}
              />
            </div>
          </div>
          
          {/* Modern progress indicator */}
          <div className="flex flex-col items-center gap-2.5">
            {/* Progress bar */}
            <div className="w-24 sm:w-32 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full w-full bg-gradient-to-r from-primary via-accent to-primary rounded-full"
                style={{
                  backgroundSize: '200% 100%',
                  animation: 'shimmerBar 1.5s linear infinite',
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
              <span className="text-xs sm:text-sm text-muted-foreground font-medium tracking-wide">
                Loading...
              </span>
            </div>
          </div>
        </div>
        
        {/* Keyframe animations */}
        <style>{`
          @keyframes planeFloat {
            0%, 100% { 
              transform: translateY(0) translateX(0) rotate(-12deg); 
            }
            25% { 
              transform: translateY(-3px) translateX(1.5px) rotate(-8deg); 
            }
            50% { 
              transform: translateY(-5px) translateX(3px) rotate(-14deg); 
            }
            75% { 
              transform: translateY(-2px) translateX(1px) rotate(-10deg); 
            }
          }
          
          @keyframes trailPulse {
            0%, 100% { 
              opacity: 0.3; 
              width: 12px; 
            }
            50% { 
              opacity: 0.6; 
              width: 18px; 
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
      </main>
      
      {/* Bottom nav skeleton - uses CSS variables for exact match with app shell */}
      <nav 
        className="px-6 flex items-center justify-around bg-card border-t border-border flex-shrink-0"
        style={{
          height: 'var(--bottom-nav-total-height, 60px)',
          minHeight: 'var(--bottom-nav-total-height, 60px)',
          maxHeight: 'var(--bottom-nav-total-height, 60px)',
          paddingBottom: 'var(--safe-area-inset-bottom, 0px)',
          contain: 'strict',
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="w-12 h-10 flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded ${i === 0 ? 'bg-primary' : 'bg-muted'}`} />
            <div className="w-8 h-2 rounded bg-muted" />
          </div>
        ))}
      </nav>
    </div>
  );
});

/**
 * Compact loading spinner for inline content
 */
export const LoadingSpinner = memo(function LoadingSpinner({ 
  size = "md",
  className = "" 
}: { 
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-3",
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} border-muted border-t-primary rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
});

/**
 * Content area loading placeholder
 */
export const ContentSkeleton = memo(function ContentSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px] relative overflow-hidden">
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
      
      <div className="flex flex-col items-center gap-3 z-10">
        {/* JET Logo with animated paper plane */}
        <div className="flex items-center gap-0.5 relative">
          <span 
            className="text-2xl font-black tracking-tight text-foreground"
            style={{
              fontFamily: 'Kanit, sans-serif',
              letterSpacing: '-0.02em',
            }}
          >
            JET
          </span>
          <div 
            className="relative -top-0.5"
            style={{
              animation: 'planeFloat 2s ease-in-out infinite',
            }}
          >
            <Send 
              className="w-4 h-4 text-primary -rotate-12"
              strokeWidth={2.5}
              fill="hsl(var(--primary))"
            />
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-20 h-0.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full w-full bg-gradient-to-r from-primary via-accent to-primary rounded-full"
            style={{
              backgroundSize: '200% 100%',
              animation: 'shimmerBar 1.5s linear infinite',
            }}
          />
        </div>
        
        <span className="text-xs text-muted-foreground font-medium">Loading content...</span>
      </div>
      
      <style>{`
        @keyframes planeFloat {
          0%, 100% { transform: translateY(0) translateX(0) rotate(-12deg); }
          25% { transform: translateY(-3px) translateX(1.5px) rotate(-8deg); }
          50% { transform: translateY(-5px) translateX(3px) rotate(-14deg); }
          75% { transform: translateY(-2px) translateX(1px) rotate(-10deg); }
        }
        @keyframes shimmerBar {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
});
