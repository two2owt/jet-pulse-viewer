/**
 * Utility to clear cached Mapbox token
 * This is useful when the token has been updated or there are loading issues
 */
export const clearMapboxTokenCache = (): void => {
  try {
    localStorage.removeItem('mapbox_token_cache');
    sessionStorage.removeItem('mapbox_token_cache');
    console.log('✅ Mapbox token cache cleared');
  } catch (error) {
    console.error('Failed to clear Mapbox token cache:', error);
  }
};

// Make it available globally for easy console access
if (typeof window !== 'undefined') {
  (window as any).clearMapboxCache = clearMapboxTokenCache;
}
