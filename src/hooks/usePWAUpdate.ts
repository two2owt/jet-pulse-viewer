import { useState, useEffect, useCallback } from 'react';

export const usePWAUpdate = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      // New service worker took control, reload to get new version
      window.location.reload();
    };

    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Check if there's a waiting worker
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdatePrompt(true);
        }

        // Listen for new service workers
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available
              setWaitingWorker(newWorker);
              setShowUpdatePrompt(true);
            }
          });
        });
      } catch (error) {
        console.error('Error checking for PWA updates:', error);
      }
    };

    // Listen for controller change (when skipWaiting is called)
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    
    checkForUpdates();

    // Check for updates periodically (every 5 minutes)
    const interval = setInterval(() => {
      navigator.serviceWorker.ready.then(reg => reg.update());
    }, 5 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      clearInterval(interval);
    };
  }, []);

  const updateApp = useCallback(() => {
    if (waitingWorker) {
      // Tell the waiting service worker to take over
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setShowUpdatePrompt(false);
    }
  }, [waitingWorker]);

  const dismissUpdate = useCallback(() => {
    setShowUpdatePrompt(false);
  }, []);

  return {
    showUpdatePrompt,
    updateApp,
    dismissUpdate
  };
};
