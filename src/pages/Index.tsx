import { useState, useEffect, useRef, lazy, Suspense, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { type Venue } from "@/components/MapboxHeatmap";
import { JetCard } from "@/components/JetCard";
import { BottomNav } from "@/components/BottomNav";
import { NotificationCard, type Notification } from "@/components/NotificationCard";
import { Header } from "@/components/Header";
import { IntroScreen } from "@/components/IntroScreen";
import { glideHaptic, soarHaptic } from "@/lib/haptics";
import { useDeepLinking } from "@/hooks/useDeepLinking";

// Lazy load heavy components
const MapboxHeatmap = lazy(() => import("@/components/MapboxHeatmap").then(m => ({ default: m.MapboxHeatmap })));
const UserProfile = lazy(() => import("@/components/UserProfile").then(m => ({ default: m.UserProfile })));
const ExploreTab = lazy(() => import("@/components/ExploreTab").then(m => ({ default: m.ExploreTab })));

import { useMapboxToken } from "@/hooks/useMapboxToken";
import { useVenueImages } from "@/hooks/useVenueImages";
import { useNotifications } from "@/hooks/useNotifications";
import { useAutoScrapeVenueImages } from "@/hooks/useAutoScrapeVenueImages";
import { useDeals } from "@/hooks/useDeals";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useVenueActivity } from "@/hooks/useVenueActivity";
import { CITIES, type City } from "@/types/cities";
import { Zap, Navigation, Map as MapIcon, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import jetLogo from "@/assets/jet-logo.webp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NotificationSkeleton } from "@/components/skeletons/NotificationSkeleton";
import { MapSkeleton } from "@/components/skeletons/MapSkeleton";

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
  const location = useLocation();
  const [showIntro, setShowIntro] = useState(() => {
    // Check if user has seen intro before
    const hasSeenIntro = localStorage.getItem('hasSeenIntro');
    return !hasSeenIntro;
  });
  const [activeTab, setActiveTab] = useState<"map" | "explore" | "notifications" | "favorites" | "social">("map");
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedCity, setSelectedCity] = useState<City>(CITIES[0]); // Default to Charlotte
  const [showDirectionsDialog, setShowDirectionsDialog] = useState(false);
  const [deepLinkedDeal, setDeepLinkedDeal] = useState<any>(null);
  const { token: mapboxToken, loading: mapboxLoading, error: mapboxError } = useMapboxToken();
  const { getVenueImage } = useVenueImages();
  const { notifications, loading: notificationsLoading, markAsRead } = useNotifications();
  const { isScrapingActive } = useAutoScrapeVenueImages(true);
  const { deals, refresh: refreshDeals } = useDeals();
  const { venues: realVenues, loading: venuesLoading, refresh: refreshVenues } = useVenueActivity();
  const jetCardRef = useRef<HTMLDivElement>(null);

  // Use real venues when available, fallback to mock for compatibility
  const venues = realVenues && realVenues.length > 0 ? realVenues : mockVenues;

  // Handle deep linked deal - select the venue associated with the deal
  const handleDeepLinkDeal = useCallback(async (dealId: string, dealData: any) => {
    setDeepLinkedDeal(dealData);
    setActiveTab("map");
    
    // Find or create venue data from the deal
    const venueFromDeal: Venue = {
      id: dealData.venue_id,
      name: dealData.venue_name,
      lat: selectedCity.lat, // Default to city center if no coords
      lng: selectedCity.lng,
      activity: 80,
      category: dealData.deal_type || "Deal",
      neighborhood: "",
      address: dealData.venue_address,
      imageUrl: dealData.image_url || getVenueImage(dealData.venue_name),
    };

    // Try to find the venue in our venue list for better coordinates
    const existingVenue = venues.find(v => 
      v.name.toLowerCase() === dealData.venue_name.toLowerCase()
    );

    if (existingVenue) {
      setSelectedVenue({
        ...existingVenue,
        imageUrl: dealData.image_url || getVenueImage(existingVenue.name) || existingVenue.imageUrl,
        address: dealData.venue_address || existingVenue.address
      });
    } else {
      setSelectedVenue(venueFromDeal);
    }

    // Scroll to JetCard
    setTimeout(() => {
      jetCardRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 300);
  }, [venues, selectedCity, getVenueImage]);

  // Handle deep linked venue
  const handleDeepLinkVenue = useCallback((venueName: string) => {
    setActiveTab("map");
    const venue = venues.find(v => 
      v.name.toLowerCase() === venueName.toLowerCase()
    );
    
    if (venue) {
      const venueWithImage = {
        ...venue,
        imageUrl: getVenueImage(venue.name) || venue.imageUrl,
      };
      setSelectedVenue(venueWithImage);
      
      setTimeout(() => {
        jetCardRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 300);
    }
  }, [venues, getVenueImage]);

  // Initialize deep linking
  useDeepLinking({
    onDealOpen: handleDeepLinkDeal,
    onVenueOpen: handleDeepLinkVenue,
  });

  const handleIntroComplete = () => {
    localStorage.setItem('hasSeenIntro', 'true');
    setShowIntro(false);
  };

  // Pull to refresh functionality
  const handleRefresh = async () => {
    try {
      await Promise.all([
        refreshDeals(),
        refreshVenues(),
        // Add a small delay to show the refresh indicator
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
      toast.success("Map refreshed", {
        description: "Venue activity and deals updated"
      });
    } catch (error) {
      console.error("Error refreshing:", error);
      toast.error("Failed to refresh");
    }
  };

  const { containerRef, isRefreshing, pullDistance, pullThreshold } = usePullToRefresh({
    onRefresh: handleRefresh,
    pullThreshold: 80,
    maxPullDistance: 150,
  });

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

  // Check URL parameters and update activeTab on mount/navigation
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    
    if (tabParam === "explore") {
      setActiveTab("explore");
    } else if (tabParam === "notifications") {
      setActiveTab("notifications");
    } else if (tabParam === "map" || (location.pathname === "/" && !tabParam)) {
      setActiveTab("map");
    }
  }, [location.search, location.pathname]);

  // Handle favorites and social tab navigation (these go to separate pages)
  useEffect(() => {
    if (activeTab === "favorites") {
      navigate("/favorites");
    } else if (activeTab === "social") {
      navigate("/social");
    }
  }, [activeTab, navigate]);

  const handleCityChange = (city: City) => {
    setSelectedCity(city);
    toast.success(`Switched to ${city.name}, ${city.state}`, {
      description: "Finding deals in your area"
    });
  };

  const handleVenueSelect = async (venue: Venue | string) => {
    // Handle both Venue object and venue name string
    if (typeof venue === 'string') {
      // Find the venue by name in real venues or mock venues
      const foundVenue = venues.find(v => v.name === venue);
      if (foundVenue) {
        // Fetch address from deals table
        const { data: dealData } = await supabase
          .from('deals')
          .select('venue_address')
          .eq('venue_name', foundVenue.name)
          .limit(1)
          .maybeSingle();
        
        const venueWithImage = {
          ...foundVenue,
          imageUrl: getVenueImage(foundVenue.name) || foundVenue.imageUrl,
          address: dealData?.venue_address || undefined
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
      // Fetch address from deals table for venue object
      const { data: dealData } = await supabase
        .from('deals')
        .select('venue_address')
        .eq('venue_name', venue.name)
        .limit(1)
        .maybeSingle();
      
      // Original venue object handling
      const venueWithImage = {
        ...venue,
        imageUrl: getVenueImage(venue.name) || venue.imageUrl,
        address: dealData?.venue_address || venue.address
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

  const handleGetDirections = async () => {
    if (!selectedVenue) return;
    await glideHaptic(); // Smooth gliding haptic when opening directions
    setShowDirectionsDialog(true);
  };

  const openDirections = async (app: 'google' | 'apple' | 'waze') => {
    if (!selectedVenue) return;
    
    await soarHaptic(); // Soaring haptic when selecting navigation app
    
    const { lat, lng, address, name } = selectedVenue;
    // Use address if available, otherwise fall back to coordinates
    const destination = encodeURIComponent(address || name);
    
    let url = '';
    
    switch (app) {
      case 'google':
        // Google Maps - prefer address for better routing
        if (address) {
          url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
        } else {
          url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${destination}`;
        }
        break;
      case 'apple':
        // Apple Maps - prefer address for better routing
        if (address) {
          url = `http://maps.apple.com/?daddr=${destination}`;
        } else {
          url = `http://maps.apple.com/?daddr=${lat},${lng}&q=${destination}`;
        }
        break;
      case 'waze':
        // Waze - prefer address for better routing
        if (address) {
          url = `https://waze.com/ul?q=${destination}&navigate=yes`;
        } else {
          url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes&q=${destination}`;
        }
        break;
    }
    
    window.open(url, '_blank');
    setShowDirectionsDialog(false);
    
    toast.success(`Opening ${app === 'google' ? 'Google Maps' : app === 'apple' ? 'Apple Maps' : 'Waze'}`, {
      description: `Navigate to ${address || name}`
    });
  };

  return (
    <>
      {/* Intro Screen */}
      {showIntro && <IntroScreen onComplete={handleIntroComplete} />}
      
      <div className="min-h-screen bg-background pb-[calc(4rem+var(--safe-area-inset-bottom))] sm:pb-[calc(5rem+var(--safe-area-inset-bottom))] md:pb-[calc(6rem+var(--safe-area-inset-bottom))]">
        {/* Header */}
        <Header 
          venues={venues}
          deals={deals}
          onVenueSelect={handleVenueSelect}
        />

      {/* Main Content */}
      <main className={`max-w-7xl mx-auto ${activeTab === 'map' ? 'px-0 py-0' : 'px-fluid-md py-fluid-md'} gap-fluid-md`}>
        {activeTab === "map" && (
          <div 
            ref={containerRef}
            className="relative h-[calc(100vh-8rem-var(--safe-area-inset-top)-var(--safe-area-inset-bottom))] sm:h-[calc(100vh-10rem-var(--safe-area-inset-top)-var(--safe-area-inset-bottom))] md:h-[calc(100vh-12rem-var(--safe-area-inset-top)-var(--safe-area-inset-bottom))] overflow-y-auto overflow-x-hidden -mx-3 sm:-mx-4 md:-mx-6"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
            }}
          >
            {/* Pull to Refresh Indicator */}
            {(pullDistance > 0 || isRefreshing) && (
              <div 
                className="sticky top-0 left-0 right-0 z-50 flex justify-center pointer-events-none mb-2"
                style={{
                  transform: `translateY(${Math.min(pullDistance - 40, 0)}px)`,
                  opacity: Math.min(pullDistance / pullThreshold, 1),
                  transition: pullDistance === 0 ? 'all 0.3s ease-out' : 'none'
                }}
              >
                <div className="bg-card/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
                  <RefreshCw 
                    className={`w-4 h-4 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
                    style={{
                      transform: isRefreshing ? 'none' : `rotate(${(pullDistance / pullThreshold) * 360}deg)`
                    }}
                  />
                  <span className="text-xs font-medium text-foreground">
                    {isRefreshing ? 'Refreshing...' : pullDistance >= pullThreshold ? 'Release to refresh' : 'Pull to refresh'}
                  </span>
                </div>
              </div>
            )}

            {/* Mapbox Heatmap - Edge to edge */}
            <div className="h-full w-full overflow-hidden animate-fade-in">
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
              <Suspense fallback={
                <div className="h-full flex items-center justify-center bg-card">
                  <div className="text-center space-y-3 sm:space-y-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs sm:text-sm text-muted-foreground">Loading map...</p>
                  </div>
                </div>
              }>
                <MapboxHeatmap 
                  onVenueSelect={handleVenueSelect} 
                  venues={venues} 
                  mapboxToken={mapboxToken}
                  selectedCity={selectedCity}
                  onCityChange={handleCityChange}
                />
              </Suspense>
              )}
            </div>

            {/* Selected Venue Card - Positioned at bottom with optimal spacing */}
            {selectedVenue && (
              <div 
                ref={jetCardRef} 
                className="absolute bottom-[calc(1rem+var(--safe-area-inset-bottom))] left-[calc(1rem+var(--safe-area-inset-left))] right-[calc(1rem+var(--safe-area-inset-right))] sm:left-[calc(1.5rem+var(--safe-area-inset-left))] sm:right-[calc(1.5rem+var(--safe-area-inset-right))] md:left-[calc(2rem+var(--safe-area-inset-left))] md:right-[calc(2rem+var(--safe-area-inset-right))] lg:left-[calc(3rem+var(--safe-area-inset-left))] lg:right-[calc(3rem+var(--safe-area-inset-right))] z-20 animate-fade-in animate-scale-in max-w-2xl mx-auto"
              >
                <JetCard 
                  venue={selectedVenue} 
                  onGetDirections={handleGetDirections}
                  onClose={() => setSelectedVenue(null)}
                />
              </div>
            )}

          </div>
        )}

         {activeTab === "notifications" && (
          <div className="gap-fluid-md animate-fade-in px-fluid-md py-fluid-md">
            <div>
              <h2 className="text-fluid-2xl font-bold text-foreground mb-1 sm:mb-2">Notifications</h2>
              <p className="text-fluid-sm text-muted-foreground">Stay updated with nearby deals and events</p>
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
          <div className="px-fluid-md py-fluid-md">
            <Suspense fallback={
              <div className="flex items-center justify-center h-96">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Loading explore...</p>
                </div>
              </div>
            }>
              <ExploreTab onVenueSelect={handleVenueSelect} />
            </Suspense>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={(tab) => {
          // For map, explore, and notifications, stay on Index page but update tab
          if (tab === "map" || tab === "explore" || tab === "notifications") {
            setActiveTab(tab);
            // Don't navigate, just update the tab state
          } else {
            // For favorites and social, the useEffect will handle navigation
            setActiveTab(tab);
          }
        }}
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
    </>
  );
};

export default Index;
