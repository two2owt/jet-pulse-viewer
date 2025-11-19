import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, MapPin, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "./ui/button";
import { DealCardSkeleton } from "./skeletons/DealCardSkeleton";
import { toast } from "sonner";
import type { City } from "@/types/cities";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";

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

export const ActiveDeals = ({ selectedCity }: ActiveDealsProps) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const INITIAL_DISPLAY = 5;

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

  if (deals.length === 0) {
    return (
      <div className="bg-card/50 rounded-xl p-4 border border-border/50 text-center">
        <p className="text-sm text-muted-foreground">No active deals right now</p>
      </div>
    );
  }

  const visibleDeals = showAll ? deals : deals.slice(0, INITIAL_DISPLAY);
  const hasMore = deals.length > INITIAL_DISPLAY;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-3 animate-fade-in">
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Active Deals</h3>
          <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-bold">
            {deals.length}
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground ml-auto" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-2">
        <div className="space-y-2">
          {visibleDeals.map((deal, index) => (
            <div
              key={deal.id}
              className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 rounded-xl overflow-hidden border border-primary/20 animate-scale-in hover-scale"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-3 p-3">
                {deal.image_url ? (
                  <img 
                    src={deal.image_url} 
                    alt={deal.venue_name}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
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
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{deal.venue_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-primary font-medium">
                      <Clock className="w-3 h-3" />
                      <span>{getTimeRemaining(deal.expires_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
                Show More ({deals.length - INITIAL_DISPLAY} more)
              </>
            )}
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
