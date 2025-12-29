import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { MapSkeleton } from "@/components/skeletons";
import type { City } from "@/types/cities";
import type { Venue } from "@/types/venue";

// Lazy load MapboxHeatmap only when visible in viewport
const MapboxHeatmap = lazy(() => 
  import("@/components/MapboxHeatmap").then(m => ({ default: m.MapboxHeatmap }))
);

// Preload function to start fetching the Mapbox chunk early
const preloadMapboxChunk = () => {
  // This triggers the dynamic import but doesn't render
  import("@/components/MapboxHeatmap");
  // Also preload mapbox-gl library itself
  import("mapbox-gl");
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

    // Preload observer - triggers chunk fetch 500px before visible
    const preloadObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasPreloaded.current) {
          hasPreloaded.current = true;
          preloadMapboxChunk();
          preloadObserver.disconnect();
        }
      },
      {
        rootMargin: '500px', // Start preloading 500px before visible
        threshold: 0,
      }
    );

    // Render observer - actually renders the component 100px before visible
    const renderObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setHasBeenVisible(true);
          renderObserver.disconnect();
        }
      },
      {
        rootMargin: '100px', // Render 100px before visible
        threshold: 0,
      }
    );

    preloadObserver.observe(container);
    renderObserver.observe(container);

    return () => {
      preloadObserver.disconnect();
      renderObserver.disconnect();
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="h-full w-full relative"
      style={{
        contain: 'layout style paint',
        contentVisibility: 'auto',
        containIntrinsicSize: '100vw 100%',
      }}
    >
      {hasBeenVisible ? (
        <Suspense fallback={<MapSkeleton />}>
          <MapboxHeatmap {...props} />
        </Suspense>
      ) : (
        <MapSkeleton />
      )}
    </div>
  );
};

export default LazyMapboxHeatmap;
