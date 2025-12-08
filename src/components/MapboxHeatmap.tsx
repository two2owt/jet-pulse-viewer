import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, TrendingUp, Layers, X, AlertCircle, Route } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocationDensity } from "@/hooks/useLocationDensity";
import { useMovementPaths } from "@/hooks/useMovementPaths";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
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
}

const getActivityColor = (activity: number) => {
  if (activity >= 80) return "hsl(0, 85%, 55%)"; // hot red
  if (activity >= 60) return "hsl(45, 100%, 55%)"; // warm yellow
  if (activity >= 40) return "hsl(210, 100%, 55%)"; // cool blue
  return "hsl(0, 0%, 45%)"; // cold gray
};

export const MapboxHeatmap = ({ onVenueSelect, venues, mapboxToken, selectedCity, onCityChange }: MapboxHeatmapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInitializing, setMapInitializing] = useState(true);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const dealMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const geolocateControlRef = useRef<mapboxgl.GeolocateControl | null>(null);
  const isMobile = useIsMobile();
  const initStartTime = useRef<number>(0);
  
  // Density heatmap state
  const [showDensityLayer, setShowDensityLayer] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'this_week' | 'this_hour'>('all');
  const [hourFilter, setHourFilter] = useState<number | undefined>();
  const [dayFilter, setDayFilter] = useState<number | undefined>();
  const [mapStyle, setMapStyle] = useState<'dark' | 'light' | 'satellite' | 'streets'>('dark');
  const [show3DTerrain, setShow3DTerrain] = useState(false);
  
  // Movement paths state
  const [showMovementPaths, setShowMovementPaths] = useState(false);
  const [pathTimeFilter, setPathTimeFilter] = useState<'all' | 'today' | 'this_week' | 'this_hour'>('all');
  const [minPathFrequency, setMinPathFrequency] = useState(2);
  
  // User location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [detectedCity, setDetectedCity] = useState<City | null>(null); // City detected from user's location
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(true); // Default to current location
  
  const { densityData, loading: densityLoading, error: densityError, refresh: refreshDensity } = useLocationDensity({
    timeFilter,
    hourOfDay: hourFilter,
    dayOfWeek: dayFilter,
  });

  const { pathData, loading: pathsLoading, error: pathsError, refresh: refreshPaths } = useMovementPaths({
    timeFilter: pathTimeFilter,
    minFrequency: minPathFrequency,
  });

  // Handle map resize on viewport changes
  useEffect(() => {
    const handleResize = () => {
      if (map.current) {
        map.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Also handle visibility changes (e.g., when switching tabs)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && map.current) {
        setTimeout(() => map.current?.resize(), 100);
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
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
      antialias: true,
      attributionControl: false,
      cooperativeGestures: isMobile,
      touchZoomRotate: true,
      touchPitch: !isMobile,
      dragRotate: !isMobile,
      projection: 'globe' as any,
      // Performance optimizations
      fadeDuration: 100, // Faster tile fade for quicker perceived load
      refreshExpiredTiles: false, // Don't refresh tiles automatically
    });

    // Add attribution control in a better position
    map.current.addControl(
      new mapboxgl.AttributionControl({
        compact: true,
      }),
      'bottom-right'
    );


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
    });

    // Add error handler
    map.current.on('error', (e) => {
      console.error('MapboxHeatmap: Map error', e.error);
    });
    } catch (error) {
      console.error('MapboxHeatmap: Failed to initialize map', error);
    }

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

    map.current.on("load", () => {
      setMapLoaded(true);
      
      // Automatically trigger geolocation when map loads
      if (geolocateControlRef.current) {
        // Wait a brief moment for the map to fully settle before triggering
        setTimeout(() => {
          geolocateControlRef.current?.trigger();
        }, 500);
      }
    });

    return () => {
      // Prevent rendering effects while map is tearing down
      setMapLoaded(false);
      if (userMarker.current) {
        userMarker.current.remove();
      }
      markersRef.current.forEach((marker) => marker.remove());
      dealMarkersRef.current.forEach((marker) => marker.remove());
      map.current?.remove();
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

  // Add/update density heatmap layer with lazy loading
  useEffect(() => {
    if (!map.current || !mapLoaded || !densityData) return;

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
      data: densityData.geojson,
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

    console.log('Density heatmap layer added with', densityData.stats.grid_cells, 'points');
  }, [mapLoaded, densityData, showDensityLayer]);

  // Add/update movement paths layer
  useEffect(() => {
    if (!map.current || !mapLoaded || !pathData) return;

    const sourceId = 'movement-paths';
    const lineLayerId = 'movement-paths-line';
    const arrowLayerId = 'movement-paths-arrows';

    try {
      // Remove existing layers and source if they exist
      if (map.current.getLayer(arrowLayerId)) {
        map.current.removeLayer(arrowLayerId);
      }
      if (map.current.getLayer(lineLayerId)) {
        map.current.removeLayer(lineLayerId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
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
      lineMetrics: true, // Enable line gradient
    });

    // Add animated flow line layer
    map.current.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        // Line width based on frequency
        'line-width': [
          'interpolate',
          ['exponential', 1.5],
          ['get', 'frequency'],
          1, 3,
          5, 6,
          10, 10,
          20, 14,
        ],
        // Color gradient based on frequency
        'line-color': [
          'interpolate',
          ['linear'],
          ['get', 'frequency'],
          1, 'rgb(100, 200, 255)',     // light blue for low frequency
          5, 'rgb(0, 255, 255)',        // cyan
          10, 'rgb(255, 200, 0)',       // yellow
          15, 'rgb(255, 100, 0)',       // orange
          20, 'rgb(255, 0, 100)',       // pink-red
        ],
        'line-opacity': 0.8,
        // Animated gradient dash for flow effect
        'line-dasharray': [0, 4, 3],
        'line-opacity-transition': {
          duration: 1000,
          delay: 0
        }
      },
    });

    // Add arrow symbols for direction
    map.current.addLayer({
      id: arrowLayerId,
      type: 'symbol',
      source: sourceId,
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 50,
        'icon-image': 'arrow',
        'icon-size': [
          'interpolate',
          ['linear'],
          ['get', 'frequency'],
          1, 0.5,
          10, 0.7,
          20, 1,
        ],
        'icon-rotate': 90,
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
      paint: {
        'icon-opacity': 0.9,
        'icon-opacity-transition': {
          duration: 1000,
          delay: 200
        }
      },
    });

    // Add arrow icon if not exists
    if (!map.current.hasImage('arrow')) {
      const size = 64;
      const arrowCanvas = document.createElement('canvas');
      arrowCanvas.width = size;
      arrowCanvas.height = size;
      const ctx = arrowCanvas.getContext('2d')!;

      // Draw arrow shape
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.moveTo(size / 2, size * 0.2);
      ctx.lineTo(size * 0.8, size / 2);
      ctx.lineTo(size * 0.6, size / 2);
      ctx.lineTo(size * 0.6, size * 0.8);
      ctx.lineTo(size * 0.4, size * 0.8);
      ctx.lineTo(size * 0.4, size / 2);
      ctx.lineTo(size * 0.2, size / 2);
      ctx.closePath();
      ctx.fill();

      // Add stroke
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      map.current.addImage('arrow', {
        width: size,
        height: size,
        data: ctx.getImageData(0, 0, size, size).data as any,
      });
    }

    // Animate the dash array for flow effect
    let dashArraySequence = [
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
    const animateFlow = () => {
      if (!map.current || !showMovementPaths) return;
      
      step = (step + 1) % dashArraySequence.length;
      
      if (map.current.getLayer(lineLayerId)) {
        map.current.setPaintProperty(
          lineLayerId,
          'line-dasharray',
          dashArraySequence[step]
        );
      }
      
      requestAnimationFrame(animateFlow);
    };

    animateFlow();

    console.log('Movement paths layer added with', pathData.stats.total_paths, 'paths');
  }, [mapLoaded, pathData, showMovementPaths]);


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
        height: ${markerSize * 1.5}px;
        cursor: pointer;
        position: relative;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        will-change: transform, opacity;
      `;

      // Create glassmorphic pin element
      const pinEl = document.createElement('div');
      pinEl.style.cssText = `
        width: ${markerSize}px;
        height: ${markerSize}px;
        background: linear-gradient(135deg, ${color}25, ${color}45);
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
        border: 1.5px solid rgba(255, 255, 255, 0.18);
        border-radius: 50% 50% 50% 0;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 
          0 8px 32px ${color}40,
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 2px rgba(255, 255, 255, 0.4),
          inset 0 -1px 2px rgba(0, 0, 0, 0.1);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        filter: drop-shadow(0 4px 12px ${color}30);
        transform: rotate(-45deg);
        position: absolute;
        top: 0;
        left: 50%;
        margin-left: -${markerSize / 2}px;
        will-change: transform;
      `;

      // Add pulsating animation based on activity level
      if (venue.activity >= 80) {
        // Most popular venues - intense pulsating
        pinEl.style.animation = "venue-pulse-intense 1.5s ease-in-out infinite";
        pinEl.style.setProperty('color', color);
      } else if (venue.activity >= 60) {
        // High traffic venues - moderate pulsating
        pinEl.style.animation = "venue-pulse-moderate 2s ease-in-out infinite";
        pinEl.style.setProperty('color', color);
      } else if (venue.activity >= 40) {
        // Medium traffic venues - subtle pulsating
        pinEl.style.animation = "venue-pulse-subtle 2.5s ease-in-out infinite";
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

      // Enhanced glassmorphic hover effects
      el.addEventListener("mouseenter", () => {
        pinEl.style.transform = "rotate(-45deg) scale(1.15)";
        pinEl.style.background = `linear-gradient(135deg, ${color}35, ${color}55)`;
        pinEl.style.boxShadow = `
          0 12px 48px ${color}60,
          0 0 0 2px rgba(255, 255, 255, 0.2),
          inset 0 2px 3px rgba(255, 255, 255, 0.5),
          inset 0 -2px 3px rgba(0, 0, 0, 0.15)
        `;
        pinEl.style.filter = `drop-shadow(0 6px 20px ${color}50)`;
        pinEl.style.borderColor = "rgba(255, 255, 255, 0.3)";
      });

      el.addEventListener("mouseleave", () => {
        pinEl.style.transform = "rotate(-45deg)";
        pinEl.style.background = `linear-gradient(135deg, ${color}25, ${color}45)`;
        pinEl.style.boxShadow = `
          0 8px 32px ${color}40,
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 2px rgba(255, 255, 255, 0.4),
          inset 0 -1px 2px rgba(0, 0, 0, 0.1)
        `;
        pinEl.style.filter = `drop-shadow(0 4px 12px ${color}30)`;
        pinEl.style.borderColor = "rgba(255, 255, 255, 0.18)";
      });

      // Create marker with bottom anchor so pin tip points to exact coordinate
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([venue.lng, venue.lat])
        .addTo(mapInstance);

      // Create popup for the venue with enhanced information
      const googleRatingHTML = venue.googleRating 
        ? `<div style="display: flex; align-items: center; gap: 4px; margin-top: 4px;">
             <span style="color: #FFD700; font-size: 12px;">★</span>
             <span style="font-size: 11px; font-weight: 600; color: white;">${venue.googleRating.toFixed(1)}</span>
             <span style="font-size: 10px; color: rgba(255, 255, 255, 0.6);">(${venue.googleTotalRatings} reviews)</span>
           </div>`
        : '';
      
      const isOpenHTML = venue.isOpen !== undefined
        ? `<div style="margin-top: 4px;">
             <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${venue.isOpen ? '#22c55e' : '#ef4444'}; margin-right: 4px;"></span>
             <span style="font-size: 10px; font-weight: 600; color: ${venue.isOpen ? '#22c55e' : '#ef4444'};">${venue.isOpen ? 'OPEN NOW' : 'CLOSED'}</span>
           </div>`
        : '';

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: true,
        maxWidth: '220px',
        className: 'venue-popup'
      }).setHTML(`
        <div style="padding: 8px;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: white;">${venue.name}</h4>
          <p style="margin: 0 0 4px 0; font-size: 11px; color: rgba(255, 255, 255, 0.7);">${venue.category} • ${venue.neighborhood}</p>
          <div style="display: flex; align-items: center; gap: 4px;">
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
        
        // Bounce animation
        pinEl.style.animation = "bounce 0.6s ease-out";
        setTimeout(() => {
          // Restore appropriate pulsating animation after bounce
          if (venue.activity >= 80) {
            pinEl.style.animation = "venue-pulse-intense 1.5s ease-in-out infinite";
          } else if (venue.activity >= 60) {
            pinEl.style.animation = "venue-pulse-moderate 2s ease-in-out infinite";
          } else if (venue.activity >= 40) {
            pinEl.style.animation = "venue-pulse-subtle 2.5s ease-in-out infinite";
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
  }, [venues, mapLoaded]);

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
    <div className="relative w-full h-full min-h-[500px]">
      {/* Map Loading Overlay */}
      {mapInitializing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm z-50 animate-fade-in">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/30 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-foreground mb-1">Loading Map</p>
              <p className="text-sm text-muted-foreground">Initializing {selectedCity.name}...</p>
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
          minHeight: isMobile ? '100%' : '500px',
          touchAction: isMobile ? 'pan-y pinch-zoom' : 'none',
          opacity: mapInitializing ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
        }} 
      />

      {/* City Selector with Current Location option */}
      <div className="absolute top-4 left-4 sm:top-5 sm:left-5 z-10 max-w-[calc(100vw-120px)] sm:max-w-[280px]">
        <Select
          value={isUsingCurrentLocation ? "current-location" : selectedCity.id}
          onValueChange={(value) => {
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
          <SelectTrigger className="w-auto text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
              <span className="font-semibold">
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
      <div className="absolute top-4 right-16 sm:top-5 sm:right-20 z-10">
        <div className="bg-card/95 backdrop-blur-xl px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-border flex items-center gap-1.5 sm:gap-2 shadow-lg">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-destructive rounded-full pulse-glow" />
          <p className="text-xs sm:text-sm font-semibold text-foreground">Live</p>
        </div>
      </div>

      {/* Map Controls - Top left below city selector, collapsible on mobile */}
      <div className="absolute top-16 sm:top-20 left-3 sm:left-4 z-10 space-y-2">
        <Collapsible defaultOpen={!isMobile}>
          <CollapsibleTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="bg-card/95 backdrop-blur-xl border border-border text-xs shadow-lg h-8 sm:h-9 px-2 sm:px-3"
            >
              <Layers className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden sm:inline">Map Style</span>
              <span className="sm:hidden">Style</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-border p-2 shadow-lg space-y-2 max-w-[160px] sm:max-w-[200px]">
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  onClick={() => setMapStyle('dark')}
                  variant={mapStyle === 'dark' ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-[10px] sm:text-xs px-2"
                >
                  Dark
                </Button>
                <Button
                  onClick={() => setMapStyle('light')}
                  variant={mapStyle === 'light' ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-[10px] sm:text-xs px-2"
                >
                  Light
                </Button>
                <Button
                  onClick={() => setMapStyle('satellite')}
                  variant={mapStyle === 'satellite' ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-[10px] sm:text-xs px-2"
                >
                  Satellite
                </Button>
                <Button
                  onClick={() => setMapStyle('streets')}
                  variant={mapStyle === 'streets' ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-[10px] sm:text-xs px-2"
                >
                  Streets
                </Button>
              </div>
              
              <Button
                onClick={() => setShow3DTerrain(!show3DTerrain)}
                variant={show3DTerrain ? "default" : "outline"}
                size="sm"
                className="w-full h-7 text-[10px] sm:text-xs mt-1"
              >
                {show3DTerrain ? "Disable" : "Enable"} 3D
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Density Layer Controls - Bottom right, offset from Mapbox controls */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-14 z-10 space-y-2 max-w-[calc(100vw-80px)] sm:max-w-[280px]">
        <Button
          onClick={() => {
            const newState = !showDensityLayer;
            setShowDensityLayer(newState);
            // Reset to "All Time" when enabling the layer
            if (newState) {
              setTimeFilter('all');
              setHourFilter(undefined);
              setDayFilter(undefined);
            }
          }}
          variant={showDensityLayer ? "default" : "secondary"}
          size="sm"
          className="bg-card/95 backdrop-blur-xl border border-border text-xs sm:text-sm shadow-lg w-full animate-fade-in"
        >
          <Layers className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">{showDensityLayer ? "Hide" : "Show"} Heat Layer</span>
          <span className="sm:hidden">Heat</span>
        </Button>

        {showDensityLayer && (
          <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-border p-3 sm:p-4 space-y-2 shadow-lg animate-scale-in">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground">Heat Filters</p>
              {densityLoading && (
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {/* Error UI */}
            {densityError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <p className="text-xs text-destructive font-medium">Failed to load heat data</p>
                </div>
                <Button
                  onClick={refreshDensity}
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs border-destructive/30 hover:bg-destructive/20"
                >
                  Retry
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Select value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_hour">This Hour</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={hourFilter?.toString() || "all"}
                onValueChange={(v) => setHourFilter(v === "all" ? undefined : parseInt(v))}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Hour of day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hours</SelectItem>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {i}:00 - {i + 1}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={dayFilter?.toString() || "all"}
                onValueChange={(v) => setDayFilter(v === "all" ? undefined : parseInt(v))}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Day of week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {densityData && (
              <div className="pt-2 border-t border-border/50 space-y-1">
                <p className="text-xs text-muted-foreground">
                  {densityData.stats.total_points.toLocaleString()} visits
                </p>
                <p className="text-xs text-muted-foreground">
                  Max density: {densityData.stats.max_density}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Movement Paths Toggle */}
        <Button
          onClick={() => setShowMovementPaths(!showMovementPaths)}
          variant={showMovementPaths ? "default" : "secondary"}
          size="sm"
          className="bg-card/95 backdrop-blur-xl border border-border text-xs sm:text-sm shadow-lg w-full animate-fade-in"
        >
          <Route className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">{showMovementPaths ? "Hide" : "Show"} Flow Paths</span>
          <span className="sm:hidden">Paths</span>
        </Button>

        {showMovementPaths && (
          <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-border p-3 sm:p-4 space-y-2 shadow-lg animate-scale-in">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground">Path Filters</p>
              {pathsLoading && (
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {/* Error UI */}
            {pathsError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <p className="text-xs text-destructive font-medium">Failed to load path data</p>
                </div>
                <Button
                  onClick={refreshPaths}
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs border-destructive/30 hover:bg-destructive/20"
                >
                  Retry
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Select value={pathTimeFilter} onValueChange={(v: any) => setPathTimeFilter(v)}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_hour">This Hour</SelectItem>
                </SelectContent>
              </Select>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Min Frequency: {minPathFrequency}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={minPathFrequency}
                  onChange={(e) => setMinPathFrequency(parseInt(e.target.value))}
                  className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>

            {pathData && (
              <div className="pt-2 border-t border-border/50 space-y-1">
                <p className="text-xs text-muted-foreground">
                  {pathData.stats.total_paths.toLocaleString()} paths
                </p>
                <p className="text-xs text-muted-foreground">
                  {pathData.stats.total_movements.toLocaleString()} movements
                </p>
                <p className="text-xs text-muted-foreground">
                  {pathData.stats.unique_users} users
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Legend - Bottom left, compact on mobile */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-card/95 backdrop-blur-xl px-2 py-1.5 sm:px-4 sm:py-3 rounded-xl border border-border z-10 shadow-lg max-w-[140px] sm:max-w-none animate-fade-in">
        {showMovementPaths ? (
          <>
            <p className="text-[10px] sm:text-xs font-semibold text-foreground mb-1.5 sm:mb-2">User Flow Paths</p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2">
              <div className="w-24 sm:w-32 h-4 sm:h-5 rounded-md shadow-inner" style={{
                background: 'linear-gradient(to right, rgb(100, 200, 255), rgb(0, 255, 255), rgb(255, 200, 0), rgb(255, 100, 0), rgb(255, 0, 100))',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }} />
              <div className="flex justify-between w-full text-[10px] sm:text-xs text-muted-foreground font-medium">
                <span>Less Traffic</span>
                <span>High Traffic</span>
              </div>
            </div>
          </>
        ) : showDensityLayer ? (
          <>
            <p className="text-[10px] sm:text-xs font-semibold text-foreground mb-1.5 sm:mb-2">User Density Heatmap</p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2">
              <div className="w-24 sm:w-32 h-4 sm:h-5 rounded-md shadow-inner" style={{
                background: 'linear-gradient(to right, rgba(65, 105, 225, 0.8), rgb(0, 255, 127), rgb(255, 255, 0), rgb(255, 165, 0), rgb(255, 0, 0), rgb(139, 0, 0))',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }} />
              <div className="flex justify-between w-full text-[10px] sm:text-xs text-muted-foreground font-medium">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-1.5 sm:mb-2">Activity Level</p>
            <div className="flex gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-hot rounded-full" />
                <span className="text-[10px] sm:text-xs text-foreground">Hot</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-warm rounded-full" />
                <span className="text-[10px] sm:text-xs text-foreground">Warm</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-cool rounded-full" />
                <span className="text-[10px] sm:text-xs text-foreground">Cool</span>
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
