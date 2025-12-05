import { useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export const PWAInstallPrompt = () => {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || isInstalled || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Download className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">Install JET</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Add to home screen for the best experience
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 p-1 rounded-full hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setDismissed(true)}
          >
            Not now
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={installApp}
          >
            Install
          </Button>
        </div>
      </div>
    </div>
  );
};
