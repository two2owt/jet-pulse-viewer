import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, TrendingUp, Layers, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLocationDensity } from "@/hooks/useLocationDensity";
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
  if (activity >= 80) return "#FF5722"; // hot
  if (activity >= 60) return "#FF9800"; // warm
  if (activity >= 40) return "#00BCD4"; // cool
  return "#2196F3"; // cold
};

export const MapboxHeatmap = ({ onVenueSelect, venues, mapboxToken, selectedCity, onCityChange }: MapboxHeatmapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  
  // Density heatmap state
  const [showDensityLayer, setShowDensityLayer] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'this_week' | 'this_hour'>('all');
  const [hourFilter, setHourFilter] = useState<number | undefined>();
  const [dayFilter, setDayFilter] = useState<number | undefined>();
  
  const { densityData, loading: densityLoading, refresh: refreshDensity } = useLocationDensity({
    timeFilter,
    hourOfDay: hourFilter,
    dayOfWeek: dayFilter,
  });

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    // Initialize map centered on selected city
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [selectedCity.lng, selectedCity.lat],
      zoom: selectedCity.zoom,
      pitch: 45,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      "top-right"
    );

    // Add geolocate control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      "top-right"
    );

    map.current.on("load", () => {
      setMapLoaded(true);
      
      // Load neighborhoods and add them to map
      loadNeighborhoods();
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      map.current?.remove();
    };
  }, [mapboxToken, selectedCity]);

  // Update map center when city changes
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

    // Remove existing layer and source if they exist
    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId);
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
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
        // Increase intensity as zoom level increases
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          15, 3,
        ],
        // Color ramp for heatmap - hot colors for high density
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(33, 102, 172, 0)',
          0.2, 'rgb(103, 169, 207)',
          0.4, 'rgb(209, 229, 240)',
          0.6, 'rgb(253, 219, 199)',
          0.8, 'rgb(239, 138, 98)',
          1, 'rgb(178, 24, 43)',
        ],
        // Adjust radius based on zoom level
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 2,
          15, 20,
        ],
        // Transition from heatmap to circle layer at higher zooms
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 1,
          15, 0.8,
        ],
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
          if (e.features && e.features[0] && map.current) {
            new mapboxgl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(`
                <div style="padding: 8px; background: #1f2937; border-radius: 8px;">
                  <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: white;">${neighborhood.name}</h3>
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">${neighborhood.description}</p>
                </div>
              `)
              .addTo(map.current);
          }
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

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add venue markers
    venues.forEach((venue) => {
      const color = getActivityColor(venue.activity);

      // Create marker container with heatmap effect
      const container = document.createElement("div");
      container.className = "venue-marker-container";
      container.style.cssText = `
        position: relative;
        width: 50px;
        height: 50px;
        cursor: pointer;
      `;

      // Create heatmap glow layers (3 expanding rings)
      const glowLayers = [
        { size: 80, opacity: 0.3, blur: 30 },
        { size: 120, opacity: 0.2, blur: 40 },
        { size: 160, opacity: 0.1, blur: 50 },
      ];

      glowLayers.forEach((layer, index) => {
        const glow = document.createElement("div");
        glow.className = `heatmap-glow heatmap-glow-${index}`;
        glow.style.cssText = `
          position: absolute;
          width: ${layer.size}px;
          height: ${layer.size}px;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, ${color}${Math.round(layer.opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.5s ease, transform 0.5s ease;
          filter: blur(${layer.blur}px);
        `;
        container.appendChild(glow);
      });

      // Create main marker
      const el = document.createElement("div");
      el.className = "venue-marker";
      el.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 40px;
        background: ${color};
        border: 3px solid #1a1f2e;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 20px ${color}CC, 0 0 40px ${color}66;
        transition: all 0.3s ease;
        z-index: 10;
      `;

      // Add pulsing animation for high activity
      if (venue.activity >= 80) {
        el.style.animation = "pulse 2s ease-in-out infinite";
      }

      // Add icon
      el.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
          <polyline points="16 7 22 7 22 13"></polyline>
        </svg>
      `;

      container.appendChild(el);

      // Enhanced hover effects - show heatmap layers
      container.addEventListener("mouseenter", () => {
        const glows = container.querySelectorAll('.heatmap-glow');
        glows.forEach((glow, index) => {
          const glowElement = glow as HTMLElement;
          glowElement.style.opacity = '1';
          glowElement.style.transform = `translate(-50%, -50%) scale(${1 + index * 0.1})`;
        });
        el.style.transform = "translate(-50%, -50%) scale(1.15)";
        el.style.boxShadow = `0 0 30px ${color}FF, 0 0 60px ${color}99, 0 0 90px ${color}66`;
        el.style.zIndex = "1000";
      });

      container.addEventListener("mouseleave", () => {
        const glows = container.querySelectorAll('.heatmap-glow');
        glows.forEach((glow) => {
          const glowElement = glow as HTMLElement;
          glowElement.style.opacity = '0';
          glowElement.style.transform = 'translate(-50%, -50%) scale(1)';
        });
        el.style.transform = "translate(-50%, -50%) scale(1)";
        el.style.boxShadow = `0 0 20px ${color}CC, 0 0 40px ${color}66`;
        el.style.zIndex = "10";
      });

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; background: #1f2937; border-radius: 8px;">
          <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: white;">${venue.name}</h3>
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">${venue.neighborhood}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: ${color}; font-weight: bold;">${venue.activity}% active</p>
        </div>
      `);

      // Create marker - check map exists before adding
      if (!map.current) return;
      
      const marker = new mapboxgl.Marker(container)
        .setLngLat([venue.lng, venue.lat])
        .setPopup(popup)
        .addTo(map.current);

      // Handle click on the whole container
      container.addEventListener("click", () => {
        onVenueSelect(venue);
      });

      markersRef.current.push(marker);
    });
  }, [venues, mapLoaded, onVenueSelect]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-2xl overflow-hidden" />

      {/* City Selector */}
      <div className="absolute top-4 left-4 z-10">
        <Select
          value={selectedCity.id}
          onValueChange={(cityId) => {
            const city = CITIES.find(c => c.id === cityId);
            if (city) onCityChange(city);
          }}
        >
          <SelectTrigger className="bg-card/90 backdrop-blur-xl border-border w-auto">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
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
      <div className="absolute top-4 right-16 z-10">
        <div className="bg-card/90 backdrop-blur-xl px-4 py-2 rounded-full border border-border flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full pulse-glow" />
          <p className="text-sm font-semibold text-foreground">Live</p>
        </div>
      </div>

      {/* Density Layer Controls */}
      <div className="absolute top-4 right-16 z-10 space-y-2">
        <Button
          onClick={() => setShowDensityLayer(!showDensityLayer)}
          variant={showDensityLayer ? "default" : "secondary"}
          size="sm"
          className="bg-card/90 backdrop-blur-xl border border-border"
        >
          <Layers className="w-4 h-4 mr-2" />
          {showDensityLayer ? "Hide" : "Show"} Heat Layer
        </Button>

        {showDensityLayer && (
          <div className="bg-card/90 backdrop-blur-xl rounded-xl border border-border p-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground">Heat Filters</p>
              {densityLoading && (
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>

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
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-xl px-4 py-3 rounded-xl border border-border z-10">
        {showDensityLayer ? (
          <>
            <p className="text-xs font-semibold text-muted-foreground mb-2">User Density</p>
            <div className="flex items-center gap-2">
              <div className="w-20 h-4 rounded" style={{
                background: 'linear-gradient(to right, rgb(103, 169, 207), rgb(209, 229, 240), rgb(253, 219, 199), rgb(239, 138, 98), rgb(178, 24, 43))'
              }} />
              <div className="flex justify-between w-full text-xs text-muted-foreground">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Activity Level</p>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-hot rounded-full" />
                <span className="text-xs text-foreground">Hot</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-warm rounded-full" />
                <span className="text-xs text-foreground">Warm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-cool rounded-full" />
                <span className="text-xs text-foreground">Cool</span>
              </div>
            </div>
          </>
        )}
      </div>

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
