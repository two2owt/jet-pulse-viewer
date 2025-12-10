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

interface PlaceDetails {
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    weekday_text?: string[];
  };
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

// Top 10 most popular venues in Charlotte, NC metropolitan area
const CHARLOTTE_TOP_VENUES = [
  { name: "Merchant & Trade", category: "Rooftop Bar" },
  { name: "The Punch Room", category: "Cocktail Bar" },
  { name: "Heirloom Restaurant", category: "Restaurant" },
  { name: "Supperland", category: "Restaurant" },
  { name: "Haberdish", category: "Restaurant" },
  { name: "Seoul Food Meat Company", category: "Restaurant" },
  { name: "The Crunkleton", category: "Cocktail Bar" },
  { name: "The Velvet Rope", category: "Nightclub" },
  { name: "Fahrenheit", category: "Restaurant" },
  { name: "Angeline's", category: "Restaurant" },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { location, radius = 8000, categories = ['bar', 'restaurant', 'night_club', 'cafe'] } = await req.json();
    
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      throw new Error('Google Places API key not configured');
    }

    // Charlotte coordinates
    const charlotteLocation = location || { lat: 35.2271, lng: -80.8431 };

    console.log(`Fetching top 10 Charlotte venues with full addresses...`);

    const venues = [];

    // Search for each popular venue by name to get exact place data
    for (const venue of CHARLOTTE_TOP_VENUES) {
      try {
        // Use Text Search to find the specific venue
        const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
        searchUrl.searchParams.append('query', `${venue.name} Charlotte NC`);
        searchUrl.searchParams.append('location', `${charlotteLocation.lat},${charlotteLocation.lng}`);
        searchUrl.searchParams.append('radius', radius.toString());
        searchUrl.searchParams.append('key', apiKey);

        const searchResponse = await fetch(searchUrl.toString());
        const searchData = await searchResponse.json();

        if (searchData.status !== 'OK' || !searchData.results?.length) {
          console.log(`Venue not found: ${venue.name}`);
          continue;
        }

        const place = searchData.results[0];

        // Get full place details including formatted address
        const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
        detailsUrl.searchParams.append('place_id', place.place_id);
        detailsUrl.searchParams.append('fields', 'formatted_address,formatted_phone_number,website,opening_hours,geometry');
        detailsUrl.searchParams.append('key', apiKey);

        const detailsResponse = await fetch(detailsUrl.toString());
        const detailsData = await detailsResponse.json();

        const details: PlaceDetails = detailsData.result || {};

        // Calculate activity score based on Google metrics
        const activityScore = Math.min(100, Math.round(
          (place.rating || 4.0) * 12 + 
          Math.min(40, (place.user_ratings_total || 100) / 25)
        ));

        venues.push({
          id: place.place_id,
          name: place.name,
          lat: place.geometry?.location?.lat || details.geometry?.location?.lat,
          lng: place.geometry?.location?.lng || details.geometry?.location?.lng,
          address: details.formatted_address || place.formatted_address || place.vicinity,
          category: venue.category,
          googleRating: place.rating,
          googleTotalRatings: place.user_ratings_total,
          isOpen: place.opening_hours?.open_now ?? null,
          openingHours: details.opening_hours?.weekday_text || [],
          website: details.website,
          phone: details.formatted_phone_number,
          activity: activityScore,
        });

        console.log(`Found: ${place.name} at ${details.formatted_address || place.formatted_address}`);

      } catch (venueError) {
        console.error(`Error fetching venue ${venue.name}:`, venueError);
      }
    }

    // If we found less than 10 named venues, supplement with nearby search
    if (venues.length < 10) {
      console.log(`Only found ${venues.length} named venues, searching for more...`);
      
      const seenPlaceIds = new Set(venues.map(v => v.id));
      
      for (const category of ['bar', 'restaurant', 'night_club']) {
        if (venues.length >= 10) break;
        
        const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
        searchUrl.searchParams.append('location', `${charlotteLocation.lat},${charlotteLocation.lng}`);
        searchUrl.searchParams.append('radius', radius.toString());
        searchUrl.searchParams.append('type', category);
        searchUrl.searchParams.append('key', apiKey);

        const response = await fetch(searchUrl.toString());
        const data = await response.json();

        if (data.status !== 'OK') continue;

        for (const place of data.results) {
          if (venues.length >= 10) break;
          if (seenPlaceIds.has(place.place_id)) continue;
          if (!place.rating || place.rating < 4.0) continue;
          if (!place.user_ratings_total || place.user_ratings_total < 100) continue;
          if (place.business_status !== 'OPERATIONAL') continue;

          seenPlaceIds.add(place.place_id);

          // Get full address details
          const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
          detailsUrl.searchParams.append('place_id', place.place_id);
          detailsUrl.searchParams.append('fields', 'formatted_address,formatted_phone_number,website,opening_hours');
          detailsUrl.searchParams.append('key', apiKey);

          const detailsResponse = await fetch(detailsUrl.toString());
          const detailsData = await detailsResponse.json();
          const details: PlaceDetails = detailsData.result || {};

          let venueCategory = 'Venue';
          if (place.types?.includes('night_club')) venueCategory = 'Nightclub';
          else if (place.types?.includes('bar')) venueCategory = 'Bar';
          else if (place.types?.includes('restaurant')) venueCategory = 'Restaurant';

          venues.push({
            id: place.place_id,
            name: place.name,
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            address: details.formatted_address || place.vicinity,
            category: venueCategory,
            googleRating: place.rating,
            googleTotalRatings: place.user_ratings_total,
            isOpen: place.opening_hours?.open_now ?? null,
            openingHours: details.opening_hours?.weekday_text || [],
            website: details.website,
            phone: details.formatted_phone_number,
            activity: Math.min(100, Math.round(
              (place.rating || 4.0) * 12 + 
              Math.min(40, (place.user_ratings_total || 100) / 25)
            )),
          });

          console.log(`Added supplemental venue: ${place.name}`);
        }
      }
    }

    // Sort by activity score and take top 10
    const topVenues = venues
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 10);

    console.log(`Returning ${topVenues.length} top Charlotte venues with addresses`);

    return new Response(
      JSON.stringify({ venues: topVenues, total: topVenues.length }),
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
