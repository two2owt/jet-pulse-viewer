import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export function ServiceWorkerUpdater() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleUpdate = () => {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          setWaitingWorker(registration.waiting);
        }
      });
    };

    // Check for waiting service worker on mount
    handleUpdate();

    // Listen for new service worker updates
    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
            }
          });
        }
      });
    });

    // Listen for controller change (update applied)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }, []);

  useEffect(() => {
    if (waitingWorker) {
      toast(
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-primary animate-spin" />
          <div className="flex-1">
            <p className="font-medium">New version available</p>
            <p className="text-sm text-muted-foreground">Click to update JET</p>
          </div>
        </div>,
        {
          duration: Infinity,
          id: "sw-update",
          action: {
            label: "Update",
            onClick: () => {
              waitingWorker.postMessage({ type: "SKIP_WAITING" });
            },
          },
          onDismiss: () => {
            // User dismissed, don't show again this session
          },
        }
      );
    }
  }, [waitingWorker]);

  return null;
}
