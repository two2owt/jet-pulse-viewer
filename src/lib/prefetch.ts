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
