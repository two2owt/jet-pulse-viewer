import { useState, useEffect } from "react";
import { Bell, X, Zap, MapPin, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useWebPushNotifications } from "@/hooks/useWebPushNotifications";
import { Capacitor } from "@capacitor/core";

interface PushNotificationPromptProps {
  show: boolean;
  onDismiss: () => void;
}

const DISMISS_KEY = "push-notification-prompt-dismissed";
const DISMISS_DURATION = 14 * 24 * 60 * 60 * 1000; // 14 days

export const PushNotificationPrompt = ({ show, onDismiss }: PushNotificationPromptProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isNative = Capacitor.isNativePlatform();
  
  // Native push notifications
  const { initializePushNotifications, isRegistered: isNativeRegistered } = usePushNotifications();
  
  // Web push notifications
  const { 
    isSupported: isWebPushSupported, 
    isSubscribed: isWebSubscribed, 
    subscribe: webSubscribe,
    permission: webPermission
  } = useWebPushNotifications();

  const isRegistered = isNative ? isNativeRegistered : isWebSubscribed;
  const isSupported = isNative || isWebPushSupported;

  useEffect(() => {
    if (!show || isRegistered) return;

    // Check if previously dismissed
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissTime < DISMISS_DURATION) {
        return;
      }
      localStorage.removeItem(DISMISS_KEY);
    }

    // Don't show if already denied
    if (!isNative && webPermission === 'denied') {
      return;
    }

    // Delay showing for smooth UX
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [show, isRegistered, webPermission, isNative]);

  const handleEnable = async () => {
    setIsLoading(true);
    
    let success = false;
    
    if (isNative) {
      // Native app - use Capacitor push notifications
      await initializePushNotifications();
      success = true;
    } else if (isWebPushSupported) {
      // Web - use web push notifications
      success = await webSubscribe();
    } else {
      // Fallback - just request basic notification permission
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        success = permission === "granted";
      }
    }
    
    setIsLoading(false);
    
    if (success) {
      setIsVisible(false);
      onDismiss();
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-x-4 bottom-24 z-[60] animate-in slide-in-from-bottom-4 fade-in duration-300"
      style={{ 
        paddingBottom: 'calc(var(--safe-area-inset-bottom, 0px) + 0.5rem)',
        marginBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className="relative bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl p-5 shadow-2xl max-w-md mx-auto">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted/80 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-4">
          <Bell className="h-7 w-7 text-primary" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Stay in the Loop
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Get instant alerts for deals near you and never miss out on exclusive offers.
        </p>

        {/* Benefits */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-2.5 text-sm">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10">
              <MapPin className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-foreground/80">Location-based deal alerts</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10">
              <Zap className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-foreground/80">Real-time notifications</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10">
              <Gift className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-foreground/80">Exclusive member offers</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            Maybe Later
          </Button>
          <Button
            className="flex-1 bg-primary hover:bg-primary/90"
            onClick={handleEnable}
            disabled={isLoading}
          >
            {isLoading ? "Enabling..." : "Enable Alerts"}
          </Button>
        </div>
      </div>
    </div>
  );
};
