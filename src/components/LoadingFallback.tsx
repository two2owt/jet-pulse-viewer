import { memo } from "react";

/**
 * Full-page loading fallback that matches the app shell design
 * Used as Suspense fallback throughout the app
 */
export const LoadingFallback = memo(function LoadingFallback() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header skeleton */}
      <header className="h-[52px] px-3 flex items-center justify-between bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
          <div className="w-12 h-5 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex-1 max-w-[300px] h-9 mx-4 rounded-lg bg-muted animate-pulse" />
        <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
      </header>
      
      {/* Main content skeleton */}
      <main className="flex-1 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-muted border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </main>
      
      {/* Bottom nav skeleton */}
      <nav className="h-[60px] px-6 flex items-center justify-around bg-card border-t border-border flex-shrink-0 pb-safe">
        {[0, 1, 2, 3].map((i) => (
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
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <span className="text-sm text-muted-foreground">Loading content...</span>
      </div>
    </div>
  );
});
