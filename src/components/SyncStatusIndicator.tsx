import { useState, useEffect, useRef } from "react";
import { RefreshCw, Check, WifiOff, Cloud, Plane, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface SyncStatusIndicatorProps {
  isLoading?: boolean;
  lastUpdated?: Date | null;
  onRefresh?: () => void;
  className?: string;
  showTimestamp?: boolean;
  compact?: boolean;
  cityName?: string;
}

export const SyncStatusIndicator = ({
  isLoading = false,
  lastUpdated = null,
  onRefresh,
  className,
  showTimestamp = true,
  compact = false,
  cityName = "Charlotte",
}: SyncStatusIndicatorProps) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>("");
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const wasOfflineRef = useRef(false);
  const previousLoadingRef = useRef(isLoading);
  const wasReconnectSyncRef = useRef(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simulate progress during sync
  useEffect(() => {
    if (isLoading && isOnline) {
      setSyncProgress(0);
      
      // Simulate progress with easing - faster at start, slower near end
      progressIntervalRef.current = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 95) return prev; // Cap at 95% until actually done
          // Slow down as we get closer to 100
          const increment = Math.max(1, (100 - prev) * 0.08);
          return Math.min(95, prev + increment);
        });
      }, 100);
    } else {
      // Complete the progress when loading finishes
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (syncProgress > 0 && syncProgress < 100) {
        setSyncProgress(100);
        // Reset after animation completes
        setTimeout(() => setSyncProgress(0), 500);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isLoading, isOnline]);

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

  // Compact mode rendering - Full width runway with takeoff/landing
  if (compact) {
    return (
      <div className={cn("flex items-center w-full", className)}>
        {/* Offline Status - Compact */}
        {!isOnline && (
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-destructive/10 rounded-full">
            <WifiOff className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
            <span className="text-[9px] sm:text-[10px] text-destructive font-medium">Offline</span>
          </div>
        )}

        {/* Syncing - Full width runway with flying airplane */}
        {isLoading && isOnline && (
          <div className="flex-1 flex items-center gap-1 sm:gap-1.5 md:gap-2">
            {/* Runway container */}
            <div className="flex-1 relative h-6 sm:h-7 md:h-8 bg-card/60 backdrop-blur-md rounded-full border border-border/40 overflow-hidden">
              {/* Passing clouds background */}
              <div className="runway-passing-clouds" />
              
              {/* Runway track with dashes */}
              <div className="absolute inset-x-2 sm:inset-x-3 top-1/2 -translate-y-1/2 h-0.5 bg-muted-foreground/20 rounded-full" />
              <div className="absolute inset-x-2 sm:inset-x-3 top-1/2 -translate-y-1/2 h-px border-t border-dashed border-muted-foreground/30" />
              
              {/* Cloud waypoints - hidden on smallest screens */}
              <Cloud className="hidden sm:block absolute top-1/2 -translate-y-1/2 left-[15%] w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground/20 runway-cloud" />
              <Cloud className="hidden xs:block absolute top-1/2 -translate-y-1/2 left-[40%] w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground/25 runway-cloud" style={{ animationDelay: '0.5s' }} />
              <Cloud className="hidden sm:block absolute top-1/2 -translate-y-1/2 left-[65%] w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground/20 runway-cloud" style={{ animationDelay: '1s' }} />
              
              {/* Takeoff marker (left) */}
              <div className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-primary/40 rounded-full" />
                <div className="w-0.5 h-1.5 sm:h-2 bg-primary/30 rounded-full hidden sm:block" />
              </div>
              
              {/* Landing marker (right) */}
              <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <div className="w-0.5 h-1.5 sm:h-2 bg-emerald-500/30 rounded-full hidden sm:block" />
                <div className="w-0.5 sm:w-1 h-2 sm:h-3 bg-emerald-500/40 rounded-full" />
              </div>
              
              {/* Progress fill underneath */}
              <div 
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-full transition-all duration-200"
                style={{ width: `${syncProgress}%` }}
              />
              
              {/* Flying airplane with takeoff animation */}
              <div 
                className="absolute top-1/2 transition-all duration-200 ease-out runway-airplane"
                style={{ 
                  left: `calc(${Math.max(5, Math.min(95, syncProgress))}% - 6px)`,
                  transform: `translateY(-50%) translateY(${Math.sin(syncProgress * 0.1) * 2}px) rotate(${syncProgress < 15 ? -25 - (15 - syncProgress) : syncProgress > 85 ? -15 + (syncProgress - 85) * 0.5 : -20}deg)`,
                }}
              >
                <div className="relative">
                  <Plane className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary fill-primary drop-shadow-md" />
                  {/* Contrails */}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 w-4 sm:w-6 md:w-8 h-0.5 overflow-hidden">
                    <div className="runway-contrail" />
                  </div>
                  {/* Engine glow */}
                  <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-accent rounded-full blur-[2px] animate-pulse" />
                </div>
              </div>
              
              {/* Progress percentage */}
              <div className="absolute right-5 sm:right-6 md:right-8 top-1/2 -translate-y-1/2">
                <span className="text-[8px] sm:text-[9px] md:text-[10px] text-primary font-semibold">
                  {Math.round(syncProgress)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Synced - Full width with landed airplane and refresh */}
        {!isLoading && isOnline && (
          <div className="flex-1 flex items-center gap-1 sm:gap-1.5 md:gap-2">
            <div 
              className={cn(
                "flex-1 relative h-6 sm:h-7 md:h-8 bg-card/60 backdrop-blur-md rounded-full border border-border/40 overflow-hidden transition-all duration-500",
                showSuccessFlash && "runway-landing-flash"
              )}
            >
              {/* Runway track */}
              <div className="absolute inset-x-2 sm:inset-x-3 top-1/2 -translate-y-1/2 h-0.5 bg-muted-foreground/10 rounded-full" />
              
              {/* Landed airplane (parked on right side) with destination */}
              <div className="absolute right-1.5 sm:right-2 md:right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-1.5">
                {/* Arrived at destination text */}
                <div className="flex flex-col items-end mr-0.5 sm:mr-1 arrival-destination">
                  <span className="text-[7px] sm:text-[8px] text-muted-foreground/70 leading-tight">Arrived at:</span>
                  <span className="text-[8px] sm:text-[10px] md:text-[11px] font-semibold text-emerald-500 leading-tight whitespace-nowrap arrival-city-name">{cityName}</span>
                </div>
                <div className="relative landed-airplane">
                  <Plane className="w-3 h-3 sm:w-4 sm:h-4 text-primary/80 fill-primary/80 rotate-[-10deg]" />
                  {/* Synced indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check className="w-1 h-1 sm:w-1.5 sm:h-1.5 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Last sync time */}
              <div className="absolute left-1.5 sm:left-2 md:left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-1.5">
                <span className="text-[8px] sm:text-[9px] md:text-[10px] text-muted-foreground truncate max-w-[40px] sm:max-w-[60px] md:max-w-[80px]">
                  {timeSinceUpdate || "Just landed"}
                </span>
              </div>
            </div>
            
            {/* Refresh button */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1 sm:p-1.5 md:p-2 hover:bg-accent/20 rounded-full transition-colors flex-shrink-0"
                aria-label="Refresh data"
              >
                <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-muted-foreground hover:text-primary transition-colors" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }



  // Full mode rendering
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
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
              <span className="font-medium text-[10px] sm:text-xs">Syncing...</span>
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

      {/* Progress Bar with Flight Path - Only show during sync */}
      {isLoading && isOnline && (
        <div className="w-full px-1 mt-1">
          {/* Flight path container */}
          <div className="relative h-6 sm:h-7">
            {/* Dotted flight path line */}
            <div className="absolute top-1/2 left-0 right-0 h-px border-t border-dashed border-muted-foreground/30" />
            
            {/* Cloud waypoints along the path */}
            <div className="absolute top-1/2 -translate-y-1/2 left-[10%]">
              <Cloud className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground/20" />
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 left-[35%]">
              <Cloud className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground/25" />
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 left-[60%]">
              <Cloud className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-muted-foreground/20" />
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 left-[85%]">
              <Cloud className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground/30" />
            </div>
            
            {/* Progress bar track */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 sm:h-2 bg-muted/40 rounded-full overflow-hidden">
              {/* Animated gradient background */}
              <div className="absolute inset-0 sync-progress-shimmer" />
              
              {/* Progress fill with gradient */}
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-accent to-primary rounded-full transition-all duration-200 ease-out"
                style={{ width: `${syncProgress}%` }}
              />
              
              {/* Contrail effect following the progress */}
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-primary-foreground/30 to-transparent rounded-full transition-all duration-200"
                style={{ width: `${Math.max(0, syncProgress - 5)}%` }}
              />
            </div>
            
            {/* Flying airplane on the flight path */}
            <div 
              className="absolute top-0 transition-all duration-200 ease-out"
              style={{ 
                left: `calc(${syncProgress}% - 10px)`,
                transform: `translateY(${Math.sin(syncProgress * 0.15) * 3}px)` // Gentle bobbing
              }}
            >
              <div className="relative flight-path-airplane">
                {/* Contrails behind airplane */}
                <div className="absolute right-full top-1/2 -translate-y-1/2 w-8 sm:w-12 h-0.5 overflow-hidden">
                  <div className="flight-contrail-trail" />
                </div>
                
                {/* Airplane with glow */}
                <div className="relative">
                  <Plane className="w-4 h-4 sm:w-5 sm:h-5 text-primary fill-primary rotate-[-15deg] drop-shadow-lg" />
                  {/* Engine glow */}
                  <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-accent rounded-full blur-sm animate-pulse" />
                </div>
              </div>
            </div>
            
            {/* Destination marker */}
            <div className="absolute top-0 right-0 opacity-40">
              <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-dashed border-primary/50 rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-primary rounded-full" />
              </div>
            </div>
          </div>
          
          {/* Progress percentage */}
          <div className="flex justify-between items-center mt-0.5">
            <span className="text-[7px] sm:text-[8px] text-muted-foreground/60">Syncing data</span>
            <span className="text-[8px] sm:text-[9px] text-primary font-semibold">
              {Math.round(syncProgress)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
