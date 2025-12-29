import { WifiOff, Map, Database } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineMapCache } from '@/hooks/useOfflineMapCache';
import { cn } from '@/lib/utils';

interface OfflineMapIndicatorProps {
  className?: string;
  compact?: boolean;
}

/**
 * Indicator overlay for the map showing offline status and cached tile availability
 */
export const OfflineMapIndicator = ({ className, compact = false }: OfflineMapIndicatorProps) => {
  const isOnline = useOnlineStatus();
  const { cacheStats, hasCachedTiles } = useOfflineMapCache();

  // Only show when offline
  if (isOnline) return null;

  return (
    <div 
      className={cn(
        "absolute z-20 pointer-events-none",
        compact ? "bottom-4 left-4" : "top-4 left-1/2 -translate-x-1/2",
        className
      )}
    >
      <div className={cn(
        "flex items-center gap-2 bg-background/95 backdrop-blur-md border border-border rounded-lg shadow-lg",
        compact ? "px-3 py-2" : "px-4 py-3"
      )}>
        <div className="flex items-center gap-2">
          <div className="relative">
            <WifiOff className={cn(
              "text-amber-500",
              compact ? "h-4 w-4" : "h-5 w-5"
            )} />
            {hasCachedTiles && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-background" />
            )}
          </div>
          
          <div className={cn("flex flex-col", compact && "hidden sm:flex")}>
            <span className={cn(
              "font-medium text-foreground",
              compact ? "text-xs" : "text-sm"
            )}>
              Offline Mode
            </span>
            {!compact && (
              <span className="text-xs text-muted-foreground">
                {hasCachedTiles 
                  ? `${cacheStats.mapboxTiles} tiles cached (${cacheStats.totalSize})`
                  : 'No cached tiles available'
                }
              </span>
            )}
          </div>
        </div>

        {hasCachedTiles && !compact && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border">
            <Map className="h-4 w-4 text-green-500" />
            <span className="text-xs text-green-500 font-medium">
              Map available
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineMapIndicator;
