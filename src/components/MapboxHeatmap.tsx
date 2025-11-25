import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, TrendingUp, Layers, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocationDensity } from "@/hooks/useLocationDensity";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { Venue } from "./Heatmap";
import { CITIES, type City } from "@/types/cities";
import locationTrackerIcon from "@/assets/location-tracker.png";

interface MapboxHeatmapProps {
  onVenueSelect: (venue: Venue) => void;
  venues: Venue[];
  mapboxToken: string;
  selectedCity: City;
  onCityChange: (city: City) => void;
}

const getActivityColor = (activity: number) => {
  if (activity >= 80) return "hsl(24, 100%, 60%)"; // sunset orange
  if (activity >= 60) return "hsl(14, 100%, 62%)"; // warm orange
  if (activity >= 40) return "hsl(320, 80%, 65%)"; // sunset pink
  return "hsl(0, 0%, 45%)"; // cool gray
};

export const MapboxHeatmap = ({ onVenueSelect, venues, mapboxToken, selectedCity, onCityChange }: MapboxHeatmapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const dealMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const geolocateControlRef = useRef<mapboxgl.GeolocateControl | null>(null);
  const isMobile = useIsMobile();
  
  // Density heatmap state
  const [showDensityLayer, setShowDensityLayer] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'this_week' | 'this_hour'>('all');
  const [hourFilter, setHourFilter] = useState<number | undefined>();
  const [dayFilter, setDayFilter] = useState<number | undefined>();
  
  const { densityData, loading: densityLoading, error: densityError, refresh: refreshDensity } = useLocationDensity({
    timeFilter,
    hourOfDay: hourFilter,
    dayOfWeek: dayFilter,
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
      return;
    }

    try {
      mapboxgl.accessToken = mapboxToken;
      console.log('MapboxHeatmap: Initializing map for', selectedCity.name);

      // Initialize map centered on selected city
      map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [selectedCity.lng, selectedCity.lat],
      zoom: selectedCity.zoom,
      pitch: isMobile ? 30 : 50, // Lower pitch on mobile for better usability
      bearing: 0,
      antialias: true,
      attributionControl: false, // We'll add it back with custom position
      // Optimize touch handling for better scroll compatibility
      cooperativeGestures: isMobile, // Require ctrl/cmd + scroll to zoom on mobile
      touchZoomRotate: true,
      touchPitch: !isMobile, // Disable pitch gestures on mobile to reduce conflicts
      dragRotate: !isMobile, // Disable rotation drag on mobile
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
      console.log('MapboxHeatmap: Map loaded successfully');
      setTimeout(() => {
        if (map.current) {
          map.current.resize();
          setMapLoaded(true);
        }
      }, 100);
    });

    // Add error handler
    map.current.on('error', (e) => {
      console.error('MapboxHeatmap: Map error', e.error);
    });
    } catch (error) {
      console.error('MapboxHeatmap: Failed to initialize map', error);
    }

    // Add atmospheric effects when style loads
    map.current.on('style.load', () => {
      if (!map.current) return;
      
      // Add fog/atmosphere for depth
      map.current.setFog({
        color: 'rgb(10, 10, 15)', // Dark atmosphere
        'high-color': 'rgb(30, 20, 40)', // Subtle purple tint at horizon
        'horizon-blend': 0.05,
        'space-color': 'rgb(5, 5, 10)',
        'star-intensity': 0.2,
      });

      // Enhance 3D buildings for depth
      const layers = map.current.getStyle().layers;
      if (layers) {
        const labelLayerId = layers.find(
          (layer) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']
        )?.id;

        if (labelLayerId && !map.current.getLayer('3d-buildings')) {
          map.current.addLayer(
            {
              id: '3d-buildings',
              source: 'composite',
              'source-layer': 'building',
              filter: ['==', 'extrude', 'true'],
              type: 'fill-extrusion',
              minzoom: 14,
              paint: {
                'fill-extrusion-color': 'hsl(0, 0%, 15%)',
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  14,
                  0,
                  14.05,
                  ['get', 'height'],
                ],
                'fill-extrusion-base': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  14,
                  0,
                  14.05,
                  ['get', 'min_height'],
                ],
                'fill-extrusion-opacity': 0.8,
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
    
    // Listen for geolocate events to update city and marker
    geolocateControl.on('geolocate', (e: any) => {
      const { longitude, latitude } = e.coords;
      
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
      
      // Find the nearest city
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
      
      // Update to nearest city if different
      if (nearestCity.id !== selectedCity.id) {
        onCityChange(nearestCity);
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

  // Add/update density heatmap layer
  useEffect(() => {
    if (!map.current || !mapLoaded || !densityData) return;

    const sourceId = 'location-density';
    const layerId = 'location-density-heat';
    const pointLayerId = `${layerId}-point`;

    try {
      // Remove existing layers and source if they exist
      if (map.current.getLayer(pointLayerId)) {
        map.current.removeLayer(pointLayerId);
      }
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
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

    // Add heatmap layer
    map.current.addLayer({
      id: layerId,
      type: 'heatmap',
      source: sourceId,
      paint: {
        // Increase weight as density increases
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'density'],
          0, 0,
          10, 1,
        ],
        // Increase intensity as zoom level increases for vibrant colors
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1.5,
          15, 4,
        ],
        // Vibrant color ramp: blue → cyan → green → yellow → orange → red
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0, 0, 255, 0)',          // transparent blue
          0.15, 'rgb(0, 191, 255)',          // cyan
          0.3, 'rgb(0, 255, 127)',           // spring green
          0.45, 'rgb(173, 255, 47)',         // green-yellow
          0.6, 'rgb(255, 255, 0)',           // yellow
          0.75, 'rgb(255, 165, 0)',          // orange
          0.9, 'rgb(255, 69, 0)',            // orange-red
          1, 'rgb(255, 0, 0)',               // red
        ],
        // Larger radius for smooth, blob-like appearance
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 15,
          9, 40,
          15, 80,
        ],
        // High opacity for vibrant appearance with smooth fade-in
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 0.9,
          15, 0.85,
        ],
        // Add smooth opacity transition
        'heatmap-opacity-transition': {
          duration: 800,
          delay: 0
        }
      },
    });

    // Add circle layer for detailed view at high zoom
    map.current.addLayer({
      id: `${layerId}-point`,
      type: 'circle',
      source: sourceId,
      minzoom: 14,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'density'],
          0, 4,
          10, 20,
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'density'],
          0, 'rgb(103, 169, 207)',
          5, 'rgb(239, 138, 98)',
          10, 'rgb(178, 24, 43)',
        ],
        'circle-opacity': 0.6,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff',
        // Add smooth opacity transition
        'circle-opacity-transition': {
          duration: 800,
          delay: 100
        }
      },
    });

    console.log('Density heatmap layer added with', densityData.stats.grid_cells, 'points');
  }, [mapLoaded, densityData, showDensityLayer]);


  // Function to update markers based on current zoom level
  const updateMarkers = () => {
    if (!map.current || !mapLoaded) return;

    const mapInstance = map.current;
    
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

      // Adjust size based on proximity
      const proximityFactor = nearbyCount > 0 ? Math.max(0.75, 1 - (nearbyCount * 0.1)) : 1;
      const markerSize = baseSize * proximityFactor;

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

      // Add pulsing animation for high activity
      if (venue.activity >= 80) {
        pinEl.style.animation = "pulse 2s ease-in-out infinite";
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

      // Create popup for the venue (like standard map pins)
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: true,
        maxWidth: '200px',
        className: 'venue-popup'
      }).setHTML(`
        <div style="padding: 8px;">
          <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: white;">${venue.name}</h4>
          <p style="margin: 0 0 4px 0; font-size: 11px; color: rgba(255, 255, 255, 0.7);">${venue.category} • ${venue.neighborhood}</p>
          <div style="display: flex; align-items: center; gap: 4px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></div>
            <span style="font-size: 11px; font-weight: 600; color: white;">${venue.activity}% Active</span>
          </div>
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
          pinEl.style.animation = venue.activity >= 80 ? "pulse 2s ease-in-out infinite" : "";
        }, 600);
        
        // Open venue card
        onVenueSelect(venue);
        
        // Show popup
        popup.addTo(mapInstance);
      });

      markersRef.current.push(marker);
    });
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
      <div 
        ref={mapContainer} 
        className="absolute inset-0 overflow-hidden"
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: isMobile ? '100%' : '500px',
          // Optimize touch handling - allow map pan but don't block page scroll
          touchAction: isMobile ? 'pan-y pinch-zoom' : 'none',
        }} 
      />

      {/* City Selector */}
      <div className="absolute top-4 left-4 sm:top-5 sm:left-5 z-10 max-w-[calc(100vw-120px)] sm:max-w-[280px]">
        <Select
          value={selectedCity.id}
          onValueChange={(cityId) => {
            const city = CITIES.find(c => c.id === cityId);
            if (city) onCityChange(city);
          }}
        >
          <SelectTrigger className="w-auto text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
              <span className="font-semibold">{selectedCity.name}, {selectedCity.state}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {CITIES.map((city) => (
              <SelectItem key={city.id} value={city.id}>
                {city.name}, {city.state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Live Indicator - Top Right inline with City Selector */}
      <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-10">
        <div className="bg-card/95 backdrop-blur-xl px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-border flex items-center gap-1.5 sm:gap-2 shadow-lg">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-destructive rounded-full pulse-glow" />
          <p className="text-xs sm:text-sm font-semibold text-foreground">Live</p>
        </div>
      </div>

      {/* Density Layer Controls - Bottom right inline with Activity Level legend */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 space-y-2 max-w-[calc(100vw-32px)] sm:max-w-[280px]">
        <Button
          onClick={() => setShowDensityLayer(!showDensityLayer)}
          variant={showDensityLayer ? "default" : "secondary"}
          size="sm"
          className="bg-card/95 backdrop-blur-xl border border-border text-xs sm:text-sm shadow-lg w-full"
        >
          <Layers className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">{showDensityLayer ? "Hide" : "Show"} Heat Layer</span>
          <span className="sm:hidden">Heat</span>
        </Button>

        {showDensityLayer && (
          <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-border p-3 sm:p-4 space-y-2 shadow-lg">
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
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-card/95 backdrop-blur-xl px-3 py-2 sm:px-4 sm:py-3 rounded-xl border border-border z-10 shadow-lg max-w-[calc(100vw-24px)] sm:max-w-none">
        {showDensityLayer ? (
          <>
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-1.5 sm:mb-2">User Density</p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2">
              <div className="w-16 sm:w-20 h-3 sm:h-4 rounded" style={{
                background: 'linear-gradient(to right, rgb(103, 169, 207), rgb(209, 229, 240), rgb(253, 219, 199), rgb(239, 138, 98), rgb(178, 24, 43))'
              }} />
              <div className="flex justify-between w-full text-[10px] sm:text-xs text-muted-foreground">
                <span>Low</span>
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

      {/* Heatmap Loading Overlay */}
      {showDensityLayer && densityLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-sm z-20">
          <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-border p-4 flex flex-col items-center gap-3 shadow-lg">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-foreground">Loading heatmap data...</p>
          </div>
        </div>
      )}

      {/* Add pulse, bounce and heatmap animations + popup styles */}
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
