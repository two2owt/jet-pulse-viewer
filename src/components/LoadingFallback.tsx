import { memo } from "react";

/**
 * Full-page loading fallback that matches the app shell design
 * Used as Suspense fallback throughout the app
 * 
 * CRITICAL: This component must exactly match the Header and BottomNav dimensions
 * to prevent Cumulative Layout Shift (CLS) during hydration
 */
export const LoadingFallback = memo(function LoadingFallback() {
  return (
    <div 
      className="app-wrapper bg-background"
      style={{
        // Match Index.tsx app-wrapper exactly
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        minHeight: '100dvh',
        maxHeight: '100dvh',
        width: '100%',
        maxWidth: '100vw',
        contain: 'strict',
        transform: 'translateZ(0)',
        isolation: 'isolate',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Header shell - MUST match Header.tsx dimensions exactly */}
      <header 
        className="bg-card/98 backdrop-blur-xl border-b border-border/50 sticky top-0 z-[60] header-contained"
        role="banner"
        style={{
          paddingTop: 'var(--safe-area-inset-top)',
          height: 'var(--header-total-height)',
          minHeight: 'var(--header-total-height)',
          maxHeight: 'var(--header-total-height)',
          flexShrink: 0,
          contain: 'strict',
          transform: 'translateZ(0)',
          overflow: 'hidden',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-4 md:px-5 lg:px-6 h-full flex items-center">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 w-full">
            {/* Logo placeholder - MUST match Header logo dimensions */}
            <div 
              className="flex items-center flex-shrink-0"
              style={{
                minWidth: '36px',
                height: '24px',
              }}
            >
              <div 
                className="w-9 h-5 sm:w-10 sm:h-6 md:w-12 md:h-7 rounded shimmer-skeleton"
                style={{ animationDelay: '0ms' }}
              />
            </div>
            
            {/* Search placeholder - MUST match Header search dimensions */}
            <div 
              className="flex-shrink-0"
              style={{
                width: 'clamp(100px, 20vw, 280px)',
                minWidth: '100px',
              }}
            >
              <div 
                className="w-full h-8 sm:h-9 md:h-10 rounded-full shimmer-skeleton"
                style={{ animationDelay: '100ms' }}
              />
            </div>

            {/* Sync status placeholder - flexible width */}
            <div className="flex-1 min-w-0 px-1 sm:px-2 md:px-3 flex items-center">
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-4 h-4 rounded-full shimmer-skeleton"
                  style={{ animationDelay: '200ms' }}
                />
                <div 
                  className="w-16 sm:w-20 h-3 rounded shimmer-skeleton"
                  style={{ animationDelay: '250ms' }}
                />
              </div>
            </div>

            {/* Avatar placeholder - MUST match Header avatar dimensions */}
            <div 
              className="flex-shrink-0 rounded-full shimmer-skeleton"
              style={{ 
                animationDelay: '300ms',
                width: 'clamp(32px, 8vw, 44px)',
                height: 'clamp(32px, 8vw, 44px)',
              }}
            />
          </div>
        </div>
      </header>
      
      {/* Empty main content area - shell only, no loader animation */}
      <main 
        role="main"
        className="bg-background"
        style={{
          flex: '1 1 auto',
          height: 'var(--main-height)',
          minHeight: 'var(--main-height)',
          maxHeight: 'var(--main-height)',
          contain: 'strict',
          transform: 'translateZ(0)',
          overflow: 'hidden',
        }}
      />
      
      {/* Bottom nav shell - MUST match BottomNav.tsx dimensions exactly */}
      <nav 
        className="fixed left-0 right-0 bg-card/98 backdrop-blur-xl border-t border-border/50 z-50 nav-contained"
        role="navigation"
        aria-label="Main navigation"
        style={{
          bottom: 0,
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)',
          paddingLeft: 'var(--safe-area-inset-left)',
          paddingRight: 'var(--safe-area-inset-right)',
          height: 'var(--bottom-nav-total-height)',
          minHeight: 'var(--bottom-nav-total-height)',
          maxHeight: 'var(--bottom-nav-total-height)',
          flexShrink: 0,
          contain: 'strict',
          transform: 'translateZ(0)',
          overflow: 'hidden',
        }}
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 h-full flex items-center">
          <div className="flex items-center justify-around w-full">
            {[0, 1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="flex flex-col items-center justify-center gap-1 px-3 sm:px-4 md:px-5 py-2"
                style={{
                  // Fixed dimensions matching actual buttons
                  minWidth: 'clamp(48px, 12vw, 64px)',
                  minHeight: 'clamp(48px, 10vw, 56px)',
                }}
              >
                <div 
                  className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-md shimmer-skeleton"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
                <div 
                  className="w-8 sm:w-9 md:w-10 h-2.5 sm:h-3 md:h-3.5 rounded shimmer-skeleton"
                  style={{ animationDelay: `${i * 100 + 50}ms` }}
                />
              </div>
            ))}
          </div>
        </div>
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
 * Content area loading placeholder - minimal version with shimmer
 */
export const ContentSkeleton = memo(function ContentSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px] bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full shimmer-skeleton" />
        <div className="w-24 h-3 rounded shimmer-skeleton" style={{ animationDelay: '100ms' }} />
      </div>
    </div>
  );
});
