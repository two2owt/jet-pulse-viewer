import { Download, X, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import jetLogo from "@/assets/jet-logo.png";

export const PWAInstallPrompt = () => {
  const { isInstallable, isInstalled, isIOS, showPrompt, installApp, dismissPrompt } = usePWAInstall();

  if (!showPrompt || !isInstallable || isInstalled) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 pb-[calc(var(--safe-area-inset-bottom,0px)+1rem)] animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-md mx-auto bg-card/98 backdrop-blur-2xl border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with gradient accent */}
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        
        <div className="p-4">
          {/* App info row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-background to-muted border border-border/50 flex items-center justify-center overflow-hidden shadow-lg">
              <img src={jetLogo} alt="JET" className="w-10 h-10 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-foreground">Install JET</h3>
              <p className="text-sm text-muted-foreground">
                Get the full app experience
              </p>
            </div>
            <button
              onClick={dismissPrompt}
              className="flex-shrink-0 p-2 rounded-full hover:bg-muted/50 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-xs font-medium text-foreground">Faster</p>
              <p className="text-[10px] text-muted-foreground">Instant load</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-xs font-medium text-foreground">Offline</p>
              <p className="text-[10px] text-muted-foreground">Works anywhere</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-xs font-medium text-foreground">Alerts</p>
              <p className="text-[10px] text-muted-foreground">Deal notifications</p>
            </div>
          </div>

          {/* iOS-specific instructions */}
          {isIOS ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center">
                To install on iPhone/iPad:
              </p>
              <div className="flex items-center justify-center gap-6 py-2">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Share className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Tap Share</span>
                </div>
                <div className="text-muted-foreground">→</div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">Add to<br/>Home Screen</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={dismissPrompt}
              >
                Got it
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={dismissPrompt}
              >
                Maybe later
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-2"
                onClick={installApp}
              >
                <Download className="w-4 h-4" />
                Install
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
