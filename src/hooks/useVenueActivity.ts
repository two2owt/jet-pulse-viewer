import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Venue } from "@/components/MapboxHeatmap";

interface GooglePlacesData {
  rating: number | null;
  totalRatings: number;
  reviews: Array<{
    author: string;
    rating: number;
    text: string;
    time: string | null;
  }>;
  isOpen: boolean | null;
  openingHours: string[];
}

interface VenueActivityData {
  venue_id: string;
  venue_name: string;
  neighborhood_name: string;
  deal_count: number;
  recent_deal_count: number;
  favorite_count: number;
  share_count: number;
  center_lat: number;
  center_lng: number;
  venue_address: string | null;
}

/**
 * Enrich venues with Google Places data
 */
const enrichWithGooglePlaces = async (venues: Venue[]): Promise<Venue[]> => {
  // Only enrich top 10 venues by activity score to avoid API quota limits
  const topVenues = venues
    .sort((a, b) => b.activity - a.activity)
    .slice(0, 10);
  
  const enrichmentPromises = topVenues.map(async (venue) => {
    try {
      console.log(`Fetching Google Places data for venue: ${venue.name}`);
      
      const { data, error } = await supabase.functions.invoke<GooglePlacesData>('get-google-places-data', {
        body: { placeId: venue.id }
      });

      if (error) {
        console.warn(`Failed to fetch Google Places data for ${venue.name}:`, error);
        return venue;
      }

      return {
        ...venue,
        googleRating: data.rating,
        googleTotalRatings: data.totalRatings,
        googleReviews: data.reviews,
        isOpen: data.isOpen,
        openingHours: data.openingHours,
      };
    } catch (error) {
      console.warn(`Error enriching venue ${venue.name}:`, error);
      return venue;
    }
  });

  const enrichedTopVenues = await Promise.all(enrichmentPromises);
  
  // Merge enriched top venues with remaining venues
  const remainingVenues = venues.filter(
    v => !enrichedTopVenues.find(ev => ev.id === v.id)
  );
  
  return [...enrichedTopVenues, ...remainingVenues];
};

/**
 * Calculate activity score (0-100) based on venue metrics
 */
const calculateActivityScore = (data: VenueActivityData, nearbyUserCount: number): number => {
  // Weight factors
  const DEAL_WEIGHT = 25;
  const RECENT_WEIGHT = 30;
  const ENGAGEMENT_WEIGHT = 25;
  const TRAFFIC_WEIGHT = 20;

  // Normalize deal count (assume max 10 deals = 100%)
  const dealScore = Math.min((data.deal_count / 10) * 100, 100);
  
  // Normalize recent deals (last 7 days, assume max 5 = 100%)
  const recentScore = Math.min((data.recent_deal_count / 5) * 100, 100);
  
  // Normalize engagement (favorites + shares, assume max 50 = 100%)
  const engagementScore = Math.min(((data.favorite_count + data.share_count) / 50) * 100, 100);
  
  // Normalize nearby user traffic (assume max 20 users = 100%)
  const trafficScore = Math.min((nearbyUserCount / 20) * 100, 100);

  // Calculate weighted average
  const activity = (
    (dealScore * DEAL_WEIGHT / 100) +
    (recentScore * RECENT_WEIGHT / 100) +
    (engagementScore * ENGAGEMENT_WEIGHT / 100) +
    (trafficScore * TRAFFIC_WEIGHT / 100)
  );

  return Math.round(activity);
};

/**
 * Fetch the top 10 most popular venues in Charlotte
 */
