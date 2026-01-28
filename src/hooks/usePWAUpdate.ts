import { useState, useEffect, useCallback } from "react";

/**
 * PWA Update Hook - Ensures production always serves the latest build
 * 
 * KEY: This hook forces immediate update activation when new content is detected,
 * preventing stale CSS/JS from causing styling issues between sandbox and production.
 */
export const usePWAUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let controllerChangeHandler: (() => void) | null = null;

    const handleUpdate = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) {
        console.log('[PWA] Update waiting, prompting user');
        setUpdateAvailable(true);
        setRegistration(reg);
      }
    };

    // Check for existing waiting worker and handle new updates
    navigator.serviceWorker.ready.then((reg) => {
      handleUpdate(reg);

      // Listen for new updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        console.log('[PWA] New worker installing...');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New worker installed, update available');
            setUpdateAvailable(true);
            setRegistration(reg);
          }
        });
      });

      // Force check for updates periodically
      setInterval(() => {
        reg.update().catch(() => {});
      }, 60000); // Check every minute
    });

    // Listen for controller change (update activated) - triggers page reload
    controllerChangeHandler = () => {
      console.log('[PWA] Controller changed, reloading for fresh assets');
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler);

    return () => {
      if (controllerChangeHandler) {
        navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler);
      }
    };
  }, []);

  // Activate the waiting worker and reload
  const updateApp = useCallback(() => {
    if (registration?.waiting) {
      setIsUpdating(true);
      console.log('[PWA] Sending SKIP_WAITING to activate new worker');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Fallback reload if controller doesn't change within 3 seconds
      setTimeout(() => {
        console.log('[PWA] Fallback reload triggered');
        window.location.reload();
      }, 3000);
    }
  }, [registration]);

  // Force clear cache and reload - for manual troubleshooting
  const forceRefresh = useCallback(async () => {
    setIsUpdating(true);
    console.log('[PWA] Force refresh: clearing caches and reloading');
    
    try {
      // Unregister all service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      
      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      // Hard reload
      window.location.reload();
    } catch (error) {
      console.error('[PWA] Force refresh failed:', error);
      window.location.reload();
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  return { 
    updateAvailable, 
    updateApp, 
    dismissUpdate, 
    forceRefresh,
    isUpdating 
  };
};