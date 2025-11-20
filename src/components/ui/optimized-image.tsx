import { useState, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  eager?: boolean;
}

export const OptimizedImage = ({ 
  src, 
  alt, 
  className, 
  fallback,
  eager = false,
  onError,
  ...props 
}: OptimizedImageProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    onError?.(e);
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={cn(
        "transition-opacity duration-300",
        isLoaded ? "opacity-100" : "opacity-0",
        className
      )}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  );
};
