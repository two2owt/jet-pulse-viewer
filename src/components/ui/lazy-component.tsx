import { ReactNode, memo } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

interface LazyComponentProps {
  children: ReactNode;
  className?: string;
  fallback?: ReactNode;
  rootMargin?: string;
  minHeight?: string | number;
}

/**
 * Defers rendering of children until the component is near the viewport.
 * Uses IntersectionObserver for efficient scroll-based loading.
 */
export const LazyComponent = memo(({
  children,
  className,
  fallback,
  rootMargin = '200px', // Preload when within 200px of viewport
  minHeight = 100,
}: LazyComponentProps) => {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>({
    rootMargin,
    freezeOnceVisible: true,
  });

  const heightStyle = typeof minHeight === 'number' ? `${minHeight}px` : minHeight;

  return (
    <div
      ref={ref}
      className={cn('transition-opacity duration-300', className)}
      style={{ minHeight: !isVisible ? heightStyle : undefined }}
    >
      {isVisible ? (
        children
      ) : (
        fallback || (
          <div className="flex items-center justify-center w-full h-full" style={{ minHeight: heightStyle }}>
            <Skeleton className="w-full h-full rounded-xl" />
          </div>
        )
      )}
    </div>
  );
});

LazyComponent.displayName = 'LazyComponent';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  containerClassName?: string;
}

/**
 * Image component that only loads when near viewport.
 * Different from OptimizedImage's native lazy loading - this completely
 * defers the image element creation until visible.
 */
export const LazyImage = memo(({
  src,
  alt,
  className,
  containerClassName,
  fallbackSrc,
  ...props
}: LazyImageProps) => {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>({
    rootMargin: '100px',
    freezeOnceVisible: true,
  });

  return (
    <div ref={ref} className={containerClassName}>
      {isVisible ? (
        <img
          src={src}
          alt={alt}
          className={className}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            if (fallbackSrc) {
              e.currentTarget.src = fallbackSrc;
            }
          }}
          {...props}
        />
      ) : (
        <Skeleton className={cn('w-full h-full', className)} />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';
