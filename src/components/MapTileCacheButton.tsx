import React, { useState } from 'react';
import { Download, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MapTileCacheButtonProps {
  map: mapboxgl.Map | null;
  mapboxToken: string;
}

// Generate tile URLs for a given bounds and zoom range
const generateTileUrls = (
  bounds: mapboxgl.LngLatBounds,
  minZoom: number,
  maxZoom: number,
  token: string
): string[] => {
  const urls: string[] = [];
  
  const lng2tile = (lng: number, zoom: number) => 
    Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
  
  const lat2tile = (lat: number, zoom: number) => 
    Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));

  for (let z = minZoom; z <= maxZoom; z++) {
    const minX = lng2tile(bounds.getWest(), z);
    const maxX = lng2tile(bounds.getEast(), z);
    const minY = lat2tile(bounds.getNorth(), z);
    const maxY = lat2tile(bounds.getSouth(), z);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        // Mapbox vector tiles
        urls.push(`https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/${z}/${x}/${y}.vector.pbf?access_token=${token}`);
        // Mapbox raster tiles for dark style
        urls.push(`https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/${z}/${x}/${y}?access_token=${token}`);
      }
    }
  }

  return urls;
};

export const MapTileCacheButton = ({ map, mapboxToken }: MapTileCacheButtonProps) => {
  const [caching, setCaching] = useState(false);
  const [cached, setCached] = useState(false);
  const [progress, setProgress] = useState(0);

  const handlePreCache = async () => {
    if (!map || !mapboxToken) {
      toast.error('Map not ready');
      return;
    }

    setCaching(true);
    setProgress(0);
    setCached(false);

    try {
      const bounds = map.getBounds();
      const currentZoom = Math.floor(map.getZoom());
      
      // Cache tiles from current zoom to 2 levels deeper
      const minZoom = Math.max(currentZoom - 1, 10);
      const maxZoom = Math.min(currentZoom + 2, 16);
      
      const tileUrls = generateTileUrls(bounds, minZoom, maxZoom, mapboxToken);
      
      // Limit to prevent excessive caching
      const maxTiles = 100;
      const urlsToCache = tileUrls.slice(0, maxTiles);
      
      if (urlsToCache.length === 0) {
        toast.info('No tiles to cache at this zoom level');
        setCaching(false);
        return;
      }

      toast.info(`Caching ${urlsToCache.length} tiles for offline use...`);

      // Open cache directly
      const cache = await caches.open('jet-map-tiles-v1');
      let completed = 0;
      const batchSize = 10;

      for (let i = 0; i < urlsToCache.length; i += batchSize) {
        const batch = urlsToCache.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (url) => {
            try {
              // Check if already cached
              const existing = await cache.match(url);
              if (!existing) {
                const response = await fetch(url);
                if (response.ok) {
                  await cache.put(url, response);
                }
              }
            } catch (e) {
              // Ignore individual tile errors
            }
            completed++;
            setProgress(Math.round((completed / urlsToCache.length) * 100));
          })
        );
      }

      setCached(true);
      toast.success(`Cached ${completed} tiles for offline access`);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setCached(false);
        setProgress(0);
      }, 3000);
    } catch (error) {
      console.error('Error caching tiles:', error);
      toast.error('Failed to cache tiles');
    } finally {
      setCaching(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePreCache}
      disabled={caching || !map}
      className="bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background/90 gap-2"
    >
      {caching ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">{progress}%</span>
        </>
      ) : cached ? (
        <>
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-xs">Cached</span>
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          <span className="text-xs hidden sm:inline">Save Offline</span>
        </>
      )}
    </Button>
  );
};
