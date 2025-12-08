import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationPoint {
  latitude: number;
  longitude: number;
  created_at: string;
  user_id: string;
}

interface MovementPath {
  from: [number, number];
  to: [number, number];
  frequency: number;
  users: string[];
}

// Calculate distance between two points in meters using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Snap coordinates to a grid to group nearby movements
function snapToGrid(lat: number, lng: number, gridSize = 0.001): [number, number] {
  return [
    Math.round(lat / gridSize) * gridSize,
    Math.round(lng / gridSize) * gridSize
  ];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role client to aggregate ALL users' location data
    // This is safe as the function only returns aggregated path data, not individual locations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching user location data for movement analysis (all users)...');

    // Parse query parameters for filtering
    const url = new URL(req.url);
    const timeFilter = url.searchParams.get('time_filter') || 'all';
    const minFrequency = parseInt(url.searchParams.get('min_frequency') || '2');

    // Build query with time filter using service client
    let query = serviceClient
      .from('user_locations')
      .select('latitude, longitude, created_at, user_id')
      .order('user_id')
      .order('created_at');

    // Apply time filtering
    const now = new Date();
    if (timeFilter === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      query = query.gte('created_at', startOfDay.toISOString());
    } else if (timeFilter === 'this_week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      query = query.gte('created_at', startOfWeek.toISOString());
    } else if (timeFilter === 'this_hour') {
      const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      query = query.gte('created_at', startOfHour.toISOString());
    }

    const { data: locations, error } = await query;

    if (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }

    console.log(`Processing ${locations?.length || 0} location points from all users...`);

    // Group locations by user and identify movements
    const userPaths = new Map<string, LocationPoint[]>();
    
    for (const location of locations || []) {
      const userId = location.user_id || 'anonymous';
      if (!userPaths.has(userId)) {
        userPaths.set(userId, []);
      }
      userPaths.get(userId)!.push({
        latitude: parseFloat(String(location.latitude)),
        longitude: parseFloat(String(location.longitude)),
        created_at: location.created_at,
        user_id: userId,
      });
    }

    // Analyze movements between locations
    const pathKey = (from: [number, number], to: [number, number]) => 
      `${from[0]},${from[1]}->${to[0]},${to[1]}`;
    
    const movements = new Map<string, MovementPath>();

    for (const [userId, userLocations] of userPaths) {
      // Sort by timestamp
      userLocations.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      for (let i = 0; i < userLocations.length - 1; i++) {
        const current = userLocations[i];
        const next = userLocations[i + 1];

        // Skip invalid coordinates
        if (isNaN(current.latitude) || isNaN(current.longitude) || 
            isNaN(next.latitude) || isNaN(next.longitude)) {
          continue;
        }

        // Calculate distance between points
        const distance = calculateDistance(
          current.latitude,
          current.longitude,
          next.latitude,
          next.longitude
        );

        // Only consider significant movements (50m to 10km - filters noise and unrealistic jumps)
        if (distance > 50 && distance < 10000) {
          // Snap to grid for grouping
          const fromSnapped = snapToGrid(current.latitude, current.longitude);
          const toSnapped = snapToGrid(next.latitude, next.longitude);
          
          const key = pathKey(
            [fromSnapped[1], fromSnapped[0]], // [lng, lat] for GeoJSON
            [toSnapped[1], toSnapped[0]]
          );

          if (!movements.has(key)) {
            movements.set(key, {
              from: [fromSnapped[1], fromSnapped[0]],
              to: [toSnapped[1], toSnapped[0]],
              frequency: 0,
              users: []
            });
          }

          const movement = movements.get(key)!;
          movement.frequency++;
          if (!movement.users.includes(userId)) {
            movement.users.push(userId);
          }
        }
      }
    }

    // Filter by minimum frequency
    const filteredMovements = Array.from(movements.values())
      .filter(m => m.frequency >= minFrequency);

    console.log(`Found ${filteredMovements.length} movement paths with frequency >= ${minFrequency}`);

    // Convert to GeoJSON format
    const features = filteredMovements.map(movement => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [movement.from, movement.to]
      },
      properties: {
        frequency: movement.frequency,
        unique_users: movement.users.length,
        weight: Math.min(movement.frequency / 2, 10) // Normalize weight for visualization
      }
    }));

    const geojson = {
      type: 'FeatureCollection',
      features
    };

    // Calculate statistics
    const stats = {
      total_paths: filteredMovements.length,
      total_movements: filteredMovements.reduce((sum, m) => sum + m.frequency, 0),
      unique_users: new Set(filteredMovements.flatMap(m => m.users)).size,
      max_frequency: Math.max(...filteredMovements.map(m => m.frequency), 0),
      avg_frequency: filteredMovements.length > 0 
        ? filteredMovements.reduce((sum, m) => sum + m.frequency, 0) / filteredMovements.length 
        : 0
    };

    console.log('Movement path statistics:', stats);

    return new Response(
      JSON.stringify({ geojson, stats }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in get-movement-paths function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
