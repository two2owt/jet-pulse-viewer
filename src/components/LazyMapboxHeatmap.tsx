import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { MapSkeleton } from "@/components/skeletons";
import { useConnectionSpeed } from "@/hooks/useConnectionSpeed";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { OfflineMapIndicator } from "@/components/OfflineMapIndicator";
import type { City } from "@/types/cities";
import type { Venue } from "@/types/venue";

// Lazy load MapboxHeatmap only when visible in viewport
const MapboxHeatmap = lazy(() => 
  import("@/components/MapboxHeatmap").then(m => ({ default: m.MapboxHeatmap }))
);

// Preload function to start fetching the Mapbox chunk early
const preloadMapboxChunk = (shouldPreloadExtras: boolean) => {
  // In production, mapbox-gl is loaded from CDN - check if already available
  if (typeof window !== 'undefined' && (window as any).mapboxgl) {
    // Already loaded from CDN, just preload the component
    import("@/components/MapboxHeatmap");
    return;
  }
  
  // This triggers the dynamic import but doesn't render
  import("@/components/MapboxHeatmap");
  // Also preload mapbox-gl library itself (dev mode fallback)
  import("mapbox-gl").catch(() => {});
  
  // On fast connections, also preload the CSS (redundant if CDN script loads it)
  if (shouldPreloadExtras) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.16.0/mapbox-gl.css';
    document.head.appendChild(link);
  }
};

interface LazyMapboxHeatmapProps {
  onVenueSelect: (venue: Venue) => void;
  venues: Venue[];
  mapboxToken: string;
  selectedCity: City;
  onCityChange: (city: City) => void;
  onNearestCityDetected?: (city: City) => void;
  onDetectedLocationNameChange?: (name: string | null) => void;
  isLoadingVenues?: boolean;
  selectedVenue?: Venue | null;
  resetUIKey?: number;
  isTokenLoading?: boolean;
}

export const LazyMapboxHeatmap = (props: LazyMapboxHeatmapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const hasPreloaded = useRef(false);
  
  // Get connection-aware preload distances
  const { preloadDistance, renderDistance, shouldPreloadExtras, isSlowConnection } = useConnectionSpeed();

  // Use Intersection Observer to detect when component enters viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      // Fallback: load immediately if IO not supported
      setHasBeenVisible(true);
      return;
    }

    // Preload observer - triggers chunk fetch based on connection speed
    // Fast connections: 500-800px, Slow connections: 100px
    const preloadObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasPreloaded.current) {
          hasPreloaded.current = true;
          preloadMapboxChunk(shouldPreloadExtras);
          preloadObserver.disconnect();
        }
      },
      {
        rootMargin: `${preloadDistance}px`,
        threshold: 0,
      }
    );

    // Render observer - actually renders the component
    // Fast connections: 150px, Slow connections: 50px
    const renderObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setHasBeenVisible(true);
          renderObserver.disconnect();
        }
      },
      {
        rootMargin: `${renderDistance}px`,
        threshold: 0,
      }
    );

    preloadObserver.observe(container);
    renderObserver.observe(container);

    return () => {
      preloadObserver.disconnect();
      renderObserver.disconnect();
    };
  }, [preloadDistance, renderDistance, shouldPreloadExtras]);

  const isOnline = useOnlineStatus();

  return (
    <div 
      ref={containerRef}
      className="relative"
      data-map-container="true"
      style={{
        // Explicit dimensions to match skeleton and prevent CLS
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        minHeight: '100%',
        contain: 'strict',
        transform: 'translateZ(0)',
        overflow: 'hidden',
        isolation: 'isolate',
      }}
      data-connection-speed={isSlowConnection ? 'slow' : 'fast'}
      data-online={isOnline ? 'true' : 'false'}
    >
      {/* Offline indicator overlay */}
      <OfflineMapIndicator compact />
      
      {hasBeenVisible ? (
        <Suspense fallback={<MapSkeleton isTokenLoading={props.isTokenLoading} />}>
          <MapboxHeatmap {...props} />
        </Suspense>
      ) : (
        <MapSkeleton isTokenLoading={props.isTokenLoading} />
      )}
    </div>
  );
};

export default LazyMapboxHeatmap;
