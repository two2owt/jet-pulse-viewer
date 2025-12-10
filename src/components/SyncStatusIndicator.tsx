import { useState, useEffect, useRef } from "react";
import { RefreshCw, Check, Wifi, WifiOff, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface SyncStatusIndicatorProps {
  isLoading?: boolean;
  lastUpdated?: Date | null;
  onRefresh?: () => void;
  className?: string;
  showTimestamp?: boolean;
}

export const SyncStatusIndicator = ({
  isLoading = false,
  lastUpdated = null,
  onRefresh,
  className,
  showTimestamp = true,
}: SyncStatusIndicatorProps) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>("");
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  const wasOfflineRef = useRef(false);
  const previousLoadingRef = useRef(isLoading);
  const wasReconnectSyncRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        toast({
          title: "Back online",
          description: "Syncing your data...",
        });
        wasReconnectSyncRef.current = true;
        onRefresh?.();
      }
      wasOfflineRef.current = false;
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
      toast({
        title: "You're offline",
        description: "Some features may be unavailable",
        variant: "destructive",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onRefresh]);

  // Show success flash and toast when sync completes after reconnecting
  useEffect(() => {
    if (previousLoadingRef.current && !isLoading && isOnline && wasReconnectSyncRef.current) {
      setShowSuccessFlash(true);
      toast({
        title: "Data synced",
        description: "Your data is now up to date",
      });
      wasReconnectSyncRef.current = false;
      
      const timer = setTimeout(() => setShowSuccessFlash(false), 500);
      return () => clearTimeout(timer);
    }
    previousLoadingRef.current = isLoading;
  }, [isLoading, isOnline]);

  useEffect(() => {
    if (!lastUpdated) {
      setTimeSinceUpdate("");
      return;
    }

    const updateTimeString = () => {
      const now = new Date();
      const diff = now.getTime() - lastUpdated.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (seconds < 10) {
        setTimeSinceUpdate("Just now");
      } else if (seconds < 60) {
        setTimeSinceUpdate(`${seconds}s ago`);
      } else if (minutes < 60) {
        setTimeSinceUpdate(`${minutes}m ago`);
      } else if (hours < 24) {
        setTimeSinceUpdate(`${hours}h ago`);
      } else {
        setTimeSinceUpdate(lastUpdated.toLocaleDateString());
      }
    };

    updateTimeString();
    const interval = setInterval(updateTimeString, 10000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground",
        className
      )}
    >
      {/* Offline Status */}
      {!isOnline && (
        <div className="flex items-center gap-1 text-destructive">
          <WifiOff className="h-3 w-3" />
          <span>Offline</span>
        </div>
      )}

      {/* Syncing Indicator with Cloud Animation */}
      {isLoading && isOnline && (
        <div 
          className={cn(
            "sync-cloud-container syncing",
            "flex items-center gap-1.5 px-2 py-1 bg-card/50 backdrop-blur-sm rounded-full border border-border/30"
          )}
        >
          {/* Cloud fog layers */}
          <div className="sync-cloud" />
          <div className="sync-cloud-wisps" />
          
          {/* Content */}
          <div className="relative flex items-center gap-1 text-primary z-10">
            <Cloud className="h-3 w-3 animate-pulse" />
            <RefreshCw className="h-2.5 w-2.5 animate-spin" />
            <span className="font-medium">Flying through clouds...</span>
          </div>
        </div>
      )}

      {/* Synced Status with Timestamp */}
      {!isLoading && isOnline && (
        <div 
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-300",
            showSuccessFlash && "sync-success-flash"
          )}
        >
          <Check className="h-3 w-3 text-emerald-500" />
          {showTimestamp && timeSinceUpdate && (
            <span className="opacity-70">{timeSinceUpdate}</span>
          )}
        </div>
      )}

      {/* Manual Refresh Button */}
      {onRefresh && !isLoading && isOnline && (
        <button
          onClick={onRefresh}
          className="p-1 hover:bg-accent rounded-full transition-colors"
          aria-label="Refresh data"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};
