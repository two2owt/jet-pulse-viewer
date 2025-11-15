import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DensityData {
  geojson: any;
  stats: {
    total_points: number;
    grid_cells: number;
    max_density: number;
    avg_density: number;
  };
}

interface DensityFilters {
  timeFilter?: 'all' | 'today' | 'this_week' | 'this_hour';
  hourOfDay?: number;
  dayOfWeek?: number;
}

export const useLocationDensity = (filters: DensityFilters = {}) => {
  const [densityData, setDensityData] = useState<DensityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDensityData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters.timeFilter) params.append('time_filter', filters.timeFilter);
      if (filters.hourOfDay !== undefined) params.append('hour_of_day', filters.hourOfDay.toString());
      if (filters.dayOfWeek !== undefined) params.append('day_of_week', filters.dayOfWeek.toString());

      const { data, error: functionError } = await supabase.functions.invoke('get-location-density', {
        method: 'GET',
      });

      if (functionError) throw functionError;
      
      setDensityData(data);
      setError(null);
    } catch (err) {
      console.error('Error loading density data:', err);
      setError('Failed to load density data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDensityData();

    // Set up realtime subscription to user_locations
    const channel = supabase
      .channel('location-density-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_locations',
        },
        () => {
          console.log('New location added, refreshing density data');
          loadDensityData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters.timeFilter, filters.hourOfDay, filters.dayOfWeek]);

  return { densityData, loading, error, refresh: loadDensityData };
};
