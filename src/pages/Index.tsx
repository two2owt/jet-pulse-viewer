import { useState } from "react";
import { Heatmap, type Venue } from "@/components/Heatmap";
import { MapboxHeatmap } from "@/components/MapboxHeatmap";
import { JetCard } from "@/components/JetCard";
import { BottomNav } from "@/components/BottomNav";
import { NotificationCard, type Notification } from "@/components/NotificationCard";
import { GeofenceTracker } from "@/components/GeofenceTracker";
import { AuthButton } from "@/components/AuthButton";
import { ActiveDeals } from "@/components/ActiveDeals";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminImageScraper } from "@/components/AdminImageScraper";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { useVenueImages } from "@/hooks/useVenueImages";
import { CITIES, type City } from "@/types/cities";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import jetLogo from "@/assets/jet-logo.png";

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "offer",
    title: "🎉 Flash Deal Alert",
    message: "$3 beers for the next hour",
    venue: "Wooden Robot Brewery",
    timestamp: "2m ago",
    distance: "0.3 mi"
  },
  {
    id: "2",
    type: "trending",
    title: "🔥 Getting Busy",
    message: "Crowd levels rising fast",
    venue: "Rooftop 210",
    timestamp: "15m ago",
    distance: "0.5 mi"
  },
  {
    id: "3",
    type: "event",
    title: "🎵 Live Music Starting",
    message: "Local band performing at 8 PM",
    venue: "NoDa Brewing",
    timestamp: "1h ago",
    distance: "1.2 mi"
  }
];

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

const Index = () => {
  const [activeTab, setActiveTab] = useState<"map" | "explore" | "notifications" | "profile">("map");
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedCity, setSelectedCity] = useState<City>(CITIES[0]); // Default to Charlotte
  const { token: mapboxToken, loading: mapboxLoading, error: mapboxError } = useMapboxToken();
  const { getVenueImage } = useVenueImages();

  const handleCityChange = (city: City) => {
    setSelectedCity(city);
    toast.success(`Switched to ${city.name}, ${city.state}`, {
      description: "Finding deals in your area"
    });
  };

  const handleVenueSelect = (venue: Venue) => {
    // Add image URL to the venue if available
    const venueWithImage = {
      ...venue,
      imageUrl: getVenueImage(venue.name)
    };
    setSelectedVenue(venueWithImage);
    toast.success(`Selected ${venue.name}`, {
      description: `${venue.activity}% active in ${venue.neighborhood}`
    });
  };

  const handleGetDirections = () => {
    toast.success("Opening directions...", {
      description: `Navigate to ${selectedVenue?.name}`
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-xl border-b border-border sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <img 
              src={jetLogo} 
              alt="JET Social" 
              className="h-12 w-auto dark:brightness-100 brightness-100 transition-all" 
            />
            
            <div className="flex items-center gap-2">
              <div className="bg-muted/50 px-3 py-1.5 rounded-full">
                <p className="text-xs font-semibold text-foreground">8:42 PM</p>
              </div>
              <ThemeToggle />
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {activeTab === "map" && (
          <>
            {/* Mapbox Heatmap */}
            <div className="h-[400px] rounded-2xl overflow-hidden animate-fade-in">
              {mapboxLoading && (
                <div className="h-full flex items-center justify-center bg-card">
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading map...</p>
                  </div>
                </div>
              )}
              {mapboxError && (
                <div className="h-full flex items-center justify-center bg-card animate-fade-in">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-destructive font-medium">Failed to load map</p>
                    <p className="text-xs text-muted-foreground">{mapboxError}</p>
                  </div>
                </div>
              )}
              {!mapboxLoading && !mapboxError && mapboxToken && (
              <MapboxHeatmap 
                onVenueSelect={handleVenueSelect} 
                venues={mockVenues} 
                mapboxToken={mapboxToken}
                selectedCity={selectedCity}
                onCityChange={handleCityChange}
              />
              )}
            </div>

            {/* Selected Venue Card */}
            {selectedVenue && (
              <div className="animate-fade-in animate-scale-in relative">
                <JetCard 
                  venue={selectedVenue} 
                  onGetDirections={handleGetDirections}
                  onClose={() => setSelectedVenue(null)}
                />
              </div>
            )}

            {/* Geofence Tracker */}
            <div className="animate-scale-in" style={{ animationDelay: '100ms' }}>
              <GeofenceTracker />
            </div>

            {/* Active Deals */}
            <div className="animate-scale-in" style={{ animationDelay: '150ms' }}>
              <ActiveDeals />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-xl p-4 border border-border text-center animate-scale-in hover-scale" style={{ animationDelay: '200ms' }}>
                <p className="text-2xl font-bold text-primary mb-1">24</p>
                <p className="text-xs text-muted-foreground">Venues Nearby</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border text-center animate-scale-in hover-scale" style={{ animationDelay: '250ms' }}>
                <p className="text-2xl font-bold text-warm mb-1">8</p>
                <p className="text-xs text-muted-foreground">Active Deals</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border text-center animate-scale-in hover-scale" style={{ animationDelay: '300ms' }}>
                <p className="text-2xl font-bold text-secondary mb-1">3</p>
                <p className="text-xs text-muted-foreground">Live Events</p>
              </div>
            </div>
          </>
        )}

         {activeTab === "notifications" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Notifications</h2>
              <p className="text-sm text-muted-foreground">Stay updated with nearby deals and events</p>
            </div>
            
            {mockNotifications.map((notification, index) => (
              <div 
                key={notification.id}
                className="animate-scale-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <NotificationCard notification={notification} />
              </div>
            ))}
          </div>
        )}

        {activeTab === "explore" && (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Discover Charlotte</h2>
            <p className="text-sm text-muted-foreground">Explore trending spots and hidden gems</p>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gradient-to-r from-primary to-primary-glow rounded-full mx-auto mb-4 animate-scale-in" />
              <h2 className="text-xl font-bold text-foreground mb-2">Your Profile</h2>
              <p className="text-sm text-muted-foreground">Track your favorite spots and rewards</p>
            </div>
            
            <AdminImageScraper />
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        notificationCount={mockNotifications.length}
      />
    </div>
  );
};

export default Index;
