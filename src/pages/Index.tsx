import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Heatmap, type Venue } from "@/components/Heatmap";
import { MapboxHeatmap } from "@/components/MapboxHeatmap";
import { JetCard } from "@/components/JetCard";
import { BottomNav } from "@/components/BottomNav";
import { NotificationCard, type Notification } from "@/components/NotificationCard";
import { AuthButton } from "@/components/AuthButton";
import { ActiveDeals } from "@/components/ActiveDeals";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserProfile } from "@/components/UserProfile";
import { ExploreTab } from "@/components/ExploreTab";
import { Header } from "@/components/Header";

import { useMapboxToken } from "@/hooks/useMapboxToken";
import { useVenueImages } from "@/hooks/useVenueImages";
import { useNotifications } from "@/hooks/useNotifications";
import { useAutoScrapeVenueImages } from "@/hooks/useAutoScrapeVenueImages";
import { useDeals } from "@/hooks/useDeals";
import { CITIES, type City } from "@/types/cities";
import { Zap, Navigation, Map as MapIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jetLogo from "@/assets/jet-logo.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NotificationSkeleton } from "@/components/skeletons/NotificationSkeleton";

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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"map" | "explore" | "notifications" | "profile">("map");
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedCity, setSelectedCity] = useState<City>(CITIES[0]); // Default to Charlotte
  const [showDirectionsDialog, setShowDirectionsDialog] = useState(false);
  const { token: mapboxToken, loading: mapboxLoading, error: mapboxError } = useMapboxToken();
  const { getVenueImage } = useVenueImages();
  const { notifications, loading: notificationsLoading, markAsRead } = useNotifications();
  const { isScrapingActive } = useAutoScrapeVenueImages(true);
  const { deals } = useDeals();
  const jetCardRef = useRef<HTMLDivElement>(null);

  // Check onboarding status
  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Check if email is verified
        if (!session.user.email_confirmed_at) {
          toast.error("Email not verified", {
            description: "Please verify your email before accessing the app. Check your inbox.",
          });
          await supabase.auth.signOut();
          navigate("/auth");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", session.user.id)
          .single();
        
        if (profile && !profile.onboarding_completed) {
          navigate("/onboarding");
        }
      }
    };
    
    checkOnboarding();
  }, [navigate]);

  const handleCityChange = (city: City) => {
    setSelectedCity(city);
    toast.success(`Switched to ${city.name}, ${city.state}`, {
      description: "Finding deals in your area"
    });
  };

  const handleVenueSelect = (venue: Venue | string) => {
    // Handle both Venue object and venue name string
    if (typeof venue === 'string') {
      // Find the venue by name in mockVenues
      const foundVenue = mockVenues.find(v => v.name === venue);
      if (foundVenue) {
        const venueWithImage = {
          ...foundVenue,
          imageUrl: getVenueImage(foundVenue.name)
        };
        setSelectedVenue(venueWithImage);
        setActiveTab('map'); // Switch to map tab
        toast.success(`Selected ${foundVenue.name}`, {
          description: `${foundVenue.activity}% active in ${foundVenue.neighborhood}`
        });
        
        // Scroll to JetCard
        setTimeout(() => {
          jetCardRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }, 100);
      }
    } else {
      // Original venue object handling
      const venueWithImage = {
        ...venue,
        imageUrl: getVenueImage(venue.name)
      };
      setSelectedVenue(venueWithImage);
      toast.success(`Selected ${venue.name}`, {
        description: `${venue.activity}% active in ${venue.neighborhood}`
      });
      
      // Scroll to JetCard
      setTimeout(() => {
        jetCardRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  };

  const handleGetDirections = () => {
    if (!selectedVenue) return;
    setShowDirectionsDialog(true);
  };

  const openDirections = (app: 'google' | 'apple' | 'waze') => {
    if (!selectedVenue) return;
    
    const { lat, lng } = selectedVenue;
    const destination = encodeURIComponent(selectedVenue.name);
    
    let url = '';
    
    switch (app) {
      case 'google':
        // Google Maps
        url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${destination}`;
        break;
      case 'apple':
        // Apple Maps
        url = `http://maps.apple.com/?daddr=${lat},${lng}&q=${destination}`;
        break;
      case 'waze':
        // Waze
        url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes&q=${destination}`;
        break;
    }
    
    window.open(url, '_blank');
    setShowDirectionsDialog(false);
    
    toast.success(`Opening ${app === 'google' ? 'Google Maps' : app === 'apple' ? 'Apple Maps' : 'Waze'}`, {
      description: `Navigate to ${selectedVenue.name}`
    });
  };

  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-20 md:pb-24">
      {/* Header */}
      <Header 
        venues={mockVenues}
        deals={deals}
        onVenueSelect={handleVenueSelect}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 space-y-3 sm:space-y-4 md:space-y-6">
        {activeTab === "map" && (
          <>
            {/* Mapbox Heatmap */}
            <div className="h-[280px] sm:h-[350px] md:h-[450px] lg:h-[550px] xl:h-[600px] rounded-xl sm:rounded-2xl overflow-hidden animate-fade-in">
              {mapboxLoading && (
                <div className="h-full flex items-center justify-center bg-card">
                  <div className="text-center space-y-3 sm:space-y-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs sm:text-sm text-muted-foreground">Loading map...</p>
                  </div>
                </div>
              )}
              {mapboxError && (
                <div className="h-full flex items-center justify-center bg-card animate-fade-in">
                  <div className="text-center space-y-1.5 sm:space-y-2">
                    <p className="text-xs sm:text-sm text-destructive font-medium">Failed to load map</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{mapboxError}</p>
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
              <div ref={jetCardRef} className="animate-fade-in animate-scale-in relative">
                <JetCard 
                  venue={selectedVenue} 
                  onGetDirections={handleGetDirections}
                  onClose={() => setSelectedVenue(null)}
                />
              </div>
            )}

          </>
        )}

         {activeTab === "notifications" && (
          <div className="space-y-3 sm:space-y-4 md:space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2">Notifications</h2>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Stay updated with nearby deals and events</p>
            </div>
            
            {notificationsLoading ? (
              <>
                <NotificationSkeleton />
                <NotificationSkeleton />
                <NotificationSkeleton />
              </>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 sm:py-10 md:py-12 text-muted-foreground">
                <p className="text-sm sm:text-base">No notifications yet</p>
                <p className="text-xs sm:text-sm mt-1 sm:mt-2">Enable location tracking to receive deal alerts</p>
              </div>
            ) : (
              notifications.map((notification, index) => (
                <div 
                  key={notification.id}
                  className="animate-scale-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <NotificationCard 
                    notification={notification} 
                    onVenueClick={handleVenueSelect}
                    onRead={() => markAsRead(notification.id)}
                  />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "explore" && (
          <ExploreTab onVenueSelect={handleVenueSelect} />
        )}

        {activeTab === "profile" && (
          <div className="space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 animate-fade-in">
            <UserProfile />
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        notificationCount={notifications.filter(n => !n.read).length}
      />

      {/* Directions Dialog */}
      <Dialog open={showDirectionsDialog} onOpenChange={setShowDirectionsDialog}>
        <DialogContent className="sm:max-w-md mx-4 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Choose Navigation App</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Select your preferred navigation app to get directions to {selectedVenue?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:gap-3 py-3 sm:py-4">
            <Button
              onClick={() => openDirections('google')}
              variant="outline"
              className="h-auto py-3 sm:py-4 justify-start gap-2 sm:gap-3 hover:bg-accent transition-colors"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <MapIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm sm:text-base font-semibold">Google Maps</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Navigate with Google</p>
              </div>
            </Button>
            
            <Button
              onClick={() => openDirections('apple')}
              variant="outline"
              className="h-auto py-3 sm:py-4 justify-start gap-2 sm:gap-3 hover:bg-accent transition-colors"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center flex-shrink-0">
                <Navigation className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm sm:text-base font-semibold">Apple Maps</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Navigate with Apple</p>
              </div>
            </Button>
            
            <Button
              onClick={() => openDirections('waze')}
              variant="outline"
              className="h-auto py-3 sm:py-4 justify-start gap-2 sm:gap-3 hover:bg-accent transition-colors"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm sm:text-base font-semibold">Waze</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Navigate with Waze</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
