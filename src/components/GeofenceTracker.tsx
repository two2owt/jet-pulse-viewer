import { useGeofencing } from "@/hooks/useGeofencing";
import { MapPin, AlertCircle, CheckCircle, Navigation, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export const GeofenceTracker = () => {
  const { isTracking, currentNeighborhood, permissionStatus, startTracking, stopTracking } = useGeofencing(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [backgroundTracking, setBackgroundTracking] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Location Tracking Settings</DialogTitle>
                <DialogDescription>
                  Customize your location tracking preferences
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications" className="text-base">
                      Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts for nearby deals
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="background" className="text-base">
                      Background Tracking
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Track location when app is closed
                    </p>
                  </div>
                  <Switch
                    id="background"
                    checked={backgroundTracking}
                    onCheckedChange={setBackgroundTracking}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="tracking" className="text-base">
                      Location Tracking
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Enable real-time location tracking
                    </p>
                  </div>
                  <Switch
                    id="tracking"
                    checked={isTracking}
                    onCheckedChange={handleToggleTracking}
                    disabled={!isAuthenticated}
                  />
                </div>

                {!isAuthenticated && (
                  <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                    Sign in to enable location tracking features
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
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

        {isTracking && notificationsEnabled && (
          <p className="text-xs text-muted-foreground text-center">
            You'll receive notifications when you enter neighborhoods with active deals
          </p>
        )}
      </div>
    </div>
  );
};
