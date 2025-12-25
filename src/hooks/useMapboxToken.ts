import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const TOKEN_CACHE_KEY = 'mapbox_token_cache';
const TOKEN_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedToken {
  token: string;
  timestamp: number;
}

const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  let timeoutId: number | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error("Request timed out")), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
};

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
  const [token, setToken] = useState<string>(() => getCachedToken() || "");
  const [loading, setLoading] = useState(() => enabled && !getCachedToken());
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    // Check cache first
    const cachedToken = getCachedToken();
    if (cachedToken) {
      setToken(cachedToken);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    // Retry logic for mobile network issues
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data, error } = await withTimeout(
          supabase.functions.invoke("get-mapbox-token"),
          10000
        );

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
        setError(null);
        setLoading(false);
        return;
      } catch (err) {
        console.error(`Mapbox token fetch attempt ${attempt + 1} failed:`, err);
        lastError = err as Error;
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
    
    // All retries failed
    console.error("All Mapbox token fetch attempts failed:", lastError);
    setError("Failed to load map. Please check your connection.");
    setLoading(false);
  }, []);

  useEffect(() => {
    // Don't fetch if not enabled
    if (!enabled) return;
    
    // If we have a cached token, we're already done
    if (token && !loading) return;
    
    fetchToken();
  }, [fetchToken, token, loading, enabled]);

  return { token, loading: enabled ? loading : false, error, refetch: fetchToken };
};
