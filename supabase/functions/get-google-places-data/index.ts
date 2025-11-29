import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeId, fields = ['rating', 'user_ratings_total', 'reviews', 'opening_hours', 'current_opening_hours'] } = await req.json();
    
    if (!placeId) {
      throw new Error('placeId is required');
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY not configured');
    }

    console.log(`Fetching Google Places data for place ID: ${placeId}`);

    // Use Google Places API (New) - Place Details
    const fieldsParam = fields.join(',');
    const url = `https://places.googleapis.com/v1/places/${placeId}?fields=${fieldsParam}&key=${apiKey}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Places API error:', response.status, errorText);
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log(`Successfully fetched data for place ${placeId}`);

    // Extract and format the data
    const formattedData = {
      rating: data.rating || null,
      totalRatings: data.userRatingsTotal || 0,
      reviews: data.reviews?.slice(0, 5).map((review: any) => ({
        author: review.authorAttribution?.displayName || 'Anonymous',
        rating: review.rating || 0,
        text: review.text?.text || '',
        time: review.publishTime || null,
      })) || [],
      isOpen: data.currentOpeningHours?.openNow || null,
      openingHours: data.openingHours?.weekdayDescriptions || [],
    };

    return new Response(
      JSON.stringify(formattedData),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in get-google-places-data function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        rating: null,
        totalRatings: 0,
        reviews: [],
        isOpen: null,
        openingHours: []
      }),
      { 
        status: 200, // Return 200 with empty data to allow graceful fallback
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
