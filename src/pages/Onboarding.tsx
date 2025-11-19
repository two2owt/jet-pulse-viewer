import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Zap, MapPin, Sparkles, Loader2, Upload } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const DEAL_TYPES = ["Food", "Drinks", "Nightlife", "Events"];

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Step 1: Profile
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Step 2: Preferences
  const [selectedDealTypes, setSelectedDealTypes] = useState<string[]>(DEAL_TYPES);
  const [trendingVenues, setTrendingVenues] = useState(true);
  const [activityInArea, setActivityInArea] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      
      // Check if already completed onboarding
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", session.user.id)
        .single();
      
      if (profile?.onboarding_completed) {
        navigate("/");
      }
    };
    
    checkAuth();
  }, [navigate]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image too large", { description: "Please select an image under 5MB" });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStep1Next = async () => {
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }
    
    setIsLoading(true);
    try {
      let avatarUrl = null;
      
      // Upload avatar if provided
      if (avatarFile && userId) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        avatarUrl = publicUrl;
      }
      
      // Use upsert to handle cases where profile might not exist yet
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          display_name: displayName,
          bio: bio || null,
          avatar_url: avatarUrl,
        }, {
          onConflict: 'id'
        });
      
      if (error) throw error;
      
      setStep(2);
    } catch (error: any) {
      toast.error("Failed to save profile", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Next = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          preferences: {
            dealTypes: selectedDealTypes,
            trendingVenues,
            activityInArea,
          },
        }, {
          onConflict: 'id'
        });
      
      if (error) throw error;
      
      setStep(3);
    } catch (error: any) {
      toast.error("Failed to save preferences", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          onboarding_completed: true
        }, {
          onConflict: 'id'
        });
      
      if (error) throw error;
      
      toast.success("Welcome to JET Charlotte!", { description: "Let's discover what's hot" });
      navigate("/");
    } catch (error: any) {
      toast.error("Failed to complete onboarding", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDealType = (type: string) => {
    setSelectedDealTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary-glow rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[var(--shadow-glow)]">
            <Zap className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {step === 1 && "Create User Profile"}
            {step === 2 && "Set Personal Preferences"}
            {step === 3 && "Review Suggestions"}
          </h1>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s === step ? "w-8 bg-primary" : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="space-y-6 bg-card border border-border rounded-2xl p-6">
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-muted border-2 border-border flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                  <Upload className="w-4 h-4 text-primary-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Upload profile picture</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="Enter your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio (Optional)</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">{bio.length}/200</p>
            </div>

            <Button
              onClick={handleStep1Next}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground font-semibold py-6 rounded-xl"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Next"}
            </Button>
          </div>
        )}

        {/* Step 2: Preferences */}
        {step === 2 && (
          <div className="space-y-6 bg-card border border-border rounded-2xl p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-base mb-3 block">What interests you?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DEAL_TYPES.map((type) => (
                    <Button
                      key={type}
                      variant={selectedDealTypes.includes(type) ? "default" : "outline"}
                      onClick={() => toggleDealType(type)}
                      className="h-12"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <Label className="text-base">Live Discovery</Label>
                
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Trending Venues</p>
                      <p className="text-xs text-muted-foreground">See what's popular now</p>
                    </div>
                  </div>
                  <Switch
                    checked={trendingVenues}
                    onCheckedChange={setTrendingVenues}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Activity in Your Area</p>
                      <p className="text-xs text-muted-foreground">Get location-based alerts</p>
                    </div>
                  </div>
                  <Switch
                    checked={activityInArea}
                    onCheckedChange={setActivityInArea}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleStep2Next}
                disabled={isLoading || selectedDealTypes.length === 0}
                className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground font-semibold"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Next"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Suggestions */}
        {step === 3 && (
          <div className="space-y-6 bg-card border border-border rounded-2xl p-6">
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-primary/20 to-primary-glow/20 rounded-xl p-6 border border-primary/30">
                <Sparkles className="w-12 h-12 text-primary mb-4 mx-auto" />
                <h3 className="text-xl font-bold text-center mb-2">All Set!</h3>
                <p className="text-center text-muted-foreground">
                  Based on your preferences, we'll show you the best deals in Charlotte
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Your Preferences:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDealTypes.map((type) => (
                    <span
                      key={type}
                      className="px-3 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full"
                    >
                      {type}
                    </span>
                  ))}
                </div>
                {trendingVenues && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Trending venues enabled
                  </p>
                )}
                {activityInArea && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Location-based alerts enabled
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={handleComplete}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground font-semibold py-6 rounded-xl"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Get Started"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
