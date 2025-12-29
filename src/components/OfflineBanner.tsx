import { WifiOff, MapPin, Database } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineMapCache } from '@/hooks/useOfflineMapCache';

export const OfflineBanner = () => {
  const isOnline = useOnlineStatus();
  const { cacheStats, hasCachedTiles } = useOfflineMapCache();

  if (isOnline) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-50 flex items-center justify-center gap-3 bg-amber-600/95 backdrop-blur-sm text-white px-4 py-2.5 text-sm font-medium animate-in slide-in-from-top-2 duration-300 shadow-lg">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>You're offline</span>
      </div>
      
      {hasCachedTiles ? (
        <>
          <span className="text-white/60">•</span>
          <div className="flex items-center gap-1.5 text-white/90">
            <MapPin className="h-3.5 w-3.5" />
            <span>{cacheStats.mapboxTiles} map tiles cached</span>
          </div>
          <span className="text-white/60">•</span>
          <div className="flex items-center gap-1.5 text-green-200">
            <Database className="h-3.5 w-3.5" />
            <span>{cacheStats.totalSize}</span>
          </div>
        </>
      ) : (
        <>
          <span className="text-white/60">•</span>
          <div className="flex items-center gap-1.5 text-white/70">
            <MapPin className="h-3.5 w-3.5" />
            <span>Visit areas online to cache them</span>
          </div>
        </>
      )}
    </div>
  );
};
