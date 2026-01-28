import { usePWAUpdate } from "@/hooks/usePWAUpdate";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

/**
 * PWA Update Prompt - Shows a banner when a new version is available
 * 
 * This component ensures users always get the latest CSS/JS by prompting
 * them to reload when a new service worker is detected.
 */
export const PWAUpdatePrompt = () => {
  const { updateAvailable, updateApp, dismissUpdate, isUpdating } = usePWAUpdate();

  if (!updateAvailable) return null;

  return (
    <div 
      className="fixed bottom-[calc(var(--bottom-nav-total-height)+1rem)] left-4 right-4 z-50 
                 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl
                 p-4 flex items-center justify-between gap-3
                 animate-in slide-in-from-bottom-4 duration-300"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <RefreshCw className={`w-5 h-5 text-primary ${isUpdating ? 'animate-spin' : ''}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            Update Available
          </p>
          <p className="text-xs text-muted-foreground truncate">
            Refresh for the latest version
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="default"
          size="sm"
          onClick={updateApp}
          disabled={isUpdating}
          className="h-8 px-3 text-xs font-semibold"
        >
          {isUpdating ? 'Updating...' : 'Update'}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={dismissUpdate}
          className="h-8 w-8"
          aria-label="Dismiss update notification"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
