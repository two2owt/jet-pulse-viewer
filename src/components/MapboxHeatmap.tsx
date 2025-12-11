import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, TrendingUp, Layers, X, AlertCircle, Route, Play, Pause, SkipBack, SkipForward, Clock, ChevronDown, ChevronUp, PanelRightClose, PanelRightOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocationDensity } from "@/hooks/useLocationDensity";
import { useMovementPaths } from "@/hooks/useMovementPaths";
import { useHeatmapTimelapse } from "@/hooks/useHeatmapTimelapse";
import { useIsMobile } from "@/hooks/use-mobile";
import { triggerHaptic } from "@/lib/haptics";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { TimelapseSwipeControl } from "./TimelapseSwipeControl";
import { CITIES, type City, getDistanceKm } from "@/types/cities";

// Venue type definition
export interface Venue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  activity: number;
  category: string;
  neighborhood: string;
  imageUrl?: string;
  address?: string;
  googleRating?: number | null;
  googleTotalRatings?: number;
  googleReviews?: Array<{
    author: string;
    rating: number;
    text: string;
    time: string | null;
  }>;
  isOpen?: boolean | null;
  openingHours?: string[];
}
import locationTrackerIcon from "@/assets/location-tracker.png";

interface MapboxHeatmapProps {
  onVenueSelect: (venue: Venue) => void;
  venues: Venue[];
  mapboxToken: string;
  selectedCity: City;
  onCityChange: (city: City) => void;
  isLoadingVenues?: boolean;
}

const getActivityColor = (activity: number) => {
  if (activity >= 80) return "hsl(0, 85%, 55%)"; // hot red
  if (activity >= 60) return "hsl(45, 100%, 55%)"; // warm yellow
  // Always show blue for any activity level (no gray for low activity)
  return "hsl(210, 100%, 55%)"; // cool blue
};

