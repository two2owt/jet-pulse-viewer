import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Venue } from "@/components/Heatmap";

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
 * Hook to fetch real venue activity data from Supabase
 */
export const useVenueActivity = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVenueActivity = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch active deals with neighborhood data
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

      if (dealsError) throw dealsError;

      // Manually aggregate venue metrics
      const venueMap = new Map<string, VenueActivityData>();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      deals?.forEach((deal: any) => {
        const key = deal.venue_id;
        const existing = venueMap.get(key);
        const isRecent = new Date(deal.created_at) > sevenDaysAgo;

        if (existing) {
          existing.deal_count++;
          if (isRecent) existing.recent_deal_count++;
        } else {
          venueMap.set(key, {
            venue_id: deal.venue_id,
            venue_name: deal.venue_name,
            neighborhood_name: deal.neighborhoods?.name || 'Unknown',
            deal_count: 1,
            recent_deal_count: isRecent ? 1 : 0,
            favorite_count: 0, // Will be updated below
            share_count: 0, // Will be updated below
            center_lat: deal.neighborhoods?.center_lat || 0,
            center_lng: deal.neighborhoods?.center_lng || 0,
            venue_address: deal.venue_address,
          });
        }
      });

      // Fetch engagement metrics (favorites and shares)
      const venueIds = Array.from(venueMap.keys());
      
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

          // Update venue map with engagement data
          dealIds.forEach(dealMapping => {
            const venue = venueMap.get(dealMapping.venue_id);
            if (venue) {
              venue.favorite_count += favorites?.filter(f => f.deal_id === dealMapping.id).length || 0;
              venue.share_count += shares?.filter(s => s.deal_id === dealMapping.id).length || 0;
            }
          });
        }
      }

      // Fetch nearby user traffic from user_locations (last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data: userLocations } = await supabase
        .from('user_locations')
        .select('latitude, longitude, current_neighborhood_id')
        .gte('created_at', oneDayAgo.toISOString());

      // Convert to venues with activity scores
      const venuesWithActivity: Venue[] = Array.from(venueMap.values()).map(venueData => {
        // Count users near this venue (within 0.01 degrees ~ 1km)
        const nearbyUsers = userLocations?.filter(loc => {
          const latDiff = Math.abs(loc.latitude - venueData.center_lat);
          const lngDiff = Math.abs(loc.longitude - venueData.center_lng);
          return latDiff < 0.01 && lngDiff < 0.01;
        }).length || 0;

        return {
          id: venueData.venue_id,
          name: venueData.venue_name,
          lat: venueData.center_lat,
          lng: venueData.center_lng,
          activity: calculateActivityScore(venueData, nearbyUsers),
          category: 'Venue', // Can be enhanced with venue type classification
          neighborhood: venueData.neighborhood_name,
          address: venueData.venue_address || undefined,
        };
      });

      // Enrich top venues with Google Places data
      const enrichedVenues = await enrichWithGooglePlaces(venuesWithActivity);
      setVenues(enrichedVenues);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { venues, loading, error, refresh: loadVenueActivity };
};
