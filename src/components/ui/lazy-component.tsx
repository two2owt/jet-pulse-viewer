import { ReactNode, memo, Suspense, lazy, ComponentType } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

interface LazyComponentProps {
  children: ReactNode;
  className?: string;
  fallback?: ReactNode;
  rootMargin?: string;
  minHeight?: string | number;
  animate?: boolean;
}

/**
 * Defers rendering of children until the component is near the viewport.
 * Uses IntersectionObserver for efficient scroll-based loading.
 */
export const LazyComponent = memo(({
  children,
  className,
  fallback,
  rootMargin = '200px',
  minHeight = 100,
  animate = true,
}: LazyComponentProps) => {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>({
    rootMargin,
    freezeOnceVisible: true,
  });

  const heightStyle = typeof minHeight === 'number' ? `${minHeight}px` : minHeight;

  return (
    <div
      ref={ref}
      className={cn(
        animate && 'transition-all duration-500 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
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

interface LazySectionProps {
  children: ReactNode;
  className?: string;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
}

/**
 * Section wrapper that renders children with fade-in animation when entering viewport.
 * Ideal for below-the-fold content sections.
 */
export const LazySection = memo(({
  children,
  className,
  fallback,
  rootMargin = '150px',
  threshold = 0.1,
}: LazySectionProps) => {
  const [ref, isVisible] = useIntersectionObserver<HTMLElement>({
    rootMargin,
    threshold,
    freezeOnceVisible: true,
  });

  return (
    <section
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        className
      )}
    >
      {isVisible ? children : fallback}
    </section>
  );
});

LazySection.displayName = 'LazySection';

interface LazyModuleProps<T extends ComponentType<any>> {
  factory: () => Promise<{ default: T }>;
  fallback?: ReactNode;
  rootMargin?: string;
  props?: React.ComponentProps<T>;
}

/**
 * Lazy loads a component module only when it enters the viewport.
 * Combines React.lazy with IntersectionObserver for optimal loading.
 */
export function LazyModule<T extends ComponentType<any>>({
  factory,
  fallback,
  rootMargin = '300px',
  props,
}: LazyModuleProps<T>) {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>({
    rootMargin,
    freezeOnceVisible: true,
  });

  const LazyLoadedComponent = isVisible ? lazy(factory) : null;

  return (
    <div ref={ref}>
      {isVisible && LazyLoadedComponent ? (
        <Suspense fallback={fallback || <Skeleton className="w-full h-32 rounded-xl" />}>
          <LazyLoadedComponent {...(props as any)} />
        </Suspense>
      ) : (
        fallback || <Skeleton className="w-full h-32 rounded-xl" />
      )}
    </div>
  );
}

interface LazyListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  itemClassName?: string;
  batchSize?: number;
  rootMargin?: string;
}

/**
 * Renders a list of items that animate in as they enter the viewport.
 * Each item gets staggered animation timing.
 */
export function LazyList<T>({
  items,
  renderItem,
  className,
  itemClassName,
  batchSize = 10,
  rootMargin = '100px',
}: LazyListProps<T>) {
  return (
    <div className={className}>
      {items.slice(0, batchSize).map((item, index) => (
        <LazyListItem
          key={index}
          index={index}
          rootMargin={rootMargin}
          className={itemClassName}
        >
          {renderItem(item, index)}
        </LazyListItem>
      ))}
    </div>
  );
}

interface LazyListItemProps {
  children: ReactNode;
  index: number;
  rootMargin?: string;
  className?: string;
}

const LazyListItem = memo(({
  children,
  index,
  rootMargin = '100px',
  className,
}: LazyListItemProps) => {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>({
    rootMargin,
    freezeOnceVisible: true,
  });

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-500 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
      style={{ transitionDelay: isVisible ? `${index * 50}ms` : '0ms' }}
    >
      {children}
    </div>
  );
});

LazyListItem.displayName = 'LazyListItem';
