import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, TrendingUp, Layers, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVenueGeocoding } from "@/hooks/useVenueGeocoding";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { Venue } from "./Heatmap";
import { CITIES, type City } from "@/types/cities";

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
  const isMobile = useIsMobile();
  
  // Movement heatmap state
  const [showMovementLayer, setShowMovementLayer] = useState(false);
  
  // Geocode venues for accurate marker placement
  const { venues: geocodedVenues, isGeocoding, progress } = useVenueGeocoding(
    venues,
    mapboxToken,
    [selectedCity.lng, selectedCity.lat]
  );

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
    });
    
    map.current.addControl(geolocateControl, "top-right");
    
    // Create custom marker element for user location
    const createUserMarker = () => {
      const el = document.createElement('div');
      el.className = 'user-location-marker';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#sunsetGradient)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <defs>
            <linearGradient id="sunsetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:hsl(24, 100%, 60%);stop-opacity:1" />
              <stop offset="100%" style="stop-color:hsl(320, 80%, 65%);stop-opacity:1" />
            </linearGradient>
          </defs>
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
        </svg>
      `;
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
      
      // Load neighborhoods and add them to map
      loadNeighborhoods();
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

  // Add/update Mapbox Movement heatmap layer
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const sourceId = 'mapbox-movement';
    const layerId = 'movement-heat';

    try {
      // Remove existing layer if it exists
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

    if (!showMovementLayer) return;

    // Add Mapbox Movement source
    map.current.addSource(sourceId, {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-traffic-v1'
    });

    // Add heatmap layer using Movement data
    map.current.addLayer({
      id: layerId,
      type: 'heatmap',
      source: sourceId,
      'source-layer': 'traffic',
      paint: {
        // Weight based on traffic activity
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'congestion'],
          0, 0,
          10, 1,
        ],
        // Increase intensity as zoom level increases
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1.5,
          15, 4,
        ],
        // Privacy-forward color ramp
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0, 0, 255, 0)',
          0.15, 'rgb(0, 191, 255)',
          0.3, 'rgb(0, 255, 127)',
          0.45, 'rgb(173, 255, 47)',
          0.6, 'rgb(255, 255, 0)',
          0.75, 'rgb(255, 165, 0)',
          0.9, 'rgb(255, 69, 0)',
          1, 'rgb(255, 0, 0)',
        ],
        // 100-meter resolution tiles
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 15,
          9, 40,
          15, 80,
        ],
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 0.9,
          15, 0.85,
        ],
        'heatmap-opacity-transition': {
          duration: 800,
          delay: 0
        }
      },
    });

    console.log('Mapbox Movement layer added - global privacy-forward aggregated activity data');
  }, [mapLoaded, showMovementLayer]);

  // Load neighborhoods and display them on the map
  const loadNeighborhoods = async () => {
    if (!map.current) return;
    
    try {
      const { data: neighborhoods, error } = await supabase
        .from('neighborhoods')
        .select('*')
        .eq('active', true);

      if (error) throw error;
      if (!neighborhoods || !map.current) return;

      const mapInstance = map.current;

      // Add neighborhood boundaries as polygons
      neighborhoods.forEach((neighborhood, index) => {
        const boundaryPoints = neighborhood.boundary_points as number[][];
        
        // Convert to GeoJSON format (lng, lat)
        const coordinates = boundaryPoints.map(point => [point[1], point[0]]);
        // Close the polygon
        coordinates.push(coordinates[0]);

        const sourceId = `neighborhood-${neighborhood.id}`;
        const fillLayerId = `neighborhood-fill-${neighborhood.id}`;
        const lineLayerId = `neighborhood-line-${neighborhood.id}`;

        // Add source
        mapInstance.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              name: neighborhood.name,
              description: neighborhood.description,
            },
            geometry: {
              type: 'Polygon',
              coordinates: [coordinates],
            },
          },
        });

        // Add fill layer
        mapInstance.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#FF5722',
            'fill-opacity': 0.1,
          },
        });

        // Add border layer
        mapInstance.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#FF5722',
            'line-width': 2,
            'line-opacity': 0.5,
          },
        });

        // Add neighborhood label
        mapInstance.addLayer({
          id: `neighborhood-label-${neighborhood.id}`,
          type: 'symbol',
          source: sourceId,
          layout: {
            'text-field': neighborhood.name,
            'text-size': 14,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          },
          paint: {
            'text-color': '#FFFFFF',
            'text-halo-color': '#1a1f2e',
            'text-halo-width': 2,
          },
        });

        // Add click handler for neighborhoods
        mapInstance.on('click', fillLayerId, (e: any) => {
          // Click handling without popup
        });

        // Change cursor on hover
        mapInstance.on('mouseenter', fillLayerId, () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = 'pointer';
          }
        });

        mapInstance.on('mouseleave', fillLayerId, () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = '';
          }
        });
      });
    } catch (error) {
      console.error('Error loading neighborhoods:', error);
    }
  };

  // Function to update markers based on current zoom level
  const updateMarkers = () => {
    // Use geocoded venues for accurate placement
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

    // Add geocoded venue markers for accurate placement
    geocodedVenues.forEach((venue, index) => {
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

      // Create marker element with vertical pin
      const el = document.createElement("div");
      el.className = "venue-marker";
      el.style.cssText = `
        width: ${markerSize}px;
        height: ${markerSize * 1.3}px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        will-change: transform, opacity;
      `;

      // Create vertical pin element
      const pinEl = document.createElement('div');
      pinEl.style.cssText = `
        width: ${markerSize}px;
        height: ${markerSize}px;
        background: linear-gradient(135deg, ${color}40, ${color}80);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 2px solid ${color}60;
        border-radius: 50% 50% 50% 0;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 
          0 8px 32px ${color}30,
          0 0 0 4px ${color}10,
          inset 0 1px 1px rgba(255, 255, 255, 0.3),
          inset 0 -1px 1px rgba(0, 0, 0, 0.2);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1), width 0.4s ease-out, height 0.4s ease-out;
        filter: drop-shadow(0 4px 12px ${color}40);
        transform: rotate(0deg);
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        will-change: transform, width, height;
      `;

      // Add pulsing animation for high activity
      if (venue.activity >= 80) {
        pinEl.style.animation = "pulse 2s ease-in-out infinite";
      }

      // Add vertical location pin icon with transition
      pinEl.innerHTML = `
        <svg width="${markerSize * 0.5}" height="${markerSize * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: all 0.4s ease-out;">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      `;

      el.appendChild(pinEl);

      // Enhanced hover effects on the pin element
      el.addEventListener("mouseenter", () => {
        pinEl.style.transform = "translateX(-50%) scale(1.2)";
        pinEl.style.boxShadow = `
          0 12px 48px ${color}50,
          0 0 0 6px ${color}20,
          inset 0 2px 2px rgba(255, 255, 255, 0.4),
          inset 0 -2px 2px rgba(0, 0, 0, 0.2)
        `;
        pinEl.style.filter = `drop-shadow(0 6px 20px ${color}60)`;
        pinEl.style.zIndex = "1000";
      });

      el.addEventListener("mouseleave", () => {
        pinEl.style.transform = "translateX(-50%)";
        pinEl.style.boxShadow = `
          0 8px 32px ${color}30,
          0 0 0 4px ${color}10,
          inset 0 1px 1px rgba(255, 255, 255, 0.3),
          inset 0 -1px 1px rgba(0, 0, 0, 0.2)
        `;
        pinEl.style.filter = `drop-shadow(0 4px 12px ${color}40)`;
        pinEl.style.zIndex = "auto";
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
        
        // Smooth fly to the marker location
        mapInstance.flyTo({
          center: [venue.lng, venue.lat],
          zoom: Math.max(mapInstance.getZoom(), 14),
          duration: 1000,
          essential: true
        });
        
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

  // Call updateMarkers on initial load and when geocoded venues change
  useEffect(() => {
    updateMarkers();
  }, [geocodedVenues, mapLoaded]);

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
              el.style.height = `${newBaseSize * 1.3}px`;
              pinEl.style.width = `${newBaseSize}px`;
              pinEl.style.height = `${newBaseSize}px`;
              
              const svg = pinEl.querySelector('svg');
              if (svg) {
                svg.setAttribute('width', `${newBaseSize * 0.5}`);
                svg.setAttribute('height', `${newBaseSize * 0.5}`);
              }
            }
          }, delay);
        }
      });
    };

    // Add fade effect during move
    const handleMoveStart = () => {
      markersRef.current.forEach((marker) => {
        const el = marker.getElement();
        if (el) {
          el.style.opacity = '0.7';
        }
      });
    };

    const handleMoveEnd = () => {
      markersRef.current.forEach((marker) => {
        const el = marker.getElement();
        if (el) {
          el.style.opacity = '1';
        }
      });
    };

    mapInstance.on('zoom', handleZoom);
    mapInstance.on('movestart', handleMoveStart);
    mapInstance.on('moveend', handleMoveEnd);
    
    return () => {
      mapInstance.off('zoom', handleZoom);
      mapInstance.off('movestart', handleMoveStart);
      mapInstance.off('moveend', handleMoveEnd);
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
          <SelectTrigger className="bg-card/95 backdrop-blur-xl border-border w-auto text-xs sm:text-sm shadow-lg">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
              <span className="font-semibold">{selectedCity.name}, {selectedCity.state}</span>
            </div>
          </SelectTrigger>
          <SelectContent className="z-50">
            {CITIES.map((city) => (
              <SelectItem key={city.id} value={city.id}>
                {city.name}, {city.state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Live Indicator and Geocoding Status - Top Right */}
      <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-10 flex flex-col items-end gap-2">
        <div className="bg-card/95 backdrop-blur-xl px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-border flex items-center gap-1.5 sm:gap-2 shadow-lg">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-destructive rounded-full pulse-glow" />
          <p className="text-xs sm:text-sm font-semibold text-foreground">Live</p>
        </div>
        
        {isGeocoding && (
          <div className="bg-card/95 backdrop-blur-xl px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-border flex items-center gap-2 shadow-lg">
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">
              Geocoding {progress.completed}/{progress.total}
            </p>
          </div>
        )}
      </div>

      {/* Movement Layer Controls */}
      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 space-y-2 max-w-[calc(100vw-32px)] sm:max-w-[280px]">
        <Button
          onClick={() => setShowMovementLayer(!showMovementLayer)}
          variant={showMovementLayer ? "default" : "secondary"}
          size="sm"
          className="bg-card/95 backdrop-blur-xl border border-border text-xs sm:text-sm shadow-lg w-full"
        >
          <Layers className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">{showMovementLayer ? "Hide" : "Show"} Movement Heat</span>
          <span className="sm:hidden">Movement</span>
        </Button>

        {showMovementLayer && (
          <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-border p-3 sm:p-4 space-y-2 shadow-lg">
            <p className="text-xs font-semibold text-foreground">Global Activity Data</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Privacy-forward de-identified mobile activity aggregated into 100m resolution tiles
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-card/95 backdrop-blur-xl px-3 py-2 sm:px-4 sm:py-3 rounded-xl border border-border z-10 shadow-lg max-w-[calc(100vw-24px)] sm:max-w-none">
        {showMovementLayer ? (
          <>
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground mb-1.5 sm:mb-2">Movement Activity</p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2">
              <div className="w-16 sm:w-20 h-3 sm:h-4 rounded" style={{
                background: 'linear-gradient(to right, rgb(0, 191, 255), rgb(0, 255, 127), rgb(255, 255, 0), rgb(255, 165, 0), rgb(255, 0, 0))'
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
