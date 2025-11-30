import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaceResult {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  types: string[];
  opening_hours?: {
    open_now?: boolean;
  };
  business_status?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { location, radius = 5000, categories = ['bar', 'restaurant', 'night_club', 'cafe'] } = await req.json();
    
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      throw new Error('Google Places API key not configured');
    }

    if (!location || !location.lat || !location.lng) {
      throw new Error('Location coordinates (lat, lng) are required');
    }

    console.log(`Searching for venues near ${location.lat},${location.lng} in categories: ${categories.join(', ')}`);

    // Search for venues in each category
    const allPlaces: PlaceResult[] = [];
    const seenPlaceIds = new Set<string>();

    for (const category of categories) {
      const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
      searchUrl.searchParams.append('location', `${location.lat},${location.lng}`);
      searchUrl.searchParams.append('radius', radius.toString());
      searchUrl.searchParams.append('type', category);
      searchUrl.searchParams.append('rankby', 'prominence'); // Get most popular places
      searchUrl.searchParams.append('key', apiKey);

      console.log(`Fetching ${category} venues...`);
      const response = await fetch(searchUrl.toString());

      if (!response.ok) {
        console.error(`Google Places API error for ${category}:`, response.status, await response.text());
        continue;
      }

      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error(`Google Places API returned status: ${data.status}`);
        continue;
      }

      // Filter for open, highly-rated venues
      const categoryPlaces = (data.results || [])
        .filter((place: PlaceResult) => {
          // Skip if already seen
          if (seenPlaceIds.has(place.place_id)) return false;
          
          // Only include places that are operational
          if (place.business_status && place.business_status !== 'OPERATIONAL') return false;
          
          // Prefer places with ratings
          if (!place.rating || place.rating < 3.5) return false;
          
          // Prefer places with more reviews
          if (!place.user_ratings_total || place.user_ratings_total < 50) return false;
          
          return true;
        })
        .slice(0, 8); // Get top 8 from each category

      categoryPlaces.forEach((place: PlaceResult) => {
        seenPlaceIds.add(place.place_id);
        allPlaces.push(place);
      });
    }

    // Sort by rating and review count, take top 25
    const topVenues = allPlaces
      .sort((a, b) => {
        const scoreA = (a.rating || 0) * Math.log(a.user_ratings_total || 1);
        const scoreB = (b.rating || 0) * Math.log(b.user_ratings_total || 1);
        return scoreB - scoreA;
      })
      .slice(0, 25);

    console.log(`Found ${topVenues.length} top venues`);

    // Transform to our venue format
    const venues = topVenues.map((place) => {
      // Determine category from types
      let category = 'Venue';
      if (place.types.includes('night_club')) category = 'Nightclub';
      else if (place.types.includes('bar')) category = 'Bar';
      else if (place.types.includes('restaurant')) category = 'Restaurant';
      else if (place.types.includes('cafe')) category = 'Cafe';

      return {
        id: place.place_id,
        name: place.name,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        address: place.vicinity,
        category,
        googleRating: place.rating,
        googleTotalRatings: place.user_ratings_total,
        isOpen: place.opening_hours?.open_now ?? null,
        // Activity score based on popularity metrics
        activity: Math.min(100, Math.round(
          (place.rating || 0) * 10 + 
          Math.min(50, (place.user_ratings_total || 0) / 20)
        )),
      };
    });

    return new Response(
      JSON.stringify({ venues, total: venues.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error searching Google Places:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        venues: [],
        total: 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
