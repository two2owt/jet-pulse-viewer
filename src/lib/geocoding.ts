/**
 * Geocoding utilities using Mapbox Geocoding API
 * Converts venue names and addresses into precise coordinates
 */

interface GeocodeResult {
  lat: number;
  lng: number;
  placeName: string;
  accuracy: 'rooftop' | 'parcel' | 'neighborhood' | 'locality';
}

/**
 * Geocode a venue using Mapbox Geocoding API
 * @param query - Venue name and location (e.g., "Rooftop 210 Charlotte NC")
 * @param mapboxToken - Mapbox access token
 * @param proximity - Optional center point to bias results [lng, lat]
 */
export async function geocodeVenue(
  query: string,
  mapboxToken: string,
  proximity?: [number, number]
): Promise<GeocodeResult | null> {
  try {
    const encodedQuery = encodeURIComponent(query);
    let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}&types=poi,address&limit=1`;
    
    // Add proximity biasing if provided for better local results
    if (proximity) {
      url += `&proximity=${proximity[0]},${proximity[1]}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Geocoding API error:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.warn('No geocoding results for:', query);
      return null;
    }

    const feature = data.features[0];
    const [lng, lat] = feature.center;
    
    // Determine accuracy based on result type
    const types = feature.place_type || [];
    let accuracy: GeocodeResult['accuracy'] = 'locality';
    
    if (types.includes('poi')) {
      accuracy = 'rooftop';
    } else if (types.includes('address')) {
      accuracy = 'parcel';
    } else if (types.includes('neighborhood')) {
      accuracy = 'neighborhood';
    }

    return {
      lat,
      lng,
      placeName: feature.place_name,
      accuracy
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Batch geocode multiple venues with rate limiting
 * @param venues - Array of venue queries
 * @param mapboxToken - Mapbox access token
 * @param proximity - Optional center point to bias results
 * @param delayMs - Delay between requests to respect rate limits (default 200ms)
 */
export async function batchGeocodeVenues(
  venues: { name: string; city: string }[],
  mapboxToken: string,
  proximity?: [number, number],
  delayMs: number = 200
): Promise<Map<string, GeocodeResult>> {
  const results = new Map<string, GeocodeResult>();

  for (const venue of venues) {
    const query = `${venue.name} ${venue.city}`;
    const result = await geocodeVenue(query, mapboxToken, proximity);
    
    if (result) {
      results.set(venue.name, result);
    }
    
    // Rate limiting delay
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Cache geocoding results in localStorage
 */
export function cacheGeocodeResult(venueName: string, result: GeocodeResult): void {
  try {
    const cache = getGeocodeCache();
    cache[venueName] = {
      ...result,
      timestamp: Date.now()
    };
    localStorage.setItem('geocode_cache', JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to cache geocode result:', error);
  }
}

/**
 * Get cached geocoding result
 * @param venueName - Name of the venue
 * @param maxAgeMs - Maximum age of cached result in milliseconds (default 30 days)
 */
export function getCachedGeocodeResult(
  venueName: string,
  maxAgeMs: number = 30 * 24 * 60 * 60 * 1000
): GeocodeResult | null {
  try {
    const cache = getGeocodeCache();
    const cached = cache[venueName];
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > maxAgeMs) {
      // Expired
      return null;
    }
    
    return {
      lat: cached.lat,
      lng: cached.lng,
      placeName: cached.placeName,
      accuracy: cached.accuracy
    };
  } catch (error) {
    console.error('Failed to get cached geocode result:', error);
    return null;
  }
}

function getGeocodeCache(): Record<string, GeocodeResult & { timestamp: number }> {
  try {
    const cached = localStorage.getItem('geocode_cache');
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}
