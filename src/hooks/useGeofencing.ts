import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GeofenceResult {
  current_neighborhood: {
    id: string;
    name: string;
    description: string;
  } | null;
  entered_new_neighborhood: boolean;
  deals: Array<{
    id: string;
    title: string;
    description: string;
    venue_name: string;
    deal_type: string;
  }>;
  notifications_triggered: number;
}

export const useGeofencing = (enabled: boolean = true) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentNeighborhood, setCurrentNeighborhood] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const requestLocationPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      setPermissionStatus(result.state);
      
      result.addEventListener('change', () => {
        setPermissionStatus(result.state);
      });

      if (result.state === 'granted') {
        return true;
      } else if (result.state === 'prompt') {
        // Try to get location to trigger permission prompt
        return new Promise<boolean>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            () => resolve(false)
          );
        });
      }
      return false;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const checkGeofence = async (latitude: number, longitude: number, accuracy: number) => {
    try {
      const { data, error } = await supabase.functions.invoke<GeofenceResult>('check-geofence', {
        body: { latitude, longitude, accuracy },
      });

      if (error) throw error;

      if (data.current_neighborhood) {
        setCurrentNeighborhood(data.current_neighborhood.name);
      } else {
        setCurrentNeighborhood(null);
      }

      // Show in-app notifications for new deals (push is handled server-side)
      if (data.entered_new_neighborhood && data.deals.length > 0) {
        toast.success(`Welcome to ${data.current_neighborhood?.name}!`, {
          description: `${data.deals.length} active ${data.deals.length === 1 ? 'deal' : 'deals'} nearby`,
        });

        // Show first deal notification after a short delay
        const firstDeal = data.deals[0];
        setTimeout(() => {
          toast(firstDeal.title, {
            description: `${firstDeal.description} at ${firstDeal.venue_name}`,
            duration: 5000,
            action: {
              label: "View",
              onClick: () => {
                window.location.href = `/?deal=${firstDeal.id}`;
              },
            },
          });
        }, 1000);

        // Show additional deals if there are more
        if (data.deals.length > 1) {
          setTimeout(() => {
            toast.info(`${data.deals.length - 1} more ${data.deals.length === 2 ? 'deal' : 'deals'} nearby`, {
              description: "Tap to explore all deals",
              action: {
                label: "Explore",
                onClick: () => {
                  window.location.href = "/?tab=explore";
                },
              },
            });
          }, 3000);
        }
      }

      return data;
    } catch (error) {
      console.error('Error checking geofence:', error);
      throw error;
    }
  };

  const startTracking = async () => {
    const hasPermission = await requestLocationPermission();
    
    if (!hasPermission) {
      toast.error('Location access denied', {
        description: 'Enable location permissions to receive nearby deals',
      });
      return false;
    }

    if (watchIdRef.current !== null) {
      return true; // Already tracking
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        try {
          await checkGeofence(latitude, longitude, accuracy || 0);
        } catch (error) {
          console.error('Error in geofence check:', error);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Location tracking error', {
          description: 'Could not access your location',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000, // Cache position for 30 seconds
      }
    );

    watchIdRef.current = watchId;
    setIsTracking(true);
    
    toast.success('Location tracking enabled', {
      description: 'You\'ll receive notifications for nearby deals',
    });

    return true;
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
      setCurrentNeighborhood(null);
      
      toast.info('Location tracking disabled');
    }
  };

  useEffect(() => {
    if (enabled) {
      startTracking();
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled]);

  return {
    isTracking,
    currentNeighborhood,
    permissionStatus,
    startTracking,
    stopTracking,
  };
};
