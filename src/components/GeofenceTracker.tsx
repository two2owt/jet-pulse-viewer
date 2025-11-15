import { useGeofencing } from "@/hooks/useGeofencing";
import { MapPin, AlertCircle, CheckCircle, Navigation } from "lucide-react";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const GeofenceTracker = () => {
  const { isTracking, currentNeighborhood, permissionStatus, startTracking, stopTracking } = useGeofencing(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getStatusIcon = () => {
    if (!isAuthenticated) {
      return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
    if (isTracking) {
      return <CheckCircle className="w-5 h-5 text-primary pulse-glow" />;
    }
    return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (!isAuthenticated) {
      return "Sign in to enable";
    }
    if (isTracking && currentNeighborhood) {
      return currentNeighborhood;
    }
    if (isTracking) {
      return "Tracking location...";
    }
    return "Tracking disabled";
  };

  const handleToggleTracking = () => {
    if (!isAuthenticated) {
      return;
    }
    
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  return (
    <div className="bg-card/90 backdrop-blur-xl rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Location Tracking</h3>
        </div>
        {getStatusIcon()}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Navigation className="w-4 h-4" />
          <span>{getStatusText()}</span>
        </div>

        <Button
          onClick={handleToggleTracking}
          disabled={!isAuthenticated}
          variant={isTracking ? "secondary" : "default"}
          className="w-full"
          size="sm"
        >
          {!isAuthenticated ? "Sign In Required" : isTracking ? "Stop Tracking" : "Start Tracking"}
        </Button>

        {!isAuthenticated && (
          <p className="text-xs text-muted-foreground text-center">
            Create an account to receive notifications for nearby deals
          </p>
        )}

        {isTracking && (
          <p className="text-xs text-muted-foreground text-center">
            You'll receive notifications when you enter neighborhoods with active deals
          </p>
        )}
      </div>
    </div>
  );
};
