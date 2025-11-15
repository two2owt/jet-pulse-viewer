import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from JWT
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { latitude, longitude, accuracy } = await req.json();

    console.log('Checking geofence for user:', user.id, 'at', latitude, longitude);

    // Get all active neighborhoods
    const { data: neighborhoods, error: neighborhoodsError } = await supabaseClient
      .from('neighborhoods')
      .select('*')
      .eq('active', true);

    if (neighborhoodsError) throw neighborhoodsError;

    // Check if user is inside any neighborhood (using simple bounding box check)
    let currentNeighborhood = null;
    for (const neighborhood of neighborhoods) {
      const boundaryPoints = neighborhood.boundary_points as number[][];
      
      // Simple point-in-polygon check using ray casting
      if (isPointInPolygon(latitude, longitude, boundaryPoints)) {
        currentNeighborhood = neighborhood;
        break;
      }
    }

    console.log('Current neighborhood:', currentNeighborhood?.name || 'none');

    // Get user's last known location
    const { data: lastLocation } = await supabaseClient
      .from('user_locations')
      .select('current_neighborhood_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Save current location
    await supabaseClient.from('user_locations').insert({
      user_id: user.id,
      latitude,
      longitude,
      accuracy,
      current_neighborhood_id: currentNeighborhood?.id || null,
    });

    // Check if user entered a new neighborhood
    const enteredNewNeighborhood = 
      currentNeighborhood && 
      (!lastLocation || lastLocation.current_neighborhood_id !== currentNeighborhood.id);

    let dealsToNotify = [];

    if (enteredNewNeighborhood) {
      console.log('User entered new neighborhood:', currentNeighborhood.name);

      // Get active deals in this neighborhood
      const now = new Date().toISOString();
      const dayOfWeek = new Date().getDay();

      const { data: deals, error: dealsError } = await supabaseClient
        .from('deals')
        .select('*')
        .eq('neighborhood_id', currentNeighborhood.id)
        .eq('active', true)
        .lte('starts_at', now)
        .gte('expires_at', now)
        .contains('active_days', [dayOfWeek]);

      if (!dealsError && deals && deals.length > 0) {
        console.log('Found', deals.length, 'active deals');
        dealsToNotify = deals;

        // Log notifications (don't send duplicates within last hour)
        for (const deal of deals) {
          // Check if we already sent this notification recently
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const { data: recentNotif } = await supabaseClient
            .from('notification_logs')
            .select('id')
            .eq('user_id', user.id)
            .eq('deal_id', deal.id)
            .gte('sent_at', oneHourAgo)
            .maybeSingle();

          if (!recentNotif) {
            await supabaseClient.from('notification_logs').insert({
              user_id: user.id,
              deal_id: deal.id,
              neighborhood_id: currentNeighborhood.id,
              notification_type: deal.deal_type,
              title: `🔥 ${deal.title}`,
              message: `${deal.description} at ${deal.venue_name}`,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        current_neighborhood: currentNeighborhood,
        entered_new_neighborhood: enteredNewNeighborhood,
        deals: dealsToNotify,
        notifications_triggered: dealsToNotify.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in check-geofence:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Ray casting algorithm for point-in-polygon test
function isPointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
