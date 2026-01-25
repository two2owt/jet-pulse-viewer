import { useState, useEffect } from "react";

/**
 * Hook that returns true after the first paint is complete and browser is idle.
 * Use this to defer non-critical data fetching to reduce Total Blocking Time (TBT).
 * 
 * The deferral strategy:
 * 1. Wait for initial React render to complete
 * 2. Use requestIdleCallback to wait for browser idle time
 * 3. Return true to enable deferred operations
 */
export const useDeferredInit = (delayMs: number = 100): boolean => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // First, yield to allow React to complete initial render
    const scheduleInit = () => {
      if ('requestIdleCallback' in window) {
        // Use requestIdleCallback with timeout for optimal scheduling
        (window as any).requestIdleCallback(
          () => {
            setIsReady(true);
          },
          { timeout: delayMs + 500 } // Add buffer for slow devices
        );
      } else {
        // Fallback for Safari - use double rAF + setTimeout
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              setIsReady(true);
            }, delayMs);
          });
        });
      }
    };

    // Small initial delay to ensure React render is complete
    const timer = setTimeout(scheduleInit, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs]);

  return isReady;
};

/**
 * Returns true after a longer delay, suitable for very low-priority operations
 * like analytics, prefetching, or background sync.
 */
export const useDeferredInitLow = (): boolean => {
  return useDeferredInit(500);
};

export default useDeferredInit;
