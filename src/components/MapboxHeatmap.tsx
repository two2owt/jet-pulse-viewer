import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Venue } from "./Heatmap";

interface MapboxHeatmapProps {
  onVenueSelect: (venue: Venue) => void;
  venues: Venue[];
  mapboxToken: string;
}

const getActivityColor = (activity: number) => {
  if (activity >= 80) return "#FF5722"; // hot
  if (activity >= 60) return "#FF9800"; // warm
  if (activity >= 40) return "#00BCD4"; // cool
  return "#2196F3"; // cold
};

export const MapboxHeatmap = ({ onVenueSelect, venues, mapboxToken }: MapboxHeatmapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    // Initialize map centered on Charlotte
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-80.843, 35.227], // Charlotte, NC
      zoom: 12,
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
  }, [mapboxToken]);

  // Load neighborhoods and display them on the map
  const loadNeighborhoods = async () => {
    try {
      const { data: neighborhoods, error } = await supabase
        .from('neighborhoods')
        .select('*')
        .eq('active', true);

      if (error) throw error;

      if (!map.current || !neighborhoods) return;

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
        map.current!.addSource(sourceId, {
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
        map.current!.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#FF5722',
            'fill-opacity': 0.1,
          },
        });

        // Add border layer
        map.current!.addLayer({
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
        map.current!.addLayer({
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
        map.current!.on('click', fillLayerId, (e: any) => {
          if (e.features && e.features[0]) {
            new mapboxgl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(`
                <div style="padding: 8px; background: #1f2937; border-radius: 8px;">
                  <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: white;">${neighborhood.name}</h3>
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">${neighborhood.description}</p>
                </div>
              `)
              .addTo(map.current!);
          }
        });

        // Change cursor on hover
        map.current!.on('mouseenter', fillLayerId, () => {
          map.current!.getCanvas().style.cursor = 'pointer';
        });

        map.current!.on('mouseleave', fillLayerId, () => {
          map.current!.getCanvas().style.cursor = '';
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

      // Create custom marker element
      const el = document.createElement("div");
      el.className = "venue-marker";
      el.style.cssText = `
        width: 40px;
        height: 40px;
        background: ${color};
        border: 3px solid #1a1f2e;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 20px ${color}80;
        transition: all 0.3s ease;
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

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.2)";
        el.style.zIndex = "1000";
      });

      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
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

      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([venue.lng, venue.lat])
        .setPopup(popup)
        .addTo(map.current!);

      // Handle click
      el.addEventListener("click", () => {
        onVenueSelect(venue);
      });

      markersRef.current.push(marker);
    });
  }, [venues, mapLoaded, onVenueSelect]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-2xl overflow-hidden" />

      {/* Charlotte Label */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-card/90 backdrop-blur-xl px-4 py-2 rounded-full border border-border">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Charlotte, NC
          </p>
        </div>
      </div>

      {/* Live Indicator */}
      <div className="absolute top-4 right-16 z-10">
        <div className="bg-card/90 backdrop-blur-xl px-4 py-2 rounded-full border border-border flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full pulse-glow" />
          <p className="text-sm font-semibold text-foreground">Live</p>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-xl px-4 py-3 rounded-xl border border-border z-10">
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
      </div>

      {/* Add pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
};
