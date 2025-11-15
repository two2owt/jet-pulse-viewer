import { useState } from "react";
import { MapPin, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { CITIES, type City } from "@/types/cities";

interface Venue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  activity: number; // 0-100
  category: string;
  neighborhood: string;
}

const mockVenues: Venue[] = [
  { id: "1", name: "Rooftop 210", lat: 35.220, lng: -80.840, activity: 92, category: "Bar", neighborhood: "South End" },
  { id: "2", name: "Pin House", lat: 35.218, lng: -80.842, activity: 78, category: "Bar", neighborhood: "South End" },
  { id: "3", name: "Wooden Robot", lat: 35.215, lng: -80.838, activity: 85, category: "Brewery", neighborhood: "South End" },
  { id: "4", name: "Ink N Ivy", lat: 35.227, lng: -80.843, activity: 67, category: "Restaurant", neighborhood: "Uptown" },
  { id: "5", name: "Fitzgerald's", lat: 35.205, lng: -80.820, activity: 88, category: "Bar", neighborhood: "Plaza Midwood" },
  { id: "6", name: "The Punch Room", lat: 35.225, lng: -80.845, activity: 55, category: "Cocktail Bar", neighborhood: "Uptown" },
  { id: "7", name: "NoDa Brewing", lat: 35.251, lng: -80.800, activity: 73, category: "Brewery", neighborhood: "NoDa" },
  { id: "8", name: "Camp North End", lat: 35.240, lng: -80.830, activity: 81, category: "Food Hall", neighborhood: "Camp North End" },
];

const getActivityColor = (activity: number) => {
  if (activity >= 80) return "bg-hot";
  if (activity >= 60) return "bg-warm";
  if (activity >= 40) return "bg-cool";
  return "bg-cold";
};

const getActivityGlow = (activity: number) => {
  if (activity >= 80) return "shadow-[0_0_20px_hsl(14_100%_57%/0.6)]";
  if (activity >= 60) return "shadow-[0_0_15px_hsl(30_100%_60%/0.5)]";
  if (activity >= 40) return "shadow-[0_0_10px_hsl(190_95%_45%/0.4)]";
  return "shadow-[0_0_5px_hsl(220_70%_50%/0.3)]";
};

export const Heatmap = ({ 
  onVenueSelect,
  selectedCity,
  onCityChange 
}: { 
  onVenueSelect: (venue: Venue) => void;
  selectedCity: City;
  onCityChange: (city: City) => void;
}) => {
  const [hoveredVenue, setHoveredVenue] = useState<string | null>(null);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-background via-muted/20 to-background rounded-2xl overflow-hidden">

      {/* City Selector */}
      <div className="absolute top-4 left-4 z-10">
        <Select
          value={selectedCity.id}
          onValueChange={(cityId) => {
            const city = CITIES.find(c => c.id === cityId);
            if (city) onCityChange(city);
          }}
        >
          <SelectTrigger className="bg-card/80 backdrop-blur-xl border-border w-auto">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">{selectedCity.name}, {selectedCity.state}</span>
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
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-card/80 backdrop-blur-xl px-4 py-2 rounded-full border border-border flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full pulse-glow" />
          <p className="text-sm font-semibold text-foreground">Live</p>
        </div>
      </div>

      {/* Venue Markers */}
      <div className="absolute inset-0 p-8">
        {mockVenues.map((venue) => {
          const isHovered = hoveredVenue === venue.id;
          const activityColor = getActivityColor(venue.activity);
          const activityGlow = getActivityGlow(venue.activity);
          
          return (
            <button
              key={venue.id}
              onClick={() => onVenueSelect(venue)}
              onMouseEnter={() => setHoveredVenue(venue.id)}
              onMouseLeave={() => setHoveredVenue(null)}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                isHovered ? "z-20" : "z-10"
              }`}
              style={{
                left: `${((venue.lng + 80.85) / 0.08) * 100}%`,
                top: `${((35.25 - venue.lat) / 0.06) * 100}%`,
              }}
            >
              {/* Heatmap glow layers - only visible on hover */}
              <div className="absolute inset-0 pointer-events-none">
                <div 
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full transition-all duration-500 ${activityGlow}`}
                  style={{
                    background: `radial-gradient(circle, ${activityColor.replace('bg-', 'hsl(var(--')})40 0%, transparent 70%)`,
                    filter: 'blur(20px)',
                    opacity: isHovered ? 0.6 : 0,
                    transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                  }}
                />
                <div 
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full transition-all duration-500 delay-100`}
                  style={{
                    background: `radial-gradient(circle, ${activityColor.replace('bg-', 'hsl(var(--')})60 0%, transparent 70%)`,
                    filter: 'blur(15px)',
                    opacity: isHovered ? 0.7 : 0,
                    transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
                <div 
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full transition-all duration-500 delay-200`}
                  style={{
                    background: `radial-gradient(circle, ${activityColor.replace('bg-', 'hsl(var(--')})80 0%, transparent 70%)`,
                    filter: 'blur(10px)',
                    opacity: isHovered ? 0.8 : 0,
                    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                  }}
                />
              </div>

              {/* Activity Pulse - always visible for high activity */}
              <div className={`absolute inset-0 ${activityColor} rounded-full ${activityGlow} ${
                venue.activity >= 80 ? "pulse-glow" : ""
              }`} style={{ opacity: venue.activity >= 80 ? 0.3 : 0 }} />
              
              {/* Marker */}
              <div className={`relative w-12 h-12 ${activityColor} rounded-full flex items-center justify-center border-2 border-background ${
                isHovered ? 'scale-110 shadow-2xl' : ''
              } transition-all duration-300`}>
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>

              {/* Hover Label */}
              {isHovered && (
                <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-card/95 backdrop-blur-xl px-3 py-2 rounded-lg border border-border whitespace-nowrap">
                  <p className="text-sm font-semibold text-foreground">{venue.name}</p>
                  <p className="text-xs text-muted-foreground">{venue.activity}% active</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/80 backdrop-blur-xl px-4 py-3 rounded-xl border border-border">
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
    </div>
  );
};

export type { Venue };
