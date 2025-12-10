import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting: 15 requests per minute per IP
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 15;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now >= entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }
  
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count, resetIn: entry.resetTime - now };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now >= entry.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check rate limit
  const clientIp = getRateLimitKey(req);
  const rateLimit = checkRateLimit(clientIp);
  
  const rateLimitHeaders = {
    ...corsHeaders,
    'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(rateLimit.resetIn / 1000).toString(),
  };

  if (!rateLimit.allowed) {
    console.warn(`Rate limit exceeded for IP: ${clientIp}`);
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: { ...rateLimitHeaders, 'Content-Type': 'application/json', 'Retry-After': Math.ceil(rateLimit.resetIn / 1000).toString() },
      }
    );
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
        headers: { ...rateLimitHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-location-density:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...rateLimitHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
