import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const TOKEN_CACHE_KEY = 'mapbox_token_cache';
const TOKEN_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedToken {
  token: string;
  timestamp: number;
}

const getCachedToken = (): string | null => {
  try {
    const cached = sessionStorage.getItem(TOKEN_CACHE_KEY);
    if (!cached) return null;
    
    const { token, timestamp }: CachedToken = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > TOKEN_CACHE_DURATION;
    
    if (isExpired) {
      sessionStorage.removeItem(TOKEN_CACHE_KEY);
      return null;
    }
    
    return token;
  } catch {
    return null;
  }
};

const setCachedToken = (token: string): void => {
  try {
    const cache: CachedToken = { token, timestamp: Date.now() };
    sessionStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
};

export const useMapboxToken = () => {
  const [token, setToken] = useState<string>(() => getCachedToken() || "");
  const [loading, setLoading] = useState(() => !getCachedToken());
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    // Check cache first
    const cachedToken = getCachedToken();
    if (cachedToken) {
      setToken(cachedToken);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("get-mapbox-token");
      
      if (error) {
        console.error('Error fetching Mapbox token:', error);
        throw error;
      }
      
      if (!data || !data.token) {
        console.error('No token received from edge function');
        throw new Error('No token received');
      }
      
      setCachedToken(data.token);
      setToken(data.token);
    } catch (err) {
      console.error("Error fetching Mapbox token:", err);
      setError("Failed to load map");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // If we have a cached token, we're already done
    if (token && !loading) return;
    
    fetchToken();
  }, [fetchToken, token, loading]);

  return { token, loading, error, refetch: fetchToken };
};
