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

    mapboxgl.accessToken = mapboxToken;

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
    });

    // Add attribution control in a better position
    map.current.addControl(
      new mapboxgl.AttributionControl({
        compact: true,
      }),
      'bottom-right'
    );

    // Add navigation control for desktop
    if (!isMobile) {
      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
          showCompass: true,
        }),
        'top-right'
      );
    }

    // Ensure map resizes to container after initialization
    map.current.on('load', () => {
      setTimeout(() => {
        if (map.current) {
          map.current.resize();
          setMapLoaded(true);
        }
      }, 100);
    });

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

      // Calculate center points for all neighborhoods to detect overlaps
      const neighborhoodCenters = neighborhoods.map(n => ({
        neighborhood: n,
        center: [n.center_lng, n.center_lat] as [number, number],
      }));

      // Group neighborhoods that are too close together (within ~1km at zoom level)
      const OVERLAP_THRESHOLD = 0.01; // ~1km in degrees
      const neighborhoodGroups: Array<typeof neighborhoods> = [];
      const processed = new Set<string>();

      neighborhoods.forEach((neighborhood) => {
        if (processed.has(neighborhood.id)) return;

        const group = [neighborhood];
        processed.add(neighborhood.id);

        // Find other neighborhoods close to this one
        neighborhoodCenters.forEach(({ neighborhood: other, center: otherCenter }) => {
          if (processed.has(other.id)) return;
          
          const distance = Math.sqrt(
            Math.pow(neighborhood.center_lng - other.center_lng, 2) +
            Math.pow(neighborhood.center_lat - other.center_lat, 2)
          );

          if (distance < OVERLAP_THRESHOLD) {
            group.push(other);
            processed.add(other.id);
          }
        });

        neighborhoodGroups.push(group);
      });

      // Add neighborhood boundaries and labels by group
      neighborhoodGroups.forEach((group, groupIndex) => {
        // For groups, create a single unified boundary combining all neighborhoods
        // For single neighborhoods, show their original boundary
        
        if (group.length === 1) {
          // Single neighborhood - show its original boundary
          const neighborhood = group[0];
          const boundaryPoints = neighborhood.boundary_points as number[][];
          
          // Convert to GeoJSON format (lng, lat)
          const coordinates = boundaryPoints.map(point => [point[1], point[0]]);
          // Close the polygon
          coordinates.push(coordinates[0]);

          const sourceId = `neighborhood-group-${groupIndex}`;
          const fillLayerId = `neighborhood-fill-group-${groupIndex}`;
          const lineLayerId = `neighborhood-line-group-${groupIndex}`;

          // Add source
          mapInstance.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {
                name: neighborhood.name,
                description: neighborhood.description,
                groupIndex,
                neighborhoods: [neighborhood.name],
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

          // Add click handler with popup
          mapInstance.on('click', fillLayerId, (e: any) => {
            const popupContent = `
              <div style="padding: 8px; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #FFFFFF;">
                  ${neighborhood.name}
                </h3>
                ${neighborhood.description ? `
                  <p style="margin: 0; font-size: 14px; color: #E0E0E0; line-height: 1.5;">
                    ${neighborhood.description}
                  </p>
                ` : ''}
              </div>
            `;

            new mapboxgl.Popup({
              closeButton: true,
              closeOnClick: true,
              className: 'neighborhood-popup',
              maxWidth: '300px'
            })
              .setLngLat(e.lngLat)
              .setHTML(popupContent)
              .addTo(mapInstance);
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
        } else {
          // Multiple neighborhoods - create a unified boundary from all points
          const allPoints: [number, number][] = [];
          
          // Collect all boundary points from all neighborhoods in the group
          group.forEach(neighborhood => {
            const boundaryPoints = neighborhood.boundary_points as number[][];
            boundaryPoints.forEach(point => {
              allPoints.push([point[1], point[0]]); // [lng, lat]
            });
          });

          // Create a convex hull of all points for a unified boundary
          // Simple implementation: find the outermost points
          const minLng = Math.min(...allPoints.map(p => p[0]));
          const maxLng = Math.max(...allPoints.map(p => p[0]));
          const minLat = Math.min(...allPoints.map(p => p[1]));
          const maxLat = Math.max(...allPoints.map(p => p[1]));
          
          // Create a simple bounding polygon
          const unifiedBoundary: [number, number][] = [
            [minLng, minLat],
            [maxLng, minLat],
            [maxLng, maxLat],
            [minLng, maxLat],
            [minLng, minLat], // Close the polygon
          ];

          const sourceId = `neighborhood-group-${groupIndex}`;
          const fillLayerId = `neighborhood-fill-group-${groupIndex}`;
          const lineLayerId = `neighborhood-line-group-${groupIndex}`;

          // Add source for unified boundary
          mapInstance.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {
                groupIndex,
                neighborhoods: group.map(n => n.name),
              },
              geometry: {
                type: 'Polygon',
                coordinates: [unifiedBoundary],
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

          // Add click handler showing all neighborhoods in the group
          mapInstance.on('click', fillLayerId, (e: any) => {
            const groupNeighborhoods = group.map(n => `<li style="margin: 4px 0;">${n.name}</li>`).join('');

            const popupContent = `
              <div style="padding: 8px; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #FFFFFF;">
                  ${group.length} Neighborhoods
                </h3>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #E0E0E0;">
                  ${groupNeighborhoods}
                </ul>
              </div>
            `;

            new mapboxgl.Popup({
              closeButton: true,
              closeOnClick: true,
              className: 'neighborhood-popup',
              maxWidth: '300px'
            })
              .setLngLat(e.lngLat)
              .setHTML(popupContent)
              .addTo(mapInstance);
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
        }

        // Add a single label for the group at the centroid
        const groupCenter = group.reduce(
          (acc, n) => {
            acc.lng += n.center_lng;
            acc.lat += n.center_lat;
            return acc;
          },
          { lng: 0, lat: 0 }
        );
        groupCenter.lng /= group.length;
        groupCenter.lat /= group.length;

        // Create a point source for the group label
        const groupLabelSourceId = `neighborhood-group-label-${groupIndex}`;
        mapInstance.addSource(groupLabelSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              name: group.length > 1 
                ? `${group.length} Neighborhoods`
                : group[0].name,
            },
            geometry: {
              type: 'Point',
              coordinates: [groupCenter.lng, groupCenter.lat],
            },
          },
        });

        // Add the label layer
        mapInstance.addLayer({
          id: `neighborhood-label-group-${groupIndex}`,
          type: 'symbol',
          source: groupLabelSourceId,
          layout: {
            'text-field': ['get', 'name'],
            'text-size': group.length > 1 ? 15 : 14,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          },
          paint: {
            'text-color': '#FFFFFF',
            'text-halo-color': '#1a1f2e',
            'text-halo-width': 2,
          },
        });
      });
    } catch (error) {
      console.error('Error loading neighborhoods:', error);
    }
  };

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Store map instance to prevent race conditions
    const mapInstance = map.current;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add venue markers
    venues.forEach((venue) => {
      // Guard against map becoming null during iteration
      if (!mapInstance) return;
      
      const color = getActivityColor(venue.activity);

      // Create marker element with glassmorphic pin shape
      const el = document.createElement("div");
      el.className = "venue-marker";
      el.style.cssText = `
        width: 44px;
        height: 44px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      // Create inner pin element - vertical, no rotation
      const pinEl = document.createElement('div');
      pinEl.style.cssText = `
        width: 44px;
        height: 44px;
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
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        filter: drop-shadow(0 4px 12px ${color}40);
      `;

      // Add pulsing animation for high activity
      if (venue.activity >= 80) {
        pinEl.style.animation = "pulse 2s ease-in-out infinite";
      }

      // Add modern location pin icon (no rotation needed)
      pinEl.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      `;

      el.appendChild(pinEl);

      // Enhanced hover effects on the pin element
      el.addEventListener("mouseenter", () => {
        pinEl.style.transform = "scale(1.2)";
        pinEl.style.boxShadow = `
          0 12px 48px ${color}50,
          0 0 0 6px ${color}20,
          inset 0 2px 2px rgba(255, 255, 255, 0.4),
          inset 0 -2px 2px rgba(0, 0, 0, 0.2)
        `;
        pinEl.style.filter = `drop-shadow(0 6px 20px ${color}60)`;
      });

      el.addEventListener("mouseleave", () => {
        pinEl.style.transform = "scale(1)";
        pinEl.style.boxShadow = `
          0 8px 32px ${color}30,
          0 0 0 4px ${color}10,
          inset 0 1px 1px rgba(255, 255, 255, 0.3),
          inset 0 -1px 1px rgba(0, 0, 0, 0.2)
        `;
        pinEl.style.filter = `drop-shadow(0 4px 12px ${color}40)`;
      });

      // Create marker with bottom anchor so pin tip points to exact coordinate
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([venue.lng, venue.lat])
        .addTo(mapInstance);

      // Handle click on the marker element
      el.addEventListener("click", () => {
        onVenueSelect(venue);
      });

      markersRef.current.push(marker);
    });
  }, [venues, mapLoaded, onVenueSelect]);

  // Deal markers removed - no longer displaying colored circles on map

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <div 
        ref={mapContainer} 
        className="absolute inset-0 rounded-none sm:rounded-2xl overflow-hidden"
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: isMobile ? '100%' : '500px' 
        }} 
      />

      {/* City Selector */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 md:top-4 md:left-4 z-10">
        <Select
          value={selectedCity.id}
          onValueChange={(cityId) => {
            const city = CITIES.find(c => c.id === cityId);
            if (city) onCityChange(city);
          }}
        >
          <SelectTrigger className="bg-card/90 backdrop-blur-xl border-border w-auto text-xs sm:text-sm">
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

      {/* Live Indicator */}
      <div className="absolute top-2 right-2 sm:top-3 sm:right-14 md:top-4 md:right-16 z-10">
        <div className="bg-card/90 backdrop-blur-xl px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-full border border-border flex items-center gap-1.5 sm:gap-2">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full pulse-glow" />
          <p className="text-xs sm:text-sm font-semibold text-foreground">Live</p>
        </div>
      </div>

      {/* Density Layer Controls */}
      <div className="absolute bottom-16 right-2 sm:bottom-20 sm:right-3 md:bottom-4 md:right-16 z-10 space-y-2">
        <Button
          onClick={() => setShowDensityLayer(!showDensityLayer)}
          variant={showDensityLayer ? "default" : "secondary"}
          size="sm"
          className="bg-card/90 backdrop-blur-xl border border-border text-xs sm:text-sm"
        >
          <Layers className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">{showDensityLayer ? "Hide" : "Show"} Heat Layer</span>
          <span className="sm:hidden">Heat</span>
        </Button>

        {showDensityLayer && (
          <div className="bg-card/90 backdrop-blur-xl rounded-xl border border-border p-2 sm:p-3 space-y-2 max-w-[180px] sm:max-w-none">
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
      <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 md:bottom-4 md:left-4 bg-card/90 backdrop-blur-xl px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3 rounded-xl border border-border z-10">
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

      {/* Add pulse and heatmap animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.05);
            opacity: 0.9;
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
      `}</style>
    </div>
  );
};
