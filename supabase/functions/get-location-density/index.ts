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
    // Use service role client to aggregate ALL users' location data
    // This is safe as the function only returns aggregated density data, not individual locations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const timeFilter = url.searchParams.get('time_filter') || 'all';
    const hourOfDay = url.searchParams.get('hour_of_day');
    const dayOfWeek = url.searchParams.get('day_of_week');

    console.log('Fetching location density with filters:', { timeFilter, hourOfDay, dayOfWeek });

    let query = serviceClient
      .from('user_locations')
      .select('latitude, longitude, created_at');

    // Apply time filters
    const now = new Date();
    switch (timeFilter) {
      case 'today':
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query = query.gte('created_at', startOfDay.toISOString());
        break;
      case 'this_week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        query = query.gte('created_at', startOfWeek.toISOString());
        break;
      case 'this_hour':
        const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
        query = query.gte('created_at', startOfHour.toISOString());
        break;
    }

    const { data: locations, error } = await query;

    if (error) throw error;

    console.log(`Found ${locations?.length || 0} location points from all users`);

    // Filter by hour of day or day of week if specified
    let filteredLocations = locations || [];
    
    if (hourOfDay !== null && hourOfDay !== undefined) {
      const targetHour = parseInt(hourOfDay);
      filteredLocations = filteredLocations.filter(loc => {
        const locHour = new Date(loc.created_at).getHours();
        return locHour === targetHour;
      });
    }

    if (dayOfWeek !== null && dayOfWeek !== undefined) {
      const targetDay = parseInt(dayOfWeek);
      filteredLocations = filteredLocations.filter(loc => {
        const locDay = new Date(loc.created_at).getDay();
        return locDay === targetDay;
      });
    }

    // Create density grid - aggregate locations into grid cells for heatmap
    // Using smaller grid for more detailed visualization
    const gridSize = 0.003; // ~300m grid cells for finer granularity
    const densityMap = new Map<string, number>();

    filteredLocations.forEach(loc => {
      const lat = parseFloat(String(loc.latitude));
      const lng = parseFloat(String(loc.longitude));
      if (isNaN(lat) || isNaN(lng)) return;
      
      const gridLat = Math.floor(lat / gridSize) * gridSize;
      const gridLng = Math.floor(lng / gridSize) * gridSize;
      const key = `${gridLat.toFixed(6)},${gridLng.toFixed(6)}`;
      densityMap.set(key, (densityMap.get(key) || 0) + 1);
    });

    // Convert to GeoJSON format for Mapbox heatmap layer
    const features = Array.from(densityMap.entries()).map(([key, count]) => {
      const [lat, lng] = key.split(',').map(Number);
      return {
        type: 'Feature',
        properties: {
          density: count,
          intensity: Math.min(count / 10, 1), // Normalize to 0-1 for styling
        },
        geometry: {
          type: 'Point',
          coordinates: [lng, lat], // GeoJSON uses [lng, lat] order
        },
      };
    });

    const geojson = {
      type: 'FeatureCollection',
      features,
    };

    // Calculate statistics for UI display
    const densityValues = Array.from(densityMap.values());
    const maxDensity = densityValues.length > 0 ? Math.max(...densityValues) : 0;
    const avgDensity = densityValues.length > 0 
      ? densityValues.reduce((a, b) => a + b, 0) / densityValues.length 
      : 0;

    console.log(`Processed ${features.length} density grid cells, max: ${maxDensity}, avg: ${avgDensity.toFixed(2)}`);

    return new Response(
      JSON.stringify({
        success: true,
        geojson,
        stats: {
          total_points: filteredLocations.length,
          grid_cells: features.length,
          max_density: maxDensity,
          avg_density: avgDensity,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-location-density:', error);
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
