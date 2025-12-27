/**
 * Prefetch utilities for loading resources during idle time
 */

import { supabase } from "@/integrations/supabase/client";

let mapboxPrefetched = false;
let mapboxTokenPrefetched = false;

const TOKEN_CACHE_KEY = 'mapbox_token_cache';
const TOKEN_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Prefetch the Mapbox token from the edge function
 * This ensures the token is cached before the map component mounts
 */
export const prefetchMapboxToken = async () => {
  if (mapboxTokenPrefetched) return;
  
  // Check if already cached
  try {
    const cached = localStorage.getItem(TOKEN_CACHE_KEY) || sessionStorage.getItem(TOKEN_CACHE_KEY);
    if (cached) {
      const { timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < TOKEN_CACHE_DURATION) {
        mapboxTokenPrefetched = true;
        return; // Already have a valid cached token
      }
    }
  } catch {
    // Continue to fetch
  }
  
  mapboxTokenPrefetched = true;
  
  try {
    const { data, error } = await supabase.functions.invoke("get-mapbox-token");
    if (!error && data?.token) {
      const cache = { token: data.token, timestamp: Date.now() };
      localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(cache));
      sessionStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(cache));
      console.log('Prefetch: Mapbox token cached successfully');
    }
  } catch {
    mapboxTokenPrefetched = false;
  }
};

/**
 * Prefetch the Mapbox chunk during browser idle time
 * This loads the heavy Mapbox JS before users need it
 */
export const prefetchMapbox = () => {
  if (mapboxPrefetched) return;
  
  const prefetch = () => {
    mapboxPrefetched = true;
    // Dynamic import triggers the chunk to load and cache
    import('mapbox-gl').catch(() => {
      // Silently fail - will load normally when needed
      mapboxPrefetched = false;
    });
  };

  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(prefetch, { timeout: 3000 });
  } else {
    setTimeout(prefetch, 1000);
  }
};

/**
 * Register prefetch handlers to load resources during idle time
 * Should be called once on app initialization
 */
export const initPrefetching = () => {
  // Prefetch Mapbox token immediately - this is critical for initial map load
  // Don't wait for idle, start fetching right away
  prefetchMapboxToken();
  
  // Wait for initial render to complete, then prefetch JS chunks during idle
  // Use a longer delay to ensure critical path is fully complete
  if (document.readyState === 'complete') {
    // Delay prefetch to after Time to Interactive (~3s on mobile)
    setTimeout(prefetchMapbox, 3000);
  } else {
    window.addEventListener('load', () => {
      // Longer delay to let critical rendering and LCP complete
      setTimeout(prefetchMapbox, 3000);
    }, { once: true });
  }
};
