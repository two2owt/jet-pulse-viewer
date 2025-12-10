import { useEffect, useState, useRef, useCallback } from "react";
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
  const lastDataHashRef = useRef<string>('');
  const isLoadingRef = useRef(false);

  const loadDensityData = useCallback(async () => {
    // Prevent concurrent requests
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters.timeFilter) params.append('time_filter', filters.timeFilter);
      if (filters.hourOfDay !== undefined) params.append('hour_of_day', filters.hourOfDay.toString());
      if (filters.dayOfWeek !== undefined) params.append('day_of_week', filters.dayOfWeek.toString());

      const queryString = params.toString();
      const path = queryString ? `get-location-density?${queryString}` : 'get-location-density';

      const { data, error: functionError } = await supabase.functions.invoke(path);

      if (functionError) throw functionError;
      
      // Only update state if data actually changed
      const dataHash = JSON.stringify(data?.stats);
      if (dataHash !== lastDataHashRef.current) {
        lastDataHashRef.current = dataHash;
        setDensityData(data);
      }
      setError(null);
    } catch (err) {
      console.error('Error loading density data:', err);
      setError('Failed to load density data');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [filters.timeFilter, filters.hourOfDay, filters.dayOfWeek]);

  useEffect(() => {
    loadDensityData();

    // Set up realtime subscription with debounce
    let debounceTimer: NodeJS.Timeout;
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
          // Debounce to prevent rapid re-fetching
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            console.log('New location added, refreshing density data');
            loadDensityData();
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [loadDensityData]);

  return { densityData, loading, error, refresh: loadDensityData };
};
