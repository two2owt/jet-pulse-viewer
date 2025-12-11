import { useState, useEffect, useRef } from "react";
import { RefreshCw, Check, WifiOff, Cloud, Plane } from "lucide-react";
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
            "flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-card/60 backdrop-blur-md rounded-full border border-border/40"
          )}
        >
          {/* Cloud fog layers */}
          <div className="sync-cloud" />
          <div className="sync-cloud-wisps" />
          
          {/* Flying clouds that pass by */}
          <div className="sync-passing-clouds" />
          
          {/* Content with airplane flying through clouds */}
          <div className="relative flex items-center gap-1.5 sm:gap-2 text-primary z-10">
            <div className="relative w-8 h-5 sm:w-10 sm:h-6">
              {/* Background clouds */}
              <Cloud className="sync-cloud-bg h-4 w-4 sm:h-5 sm:w-5 absolute left-0 top-0.5 opacity-40" />
              <Cloud className="sync-cloud-bg-2 h-3 w-3 sm:h-4 sm:w-4 absolute right-0 bottom-0 opacity-30" />
              
              {/* Flying airplane */}
              <div className="sync-airplane-wrapper absolute inset-0 flex items-center justify-center">
                <Plane className="sync-airplane h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary fill-primary rotate-[-20deg]" />
                {/* Contrails */}
                <span className="sync-contrail sync-contrail-1" />
                <span className="sync-contrail sync-contrail-2" />
              </div>
            </div>
            <span className="font-medium text-[10px] sm:text-xs">Flying through clouds...</span>
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
