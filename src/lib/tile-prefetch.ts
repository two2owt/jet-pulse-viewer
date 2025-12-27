/**
 * Mapbox tile prefetching for faster repeat visits
 * Prefetches tiles for the default city area at common zoom levels
 */

import { CITIES } from "@/types/cities";

// Default city for prefetching (Charlotte)
const DEFAULT_CITY = CITIES[0];

// Zoom levels to prefetch (city overview to neighborhood level)
const PREFETCH_ZOOM_LEVELS = [10, 11, 12, 13];

// Tile size in degrees at different zoom levels (approximate)
const TILE_SIZE_AT_ZOOM: Record<number, number> = {
  10: 0.35,
  11: 0.175,
  12: 0.088,
  13: 0.044,
};

// Max tiles per zoom level to avoid excessive prefetching
const MAX_TILES_PER_ZOOM = 16;

/**
 * Convert lat/lng to tile coordinates
 */
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

/**
 * Generate tile URLs for a given area and zoom level
 */
function generateTileUrls(
  centerLat: number,
  centerLng: number,
  zoom: number,
  style: string = 'dark-v11'
): string[] {
  const urls: string[] = [];
  const centerTile = latLngToTile(centerLat, centerLng, zoom);
  
  // Calculate tile radius based on zoom level (fewer tiles at higher zooms)
  const radius = zoom <= 11 ? 2 : 1;
  
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const x = centerTile.x + dx;
      const y = centerTile.y + dy;
      
      // Mapbox vector tile URL format
      // Using the same style as the map (dark-v11)
      urls.push(
        `https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/${zoom}/${x}/${y}@2x?access_token=PLACEHOLDER`
      );
      
      if (urls.length >= MAX_TILES_PER_ZOOM) break;
    }
    if (urls.length >= MAX_TILES_PER_ZOOM) break;
  }
  
  return urls;
}

/**
 * Prefetch Mapbox tiles for the default city
 * Should be called after the user has interacted with the map
 * so we have a valid token cached
 */
export async function prefetchDefaultCityTiles(): Promise<void> {
  // Check if we have a cached token
  const tokenCache = localStorage.getItem('mapbox_token_cache') || 
                     sessionStorage.getItem('mapbox_token_cache');
  
  if (!tokenCache) {
    console.log('Tile prefetch: No token cached, skipping');
    return;
  }
  
  let token: string;
  try {
    const { token: cachedToken } = JSON.parse(tokenCache);
    token = cachedToken;
  } catch {
    console.log('Tile prefetch: Invalid token cache');
    return;
  }
  
  // Check if we've already prefetched recently
  const lastPrefetch = localStorage.getItem('tile_prefetch_timestamp');
  if (lastPrefetch) {
    const elapsed = Date.now() - parseInt(lastPrefetch, 10);
    // Only prefetch once per day
    if (elapsed < 24 * 60 * 60 * 1000) {
      console.log('Tile prefetch: Already prefetched recently');
      return;
    }
  }
  
  console.log(`Tile prefetch: Starting for ${DEFAULT_CITY.name}`);
  
  // Generate tile URLs for each zoom level
  const allUrls: string[] = [];
  for (const zoom of PREFETCH_ZOOM_LEVELS) {
    const urls = generateTileUrls(
      DEFAULT_CITY.lat,
      DEFAULT_CITY.lng,
      zoom
    ).map(url => url.replace('PLACEHOLDER', token));
    
    allUrls.push(...urls);
  }
  
  // Prefetch tiles using fetch with cache mode
  let successCount = 0;
  const prefetchPromises = allUrls.map(async (url) => {
    try {
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        // This hints the browser to cache the response
        cache: 'force-cache',
      });
      
      if (response.ok) {
        successCount++;
      }
    } catch {
      // Ignore individual tile failures
    }
  });
  
  // Prefetch in batches to avoid overwhelming the network
  const BATCH_SIZE = 4;
  for (let i = 0; i < prefetchPromises.length; i += BATCH_SIZE) {
    const batch = prefetchPromises.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(batch);
    
    // Small delay between batches to be nice to the network
    if (i + BATCH_SIZE < prefetchPromises.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`Tile prefetch: Completed ${successCount}/${allUrls.length} tiles`);
  
  // Record prefetch timestamp
  localStorage.setItem('tile_prefetch_timestamp', Date.now().toString());
}

/**
 * Initialize tile prefetching
 * Should be called during idle time after the app is loaded
 */
export function initTilePrefetching(): void {
  // Wait for the page to be fully interactive
  if (document.readyState === 'complete') {
    schedulePrefetch();
  } else {
    window.addEventListener('load', schedulePrefetch, { once: true });
  }
}

function schedulePrefetch(): void {
  // Wait 10 seconds after load to avoid competing with critical resources
  setTimeout(() => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(
        () => prefetchDefaultCityTiles(),
        { timeout: 30000 }
      );
    } else {
      prefetchDefaultCityTiles();
    }
  }, 10000);
}
