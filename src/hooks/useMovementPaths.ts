import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MovementPathData {
  geojson: any;
  stats: {
    total_paths: number;
    total_movements: number;
    unique_users: number;
    max_frequency: number;
    avg_frequency: number;
  };
}

interface MovementPathFilters {
  timeFilter?: 'all' | 'today' | 'this_week' | 'this_hour';
  minFrequency?: number;
}

export const useMovementPaths = (filters: MovementPathFilters = {}) => {
  const [pathData, setPathData] = useState<MovementPathData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPathData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters.timeFilter) params.append('time_filter', filters.timeFilter);
      if (filters.minFrequency !== undefined) params.append('min_frequency', filters.minFrequency.toString());

      const queryString = params.toString();
      const path = queryString ? `get-movement-paths?${queryString}` : 'get-movement-paths';

      const { data, error: functionError } = await supabase.functions.invoke(path);

      if (functionError) throw functionError;
      
      setPathData(data);
      setError(null);
    } catch (err) {
      console.error('Error loading movement path data:', err);
      setError('Failed to load movement paths');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPathData();

    // Set up realtime subscription to user_locations
    const channel = supabase
      .channel('movement-path-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_locations',
        },
        () => {
          console.log('New location added, refreshing movement paths');
          loadPathData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters.timeFilter, filters.minFrequency]);

  return { pathData, loading, error, refresh: loadPathData };
};
