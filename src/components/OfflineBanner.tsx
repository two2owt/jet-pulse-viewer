import { WifiOff, MapPin } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export const OfflineBanner = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-50 flex items-center justify-center gap-3 bg-destructive/90 backdrop-blur-sm text-destructive-foreground px-4 py-2 text-sm font-medium animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>You're offline</span>
      </div>
      <span className="text-destructive-foreground/60">•</span>
      <div className="flex items-center gap-1.5 text-destructive-foreground/80">
        <MapPin className="h-3.5 w-3.5" />
        <span>Previously visited areas available</span>
      </div>
    </div>
  );
};
