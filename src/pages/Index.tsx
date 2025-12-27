import { useState, useEffect, useRef, lazy, Suspense, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { type Venue } from "@/components/MapboxHeatmap";
import { JetCard } from "@/components/JetCard";
import { BottomNav } from "@/components/BottomNav";
import { NotificationCard, type Notification } from "@/components/NotificationCard";
import { Header } from "@/components/Header";

import { glideHaptic, soarHaptic } from "@/lib/haptics";
import { useDeepLinking } from "@/hooks/useDeepLinking";
import { useSwipeToDismiss } from "@/hooks/useSwipeToDismiss";
import { useIsMobile } from "@/hooks/use-mobile";

// Direct import for immediate map availability
import { MapboxHeatmap } from "@/components/MapboxHeatmap";
const UserProfile = lazy(() => import("@/components/UserProfile").then(m => ({ default: m.UserProfile })));
const ExploreTab = lazy(() => import("@/components/ExploreTab").then(m => ({ default: m.ExploreTab })));

import { useMapboxToken } from "@/hooks/useMapboxToken";
import { useVenueImages } from "@/hooks/useVenueImages";
import { useNotifications } from "@/hooks/useNotifications";
import { useAutoScrapeVenueImages } from "@/hooks/useAutoScrapeVenueImages";
import { useDeals } from "@/hooks/useDeals";

import { useVenueActivity } from "@/hooks/useVenueActivity";
import { CITIES, type City } from "@/types/cities";
import { Zap, Navigation, Map as MapIcon } from "lucide-react";
import { toast } from "sonner";
import jetLogo from "@/assets/jet-logo-256.webp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { OfflineBanner } from "@/components/OfflineBanner";

// Top 10 most popular venues in Charlotte, NC metropolitan area with real addresses
const charlotteVenues: Venue[] = [
  { id: "merchant-trade", name: "Merchant & Trade", lat: 35.2271, lng: -80.8393, activity: 95, category: "Rooftop Bar", neighborhood: "Uptown", address: "201 S College St, Charlotte, NC 28202" },
  { id: "punch-room", name: "The Punch Room", lat: 35.2269, lng: -80.8405, activity: 88, category: "Cocktail Bar", neighborhood: "Uptown", address: "100 W Trade St, Charlotte, NC 28202" },
  { id: "heirloom", name: "Heirloom Restaurant", lat: 35.2163, lng: -80.8482, activity: 92, category: "Restaurant", neighborhood: "South End", address: "2000 South Blvd Suite 420, Charlotte, NC 28203" },
  { id: "supperland", name: "Supperland", lat: 35.2381, lng: -80.8237, activity: 87, category: "Restaurant", neighborhood: "Camp North End", address: "1212 N Davidson St, Charlotte, NC 28206" },
  { id: "haberdish", name: "Haberdish", lat: 35.2488, lng: -80.8067, activity: 85, category: "Restaurant", neighborhood: "NoDa", address: "3106 N Davidson St, Charlotte, NC 28205" },
  { id: "seoul-food", name: "Seoul Food Meat Company", lat: 35.2188, lng: -80.8441, activity: 83, category: "Restaurant", neighborhood: "South End", address: "2001 South Blvd, Charlotte, NC 28203" },
  { id: "crunkleton", name: "The Crunkleton", lat: 35.2193, lng: -80.8137, activity: 80, category: "Cocktail Bar", neighborhood: "Plaza Midwood", address: "1957 E 7th St, Charlotte, NC 28204" },
  { id: "fahrenheit", name: "Fahrenheit", lat: 35.2272, lng: -80.8394, activity: 90, category: "Restaurant", neighborhood: "Uptown", address: "222 S Caldwell St, Charlotte, NC 28202" },
  { id: "angelines", name: "Angeline's", lat: 35.2257, lng: -80.8401, activity: 82, category: "Restaurant", neighborhood: "Uptown", address: "125 W Trade St, Charlotte, NC 28202" },
  { id: "wooden-robot", name: "Wooden Robot Brewery", lat: 35.2156, lng: -80.8485, activity: 78, category: "Brewery", neighborhood: "South End", address: "1440 S Tryon St Suite 110, Charlotte, NC 28203" },
];

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize activeTab from URL parameter synchronously to prevent flash
  const getInitialTab = (): "map" | "explore" | "notifications" | "favorites" | "social" => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam === "explore") return "explore";
    if (tabParam === "notifications") return "notifications";
    return "map";
  };
  
  const [activeTab, setActiveTab] = useState<"map" | "explore" | "notifications" | "favorites" | "social">(getInitialTab);
  const [mapUIResetKey, setMapUIResetKey] = useState(0); // Increments when switching to map tab to reset collapsed UI
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedCity, setSelectedCity] = useState<City>(CITIES[0]); // Default to Charlotte
  const [detectedLocationName, setDetectedLocationName] = useState<string | null>(null); // Actual city from reverse geocoding
  const [showDirectionsDialog, setShowDirectionsDialog] = useState(false);
  const [deepLinkedDeal, setDeepLinkedDeal] = useState<any>(null);
  const { token: mapboxToken, loading: mapboxLoading, error: mapboxError } = useMapboxToken();
  const { getVenueImage } = useVenueImages();
  const { notifications, loading: notificationsLoading, markAsRead } = useNotifications();
  const { isScrapingActive } = useAutoScrapeVenueImages(true);
  const { deals, refresh: refreshDeals, loading: dealsLoading, lastUpdated: dealsLastUpdated } = useDeals();
  const { venues: realVenues, loading: venuesLoading, refresh: refreshVenues, lastUpdated: venuesLastUpdated } = useVenueActivity();
  const { justInstalled, clearJustInstalled } = usePWAInstall();
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const jetCardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  // Swipe to dismiss for JetCard on mobile
  const { handlers: swipeHandlers, style: swipeStyle } = useSwipeToDismiss({
    onDismiss: () => setSelectedVenue(null),
    threshold: 80,
    direction: 'down'
  });

  // Use real venues when available, fallback to Charlotte venues
  const venues = realVenues && realVenues.length > 0 ? realVenues : charlotteVenues;

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



  // Check onboarding status - only redirect to onboarding if needed, never sign out
  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
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

  // Sync activeTab with URL when navigating back/forward
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    
    // Only update if we're on the Index page and URL changed (e.g., browser back/forward)
    if (location.pathname === "/") {
      if (tabParam === "explore" && activeTab !== "explore") {
        setActiveTab("explore");
      } else if (tabParam === "notifications" && activeTab !== "notifications") {
        setActiveTab("notifications");
      } else if (!tabParam && activeTab !== "map") {
        setActiveTab("map");
      }
    }
  }, [location.search, location.pathname]);

  // Reset map UI collapsed state when switching to map tab
  useEffect(() => {
    if (activeTab === "map") {
      setMapUIResetKey(prev => prev + 1);
    }
  }, [activeTab]);

  const handleCityChange = useCallback((city: City) => {
    setSelectedCity(city);
    toast.success(`Switched to ${city.name}, ${city.state}`, {
      description: "Finding deals in your area"
    });
  }, []);

  // Auto-select nearest city when geolocation detects it on initial load
  const handleNearestCityDetected = useCallback((city: City) => {
    setSelectedCity(city);
  }, []);

  // Handle detected location name from reverse geocoding
  const handleDetectedLocationNameChange = useCallback((name: string | null) => {
    setDetectedLocationName(name);
  }, []);

  const handleVenueSelect = useCallback(async (venue: Venue | string) => {
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
  }, [venues, getVenueImage]);

  const handleGetDirections = useCallback(async () => {
    if (!selectedVenue) return;
    await glideHaptic(); // Smooth gliding haptic when opening directions
    setShowDirectionsDialog(true);
  }, [selectedVenue]);

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
      
      <div 
        className={`app-wrapper ${activeTab === 'map' ? 'map-container' : 'page-container'}`}
        style={{
          // Fixed dimensions prevent layout shifts during initial render
          height: '100dvh',
          minHeight: '100dvh',
          contain: 'strict',
          transform: 'translateZ(0)',
          // Isolate stacking context to prevent shift propagation
          isolation: 'isolate',
        }}
      >
        {/* Header */}
        <Header 
          venues={venues}
          deals={deals}
          onVenueSelect={handleVenueSelect}
          isLoading={dealsLoading || venuesLoading}
          lastUpdated={dealsLastUpdated || venuesLastUpdated}
          onRefresh={() => {
            refreshDeals();
            refreshVenues();
          }}
          cityName={detectedLocationName || `${selectedCity.name}, ${selectedCity.state}`}
        />

        {/* Offline Banner */}
        <OfflineBanner />

      {/* Main Content - Reserve height immediately to prevent CLS */}
      {/* Header is 48px + safe area, bottom nav is ~56px on mobile */}
      <main 
        role="main"
        className={`${activeTab === 'map' ? 'w-full' : 'max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4'}`}
        style={{ 
          // Fixed dimensions prevent layout shifts - use flex-grow instead of flex-1 class
          flex: '1 1 auto',
          // Calculate height: 100dvh - header (48px + safe-area-top) - bottom nav (56px + safe-area-bottom)
          minHeight: activeTab === 'map' ? 'calc(100dvh - 48px - 56px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))' : '400px',
          height: activeTab === 'map' ? 'calc(100dvh - 48px - 56px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))' : 'auto',
          // Strict size containment prevents content from affecting layout
          contain: 'size layout style paint',
          contentVisibility: 'auto',
          containIntrinsicSize: activeTab === 'map' ? '100vw calc(100dvh - 104px)' : '100vw 400px',
          // Create a stable layer
          transform: 'translateZ(0)',
          // Explicit sizing prevents browser recalculation
          boxSizing: 'border-box',
          width: '100%',
          // Isolate stacking context
          isolation: 'isolate',
        }}
      >
        {activeTab === "map" && (
          <div 
            className="relative w-full h-full"
            style={{ 
              height: '100%',
              minHeight: '400px',
              contain: 'layout style paint',
              contentVisibility: 'auto',
              containIntrinsicSize: '100vw 400px',
              transform: 'translateZ(0)',
            }}
          >

            {/* Mapbox Heatmap - Edge to edge */}
            <div className="h-full w-full relative">
              {/* Error state - only show if there's a definite error */}
              {mapboxError && !mapboxLoading && (
                <div 
                  className="absolute inset-0 z-10 flex items-center justify-center bg-background"
                >
                  <div className="text-center space-y-3 sm:space-y-4 p-6 sm:p-8">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                      <MapIcon className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-destructive" />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <p className="text-sm sm:text-base md:text-lg font-medium text-foreground">Unable to load map</p>
                      <p className="text-xs sm:text-sm text-muted-foreground max-w-[200px] sm:max-w-[280px] mx-auto">{mapboxError}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="default"
                      onClick={() => window.location.reload()}
                      className="mt-2 sm:mt-3"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Map - render immediately, MapboxHeatmap handles its own loading state */}
              <MapboxHeatmap
                onVenueSelect={handleVenueSelect} 
                venues={venues} 
                mapboxToken={mapboxToken || ""}
                selectedCity={selectedCity}
                onCityChange={handleCityChange}
                onNearestCityDetected={handleNearestCityDetected}
                onDetectedLocationNameChange={handleDetectedLocationNameChange}
                isLoadingVenues={venuesLoading}
                selectedVenue={selectedVenue}
                resetUIKey={mapUIResetKey}
                isTokenLoading={mapboxLoading}
              />
            </div>

            {/* Selected Venue Card - Positioned at bottom with optimal spacing */}
            {selectedVenue && (
              <div 
                ref={jetCardRef} 
                className="absolute bottom-[calc(1rem+var(--safe-area-inset-bottom))] left-[calc(1rem+var(--safe-area-inset-left))] right-[calc(1rem+var(--safe-area-inset-right))] sm:left-[calc(1.5rem+var(--safe-area-inset-left))] sm:right-[calc(1.5rem+var(--safe-area-inset-right))] md:left-[calc(2rem+var(--safe-area-inset-left))] md:right-[calc(2rem+var(--safe-area-inset-right))] lg:left-[calc(3rem+var(--safe-area-inset-left))] lg:right-[calc(3rem+var(--safe-area-inset-right))] z-[60] animate-fade-in animate-scale-in max-w-2xl mx-auto"
                style={isMobile ? swipeStyle : undefined}
                {...(isMobile ? swipeHandlers : {})}
              >
                {/* Swipe indicator for mobile */}
                {isMobile && (
                  <div className="flex justify-center pb-2">
                    <div className="w-10 h-1 bg-muted-foreground/40 rounded-full" />
                  </div>
                )}
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
            
            {notifications.length === 0 ? (
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
            <Suspense fallback={null}>
              <ExploreTab onVenueSelect={handleVenueSelect} />
            </Suspense>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={(tab) => {
          // For map, explore, and notifications, stay on Index page but update URL
          if (tab === "map") {
            setActiveTab(tab);
            // Update URL to remove tab param for map (default)
            navigate("/", { replace: true });
          } else if (tab === "explore" || tab === "notifications") {
            setActiveTab(tab);
            // Update URL with tab parameter
            navigate(`/?tab=${tab}`, { replace: true });
          } else if (tab === "favorites") {
            // Navigate to favorites page
            navigate("/favorites");
          } else if (tab === "social") {
            // Navigate to social page
            navigate("/social");
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

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Push Notification Prompt - shows after PWA install */}
      <PushNotificationPrompt 
        show={justInstalled || showPushPrompt}
        onDismiss={() => {
          clearJustInstalled();
          setShowPushPrompt(false);
        }}
      />
    </div>
    </>
  );
};

export default Index;
