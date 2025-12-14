import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";

export const PWAUpdatePrompt = () => {
  const { showUpdatePrompt, updateApp, dismissUpdate } = usePWAUpdate();

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300 w-[calc(100%-2rem)] max-w-md">
      <div className="relative bg-primary text-primary-foreground rounded-xl p-4 shadow-2xl flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-foreground/20">
          <RefreshCw className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Update Available</p>
          <p className="text-xs opacity-90">A new version of JET is ready</p>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={updateApp}
          className="shrink-0"
        >
          Update
        </Button>

        <button
          onClick={dismissUpdate}
          className="absolute -top-2 -right-2 p-1 rounded-full bg-background text-foreground shadow-md hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
