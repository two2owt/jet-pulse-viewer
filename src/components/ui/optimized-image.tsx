import { useState, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { 
  generateSrcSet, 
  generateSizesAttribute, 
  getSupabaseImageUrl,
  isSupabaseStorageUrl,
  ImageSize 
} from "@/lib/image-utils";

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
}

export const OptimizedImage = ({ 
  src, 
  alt, 
  className, 
  fallback,
  eager = false,
  responsive = true,
  responsiveSizes = ['thumbnail', 'small', 'medium', 'large'],
  sizesConfig,
  quality = 80,
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

  // Generate responsive attributes for Supabase images
  const isSupabase = isSupabaseStorageUrl(src);
  const optimizedSrc = isSupabase ? getSupabaseImageUrl(src, 640, quality) : src;
  const srcSet = responsive && isSupabase ? generateSrcSet(src, responsiveSizes, quality) : undefined;
  const sizes = responsive && isSupabase ? generateSizesAttribute(sizesConfig) : undefined;

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
};
