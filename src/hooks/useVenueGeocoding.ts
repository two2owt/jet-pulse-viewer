import { useEffect, useState } from 'react';
import { geocodeVenue, getCachedGeocodeResult, cacheGeocodeResult } from '@/lib/geocoding';
import type { Venue } from '@/components/Heatmap';

interface GeocodeProgress {
  total: number;
  completed: number;
  errors: number;
}

/**
 * Hook to geocode venues and update their coordinates
 */
export function useVenueGeocoding(
  venues: Venue[],
  mapboxToken: string,
  cityCenter?: [number, number]
) {
  const [geocodedVenues, setGeocodedVenues] = useState<Venue[]>(venues);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [progress, setProgress] = useState<GeocodeProgress>({ total: 0, completed: 0, errors: 0 });

  useEffect(() => {
    if (!mapboxToken || venues.length === 0) return;

    const geocodeVenues = async () => {
      setIsGeocoding(true);
      setProgress({ total: venues.length, completed: 0, errors: 0 });

      const updated: Venue[] = [];

      for (let i = 0; i < venues.length; i++) {
        const venue = venues[i];
        
        // Check cache first
        let cached = getCachedGeocodeResult(venue.name);
        
        if (cached) {
          // Use cached coordinates
          updated.push({
            ...venue,
            lat: cached.lat,
            lng: cached.lng
          });
          setProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
          continue;
        }

        // Geocode the venue
        const query = `${venue.name} ${venue.neighborhood}`;
        const result = await geocodeVenue(query, mapboxToken, cityCenter);

        if (result && result.accuracy === 'rooftop') {
          // Only use results with rooftop accuracy (POI level)
          updated.push({
            ...venue,
            lat: result.lat,
            lng: result.lng
          });
          
          // Cache the result
          cacheGeocodeResult(venue.name, result);
          
          console.log(`✓ Geocoded ${venue.name} with ${result.accuracy} accuracy`);
        } else if (result) {
          // Use existing coordinates if accuracy is not good enough
          console.warn(`⚠ Low accuracy for ${venue.name}: ${result.accuracy}, keeping original coordinates`);
          updated.push(venue);
          setProgress(prev => ({ ...prev, errors: prev.errors + 1 }));
        } else {
          // Keep original coordinates if geocoding failed
          console.error(`✗ Failed to geocode ${venue.name}, keeping original coordinates`);
          updated.push(venue);
          setProgress(prev => ({ ...prev, errors: prev.errors + 1 }));
        }

        setProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
        
        // Update incrementally so markers appear as they're geocoded
        setGeocodedVenues([...updated]);

        // Rate limiting - wait between requests
        if (i < venues.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      setIsGeocoding(false);
      console.log(`Geocoding complete: ${updated.length} venues processed, ${progress.errors} errors`);
    };

    geocodeVenues();
  }, [venues, mapboxToken, cityCenter]);

  return {
    venues: geocodedVenues,
    isGeocoding,
    progress
  };
}
