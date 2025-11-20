import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useMapboxToken = () => {
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        console.log('Fetching Mapbox token...');
        const { data, error } = await supabase.functions.invoke("get-mapbox-token");
        
        if (error) {
          console.error('Error fetching Mapbox token:', error);
          throw error;
        }
        
        if (!data || !data.token) {
          console.error('No token received from edge function');
          throw new Error('No token received');
        }
        
        console.log('Mapbox token fetched successfully');
        setToken(data.token);
      } catch (err) {
        console.error("Error fetching Mapbox token:", err);
        setError("Failed to load map");
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, []);

  return { token, loading, error };
};
