import { useState, ImgHTMLAttributes, memo } from "react";
import { cn } from "@/lib/utils";
import { 
  generateSrcSet, 
  generateSizesAttribute, 
  getSupabaseImageUrl,
  isSupabaseStorageUrl,
  ImageSize 
} from "@/lib/image-utils";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Skeleton } from "./skeleton";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading' | 'sizes'> {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  eager?: boolean;
  responsive?: boolean;
  responsiveSizes?: ImageSize[];
  sizesConfig?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  quality?: number;
  /** Use intersection observer for deferred loading (more aggressive than native lazy) */
  deferLoad?: boolean;
}

export const OptimizedImage = memo(({ 
  src, 
  alt, 
  className, 
  fallback,
  eager = false,
  responsive = true,
  responsiveSizes = ['thumbnail', 'small', 'medium', 'large'],
  sizesConfig,
  quality = 80,
  deferLoad = false,
  onError,
  ...props 
}: OptimizedImageProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Use intersection observer for deferred loading
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>({
    rootMargin: '150px',
    freezeOnceVisible: true,
  });

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

  // Generate responsive attributes for Supabase images
  const isSupabase = isSupabaseStorageUrl(src);
  const optimizedSrc = isSupabase ? getSupabaseImageUrl(src, 640, quality) : src;
  const srcSet = responsive && isSupabase ? generateSrcSet(src, responsiveSizes, quality) : undefined;
  const sizes = responsive && isSupabase ? generateSizesAttribute(sizesConfig) : undefined;

  // If deferLoad is enabled, wrap in observer
  if (deferLoad) {
    return (
      <div ref={ref} className={cn("relative", className)}>
        {isVisible ? (
          <img
            src={optimizedSrc}
            srcSet={srcSet}
            sizes={sizes}
            alt={alt}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            className={cn(
              "transition-opacity duration-300 w-full h-full object-cover",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
            onError={handleError}
            onLoad={handleLoad}
            {...props}
          />
        ) : (
          <Skeleton className="absolute inset-0 w-full h-full" />
        )}
      </div>
    );
  }

  return (
    <img
      src={optimizedSrc}
      srcSet={srcSet}
      sizes={sizes}
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
});

OptimizedImage.displayName = 'OptimizedImage';
