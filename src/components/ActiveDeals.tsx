import { useEffect, useState, memo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, MapPin, TrendingUp, ChevronDown, ChevronUp, Heart, Share2, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { OptimizedImage } from "./ui/optimized-image";
import { DealCardSkeleton } from "./skeletons/DealCardSkeleton";
import { toast } from "sonner";
import type { City } from "@/types/cities";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { useFavorites } from "@/hooks/useFavorites";
import { shareDeal } from "@/utils/shareUtils";
import { glideHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

interface UserPreferences {
  categories?: string[];
}

// Map deal_type values to preference categories
const dealTypeToCategory: Record<string, string> = {
  'food': 'Food',
  'Food': 'Food',
  'restaurant': 'Food',
  'dining': 'Food',
  'drinks': 'Drinks',
  'Drinks': 'Drinks',
  'bar': 'Drinks',
  'cocktail': 'Drinks',
  'coffee': 'Drinks',
  'nightlife': 'Nightlife',
  'Nightlife': 'Nightlife',
  'club': 'Nightlife',
  'lounge': 'Nightlife',
  'events': 'Events',
  'Events': 'Events',
  'concert': 'Events',
  'festival': 'Events',
};

interface Deal {
  id: string;
  title: string;
  description: string;
  venue_name: string;
  deal_type: string;
  expires_at: string;
  image_url: string | null;
  website_url: string | null;
  neighborhood_id: string | null;
}

interface ActiveDealsProps {
  selectedCity: City;
}

export const ActiveDeals = memo(({ selectedCity }: ActiveDealsProps) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [preferenceFilterEnabled, setPreferenceFilterEnabled] = useState(true);
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('activeDealsOpen');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const INITIAL_DISPLAY = 5;

  const { isFavorite, toggleFavorite } = useFavorites(user?.id);

  const loadUserPreferences = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      const prefs = data?.preferences as UserPreferences | null;
      setUserPreferences(prefs);
    } catch (err) {
      console.error('Error loading user preferences:', err);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserPreferences(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserPreferences(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserPreferences]);

  // Apply preference filtering
  useEffect(() => {
    if (!preferenceFilterEnabled || !userPreferences?.categories || userPreferences.categories.length === 0) {
      setFilteredDeals(deals);
      return;
    }

    const filtered = deals.filter(deal => {
      const dealCategory = dealTypeToCategory[deal.deal_type] || deal.deal_type;
      return userPreferences.categories!.some(cat => 
        cat.toLowerCase() === dealCategory.toLowerCase()
      );
    });
    setFilteredDeals(filtered);
  }, [deals, userPreferences, preferenceFilterEnabled]);

  useEffect(() => {
    localStorage.setItem('activeDealsOpen', JSON.stringify(isOpen));
  }, [isOpen]);

  useEffect(() => {
    loadActiveDeals();
    
    // Set up realtime subscription for new deals
    const channel = supabase
      .channel('deals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deals',
        },
        () => {
          loadActiveDeals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCity]);

  const loadActiveDeals = async () => {
    try {
      // First, get neighborhoods near the selected city (within ~50km radius)
      const { data: neighborhoods, error: neighborhoodError } = await supabase
        .from('neighborhoods')
        .select('id, center_lat, center_lng')
        .eq('active', true);

      if (neighborhoodError) throw neighborhoodError;

      // Filter neighborhoods by distance to selected city
      const nearbyNeighborhoods = neighborhoods?.filter(neighborhood => {
        const distance = getDistance(
          selectedCity.lat,
          selectedCity.lng,
          Number(neighborhood.center_lat),
          Number(neighborhood.center_lng)
        );
        return distance <= 50; // 50km radius
      });

      const neighborhoodIds = nearbyNeighborhoods?.map(n => n.id) || [];

      // Get deals for nearby neighborhoods
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('active', true)
        .gte('expires_at', new Date().toISOString())
        .lte('starts_at', new Date().toISOString())
        .in('neighborhood_id', neighborhoodIds)
        .limit(20);

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate distance between two coordinates in km using Haversine formula
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getDealIcon = (dealType: string) => {
    switch (dealType) {
      case 'offer':
        return '🎉';
      case 'event':
        return '🎵';
      case 'special':
        return '⭐';
      default:
        return '💎';
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Active Deals</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <DealCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (filteredDeals.length === 0 && deals.length > 0) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Active Deals</h3>
          {userPreferences?.categories && userPreferences.categories.length > 0 && (
            <Badge 
              variant={preferenceFilterEnabled ? "default" : "outline"}
              className="text-xs flex items-center gap-1 cursor-pointer"
              onClick={() => setPreferenceFilterEnabled(!preferenceFilterEnabled)}
            >
              <Sparkles className="w-3 h-3" />
              {preferenceFilterEnabled ? "Personalized" : "Show All"}
            </Badge>
          )}
        </div>
        <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl p-8 border border-border/50 text-center space-y-3">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary/60" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">No matching deals</p>
            <p className="text-sm text-muted-foreground">Tap "Personalized" to see all {deals.length} deals</p>
          </div>
        </div>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="space-y-3 animate-fade-in">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Active Deals</h3>
        </div>
        <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl p-8 border border-border/50 text-center space-y-3">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-primary/60" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">No active deals yet</p>
            <p className="text-sm text-muted-foreground">Check back soon for exciting offers near you!</p>
          </div>
        </div>
      </div>
    );
  }

  const visibleDeals = showAll ? filteredDeals : filteredDeals.slice(0, INITIAL_DISPLAY);
  const hasMore = filteredDeals.length > INITIAL_DISPLAY;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-3 animate-fade-in">
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Active Deals</h3>
          <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-bold">
            {filteredDeals.length}
          </div>
          {userPreferences?.categories && userPreferences.categories.length > 0 && (
            <Badge 
              variant={preferenceFilterEnabled ? "default" : "outline"}
              className="text-xs flex items-center gap-1 cursor-pointer ml-auto mr-2"
              onClick={(e) => {
                e.stopPropagation();
                setPreferenceFilterEnabled(!preferenceFilterEnabled);
              }}
            >
              <Sparkles className="w-3 h-3" />
              {preferenceFilterEnabled ? "Personalized" : "Show All"}
            </Badge>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-2">
        <div className="space-y-2">
          {visibleDeals.map((deal, index) => {
            // First 3 items load eagerly, rest defer
            const shouldDeferLoad = index >= 3;
            
            return (
            <div
              key={deal.id}
              className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 rounded-xl overflow-hidden border border-primary/20 hover-scale"
            >
              <div className="flex items-start gap-3 p-3">
                {deal.image_url ? (
                  <OptimizedImage
                    src={deal.image_url} 
                    alt={deal.venue_name}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    responsive={true}
                    responsiveSizes={['thumbnail', 'small']}
                    sizesConfig={{ mobile: '64px', tablet: '64px', desktop: '64px' }}
                    deferLoad={shouldDeferLoad}
                    fallback={
                      <div className="w-16 h-16 flex items-center justify-center text-3xl flex-shrink-0">
                        {getDealIcon(deal.deal_type)}
                      </div>
                    }
                  />
                ) : (
                  <div className="w-16 h-16 flex items-center justify-center text-3xl flex-shrink-0">
                    {getDealIcon(deal.deal_type)}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-foreground mb-1 truncate">
                    {deal.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {deal.description}
                  </p>
                  
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-1 min-w-0">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{deal.venue_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-primary font-medium flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{getTimeRemaining(deal.expires_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await glideHaptic();
                      await toggleFavorite(deal.id);
                    }}
                    className="p-2 rounded-lg hover:bg-background/50 transition-colors"
                    aria-label={isFavorite(deal.id) ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart
                      className={cn(
                        "w-4 h-4 transition-colors",
                        isFavorite(deal.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"
                      )}
                    />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await glideHaptic();
                      const result = await shareDeal(deal, user?.id);
                      if (result.success) {
                        toast.success(
                          result.method === "native" ? "Shared successfully!" : "Copied to clipboard!",
                          {
                            description:
                              result.method === "native"
                                ? `${deal.title} shared with others`
                                : "Share link copied - paste it anywhere",
                          }
                        );
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-background/50 transition-colors"
                    aria-label="Share deal"
                  >
                    <Share2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full text-primary hover:bg-primary/10"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show More ({filteredDeals.length - INITIAL_DISPLAY} more)
              </>
            )}
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
});
