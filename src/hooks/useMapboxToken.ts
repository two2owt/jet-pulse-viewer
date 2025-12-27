import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const TOKEN_CACHE_KEY = 'mapbox_token_cache';
const TOKEN_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedToken {
  token: string;
  timestamp: number;
}

// Use both localStorage and sessionStorage for better mobile persistence
const getCachedToken = (): string | null => {
  try {
    // Try localStorage first (persists across sessions)
    let cached = localStorage.getItem(TOKEN_CACHE_KEY);
    
    // Fallback to sessionStorage
    if (!cached) {
      cached = sessionStorage.getItem(TOKEN_CACHE_KEY);
    }
    
    if (!cached) return null;
    
    const { token, timestamp }: CachedToken = JSON.parse(cached);
    const isExpired = Date.now() - timestamp > TOKEN_CACHE_DURATION;
    
    if (isExpired) {
      localStorage.removeItem(TOKEN_CACHE_KEY);
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
    // Store in both for redundancy on mobile
    localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(cache));
    sessionStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
};

interface UseMapboxTokenOptions {
  enabled?: boolean;
}

export const useMapboxToken = (options: UseMapboxTokenOptions = {}) => {
  const { enabled = true } = options;
  
  // Initialize synchronously from cache
  const initialCachedToken = getCachedToken();
  const [token, setToken] = useState<string>(initialCachedToken || "");
  const [loading, setLoading] = useState(!initialCachedToken && enabled);
  const [error, setError] = useState<string | null>(null);
  const fetchStartedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchToken = useCallback(async () => {
    // Check cache first
    const cachedToken = getCachedToken();
    if (cachedToken) {
      console.log('useMapboxToken: Using cached token');
      setToken(cachedToken);
      setLoading(false);
      setError(null);
      return;
    }
    
    console.log('useMapboxToken: No cached token, fetching from edge function...');
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase.functions.invoke("get-mapbox-token");

      if (fetchError) {
        console.error('useMapboxToken: Error fetching token:', fetchError);
        throw fetchError;
      }
      
      if (!data || !data.token) {
        console.error('useMapboxToken: No token received from edge function');
        throw new Error('No token received');
      }
      
      console.log('useMapboxToken: Successfully fetched token');
      setCachedToken(data.token);
      setToken(data.token);
      setError(null);
    } catch (err) {
      console.error('useMapboxToken: Fetch failed:', err);
      setError("Failed to load map. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch token on mount if not cached
  useEffect(() => {
    if (!enabled) return;
    if (token) return; // Already have a token
    if (fetchStartedRef.current) return; // Already started fetching
    
    fetchStartedRef.current = true;
    
    // Set a timeout - if fetch takes too long, show an error instead of infinite loading
    timeoutRef.current = setTimeout(() => {
      if (loading && !token) {
        console.error('useMapboxToken: Fetch timeout, still loading after 15 seconds');
        setLoading(false);
        setError("Map loading timed out. Please refresh the page.");
      }
    }, 15000);
    
    fetchToken().finally(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    });
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, token, fetchToken, loading]);

  return { token, loading: enabled ? loading : false, error, refetch: fetchToken };
};
