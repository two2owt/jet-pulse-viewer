import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Bell, MapPin, Radio, Loader2, Save, Sun, Moon, Monitor } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useTheme } from "next-themes";

const preferencesSchema = z.object({
  notifications_enabled: z.boolean(),
  location_tracking_enabled: z.boolean(),
  background_tracking_enabled: z.boolean(),
});

interface UserPreferences {
  id: string;
  user_id: string;
  notifications_enabled: boolean;
  location_tracking_enabled: boolean;
  background_tracking_enabled: boolean;
}

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationTrackingEnabled, setLocationTrackingEnabled] = useState(false);
  const [backgroundTrackingEnabled, setBackgroundTrackingEnabled] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        // If no preferences exist, create default ones
        if (error.code === 'PGRST116') {
          await createDefaultPreferences(session.user.id);
          return;
        }
        throw error;
      }

      if (data) {
        setPreferences(data);
        setNotificationsEnabled(data.notifications_enabled);
        setLocationTrackingEnabled(data.location_tracking_enabled);
        setBackgroundTrackingEnabled(data.background_tracking_enabled);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultPreferences = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          notifications_enabled: true,
          location_tracking_enabled: false,
          background_tracking_enabled: true,
        })
        .select()
        .single();

      if (error) throw error;

      setPreferences(data);
      setNotificationsEnabled(data.notifications_enabled);
      setLocationTrackingEnabled(data.location_tracking_enabled);
      setBackgroundTrackingEnabled(data.background_tracking_enabled);
    } catch (error) {
      console.error('Error creating preferences:', error);
      toast.error('Failed to initialize settings');
    }
  };

  const handleSaveSettings = async () => {
    if (!preferences) return;

    // Validate preferences
    try {
      preferencesSchema.parse({
        notifications_enabled: notificationsEnabled,
        location_tracking_enabled: locationTrackingEnabled,
        background_tracking_enabled: backgroundTrackingEnabled,
      });
    } catch (error) {
      toast.error('Invalid settings');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({
          notifications_enabled: notificationsEnabled,
          location_tracking_enabled: locationTrackingEnabled,
          background_tracking_enabled: backgroundTrackingEnabled,
        })
        .eq('user_id', preferences.user_id);

      if (error) throw error;

      toast.success('Settings saved successfully');
      loadPreferences();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="hover:bg-muted"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold text-foreground">Settings</h1>
            </div>
          </div>
        </header>
        
        <main className="max-w-lg mx-auto px-4 py-6">
          <Card className="p-6 text-center">
            <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Please sign in to access settings</p>
            <Button onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Settings</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Notifications Section */}
        <Card className="p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Notifications</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage how you receive alerts and updates
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <label htmlFor="notifications" className="text-sm font-medium text-foreground">
                  Push Notifications
                </label>
                <p className="text-xs text-muted-foreground">
                  Receive notifications about deals and events near you
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>
          </div>
        </Card>

        {/* Theme Section */}
        <Card className="p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Appearance</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Choose how the app looks
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <button
              onClick={() => setTheme("light")}
              className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                theme === "light" 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Sun className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium text-foreground">Light</div>
                  <div className="text-xs text-muted-foreground">Bright theme for daytime</div>
                </div>
              </div>
              {theme === "light" && (
                <div className="w-4 h-4 rounded-full bg-primary" />
              )}
            </button>

            <button
              onClick={() => setTheme("dark")}
              className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                theme === "dark" 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium text-foreground">Dark</div>
                  <div className="text-xs text-muted-foreground">Dark theme for nighttime</div>
                </div>
              </div>
              {theme === "dark" && (
                <div className="w-4 h-4 rounded-full bg-primary" />
              )}
            </button>

            <button
              onClick={() => setTheme("system")}
              className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                theme === "system" 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium text-foreground">Auto</div>
                  <div className="text-xs text-muted-foreground">Matches your device theme</div>
                </div>
              </div>
              {theme === "system" && (
                <div className="w-4 h-4 rounded-full bg-primary" />
              )}
            </button>
          </div>
        </Card>

        {/* Location Section */}
        <Card className="p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Location</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Control how the app uses your location
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <label htmlFor="location-tracking" className="text-sm font-medium text-foreground">
                  Location Tracking
                </label>
                <p className="text-xs text-muted-foreground">
                  Allow the app to track your location for nearby deals
                </p>
              </div>
              <Switch
                id="location-tracking"
                checked={locationTrackingEnabled}
                onCheckedChange={setLocationTrackingEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1 flex-1">
                <label htmlFor="background-tracking" className="text-sm font-medium text-foreground">
                  Background Tracking
                </label>
                <p className="text-xs text-muted-foreground">
                  Continue tracking location when app is in background
                </p>
              </div>
              <Switch
                id="background-tracking"
                checked={backgroundTrackingEnabled}
                onCheckedChange={setBackgroundTrackingEnabled}
                disabled={!locationTrackingEnabled}
              />
            </div>
          </div>
        </Card>

        {/* Privacy Info */}
        <Card className="p-6 bg-muted">
          <div className="flex items-start gap-3">
            <Radio className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="space-y-2 flex-1">
              <h3 className="text-sm font-medium text-foreground">Privacy Notice</h3>
              <p className="text-xs text-muted-foreground">
                Your location data is used solely to provide personalized recommendations and notifications. 
                We never share your data with third parties without your explicit consent.
              </p>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="w-full"
          size="lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </main>
    </div>
  );
};

export default Settings;
