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
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const dealMarkersRef = useRef<mapboxgl.Marker[]>([]);
  
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
      style: "mapbox://styles/hodgesb02/cmi15w1cm00ft01s1ci7s2t0z",
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
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#DC143C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

      // Create marker using stored map instance
      const marker = new mapboxgl.Marker(container)
        .setLngLat([venue.lng, venue.lat])
        .setPopup(popup)
        .addTo(mapInstance);

      // Handle click on the whole container
      container.addEventListener("click", () => {
        onVenueSelect(venue);
      });

      markersRef.current.push(marker);
    });
  }, [venues, mapLoaded, onVenueSelect]);

  // Load and display active deals on the map with clustering
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const loadActiveDeals = async () => {
      try {
        const { data: deals, error } = await supabase
          .from('deals')
          .select(`
            *,
            neighborhoods (
              center_lat,
              center_lng,
              name
            )
          `)
          .eq('active', true)
          .gte('expires_at', new Date().toISOString())
          .lte('starts_at', new Date().toISOString());

        if (error) throw error;
        if (!deals || !map.current) return;

        const mapInstance = map.current;

        // Clear existing deal markers
        dealMarkersRef.current.forEach((marker) => marker.remove());
        dealMarkersRef.current = [];

        // Add deal markers
        deals.forEach((deal: any) => {
          if (!deal.neighborhoods || !mapInstance) return;

          const neighborhood = deal.neighborhoods;
          const dealColor = deal.deal_type === 'food' ? '#FF6B35' : 
                           deal.deal_type === 'drink' ? '#4ECDC4' : 
                           deal.deal_type === 'event' ? '#9B59B6' : 
                           '#F7B731';
          const icon = deal.deal_type === 'food' ? '🍕' :
                       deal.deal_type === 'drink' ? '🍹' :
                       deal.deal_type === 'event' ? '🎉' : '⭐';

          // Create marker element with animations
          const markerEl = document.createElement('div');
          markerEl.style.cssText = `
            position: relative;
            width: 60px;
            height: 60px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-center;
          `;

          // Main marker with bounce animation
          const mainMarker = document.createElement('div');
          mainMarker.style.cssText = `
            width: 48px;
            height: 48px;
            background: ${dealColor};
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10;
            position: relative;
            animation: dealBounce 2s ease-in-out infinite;
          `;
          mainMarker.innerHTML = icon;

          markerEl.appendChild(mainMarker);

          // Create popup
          const popup = new mapboxgl.Popup({ 
            offset: 30,
            className: 'deal-popup'
          }).setHTML(`
            <div style="padding: 12px; background: linear-gradient(135deg, #1f2937 0%, #111827 100%); border-radius: 12px; border: 2px solid ${dealColor}; min-width: 200px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 24px;">${icon}</span>
                <span style="background: ${dealColor}30; color: ${dealColor}; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; text-transform: uppercase;">${deal.deal_type}</span>
              </div>
              <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: bold; color: white;">${deal.title}</h3>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af; line-height: 1.4;">${deal.description}</p>
              <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${dealColor}" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <p style="margin: 0; font-size: 11px; color: #6b7280; font-weight: 600;">${deal.venue_name} • ${neighborhood.name}</p>
              </div>
            </div>
          `);

          // Create and add marker
          const marker = new mapboxgl.Marker({ 
            element: markerEl,
            anchor: 'center'
          })
            .setLngLat([Number(neighborhood.center_lng), Number(neighborhood.center_lat)])
            .setPopup(popup)
            .addTo(mapInstance);

          dealMarkersRef.current.push(marker);
        });

        console.log(`Added ${deals.length} deal markers`);
      } catch (error) {
        console.error('Error loading deals:', error);
      }
    };

    loadActiveDeals();
  }, [mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-2xl overflow-hidden" />

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
