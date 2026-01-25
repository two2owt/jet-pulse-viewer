import { memo } from "react";

/**
 * Compact loading spinner for inline content - used for action-triggered loading states
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