export const MapboxHeatmap = ({ onVenueSelect, venues, mapboxToken, selectedCity, onCityChange, isLoadingVenues = false }: MapboxHeatmapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInitializing, setMapInitializing] = useState(true);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const dealMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const geolocateControlRef = useRef<mapboxgl.GeolocateControl | null>(null);
  const flowAnimationRef = useRef<number | null>(null);
  const isMobile = useIsMobile();
  const initStartTime = useRef<number>(0);
  
  // Density heatmap state
  const [showDensityLayer, setShowDensityLayer] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'this_week' | 'this_hour'>('all');
  const [hourFilter, setHourFilter] = useState<number | undefined>();
  const [dayFilter, setDayFilter] = useState<number | undefined>();
  const [mapStyle, setMapStyle] = useState<'dark' | 'light' | 'satellite' | 'streets'>('dark');
  const [show3DTerrain, setShow3DTerrain] = useState(false);
  
  // Time-lapse mode state
  const [timelapseMode, setTimelapseMode] = useState(false);
  
  // Movement paths state
  const [showMovementPaths, setShowMovementPaths] = useState(false);
  const [pathTimeFilter, setPathTimeFilter] = useState<'all' | 'today' | 'this_week' | 'this_hour'>('all');
  const [minPathFrequency, setMinPathFrequency] = useState(2);
  
  // Controls visibility state
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  
  // User location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [detectedCity, setDetectedCity] = useState<City | null>(null); // City detected from user's location
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(true); // Default to current location
  
  const { densityData, loading: densityLoading, error: densityError, refresh: refreshDensity } = useLocationDensity({
    timeFilter,
    hourOfDay: timelapseMode ? undefined : hourFilter,
    dayOfWeek: dayFilter,
  });

  const { pathData, loading: pathsLoading, error: pathsError, refresh: refreshPaths } = useMovementPaths({
    timeFilter: pathTimeFilter,
    minFrequency: minPathFrequency,
  });
  
  // Time-lapse hook
  const timelapse = useHeatmapTimelapse(dayFilter);

  // Handle map resize on viewport changes - optimized for all mobile devices
  useEffect(() => {
    let resizeTimeout: ReturnType<typeof setTimeout>;
    
    const handleResize = () => {
      // Debounce resize to prevent excessive calls during orientation changes
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (map.current) {
          map.current.resize();
        }
      }, 100);
    };

    // Handle iOS Safari address bar show/hide
    const handleVisualViewportResize = () => {
      if (map.current && window.visualViewport) {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          map.current?.resize();
        }, 50);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Visual viewport API for iOS Safari dynamic viewport
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
    }
    
    // Handle visibility changes (e.g., when switching tabs)
    const handleVisibilityChange = () => {
      if (!document.hidden && map.current) {
        setTimeout(() => map.current?.resize(), 100);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle page focus for PWA and native apps
    const handleFocus = () => {
      if (map.current) {
        setTimeout(() => map.current?.resize(), 150);
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    
    // Validate token before initialization
    if (!mapboxToken || mapboxToken.trim() === '') {
      console.error('MapboxHeatmap: Invalid or missing Mapbox token');
      setMapInitializing(false);
      return;
    }

    // Defer map initialization to reduce main thread blocking during initial load
    const initializeMap = () => {
      if (!mapContainer.current || map.current) return;
      
      try {
        initStartTime.current = performance.now();
        setMapInitializing(true);
        mapboxgl.accessToken = mapboxToken;
        console.log('MapboxHeatmap: Initializing map for', selectedCity.name);

        // Initialize map centered on selected city with performance optimizations
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: `mapbox://styles/mapbox/${mapStyle}-v11`,
          center: [selectedCity.lng, selectedCity.lat],
          zoom: selectedCity.zoom,
          pitch: isMobile ? 30 : 50,
          bearing: 0,
          antialias: false, // Disable antialiasing for faster initial render
          attributionControl: false,
          cooperativeGestures: isMobile,
          touchZoomRotate: true,
          touchPitch: !isMobile,
          dragRotate: !isMobile,
          projection: 'globe' as any,
          // Performance optimizations
          fadeDuration: 0, // No fade for fastest initial render
          refreshExpiredTiles: false, // Don't refresh tiles automatically
          maxTileCacheSize: 50, // Limit tile cache for memory efficiency
          trackResize: false, // We handle resize manually
        });

        // Add attribution control in a better position
        map.current.addControl(
          new mapboxgl.AttributionControl({
            compact: true,
          }),
          'bottom-right'
        );

        // Add atmospheric effects and terrain when style loads
        map.current.on('style.load', () => {
          if (!map.current) return;
          
          // Dynamic fog based on map style
          const fogConfig = mapStyle === 'dark' ? {
            color: 'rgb(10, 10, 15)',
            'high-color': 'rgb(30, 20, 40)',
            'horizon-blend': 0.05,
            'space-color': 'rgb(5, 5, 10)',
            'star-intensity': 0.2,
          } : mapStyle === 'light' ? {
            color: 'rgb(220, 220, 230)',
            'high-color': 'rgb(180, 200, 230)',
            'horizon-blend': 0.1,
          } : {
            color: 'rgb(186, 210, 235)',
            'high-color': 'rgb(120, 170, 220)',
            'horizon-blend': 0.08,
          };
          
          map.current.setFog(fogConfig);

          // Add terrain source
          if (!map.current.getSource('mapbox-dem')) {
            map.current.addSource('mapbox-dem', {
              type: 'raster-dem',
              url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
              tileSize: 512,
              maxzoom: 14,
            });
          }

          // Enhance 3D buildings with dynamic styling
          const layers = map.current.getStyle().layers;
          if (layers) {
            const labelLayerId = layers.find(
              (layer) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
            )?.id;

            if (labelLayerId && !map.current.getLayer('3d-buildings')) {
              const buildingColor = mapStyle === 'dark' 
                ? 'hsl(0, 0%, 15%)' 
                : mapStyle === 'light' 
                ? 'hsl(0, 0%, 85%)'
                : 'hsl(0, 0%, 70%)';
                
              map.current.addLayer(
                {
                  id: '3d-buildings',
                  source: 'composite',
                  'source-layer': 'building',
                  filter: ['==', 'extrude', 'true'],
                  type: 'fill-extrusion',
                  minzoom: 14,
                  paint: {
                    'fill-extrusion-color': buildingColor,
                    'fill-extrusion-height': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      14, 0,
                      14.05, ['get', 'height'],
                    ],
                    'fill-extrusion-base': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      14, 0,
                      14.05, ['get', 'min_height'],
                    ],
                    'fill-extrusion-opacity': mapStyle === 'satellite' ? 0.6 : 0.8,
                  },
                },
                labelLayerId
              );
            }
          }
        });

        // Add navigation controls
        map.current.addControl(
          new mapboxgl.NavigationControl({
            visualizePitch: true,
          }),
          "top-right"
        );

        // Add geolocate control with location change handler
        const geolocateControl = new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
          },
          trackUserLocation: true,
          showUserHeading: true,
          showUserLocation: false, // Hide default marker, we'll use custom
        });
        
        geolocateControlRef.current = geolocateControl;
        map.current.addControl(geolocateControl, "top-right");
        
        // Create custom marker element for user location
        const createUserMarker = () => {
          const el = document.createElement('div');
          el.className = 'user-location-marker';
          el.style.width = '56px';
          el.style.height = '56px';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.transition = 'transform 0.3s ease';
          el.style.position = 'relative';
          
          // Glassmorphic container
          const glassContainer = document.createElement('div');
          glassContainer.style.width = '100%';
          glassContainer.style.height = '100%';
          glassContainer.style.borderRadius = '50%';
          glassContainer.style.background = 'linear-gradient(135deg, rgba(255, 69, 58, 0.15), rgba(255, 105, 97, 0.1))';
          glassContainer.style.backdropFilter = 'blur(12px)';
          (glassContainer.style as any).WebkitBackdropFilter = 'blur(12px)';
          glassContainer.style.border = '1.5px solid rgba(255, 255, 255, 0.2)';
          glassContainer.style.boxShadow = '0 8px 32px 0 rgba(255, 69, 58, 0.37), inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)';
          glassContainer.style.display = 'flex';
          glassContainer.style.alignItems = 'center';
          glassContainer.style.justifyContent = 'center';
          glassContainer.style.position = 'relative';
          glassContainer.style.zIndex = '1';
          
          const img = document.createElement('img');
          img.src = locationTrackerIcon;
          img.style.width = '60%';
          img.style.height = '60%';
          img.style.objectFit = 'contain';
          img.style.filter = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))';
          
          glassContainer.appendChild(img);
          el.appendChild(glassContainer);
          return el;
        };
        
        // Track if this is the initial geolocate (for auto-centering on load)
        let isInitialGeolocate = true;
        
        // Listen for geolocate events to update city and marker
        geolocateControl.on('geolocate', (e: any) => {
          const { longitude, latitude } = e.coords;
          
          // Update user location state
          setUserLocation({ lat: latitude, lng: longitude });
          
          // Find the nearest city to detect which metro area user is in
          let nearestCity = CITIES[0];
          let minDistance = Infinity;
          
          CITIES.forEach(city => {
            const distance = Math.sqrt(
              Math.pow(city.lat - latitude, 2) + 
              Math.pow(city.lng - longitude, 2)
            );
            
            if (distance < minDistance) {
              minDistance = distance;
              nearestCity = city;
            }
          });
          
          // Set detected city based on location
          setDetectedCity(nearestCity);
          
          // Only fly to user location on initial load (default behavior)
          // After that, users can pan/zoom freely without being pulled back
          if (isInitialGeolocate && map.current) {
            map.current.flyTo({
              center: [longitude, latitude],
              zoom: Math.max(map.current.getZoom(), 13),
              duration: 1500,
              essential: true
            });
            isInitialGeolocate = false;
          }
          
          // Create or update user marker
          if (!userMarker.current && map.current) {
            userMarker.current = new mapboxgl.Marker({
              element: createUserMarker(),
              anchor: 'center'
            })
              .setLngLat([longitude, latitude])
              .addTo(map.current);
          } else if (userMarker.current) {
            userMarker.current.setLngLat([longitude, latitude]);
          }
        });
        
        // Remove marker when tracking stops
        geolocateControl.on('trackuserlocationend', () => {
          if (userMarker.current) {
            userMarker.current.remove();
            userMarker.current = null;
          }
        });

        // Ensure map resizes to container after initialization
        map.current.on('load', () => {
          const loadTime = performance.now() - initStartTime.current;
          console.log(`MapboxHeatmap: Map loaded successfully in ${loadTime.toFixed(2)}ms`);
          
          // Use requestAnimationFrame for smoother initialization
          requestAnimationFrame(() => {
            if (map.current) {
              map.current.resize();
              setMapLoaded(true);
              setMapInitializing(false);
            }
          });
          
          // Automatically trigger geolocation when map loads
          if (geolocateControlRef.current) {
            setTimeout(() => {
              geolocateControlRef.current?.trigger();
            }, 500);
          }
        });

        // Add error handler
        map.current.on('error', (e) => {
          console.error('MapboxHeatmap: Map error', e.error);
        });
      } catch (error) {
        console.error('MapboxHeatmap: Failed to initialize map', error);
        setMapInitializing(false);
      }
    };

    // Use requestIdleCallback to defer initialization, with fallback to setTimeout
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    
    if ('requestIdleCallback' in window) {
      idleId = requestIdleCallback(initializeMap, { timeout: 100 });
    } else {
      timeoutId = setTimeout(initializeMap, 0);
    }

    return () => {
      if (idleId !== undefined) cancelIdleCallback(idleId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      // Cleanup map resources
      setMapLoaded(false);
      if (userMarker.current) {
        userMarker.current.remove();
      }
      markersRef.current.forEach((marker) => marker.remove());
      dealMarkersRef.current.forEach((marker) => marker.remove());
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    map.current.flyTo({
      center: [selectedCity.lng, selectedCity.lat],
      zoom: selectedCity.zoom,
      duration: 2000,
      essential: true
    });
  }, [selectedCity, mapLoaded]);

  // Handle map style changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    map.current.setStyle(`mapbox://styles/mapbox/${mapStyle}-v11`);
  }, [mapStyle, mapLoaded]);

  // Handle 3D terrain toggle
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (show3DTerrain) {
      // Enable 3D terrain with exaggeration
      map.current.setTerrain({ 
        source: 'mapbox-dem', 
        exaggeration: 1.5 
      });
      
      // Animate to a better viewing angle for terrain
      map.current.easeTo({
        pitch: 60,
        duration: 1000
      });
    } else {
      // Disable terrain
      map.current.setTerrain(null);
      
      // Return to normal viewing angle
      map.current.easeTo({
        pitch: isMobile ? 30 : 50,
        duration: 1000
      });
    }
  }, [show3DTerrain, mapLoaded, isMobile]);

  // Add/update density heatmap layer with lazy loading (supports timelapse mode)
  useEffect(() => {
    // Use timelapse data when in timelapse mode, otherwise use regular density data
    const activeData = timelapseMode && timelapse.currentData 
      ? timelapse.currentData 
      : densityData;
      
    if (!map.current || !mapLoaded || !activeData) return;

    const sourceId = 'location-density';
    const layerId = 'location-density-heat';
    const pointLayerId = `${layerId}-point`;
    const glowLayerId = `${layerId}-glow`;

    try {
      // Remove existing layers and source if they exist
      [glowLayerId, pointLayerId, layerId].forEach(id => {
        if (map.current?.getLayer(id)) {
          map.current.removeLayer(id);
        }
      });
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    } catch (error) {
      console.error('Error removing existing layers:', error);
      return;
    }

    if (!showDensityLayer) return;

    // Add density data source
    map.current.addSource(sourceId, {
      type: 'geojson',
      data: activeData.geojson,
    });

    // Add enhanced heatmap layer with glow effect
    map.current.addLayer({
      id: layerId,
      type: 'heatmap',
      source: sourceId,
      paint: {
        // Enhanced weight calculation with exponential curve
        'heatmap-weight': [
          'interpolate',
          ['exponential', 1.5],
          ['get', 'density'],
          0, 0,
          5, 0.5,
          10, 1,
        ],
        // Dynamic intensity based on zoom with higher peak
        'heatmap-intensity': [
          'interpolate',
          ['exponential', 2],
          ['zoom'],
          0, 2,
          9, 3,
          15, 5,
        ],
        // Enhanced vibrant color ramp with smooth gradients
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0, 0, 0, 0)',              // transparent
          0.1, 'rgba(65, 105, 225, 0.6)',     // royal blue with glow
          0.2, 'rgba(0, 191, 255, 0.8)',      // deep sky blue
          0.3, 'rgba(0, 255, 127, 0.85)',     // spring green
          0.4, 'rgba(50, 205, 50, 0.9)',      // lime green
          0.5, 'rgba(255, 255, 0, 0.95)',     // yellow
          0.6, 'rgba(255, 215, 0, 0.95)',     // gold
          0.7, 'rgba(255, 165, 0, 1)',        // orange
          0.8, 'rgba(255, 69, 0, 1)',         // orange-red
          0.9, 'rgba(255, 0, 0, 1)',          // red
          1, 'rgba(139, 0, 0, 1)',            // dark red
        ],
        // Adaptive radius for better visualization at all zoom levels
        'heatmap-radius': [
          'interpolate',
          ['exponential', 1.8],
          ['zoom'],
          0, 20,
          9, 50,
          12, 70,
          15, 100,
        ],
        // Smooth opacity curve for better blending
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 0.95,
          12, 0.9,
          15, 0.85,
        ],
        'heatmap-opacity-transition': {
          duration: 1000,
          delay: 0
        }
      },
    });

    // Add enhanced circle layer for detailed view with pulsing animation
    map.current.addLayer({
      id: `${layerId}-point`,
      type: 'circle',
      source: sourceId,
      minzoom: 13,
      paint: {
        // Dynamic radius based on density with exponential scaling
        'circle-radius': [
          'interpolate',
          ['exponential', 1.5],
          ['get', 'density'],
          0, 5,
          5, 12,
          10, 25,
        ],
        // Vibrant color gradient matching heatmap
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'density'],
          0, 'rgb(65, 105, 225)',
          3, 'rgb(0, 255, 127)',
          6, 'rgb(255, 215, 0)',
          8, 'rgb(255, 69, 0)',
          10, 'rgb(139, 0, 0)',
        ],
        'circle-opacity': 0.7,
        'circle-blur': 0.3,
        'circle-stroke-width': 2,
        'circle-stroke-color': [
          'interpolate',
          ['linear'],
          ['get', 'density'],
          0, 'rgba(255, 255, 255, 0.6)',
          10, 'rgba(255, 255, 255, 0.9)',
        ],
        'circle-stroke-opacity': 0.8,
        'circle-opacity-transition': {
          duration: 1000,
          delay: 100
        }
      },
    });

    // Add outer glow layer for enhanced visual effect
    map.current.addLayer({
      id: `${layerId}-glow`,
      type: 'circle',
      source: sourceId,
      minzoom: 13,
      paint: {
        'circle-radius': [
          'interpolate',
          ['exponential', 1.5],
          ['get', 'density'],
          0, 10,
          5, 20,
          10, 40,
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'density'],
          0, 'rgba(65, 105, 225, 0.3)',
          5, 'rgba(255, 215, 0, 0.4)',
          10, 'rgba(255, 0, 0, 0.5)',
        ],
        'circle-opacity': 0.3,
        'circle-blur': 1,
        'circle-opacity-transition': {
          duration: 1000,
          delay: 200
        }
      },
    });

    console.log('Density heatmap layer added with', activeData.stats.grid_cells, 'points', timelapseMode ? `(hour ${timelapse.currentHour})` : '');
  }, [mapLoaded, densityData, showDensityLayer, timelapseMode, timelapse.currentData, timelapse.currentHour]);

  // Add/update movement paths layer with animated flow
  useEffect(() => {
    // Cancel any existing animation
    if (flowAnimationRef.current) {
      cancelAnimationFrame(flowAnimationRef.current);
      flowAnimationRef.current = null;
    }

    if (!map.current || !mapLoaded || !pathData) return;

    const sourceId = 'movement-paths';
    const lineLayerId = 'movement-paths-line';
    const glowLayerId = 'movement-paths-glow';
    const arrowLayerId = 'movement-paths-arrows';
    const particleLayerId = 'movement-paths-particles';

    try {
      // Remove existing layers and source if they exist
      [particleLayerId, arrowLayerId, glowLayerId, lineLayerId].forEach(id => {
        if (map.current?.getLayer(id)) {
          map.current.removeLayer(id);
        }
      });
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
      if (map.current.getSource(`${sourceId}-particles`)) {
        map.current.removeSource(`${sourceId}-particles`);
      }
    } catch (error) {
      console.error('Error removing existing movement path layers:', error);
      return;
    }

    if (!showMovementPaths) return;

    // Add movement paths source
    map.current.addSource(sourceId, {
      type: 'geojson',
      data: pathData.geojson,
      lineMetrics: true,
    });

    // Add glow effect layer (behind main line)
    map.current.addLayer({
      id: glowLayerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-width': [
          'interpolate',
          ['exponential', 1.5],
          ['get', 'frequency'],
          1, 8,
          5, 14,
          10, 22,
          20, 30,
        ],
        'line-color': [
          'interpolate',
          ['linear'],
          ['get', 'frequency'],
          1, 'rgba(100, 200, 255, 0.3)',
          5, 'rgba(0, 255, 255, 0.35)',
          10, 'rgba(255, 200, 0, 0.4)',
          15, 'rgba(255, 100, 0, 0.45)',
          20, 'rgba(255, 0, 100, 0.5)',
        ],
        'line-blur': 4,
        'line-opacity': 0.6,
      },
    });

    // Add main animated flow line layer
    map.current.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-width': [
          'interpolate',
          ['exponential', 1.5],
          ['get', 'frequency'],
          1, 3,
          5, 6,
          10, 10,
          20, 14,
        ],
        'line-color': [
          'interpolate',
          ['linear'],
          ['get', 'frequency'],
          1, 'rgb(100, 200, 255)',
          5, 'rgb(0, 255, 255)',
          10, 'rgb(255, 200, 0)',
          15, 'rgb(255, 100, 0)',
          20, 'rgb(255, 0, 100)',
        ],
        'line-opacity': 0.9,
        'line-dasharray': [0, 4, 3],
      },
    });

    // Add arrow icon if not exists
    if (!map.current.hasImage('flow-arrow')) {
      const size = 48;
      const arrowCanvas = document.createElement('canvas');
      arrowCanvas.width = size;
      arrowCanvas.height = size;
      const ctx = arrowCanvas.getContext('2d')!;

      // Create gradient for arrow
      const gradient = ctx.createLinearGradient(0, 0, size, 0);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.4)');

      // Draw arrow/chevron shape
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(size * 0.2, size * 0.3);
      ctx.lineTo(size * 0.6, size * 0.5);
      ctx.lineTo(size * 0.2, size * 0.7);
      ctx.lineTo(size * 0.35, size * 0.5);
      ctx.closePath();
      ctx.fill();

      // Add outer glow
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 8;
      ctx.fill();

      map.current.addImage('flow-arrow', {
        width: size,
        height: size,
        data: ctx.getImageData(0, 0, size, size).data as any,
      });
    }

    // Add animated arrow symbols for direction
    map.current.addLayer({
      id: arrowLayerId,
      type: 'symbol',
      source: sourceId,
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 40,
        'icon-image': 'flow-arrow',
        'icon-size': [
          'interpolate',
          ['linear'],
          ['get', 'frequency'],
          1, 0.6,
          10, 0.9,
          20, 1.2,
        ],
        'icon-rotate': 90,
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
      paint: {
        'icon-opacity': 0.85,
      },
    });

    // Create animated particle points along paths
    const createParticleData = (offset: number) => {
      const particles: GeoJSON.Feature<GeoJSON.Point>[] = [];
      
      pathData.geojson.features.forEach((feature: any) => {
        if (feature.geometry.type === 'LineString') {
          const coords = feature.geometry.coordinates;
          const frequency = feature.properties?.frequency || 1;
          
          // Create multiple particles per path based on frequency
          const numParticles = Math.min(Math.ceil(frequency / 3), 5);
          
          for (let p = 0; p < numParticles; p++) {
            // Calculate position along the line with offset
            const t = ((offset / 100) + (p / numParticles)) % 1;
            
            if (coords.length >= 2) {
              const segmentCount = coords.length - 1;
              const segmentIndex = Math.floor(t * segmentCount);
              const segmentT = (t * segmentCount) - segmentIndex;
              
              const start = coords[Math.min(segmentIndex, coords.length - 2)];
              const end = coords[Math.min(segmentIndex + 1, coords.length - 1)];
              
              const lng = start[0] + (end[0] - start[0]) * segmentT;
              const lat = start[1] + (end[1] - start[1]) * segmentT;
              
              particles.push({
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [lng, lat],
                },
                properties: {
                  frequency,
                  particleIndex: p,
                },
              });
            }
          }
        }
      });
      
      return {
        type: 'FeatureCollection' as const,
        features: particles,
      };
    };

    // Add particle source
    map.current.addSource(`${sourceId}-particles`, {
      type: 'geojson',
      data: createParticleData(0),
    });

    // Add particle layer
    map.current.addLayer({
      id: particleLayerId,
      type: 'circle',
      source: `${sourceId}-particles`,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'frequency'],
          1, 4,
          10, 7,
          20, 10,
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'frequency'],
          1, 'rgb(150, 220, 255)',
          5, 'rgb(100, 255, 255)',
          10, 'rgb(255, 230, 100)',
          15, 'rgb(255, 150, 50)',
          20, 'rgb(255, 80, 150)',
        ],
        'circle-opacity': 0.9,
        'circle-blur': 0.3,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255, 255, 255, 0.8)',
      },
    });

    // Animate the dash array and particles for continuous flow effect
    const dashArraySequence = [
      [0, 4, 3],
      [0.5, 4, 2.5],
      [1, 4, 2],
      [1.5, 4, 1.5],
      [2, 4, 1],
      [2.5, 4, 0.5],
      [3, 4, 0],
      [0, 0.5, 3, 3.5],
      [0, 1, 3, 3],
      [0, 1.5, 3, 2.5],
      [0, 2, 3, 2],
      [0, 2.5, 3, 1.5],
      [0, 3, 3, 1],
      [0, 3.5, 3, 0.5],
    ];

    let step = 0;
    let particleOffset = 0;
    let lastTime = performance.now();

    const animateFlow = (currentTime: number) => {
      if (!map.current || !showMovementPaths) {
        flowAnimationRef.current = null;
        return;
      }

      const deltaTime = currentTime - lastTime;
      
      // Update dash animation every ~80ms
      if (deltaTime > 80) {
        step = (step + 1) % dashArraySequence.length;
        
        if (map.current.getLayer(lineLayerId)) {
          map.current.setPaintProperty(
            lineLayerId,
            'line-dasharray',
            dashArraySequence[step]
          );
        }

        // Update particle positions
        particleOffset = (particleOffset + 2) % 100;
        const particleSource = map.current.getSource(`${sourceId}-particles`) as mapboxgl.GeoJSONSource;
        if (particleSource) {
          particleSource.setData(createParticleData(particleOffset));
        }

        lastTime = currentTime;
      }

      flowAnimationRef.current = requestAnimationFrame(animateFlow);
    };

    flowAnimationRef.current = requestAnimationFrame(animateFlow);

    console.log('Movement paths layer added with', pathData.stats.total_paths, 'paths and animated particles');

    // Cleanup animation on unmount
    return () => {
      if (flowAnimationRef.current) {
        cancelAnimationFrame(flowAnimationRef.current);
        flowAnimationRef.current = null;
      }
    };
  }, [mapLoaded, pathData, showMovementPaths]);


  // Skeleton marker positions (static positions around the city center for loading state)
  const skeletonMarkerPositions = [
    { lat: selectedCity.lat + 0.008, lng: selectedCity.lng - 0.012 },
    { lat: selectedCity.lat - 0.005, lng: selectedCity.lng + 0.015 },
    { lat: selectedCity.lat + 0.012, lng: selectedCity.lng + 0.008 },
    { lat: selectedCity.lat - 0.010, lng: selectedCity.lng - 0.006 },
    { lat: selectedCity.lat + 0.003, lng: selectedCity.lng - 0.018 },
    { lat: selectedCity.lat - 0.015, lng: selectedCity.lng + 0.003 },
  ];

  // Optimized marker updates with throttling
  const updateMarkers = () => {
    if (!map.current || !mapLoaded) return;

    const mapInstance = map.current;
    
    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Get current zoom level for dynamic sizing
      const currentZoom = mapInstance.getZoom();
    
    // Improved zoom scaling formula for extreme zoom levels
    let zoomFactor: number;
    if (currentZoom < 8) {
      // Very zoomed out - scale down aggressively
      zoomFactor = Math.max(0.3, currentZoom / 20);
    } else if (currentZoom < 12) {
      // Medium zoom - moderate scaling
      zoomFactor = 0.4 + ((currentZoom - 8) / 4) * 0.4; // 0.4 to 0.8
    } else {
      // Zoomed in - larger markers
      zoomFactor = 0.8 + Math.min(0.5, (currentZoom - 12) / 8); // 0.8 to 1.3
    }
    
    const baseSize = 36 * zoomFactor;

    // Show skeleton markers while loading
    if (isLoadingVenues && venues.length === 0) {
      skeletonMarkerPositions.forEach((pos, index) => {
        if (!mapInstance) return;
        
        const el = document.createElement("div");
        el.className = "venue-marker-skeleton";
        el.style.cssText = `
          width: ${baseSize}px;
          height: ${baseSize * 1.4}px;
          position: relative;
        `;

        const pinEl = document.createElement('div');
        pinEl.style.cssText = `
          width: ${baseSize}px;
          height: ${baseSize}px;
          background: linear-gradient(90deg, 
            hsl(var(--muted)) 0%, 
            hsl(var(--muted-foreground) / 0.3) 50%, 
            hsl(var(--muted)) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          animation-delay: ${index * 150}ms;
          border: 2px solid hsl(var(--border) / 0.5);
          border-radius: 50% 50% 50% 0;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transform: rotate(-45deg);
          position: absolute;
          top: 0;
          left: 50%;
          margin-left: -${baseSize / 2}px;
          opacity: 0.7;
        `;

        el.appendChild(pinEl);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([pos.lng, pos.lat])
          .addTo(mapInstance);

        markersRef.current.push(marker);
      });
      return;
    }

    // Calculate distances between venues to detect clusters
    const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
    };

    // Add venue markers
    venues.forEach((venue, index) => {
      // Guard against map becoming null during iteration
      if (!mapInstance) return;
      
      const color = getActivityColor(venue.activity);

      // Check proximity to other venues
      let nearbyCount = 0;
      venues.forEach((otherVenue, otherIndex) => {
        if (index !== otherIndex) {
          const distance = getDistance(venue.lat, venue.lng, otherVenue.lat, otherVenue.lng);
          if (distance < 0.001) nearbyCount++; // Very close proximity
        }
      });

      // Adjust size based on proximity and activity level
      const proximityFactor = nearbyCount > 0 ? Math.max(0.75, 1 - (nearbyCount * 0.1)) : 1;
      const activitySizeFactor = venue.activity >= 80 ? 1.3 : venue.activity >= 60 ? 1.15 : 1;
      const markerSize = baseSize * proximityFactor * activitySizeFactor;

      // Create custom glassmorphic marker element via JavaScript
      const el = document.createElement("div");
      el.className = "venue-marker";
      el.style.cssText = `
        width: ${markerSize}px;
        height: ${markerSize * 1.4}px;
        cursor: pointer;
        position: relative;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        will-change: transform;
      `;

      // Create pin element with improved visibility
      const pinEl = document.createElement('div');
      pinEl.style.cssText = `
        width: ${markerSize}px;
        height: ${markerSize}px;
        background: linear-gradient(145deg, ${color}, ${color}dd);
        border: 2px solid rgba(255, 255, 255, 0.9);
        border-radius: 50% 50% 50% 0;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 
          0 4px 16px ${color}80,
          0 2px 8px rgba(0, 0, 0, 0.4),
          inset 0 2px 4px rgba(255, 255, 255, 0.3);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
        filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.5));
        transform: rotate(-45deg);
        position: absolute;
        top: 0;
        left: 50%;
        margin-left: -${markerSize / 2}px;
      `;

      // Add activity indicator ring for high activity venues
      if (venue.activity >= 80) {
        pinEl.style.animation = "venue-pulse-intense 1.5s ease-in-out infinite";
        pinEl.style.boxShadow = `
          0 4px 20px ${color}90,
          0 2px 8px rgba(0, 0, 0, 0.4),
          0 0 0 3px ${color}40,
          inset 0 2px 4px rgba(255, 255, 255, 0.3)
        `;
      } else if (venue.activity >= 60) {
        pinEl.style.animation = "venue-pulse-moderate 2s ease-in-out infinite";
        pinEl.style.boxShadow = `
          0 4px 18px ${color}80,
          0 2px 8px rgba(0, 0, 0, 0.4),
          0 0 0 2px ${color}30,
          inset 0 2px 4px rgba(255, 255, 255, 0.3)
        `;
      }

      // Create inner content container (rotated back to normal)
      const innerEl = document.createElement('div');
      innerEl.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(45deg);
      `;

      // Add pin icon
      innerEl.innerHTML = `
        <svg width="${markerSize * 0.5}" height="${markerSize * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: all 0.4s ease-out; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      `;

      pinEl.appendChild(innerEl);
      el.appendChild(pinEl);

      // Enhanced hover effects
      el.addEventListener("mouseenter", () => {
        pinEl.style.transform = "rotate(-45deg) scale(1.15)";
        pinEl.style.boxShadow = `
          0 6px 24px ${color}90,
          0 3px 12px rgba(0, 0, 0, 0.5),
          0 0 0 4px ${color}50,
          inset 0 2px 4px rgba(255, 255, 255, 0.4)
        `;
      });

      el.addEventListener("mouseleave", () => {
        pinEl.style.transform = "rotate(-45deg)";
        if (venue.activity >= 80) {
          pinEl.style.boxShadow = `
            0 4px 20px ${color}90,
            0 2px 8px rgba(0, 0, 0, 0.4),
            0 0 0 3px ${color}40,
            inset 0 2px 4px rgba(255, 255, 255, 0.3)
          `;
        } else if (venue.activity >= 60) {
          pinEl.style.boxShadow = `
            0 4px 18px ${color}80,
            0 2px 8px rgba(0, 0, 0, 0.4),
            0 0 0 2px ${color}30,
            inset 0 2px 4px rgba(255, 255, 255, 0.3)
          `;
        } else {
          pinEl.style.boxShadow = `
            0 4px 16px ${color}80,
            0 2px 8px rgba(0, 0, 0, 0.4),
            inset 0 2px 4px rgba(255, 255, 255, 0.3)
          `;
        }
      });

      // Create marker with bottom anchor so pin tip points to exact coordinate
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([venue.lng, venue.lat])
        .addTo(mapInstance);

      // Create popup for the venue with enhanced information
      const addressHTML = venue.address 
        ? `<p style="margin: 2px 0 6px 0; font-size: 10px; color: rgba(255, 255, 255, 0.6); line-height: 1.3;">${venue.address}</p>`
        : '';
        
      const googleRatingHTML = venue.googleRating 
        ? `<div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
             <span style="color: #FFD700; font-size: 12px;">★</span>
             <span style="font-size: 11px; font-weight: 600; color: white;">${venue.googleRating.toFixed(1)}</span>
             <span style="font-size: 10px; color: rgba(255, 255, 255, 0.6);">(${venue.googleTotalRatings?.toLocaleString() || 0} reviews)</span>
           </div>`
        : '';
      
      const isOpenHTML = venue.isOpen !== null && venue.isOpen !== undefined
        ? `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
             <span style="display: inline-flex; align-items: center; gap: 5px;">
               <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${venue.isOpen ? '#22c55e' : '#ef4444'}; box-shadow: 0 0 6px ${venue.isOpen ? '#22c55e' : '#ef4444'};"></span>
               <span style="font-size: 11px; font-weight: 600; color: ${venue.isOpen ? '#22c55e' : '#ef4444'};">${venue.isOpen ? 'Open Now' : 'Closed'}</span>
             </span>
           </div>`
        : '';

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: true,
        maxWidth: '260px',
        className: 'venue-popup'
      }).setHTML(`
        <div style="padding: 10px;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: white;">${venue.name}</h4>
          <p style="margin: 0 0 4px 0; font-size: 11px; color: rgba(255, 255, 255, 0.7);">${venue.category}</p>
          ${addressHTML}
          <div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></div>
            <span style="font-size: 11px; font-weight: 600; color: white;">${venue.activity}% Active</span>
          </div>
          ${googleRatingHTML}
          ${isOpenHTML}
        </div>
      `);

      // Attach popup to marker
      marker.setPopup(popup);

      // Handle click on the marker element - bounce animation + open venue card
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        
        // Haptic feedback for venue selection
        triggerHaptic('medium');
        
        // Bounce animation
        pinEl.style.animation = "bounce 0.6s ease-out";
        setTimeout(() => {
          // Restore appropriate pulsating animation after bounce (only for high activity)
          if (venue.activity >= 80) {
            pinEl.style.animation = "venue-pulse-intense 1.5s ease-in-out infinite";
          } else if (venue.activity >= 60) {
            pinEl.style.animation = "venue-pulse-moderate 2s ease-in-out infinite";
          } else {
            pinEl.style.animation = "";
          }
        }, 600);
        
        // Open venue card
        onVenueSelect(venue);
        
        // Show popup
        popup.addTo(mapInstance);
      });

      markersRef.current.push(marker);
    });
    
    }); // Close requestAnimationFrame
  };

  // Call updateMarkers on initial load and when venues change
  useEffect(() => {
    updateMarkers();
  }, [venues, mapLoaded, isLoadingVenues, selectedCity]);

  // Add smooth zoom and pan transitions
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const mapInstance = map.current;
    
    // Smooth resize during zoom with staggered animation
    const handleZoom = () => {
      const currentZoom = mapInstance.getZoom();
      
      let zoomFactor: number;
      if (currentZoom < 8) {
        zoomFactor = Math.max(0.3, currentZoom / 20);
      } else if (currentZoom < 12) {
        zoomFactor = 0.4 + ((currentZoom - 8) / 4) * 0.4;
      } else {
        zoomFactor = 0.8 + Math.min(0.5, (currentZoom - 12) / 8);
      }
      
      const newBaseSize = 36 * zoomFactor;
      
      markersRef.current.forEach((marker, index) => {
        const el = marker.getElement();
        if (el) {
          // Add staggered delay for smoother animation
          const delay = (index % 20) * 10; // Stagger in groups
          setTimeout(() => {
            const pinEl = el.querySelector('div') as HTMLElement;
            if (pinEl) {
              el.style.width = `${newBaseSize}px`;
              el.style.height = `${newBaseSize * 1.5}px`;
              pinEl.style.width = `${newBaseSize}px`;
              pinEl.style.height = `${newBaseSize}px`;
              pinEl.style.marginLeft = `-${newBaseSize / 2}px`;
              
              const innerEl = pinEl.querySelector('div') as HTMLElement;
              if (innerEl) {
                const svg = innerEl.querySelector('svg');
                if (svg) {
                  svg.setAttribute('width', `${newBaseSize * 0.5}`);
                  svg.setAttribute('height', `${newBaseSize * 0.5}`);
                }
              }
            }
          }, delay);
        }
      });
    };

    // Removed fade effect during panning - markers now stay fully visible and anchored

    mapInstance.on('zoom', handleZoom);
    
    return () => {
      mapInstance.off('zoom', handleZoom);
    };
  }, [mapLoaded, venues]);

  // Update map view when selected city changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    map.current.flyTo({
      center: [selectedCity.lng, selectedCity.lat],
      zoom: selectedCity.zoom,
      pitch: isMobile ? 30 : 50,
      duration: 2000,
      essential: true
    });
    
    // Update markers after city change animation completes
    setTimeout(() => {
      updateMarkers();
    }, 2100);
  }, [selectedCity, mapLoaded, isMobile]);

  // Deal markers removed - no longer displaying colored circles on map

  return (
    <div 
      className="relative w-full h-full"
      style={{
        // Use dvh for dynamic viewport height on mobile (handles iOS Safari address bar)
        minHeight: isMobile ? '100dvh' : '500px',
      }}
    >
      {/* Map Loading Overlay */}
      {mapInitializing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm z-50 animate-fade-in">
          <div className="flex flex-col items-center gap-3 sm:gap-4 px-4">
            <div className="relative">
              <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-primary/30 rounded-full" />
              <div className="absolute inset-0 w-12 h-12 sm:w-16 sm:h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm sm:text-base font-semibold text-foreground mb-1">Loading Map</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Initializing {selectedCity.name}...</p>
            </div>
          </div>
        </div>
      )}
      
      <div 
        ref={mapContainer} 
        className="absolute inset-0 overflow-hidden"
        style={{ 
          width: '100%', 
          height: '100%',
          // Ensure proper touch handling for different mobile devices
          touchAction: isMobile ? 'manipulation' : 'none',
          WebkitOverflowScrolling: 'touch',
          opacity: mapInitializing ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
        }} 
      />

      {/* City Selector with Current Location option - responsive for all devices */}
      <div 
        className={`absolute z-10 transition-all duration-500 ease-out ${
          mapLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
        style={{
          top: isMobile ? '0.5rem' : 'var(--map-ui-inset-top)',
          left: isMobile ? '0.5rem' : 'var(--map-ui-inset-left)',
          maxWidth: isMobile ? 'calc(100vw - 5rem)' : 'var(--map-control-max-width)',
        }}
      >
        <Select
          value={isUsingCurrentLocation ? "current-location" : selectedCity.id}
          onValueChange={(value) => {
            // Haptic feedback for city selection
            triggerHaptic('light');
            
            if (value === "current-location") {
              setIsUsingCurrentLocation(true);
              // Fly to user's current location if known
              if (userLocation && map.current) {
                map.current.flyTo({
                  center: [userLocation.lng, userLocation.lat],
                  zoom: Math.max(map.current.getZoom(), 13),
                  duration: 1500,
                  essential: true
                });
              } else if (geolocateControlRef.current) {
                // Trigger geolocation if location not yet known
                geolocateControlRef.current.trigger();
              }
            } else {
              setIsUsingCurrentLocation(false);
              const city = CITIES.find(c => c.id === value);
              if (city) {
                onCityChange(city);
                // Fly to selected city
                if (map.current) {
                  map.current.flyTo({
                    center: [city.lng, city.lat],
                    zoom: city.zoom,
                    duration: 1500,
                    essential: true
                  });
                }
              }
            }
          }}
        >
          <SelectTrigger className="w-auto text-[10px] sm:text-xs md:text-sm h-8 sm:h-9 md:h-10">
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-primary flex-shrink-0" />
              <span className="font-semibold truncate">
                {isUsingCurrentLocation 
                  ? (detectedCity ? `${detectedCity.name}, ${detectedCity.state}` : "Locating...") 
                  : `${selectedCity.name}, ${selectedCity.state}`}
              </span>
              {isUsingCurrentLocation && detectedCity && (
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              )}
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current-location">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                {detectedCity ? `${detectedCity.name}, ${detectedCity.state} (Current)` : "Use Current Location"}
              </div>
            </SelectItem>
            <div className="h-px bg-border my-1" />
            {CITIES.map((city) => {
              const distance = userLocation 
                ? getDistanceKm(userLocation.lat, userLocation.lng, city.lat, city.lng)
                : null;
              return (
                <SelectItem key={city.id} value={city.id}>
                  <div className="flex items-center justify-between w-full gap-3">
                    <span>{city.name}, {city.state}</span>
                    {distance !== null && (
                      <span className="text-xs text-muted-foreground">
                        {distance < 1 ? '<1' : Math.round(distance)} mi
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Live Indicator - Top Right, offset from map controls */}
      <div 
        className={`absolute z-10 transition-all duration-500 ease-out delay-100 ${
          mapLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
        style={{
          top: isMobile ? '0.5rem' : 'var(--map-ui-inset-top)',
          right: isMobile ? '2.75rem' : 'calc(var(--map-ui-inset-right) + 3rem)',
        }}
      >
        <div className="bg-card/95 backdrop-blur-xl px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border border-border flex items-center gap-1 sm:gap-1.5 shadow-lg">
          <div className="w-1.5 h-1.5 bg-destructive rounded-full pulse-glow" />
          <p className="text-[10px] sm:text-xs font-semibold text-foreground">Live</p>
        </div>
      </div>

      {/* Map Controls - Top left below city selector, collapsible on mobile/tablet */}
      <div 
        className={`absolute z-10 space-y-1.5 transition-all duration-500 ease-out delay-150 ${
          mapLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
        }`}
        style={{
          top: isMobile ? '3rem' : 'calc(var(--map-ui-inset-top) + 2.5rem)',
          left: isMobile ? '0.5rem' : 'var(--map-ui-inset-left)',
          maxWidth: isMobile ? 'calc(50vw - 1rem)' : 'var(--map-control-max-width)',
        }}
      >
        <Collapsible defaultOpen={!isMobile}>
          <CollapsibleTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="bg-card/95 backdrop-blur-xl border border-border text-[9px] sm:text-[10px] md:text-xs shadow-lg h-7 sm:h-8 md:h-9 px-1.5 sm:px-2 md:px-3"
            >
              <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 mr-0.5 sm:mr-1" />
              <span className="hidden sm:inline">Map Style</span>
              <span className="sm:hidden">Style</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1.5 sm:mt-2">
            <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-border p-1.5 sm:p-2 shadow-lg space-y-1.5 sm:space-y-2">
              <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                <Button
                  onClick={() => { triggerHaptic('light'); setMapStyle('dark'); }}
                  variant={mapStyle === 'dark' ? "default" : "outline"}
                  size="sm"
                  className="h-6 sm:h-7 text-[9px] sm:text-[10px] md:text-xs px-1.5 sm:px-2"
                >
                  Dark
                </Button>
                <Button
                  onClick={() => { triggerHaptic('light'); setMapStyle('light'); }}
                  variant={mapStyle === 'light' ? "default" : "outline"}
                  size="sm"
                  className="h-6 sm:h-7 text-[9px] sm:text-[10px] md:text-xs px-1.5 sm:px-2"
                >
                  Light
                </Button>
                <Button
                  onClick={() => { triggerHaptic('light'); setMapStyle('satellite'); }}
                  variant={mapStyle === 'satellite' ? "default" : "outline"}
                  size="sm"
                  className="h-6 sm:h-7 text-[9px] sm:text-[10px] md:text-xs px-1.5 sm:px-2"
                >
                  Satellite
                </Button>
                <Button
                  onClick={() => { triggerHaptic('light'); setMapStyle('streets'); }}
                  variant={mapStyle === 'streets' ? "default" : "outline"}
                  size="sm"
                  className="h-6 sm:h-7 text-[9px] sm:text-[10px] md:text-xs px-1.5 sm:px-2"
                >
                  Streets
                </Button>
              </div>
              
              <Button
                onClick={() => { triggerHaptic('medium'); setShow3DTerrain(!show3DTerrain); }}
                variant={show3DTerrain ? "default" : "outline"}
                size="sm"
                className="w-full h-6 sm:h-7 text-[9px] sm:text-[10px] md:text-xs mt-1"
              >
                {show3DTerrain ? "Disable" : "Enable"} 3D
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Mobile Controls - Slide style like desktop */}
      {isMobile && (
        <div 
          className={`fixed z-50 flex flex-col gap-2 transition-all duration-300 ease-out ${
            mapLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
          }`}
          style={{
            bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
            right: '0.75rem',
            width: '120px',
          }}
        >
          <Button
            onClick={() => {
              triggerHaptic('medium');
              const newState = !showDensityLayer;
              setShowDensityLayer(newState);
              if (newState) {
                setTimeFilter('all');
                setHourFilter(undefined);
                setDayFilter(undefined);
              }
            }}
            variant={showDensityLayer ? "default" : "outline"}
            size="sm"
            className={`w-full h-11 text-xs font-semibold rounded-xl shadow-lg transition-all duration-200 active:scale-95 touch-manipulation ${
              showDensityLayer 
                ? 'bg-primary text-primary-foreground shadow-primary/30' 
                : 'bg-card/95 backdrop-blur-xl text-foreground border-border'
            }`}
          >
            <Layers className="w-4 h-4 mr-2" />
            {showDensityLayer ? "Heat On" : "Heat Off"}
          </Button>

          <Button
            onClick={() => { triggerHaptic('medium'); setShowMovementPaths(!showMovementPaths); }}
            variant={showMovementPaths ? "default" : "outline"}
            size="sm"
            className={`w-full h-11 text-xs font-semibold rounded-xl shadow-lg transition-all duration-200 active:scale-95 touch-manipulation ${
              showMovementPaths 
                ? 'bg-primary text-primary-foreground shadow-primary/30' 
                : 'bg-card/95 backdrop-blur-xl text-foreground border-border'
            }`}
          >
            <Route className="w-4 h-4 mr-2" />
            {showMovementPaths ? "Paths On" : "Paths Off"}
          </Button>

          {/* Mobile Filter Controls - Show when Heat layer is active */}
          {showDensityLayer && (
            <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-border p-2 shadow-lg space-y-2 animate-fade-in">
              {/* Time-lapse toggle */}
              <Button
                onClick={() => {
                  triggerHaptic('medium');
                  const newMode = !timelapseMode;
                  setTimelapseMode(newMode);
                  if (newMode) {
                    timelapse.loadHourlyData();
                  }
                }}
                variant={timelapseMode ? "default" : "outline"}
                size="sm"
                className="w-full h-8 text-[10px] font-semibold"
              >
                <Clock className="w-3 h-3 mr-1" />
                {timelapseMode ? "Time-lapse On" : "Time-lapse"}
              </Button>

              {/* Time-lapse controls when active */}
              {timelapseMode ? (
                <div className="space-y-2 pt-1 border-t border-border/50">
                  {/* Play controls */}
                  <div className="flex items-center justify-between gap-1">
                    <Button
                      onClick={() => { triggerHaptic('light'); timelapse.stepBackward(); }}
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={timelapse.isPlaying}
                    >
                      <SkipBack className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => { triggerHaptic('medium'); timelapse.isPlaying ? timelapse.pause() : timelapse.play(); }}
                      variant={timelapse.isPlaying ? "default" : "outline"}
                      size="sm"
                      className="h-7 flex-1"
                    >
                      {timelapse.isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </Button>
                    <Button
                      onClick={() => { triggerHaptic('light'); timelapse.stepForward(); }}
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={timelapse.isPlaying}
                    >
                      <SkipForward className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Current hour display */}
                  <div className="text-center text-[10px] font-semibold text-primary">
                    {timelapse.formatHour(timelapse.currentHour)}
                  </div>

                  {/* Hour slider */}
                  <Slider
                    value={[timelapse.currentHour]}
                    onValueChange={([v]) => timelapse.setHour(v)}
                    min={0}
                    max={23}
                    step={1}
                    className="w-full"
                    disabled={timelapse.isPlaying}
                  />

                  {/* Speed control */}
                  <div className="flex gap-1">
                    {[2, 1, 0.5].map((speed) => (
                      <Button
                        key={speed}
                        onClick={() => timelapse.setSpeed(speed)}
                        variant={timelapse.speed === speed ? "default" : "outline"}
                        size="sm"
                        className="h-6 flex-1 text-[9px] px-1"
                      >
                        {speed === 2 ? '0.5x' : speed === 1 ? '1x' : '2x'}
                      </Button>
                    ))}
                  </div>

                  {timelapse.loading && (
                    <div className="flex items-center justify-center gap-1 py-1">
                      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-[9px] text-muted-foreground">Loading...</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Regular filters when time-lapse is off */
                <>
                  <Select value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)}>
                    <SelectTrigger className="h-8 text-[10px] bg-background/80">
                      <SelectValue placeholder="Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="this_hour">This Hour</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={hourFilter?.toString() || "all"} onValueChange={(v) => setHourFilter(v === "all" ? undefined : parseInt(v))}>
                    <SelectTrigger className="h-8 text-[10px] bg-background/80">
                      <SelectValue placeholder="Hour" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Hours</SelectItem>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>{i}:00</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={dayFilter?.toString() || "all"} onValueChange={(v) => setDayFilter(v === "all" ? undefined : parseInt(v))}>
                    <SelectTrigger className="h-8 text-[10px] bg-background/80">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Days</SelectItem>
                      <SelectItem value="0">Sun</SelectItem>
                      <SelectItem value="1">Mon</SelectItem>
                      <SelectItem value="2">Tue</SelectItem>
                      <SelectItem value="3">Wed</SelectItem>
                      <SelectItem value="4">Thu</SelectItem>
                      <SelectItem value="5">Fri</SelectItem>
                      <SelectItem value="6">Sat</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Desktop Controls Toggle Button */}
      {!isMobile && (
        <button
          onClick={() => { triggerHaptic('light'); setControlsCollapsed(!controlsCollapsed); }}
          className={`absolute z-30 bg-card backdrop-blur-xl rounded-full p-2.5 border border-border shadow-lg transition-all duration-300 hover:bg-card/90 active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation ${
            mapLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
          style={{
            bottom: 'var(--map-ui-inset-bottom)',
            right: controlsCollapsed 
              ? 'var(--map-ui-inset-right)'
              : 'calc(var(--map-ui-inset-right) + var(--map-control-max-width) + 0.5rem)',
          }}
          aria-label={controlsCollapsed ? "Show map controls" : "Hide map controls"}
        >
          {controlsCollapsed ? (
            <PanelRightOpen className="w-5 h-5 text-foreground" />
          ) : (
            <PanelRightClose className="w-5 h-5 text-foreground" />
          )}
        </button>
      )}

      {/* Controls Loading Skeleton - Desktop only */}
      {!isMobile && !mapLoaded && !controlsCollapsed && (
        <div 
          className="absolute z-30 space-y-2 animate-pulse"
          style={{
            bottom: 'var(--map-ui-inset-bottom)',
            right: 'var(--map-ui-inset-right)',
            width: 'var(--map-control-max-width)',
          }}
        >
          <div className="h-11 bg-card/80 backdrop-blur-xl rounded-lg border border-border/50 animate-shimmer" />
          <div className="h-11 bg-card/80 backdrop-blur-xl rounded-lg border border-border/50 animate-shimmer" style={{ animationDelay: '150ms' }} />
        </div>
      )}

      {/* Desktop Density Layer Controls - Bottom right */}
      {!isMobile && (
        <div 
          className={`absolute z-30 space-y-2 transition-all duration-300 ease-out ${
            controlsCollapsed 
              ? 'opacity-0 translate-x-full pointer-events-none' 
              : mapLoaded 
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 pointer-events-none'
          }`}
          style={{
            bottom: 'var(--map-ui-inset-bottom)',
            right: 'var(--map-ui-inset-right)',
            maxWidth: 'var(--map-control-max-width)',
          }}
        >
          <Button
            onClick={() => {
              triggerHaptic('medium');
              const newState = !showDensityLayer;
              setShowDensityLayer(newState);
              if (newState) {
                setTimeFilter('all');
                setHourFilter(undefined);
                setDayFilter(undefined);
              }
            }}
            variant={showDensityLayer ? "default" : "secondary"}
            size="sm"
            className="bg-card/95 backdrop-blur-xl border border-border text-xs shadow-lg w-full animate-fade-in min-h-[44px] touch-manipulation"
          >
            <Layers className="w-4 h-4 mr-1.5 flex-shrink-0" />
            <span>{showDensityLayer ? "Hide" : "Show"} Heat</span>
          </Button>

        {showDensityLayer && (
          <div className="map-control-compact space-y-1.5 animate-scale-in">
            <div className="control-header">
              <span>Heat Filters</span>
              {(densityLoading || timelapse.loading) && (
                <div className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {/* Error UI - Compact */}
            {densityError && (
              <div className="flex items-center gap-1.5 p-1.5 bg-destructive/10 rounded text-[9px]">
                <AlertCircle className="w-3 h-3 text-destructive flex-shrink-0" />
                <span className="text-destructive truncate">Load failed</span>
                <Button onClick={refreshDensity} variant="ghost" size="sm" className="h-5 text-[9px] px-1.5 ml-auto">
                  Retry
                </Button>
              </div>
            )}

            {/* Time-lapse Toggle */}
            <div className="flex items-center justify-between p-1.5 sm:p-2 bg-background/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-primary" />
                <span className="text-[10px] sm:text-xs font-medium">Time-lapse</span>
              </div>
              <Button
                onClick={() => {
                  triggerHaptic('light');
                  const newMode = !timelapseMode;
                  setTimelapseMode(newMode);
                  if (newMode && timelapse.hourlyData.length === 0) {
                    timelapse.loadHourlyData();
                  }
                }}
                variant={timelapseMode ? "default" : "outline"}
                size="sm"
                className="h-5 text-[9px] px-1.5"
              >
                {timelapseMode ? "On" : "Off"}
              </Button>
            </div>

            {/* Compact Time-lapse Controls for Mobile */}
            {timelapseMode && (
              <div className="space-y-1.5 p-1.5 sm:p-2 bg-primary/5 rounded-lg border border-primary/20">
                {/* Mobile: Use swipe control */}
                {isMobile ? (
                  <TimelapseSwipeControl
                    currentHour={timelapse.currentHour}
                    isPlaying={timelapse.isPlaying}
                    loading={timelapse.loading || timelapse.hourlyData.length === 0}
                    onHourChange={timelapse.setHour}
                    onTogglePlay={timelapse.togglePlay}
                    formatHour={timelapse.formatHour}
                    stats={timelapse.currentData?.stats}
                  />
                ) : (
                  <>
                    {/* Desktop: Compact inline controls */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-primary">{timelapse.formatHour(timelapse.currentHour)}</span>
                      <div className="flex items-center gap-1">
                        <Button onClick={timelapse.stepBackward} variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={timelapse.loading}>
                          <SkipBack className="w-3 h-3" />
                        </Button>
                        <Button onClick={timelapse.togglePlay} variant="default" size="sm" className="h-7 w-7 p-0 rounded-full" disabled={timelapse.loading || timelapse.hourlyData.length === 0}>
                          {timelapse.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                        </Button>
                        <Button onClick={timelapse.stepForward} variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={timelapse.loading}>
                          <SkipForward className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Hour slider */}
                    <input
                      type="range"
                      min="0"
                      max="23"
                      value={timelapse.currentHour}
                      onChange={(e) => timelapse.setHour(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                      disabled={timelapse.loading}
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>12AM</span>
                      <span>12PM</span>
                      <span>11PM</span>
                    </div>

                    {/* Speed control */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-muted-foreground">Speed:</span>
                      <div className="flex gap-0.5 flex-1">
                        {[2, 1, 0.5].map((speed) => (
                          <Button
                            key={speed}
                            onClick={() => timelapse.setSpeed(speed)}
                            variant={timelapse.speed === speed ? "default" : "outline"}
                            size="sm"
                            className="h-5 flex-1 text-[9px] px-1"
                          >
                            {speed === 2 ? '0.5x' : speed === 1 ? '1x' : '2x'}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Loading indicator */}
                {timelapse.loading && (
                  <div className="flex items-center justify-center gap-1.5 py-1">
                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-[9px] text-muted-foreground">Loading...</span>
                  </div>
                )}

                {timelapse.error && (
                  <div className="flex items-center gap-1.5 p-1.5 bg-destructive/10 rounded text-[9px]">
                    <AlertCircle className="w-3 h-3 text-destructive" />
                    <span className="text-destructive truncate">{timelapse.error}</span>
                  </div>
                )}
              </div>
            )}

            {/* Regular filters (disabled in timelapse mode) - Compact */}
            {!timelapseMode && (
              <div className="space-y-1.5">
                <div className="control-inline-row">
                  <span className="control-inline-label">Time:</span>
                  <Select value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)}>
                    <SelectTrigger className="h-6 text-[10px] bg-background flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="this_week">Week</SelectItem>
                      <SelectItem value="this_hour">Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="control-inline-row">
                  <span className="control-inline-label">Hour:</span>
                  <Select value={hourFilter?.toString() || "all"} onValueChange={(v) => setHourFilter(v === "all" ? undefined : parseInt(v))}>
                    <SelectTrigger className="h-6 text-[10px] bg-background flex-1">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>{i}:00</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="control-inline-row">
                  <span className="control-inline-label">Day:</span>
                  <Select value={dayFilter?.toString() || "all"} onValueChange={(v) => setDayFilter(v === "all" ? undefined : parseInt(v))}>
                    <SelectTrigger className="h-6 text-[10px] bg-background flex-1">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="0">Sun</SelectItem>
                      <SelectItem value="1">Mon</SelectItem>
                      <SelectItem value="2">Tue</SelectItem>
                      <SelectItem value="3">Wed</SelectItem>
                      <SelectItem value="4">Thu</SelectItem>
                      <SelectItem value="5">Fri</SelectItem>
                      <SelectItem value="6">Sat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Day filter for timelapse mode */}
            {timelapseMode && (
              <div className="control-inline-row">
                <span className="control-inline-label">Day:</span>
                <Select value={dayFilter?.toString() || "all"} onValueChange={(v) => {
                  setDayFilter(v === "all" ? undefined : parseInt(v));
                  setTimeout(() => timelapse.loadHourlyData(), 100);
                }}>
                  <SelectTrigger className="h-6 text-[10px] bg-background flex-1">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="0">Sun</SelectItem>
                    <SelectItem value="1">Mon</SelectItem>
                    <SelectItem value="2">Tue</SelectItem>
                    <SelectItem value="3">Wed</SelectItem>
                    <SelectItem value="4">Thu</SelectItem>
                    <SelectItem value="5">Fri</SelectItem>
                    <SelectItem value="6">Sat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Stats - single line */}
            {(timelapseMode ? timelapse.currentData : densityData) && (
              <div className="flex items-center gap-2 text-[9px] text-muted-foreground pt-1 border-t border-border/30">
                <span>{(timelapseMode ? timelapse.currentData?.stats.total_points : densityData?.stats.total_points)?.toLocaleString()} visits</span>
              </div>
            )}
          </div>
        )}
        
        {/* Movement Paths Toggle - Compact */}
        <Button
          onClick={() => { triggerHaptic('medium'); setShowMovementPaths(!showMovementPaths); }}
          variant={showMovementPaths ? "default" : "secondary"}
          size="sm"
          className={`backdrop-blur-xl border shadow-lg w-full animate-fade-in min-h-[44px] touch-manipulation ${
            isMobile 
              ? 'bg-card border-border text-foreground text-[11px] font-semibold' 
              : 'bg-card/95 border-border text-xs'
          }`}
        >
          <Route className="w-4 h-4 mr-1.5 flex-shrink-0" />
          <span>{showMovementPaths ? "Hide" : "Show"} Paths</span>
        </Button>

        {showMovementPaths && (
          <div className="map-control-compact space-y-1.5 animate-scale-in">
            <div className="control-header">
              <span>Flow Filters</span>
              {pathsLoading && (
                <div className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {/* Error UI - Compact */}
            {pathsError && (
              <div className="flex items-center gap-1.5 p-1.5 bg-destructive/10 rounded text-[9px]">
                <AlertCircle className="w-3 h-3 text-destructive flex-shrink-0" />
                <span className="text-destructive truncate">Load failed</span>
                <Button onClick={refreshPaths} variant="ghost" size="sm" className="h-5 text-[9px] px-1.5 ml-auto">
                  Retry
                </Button>
              </div>
            )}

            {/* Time filter - inline */}
            <div className="control-inline-row">
              <span className="control-inline-label">Time:</span>
              <Select value={pathTimeFilter} onValueChange={(v: any) => setPathTimeFilter(v)}>
                <SelectTrigger className="h-6 text-[10px] bg-background flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">Week</SelectItem>
                  <SelectItem value="this_hour">Hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Frequency slider - compact */}
            <div className="control-inline-row">
              <span className="control-inline-label">Freq:</span>
              <input
                type="range"
                min="1"
                max="10"
                value={minPathFrequency}
                onChange={(e) => setMinPathFrequency(parseInt(e.target.value))}
                className="path-flow-slider flex-1"
              />
              <span className="control-inline-value w-4 text-center">{minPathFrequency}</span>
            </div>

            {/* Stats - single line */}
            {pathData && (
              <div className="flex items-center gap-2 text-[9px] text-muted-foreground pt-1 border-t border-border/30">
                <span>{pathData.stats.total_paths} paths</span>
                <span>•</span>
                <span>{pathData.stats.unique_users} users</span>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Enhanced Legend - Bottom left, responsive for all devices */}
      <div 
        className={`absolute bg-card/95 backdrop-blur-xl px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3 rounded-xl border border-border z-10 shadow-lg transition-all duration-300 ease-out ${
          mapLoaded && (isMobile ? (showDensityLayer || showMovementPaths) : !controlsCollapsed) 
            ? 'opacity-100 translate-x-0' 
            : 'opacity-0 -translate-x-full pointer-events-none'
        }`}
        style={{
          bottom: isMobile ? 'calc(5rem + env(safe-area-inset-bottom, 0px))' : 'var(--map-ui-inset-bottom)',
          left: 'var(--map-ui-inset-left)',
          maxWidth: 'var(--map-control-max-width)',
        }}
      >
        {showMovementPaths ? (
          <>
            <p className="text-[10px] sm:text-xs md:text-sm font-semibold text-foreground mb-1.5 sm:mb-2">User Flow Paths</p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2">
              <div className="w-20 sm:w-24 md:w-32 h-3.5 sm:h-4 md:h-5 rounded-md shadow-inner" style={{
                background: 'linear-gradient(to right, rgb(100, 200, 255), rgb(0, 255, 255), rgb(255, 200, 0), rgb(255, 100, 0), rgb(255, 0, 100))',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }} />
              <div className="flex justify-between w-full text-[9px] sm:text-[10px] md:text-xs text-muted-foreground font-medium">
                <span>Less Traffic</span>
                <span>High Traffic</span>
              </div>
            </div>
          </>
        ) : showDensityLayer ? (
          <>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              <p className="text-[10px] sm:text-xs md:text-sm font-semibold text-foreground">
                {timelapseMode ? 'Time-lapse' : 'User Density Heatmap'}
              </p>
              {timelapseMode && timelapse.isPlaying && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  <span className="text-[9px] sm:text-[10px] text-primary font-medium">{timelapse.formatHour(timelapse.currentHour)}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2">
              <div className="w-20 sm:w-24 md:w-32 h-3.5 sm:h-4 md:h-5 rounded-md shadow-inner" style={{
                background: 'linear-gradient(to right, rgba(65, 105, 225, 0.8), rgb(0, 255, 127), rgb(255, 255, 0), rgb(255, 165, 0), rgb(255, 0, 0), rgb(139, 0, 0))',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }} />
              <div className="flex justify-between w-full text-[9px] sm:text-[10px] md:text-xs text-muted-foreground font-medium">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-[10px] sm:text-xs md:text-sm font-semibold text-muted-foreground mb-1 sm:mb-1.5 md:mb-2">Activity Level</p>
            <div className="flex gap-1.5 sm:gap-2 md:gap-3 flex-wrap">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 bg-hot rounded-full" />
                <span className="text-[9px] sm:text-[10px] md:text-xs text-foreground">Hot</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 bg-warm rounded-full" />
                <span className="text-[9px] sm:text-[10px] md:text-xs text-foreground">Warm</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 bg-cool rounded-full" />
                <span className="text-[9px] sm:text-[10px] md:text-xs text-foreground">Cool</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Enhanced Heatmap Loading Overlay */}
      {showDensityLayer && densityLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-md z-20 animate-fade-in">
          <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-border p-6 flex flex-col items-center gap-4 shadow-2xl animate-scale-in">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-primary/30 rounded-full" />
              <div className="absolute inset-0 w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground mb-1">Loading Density Data</p>
              <p className="text-xs text-muted-foreground">Analyzing user hotspots...</p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced animations and styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: translate(-50%, 0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, 0) scale(1.05);
            opacity: 0.9;
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateX(-50%) translateY(0);
          }
          25% {
            transform: translateX(-50%) translateY(-20px);
          }
          50% {
            transform: translateX(-50%) translateY(-10px);
          }
          75% {
            transform: translateX(-50%) translateY(-15px);
          }
        }
        
        .venue-marker-container {
          position: relative;
        }
        
        .heatmap-glow {
          animation: heatmap-pulse 3s ease-in-out infinite;
        }
        
        .heatmap-glow-0 {
          animation-delay: 0s;
        }
        
        .heatmap-glow-1 {
          animation-delay: 0.2s;
        }
        
        .heatmap-glow-2 {
          animation-delay: 0.4s;
        }
        
        @keyframes heatmap-pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.3;
          }
        }
        
        /* Popup styling */
        .mapboxgl-popup-content {
          background: rgba(20, 20, 30, 0.95) !important;
          backdrop-filter: blur(10px) !important;
          border-radius: 12px !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
          padding: 0 !important;
        }
        
        .mapboxgl-popup-tip {
          border-top-color: rgba(20, 20, 30, 0.95) !important;
        }
        
        .venue-popup .mapboxgl-popup-content {
          animation: popup-fade-in 0.3s ease-out;
        }
        
        @keyframes popup-fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
