import { WifiOff, MapPin, Database } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineMapCache } from '@/hooks/useOfflineMapCache';

export const OfflineBanner = () => {
  const isOnline = useOnlineStatus();
  const { cacheStats, hasCachedTiles } = useOfflineMapCache();

  // Don't render anything when online - no CLS since no space is reserved
  if (isOnline) return null;

  // Position as absolute overlay within header area - doesn't shift content
  // Uses transform for animation instead of top to avoid CLS
  return (
    <div 
      className="fixed left-0 right-0 z-[100] flex items-center justify-center gap-3 bg-amber-600/95 backdrop-blur-sm text-white px-4 py-2 text-sm font-medium shadow-lg"
      style={{
        // Position just below header using CSS variable
        top: 'var(--header-total-height, 52px)',
        // GPU-accelerated entrance animation
        animation: 'slideInFromTop 0.3s ease-out',
        // Prevent any layout impact
        contain: 'layout style',
      }}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span>You're offline</span>
      </div>
      
      {hasCachedTiles ? (
        <>
          <span className="text-white/60 hidden sm:inline" aria-hidden="true">•</span>
          <div className="hidden sm:flex items-center gap-1.5 text-white/90">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{cacheStats.mapboxTiles} tiles cached</span>
          </div>
          <span className="text-white/60 hidden md:inline" aria-hidden="true">•</span>
          <div className="hidden md:flex items-center gap-1.5 text-green-200">
            <Database className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{cacheStats.totalSize}</span>
          </div>
        </>
      ) : (
        <span className="hidden sm:inline text-white/70">Browse areas online to cache them</span>
      )}
    </div>
  );
};