const fetchPopularVenuesFromGooglePlaces = async (): Promise<Venue[]> => {
  try {
    console.log('Fetching top 10 Charlotte venues...');
    
    // Charlotte coordinates
    const charlotteLocation = { lat: 35.2271, lng: -80.8431 };
    
    const { data, error } = await supabase.functions.invoke('search-google-places-venues', {
      body: { location: charlotteLocation }
    });

    if (error) {
      console.error('Error fetching venues:', error);
      return [];
    }

    // Map the response to our Venue interface
    const venues: Venue[] = (data.venues || []).slice(0, 10).map((v: any) => ({
      id: v.id,
      name: v.name,
      lat: v.lat,
      lng: v.lng,
      activity: v.activity || 50,
      category: v.category || 'Venue',
      neighborhood: getNeighborhoodFromCoords(v.lat, v.lng),
      address: v.address,
      googleRating: v.googleRating,
      googleTotalRatings: v.googleTotalRatings,
      isOpen: v.isOpen,
      openingHours: v.openingHours || [],
    }));
    
    console.log(`Fetched ${venues.length} Charlotte venues:`);
    venues.forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.name}: lat=${v.lat}, lng=${v.lng} | ${v.address || 'No address'}`);
    });
    return venues;
  } catch (error) {
    console.error('Error in fetchPopularVenuesFromGooglePlaces:', error);
    return [];
  }
};

/**
 * Determine neighborhood from coordinates
 */
const getNeighborhoodFromCoords = (lat: number, lng: number): string => {
  // Charlotte neighborhoods approximate boundaries
  if (lat >= 35.245) return 'NoDa';
  if (lat >= 35.230 && lng <= -80.820) return 'Camp North End';
  if (lat >= 35.220 && lat < 35.235) return 'Uptown';
  if (lat >= 35.200 && lat < 35.220 && lng >= -80.820) return 'Plaza Midwood';
  if (lat < 35.220 && lng <= -80.840) return 'South End';
  return 'Charlotte';
};

/**
 * Hook to fetch real venue activity data from Supabase and Google Places
 */
export const useVenueActivity = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadVenueActivity = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, fetch popular venues from Google Places as the base dataset
      const googleVenues = await fetchPopularVenuesFromGooglePlaces();
      
      // Then, enhance with our own platform data (deals, engagement, etc.)
      const { data: deals, error: dealsError } = await supabase
          .from('deals')
          .select(`
            venue_id,
            venue_name,
            venue_address,
            neighborhood_id,
            created_at,
            neighborhoods!inner(
              name,
              center_lat,
              center_lng
            )
          `)
          .eq('active', true)
          .gte('expires_at', new Date().toISOString())
          .lte('starts_at', new Date().toISOString());

      if (dealsError) {
        console.warn('Error fetching deals:', dealsError);
      }

      // Aggregate venue metrics from deals
      const venueEngagementMap = new Map<string, {
        dealCount: number;
        recentDealCount: number;
        favoriteCount: number;
        shareCount: number;
      }>();
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      deals?.forEach((deal: any) => {
        const key = deal.venue_id;
        const existing = venueEngagementMap.get(key);
        const isRecent = new Date(deal.created_at) > sevenDaysAgo;

        if (existing) {
          existing.dealCount++;
          if (isRecent) existing.recentDealCount++;
        } else {
          venueEngagementMap.set(key, {
            dealCount: 1,
            recentDealCount: isRecent ? 1 : 0,
            favoriteCount: 0,
            shareCount: 0,
          });
        }
      });

      // Fetch engagement metrics (favorites and shares) for venues with deals
      const venueIds = Array.from(venueEngagementMap.keys());
      
      if (venueIds.length > 0) {
        const { data: dealIds } = await supabase
          .from('deals')
          .select('id, venue_id')
          .in('venue_id', venueIds);

        if (dealIds && dealIds.length > 0) {
          const dealIdsArray = dealIds.map(d => d.id);

          // Get favorites count
          const { data: favorites } = await supabase
            .from('user_favorites')
            .select('deal_id')
            .in('deal_id', dealIdsArray);

          // Get shares count
          const { data: shares } = await supabase
            .from('deal_shares')
            .select('deal_id')
            .in('deal_id', dealIdsArray);

          // Update engagement map
          dealIds.forEach(dealMapping => {
            const engagement = venueEngagementMap.get(dealMapping.venue_id);
            if (engagement) {
              engagement.favoriteCount += favorites?.filter(f => f.deal_id === dealMapping.id).length || 0;
              engagement.shareCount += shares?.filter(s => s.deal_id === dealMapping.id).length || 0;
            }
          });
        }
      }

      // Enhance Google Places venues with our engagement data
      const enhancedVenues = googleVenues.map(venue => {
        const engagement = venueEngagementMap.get(venue.id);
        
        if (engagement) {
          // Boost activity score for venues with deals/engagement
          const engagementBoost = Math.min(30, 
            (engagement.dealCount * 5) + 
            (engagement.recentDealCount * 10) + 
            (engagement.favoriteCount * 2) + 
            (engagement.shareCount * 2)
          );
          
          return {
            ...venue,
            activity: Math.min(100, venue.activity + engagementBoost),
          };
        }
        
        return venue;
      });

      // Sort by activity score
      const sortedVenues = enhancedVenues.sort((a, b) => b.activity - a.activity);
      
      console.log(`Loaded ${sortedVenues.length} venues with activity scores`);
      setVenues(sortedVenues);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading venue activity:', err);
      setError(err instanceof Error ? err.message : 'Failed to load venue data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVenueActivity();

    // Set up real-time subscription for deal changes
    const channel = supabase
      .channel('venue-activity-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deals'
        },
        () => {
          console.log('Deal change detected, refreshing venue activity');
          loadVenueActivity();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_locations'
        },
        () => {
          console.log('User location update detected, refreshing venue activity');
          loadVenueActivity();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_favorites'
        },
        () => {
          console.log('Favorites change detected, refreshing venue activity');
          loadVenueActivity();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deal_shares'
        },
        () => {
          console.log('Deal share detected, refreshing venue activity');
          loadVenueActivity();
        }
      )
      .subscribe();

    // Listen for visibility changes to refresh on tab focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadVenueActivity();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { venues, loading, error, refresh: loadVenueActivity, lastUpdated };
};
