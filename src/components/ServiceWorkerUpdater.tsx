import { useEffect, useRef } from "react";

export function ServiceWorkerUpdater() {
  const hasReloaded = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    
    // Prevent reload loop by checking sessionStorage
    const reloadKey = 'sw_reload_' + Date.now().toString().slice(0, -4); // Group by ~10 second windows
    const hasRecentReload = sessionStorage.getItem('sw_recent_reload');
    
    if (hasRecentReload) {
      // Already reloaded recently, don't set up reload listener
      console.log('ServiceWorkerUpdater: Skipping reload listener to prevent loop');
      return;
    }

    // Listen for controller change (update applied) with guard against loops
    const handleControllerChange = () => {
      if (hasReloaded.current) return;
      
      // Mark that we're about to reload
      hasReloaded.current = true;
      sessionStorage.setItem('sw_recent_reload', 'true');
      
      // Clear the flag after 30 seconds to allow future updates
      setTimeout(() => {
        sessionStorage.removeItem('sw_recent_reload');
      }, 30000);
      
      window.location.reload();
    };
    
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
