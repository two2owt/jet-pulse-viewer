import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { MapSkeleton } from "@/components/skeletons";
import type { City } from "@/types/cities";
import type { Venue } from "@/types/venue";

// Lazy load MapboxHeatmap only when visible in viewport
const MapboxHeatmap = lazy(() => 
  import("@/components/MapboxHeatmap").then(m => ({ default: m.MapboxHeatmap }))
);

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
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  // Use Intersection Observer to detect when component enters viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      // Fallback: load immediately if IO not supported
      setIsVisible(true);
      setHasBeenVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasBeenVisible(true);
          // Once visible, disconnect observer - no need to track anymore
          observer.disconnect();
        }
      },
      {
        // Start loading slightly before visible (100px threshold)
        rootMargin: '100px',
        threshold: 0,
      }
    );

    observer.observe(container);

    return () => observer.disconnect();
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
