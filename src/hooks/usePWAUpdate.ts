 import { useState, useEffect } from "react";
 
 export const usePWAUpdate = () => {
   const [updateAvailable, setUpdateAvailable] = useState(false);
   const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
 
   useEffect(() => {
     if (!('serviceWorker' in navigator)) return;
 
     const handleUpdate = (reg: ServiceWorkerRegistration) => {
       if (reg.waiting) {
         setUpdateAvailable(true);
         setRegistration(reg);
       }
     };
 
     // Check for existing waiting worker
     navigator.serviceWorker.ready.then((reg) => {
       handleUpdate(reg);
 
       // Listen for new updates
       reg.addEventListener('updatefound', () => {
         const newWorker = reg.installing;
         if (!newWorker) return;
 
         newWorker.addEventListener('statechange', () => {
           if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
             setUpdateAvailable(true);
             setRegistration(reg);
           }
         });
       });
     });
 
     // Listen for controller change (update activated)
     navigator.serviceWorker.addEventListener('controllerchange', () => {
       window.location.reload();
     });
   }, []);
 
   const updateApp = () => {
     if (registration?.waiting) {
       registration.waiting.postMessage({ type: 'SKIP_WAITING' });
     }
   };
 
   const dismissUpdate = () => {
     setUpdateAvailable(false);
   };
 
   return { updateAvailable, updateApp, dismissUpdate };
 };