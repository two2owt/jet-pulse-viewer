/**
 * Prefetch utilities for loading resources during idle time
 */

let mapboxPrefetched = false;

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
  // Wait for initial render to complete, then prefetch during idle
  if (document.readyState === 'complete') {
    prefetchMapbox();
  } else {
    window.addEventListener('load', () => {
      // Small delay to let critical rendering complete
      setTimeout(prefetchMapbox, 100);
    }, { once: true });
  }
};
