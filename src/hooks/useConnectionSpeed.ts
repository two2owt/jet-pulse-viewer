import { useState, useEffect } from 'react';

type EffectiveConnectionType = '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';

interface ConnectionInfo {
  effectiveType: EffectiveConnectionType;
  saveData: boolean;
  downlink: number; // Mbps
  rtt: number; // Round-trip time in ms
}

interface NetworkInfo extends EventTarget {
  effectiveType?: EffectiveConnectionType;
  saveData?: boolean;
  downlink?: number;
  rtt?: number;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInfo;
  mozConnection?: NetworkInfo;
  webkitConnection?: NetworkInfo;
}

const getConnection = (): NetworkInfo | undefined => {
  const nav = navigator as NavigatorWithConnection;
  return nav.connection || nav.mozConnection || nav.webkitConnection;
};

const getConnectionInfo = (): ConnectionInfo => {
  const connection = getConnection();
  
  if (!connection) {
    // Default to 4g if API not supported (assume good connection)
    return {
      effectiveType: 'unknown',
      saveData: false,
      downlink: 10,
      rtt: 50,
    };
  }
  
  return {
    effectiveType: connection.effectiveType || 'unknown',
    saveData: connection.saveData || false,
    downlink: connection.downlink || 10,
    rtt: connection.rtt || 50,
  };
};

/**
 * Determines preload distances based on connection speed
 * Returns distances in pixels for preload and render thresholds
 */
export const getPreloadDistances = (connectionInfo: ConnectionInfo) => {
  const { effectiveType, saveData, downlink } = connectionInfo;
  
  // If save-data is enabled, minimize preloading
  if (saveData) {
    return {
      preloadDistance: 100,  // Only preload when very close
      renderDistance: 50,   // Render when almost visible
      shouldPreloadExtras: false,
    };
  }
  
  // Adjust based on effective connection type
  switch (effectiveType) {
    case '4g':
      // Fast connection: aggressive preloading
      return {
        preloadDistance: downlink > 5 ? 800 : 500, // Even more aggressive on very fast connections
        renderDistance: 150,
        shouldPreloadExtras: true,
      };
    
    case '3g':
      // Moderate connection: balanced approach
      return {
        preloadDistance: 300,
        renderDistance: 100,
        shouldPreloadExtras: false,
      };
    
    case '2g':
    case 'slow-2g':
      // Slow connection: minimal preloading to save bandwidth
      return {
        preloadDistance: 100,
        renderDistance: 50,
        shouldPreloadExtras: false,
      };
    
    case 'unknown':
    default:
      // Unknown: use moderate defaults
      return {
        preloadDistance: 500,
        renderDistance: 100,
        shouldPreloadExtras: true,
      };
  }
};

/**
 * Hook that provides connection-aware preload distances
 * Updates when connection quality changes
 */
export const useConnectionSpeed = () => {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>(getConnectionInfo);
  
  useEffect(() => {
    const connection = getConnection();
    if (!connection) return;
    
    const handleChange = () => {
      setConnectionInfo(getConnectionInfo());
    };
    
    connection.addEventListener('change', handleChange);
    return () => connection.removeEventListener('change', handleChange);
  }, []);
  
  const distances = getPreloadDistances(connectionInfo);
  
  return {
    connectionInfo,
    ...distances,
    isFastConnection: connectionInfo.effectiveType === '4g' && !connectionInfo.saveData,
    isSlowConnection: ['2g', 'slow-2g'].includes(connectionInfo.effectiveType) || connectionInfo.saveData,
  };
};

export default useConnectionSpeed;
