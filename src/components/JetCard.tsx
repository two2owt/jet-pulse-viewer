import { memo, useState, useEffect } from "react";
import { MapPin, Users, Star, TrendingUp, X, Share2 } from "lucide-react";
import { Button } from "./ui/button";
import { OptimizedImage } from "./ui/optimized-image";
import { glideHaptic } from "@/lib/haptics";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Venue } from "./MapboxHeatmap";
import { UpgradePrompt, useFeatureAccess } from "./UpgradePrompt";

interface JetCardProps {
  venue: Venue;
  onGetDirections: () => void;
  onClose?: () => void;
}

export const JetCard = memo(({ venue, onGetDirections, onClose }: JetCardProps) => {
  const [user, setUser] = useState<any>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const { canAccessSocialFeatures } = useFeatureAccess();
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getActivityLevel = (activity: number) => {
    if (activity >= 80) return { label: "🔥 Very Busy", color: "text-hot" };
    if (activity >= 60) return { label: "🌟 Busy", color: "text-warm" };
    if (activity >= 40) return { label: "✨ Moderate", color: "text-cool" };
    return { label: "😌 Quiet", color: "text-cold" };
  };


  const handleGetDirections = async () => {
    await glideHaptic(); // Smooth gliding haptic feedback
    onGetDirections();
  };

  const handleShare = async () => {
    // Check if user has JET+ subscription for sharing
    if (!canAccessSocialFeatures()) {
      setShowUpgradePrompt(true);
      return;
    }

    await glideHaptic();
    
    const shareUrl = venue.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`
      : `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`;
    
    const shareText = venue.address 
      ? `Check out ${venue.name} at ${venue.address}!`
      : `Check out ${venue.name} in ${venue.neighborhood}!`;

    // Use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: venue.name,
          text: shareText,
          url: shareUrl,
        });
        toast.success("Shared successfully!", {
          description: `${venue.name} shared with others`,
        });
      } catch (error) {
        // User cancelled or share failed
        if ((error as Error).name !== "AbortError") {
          console.error("Error sharing:", error);
          toast.error("Couldn't share", {
            description: "Please try again",
          });
        }
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast.success("Copied to clipboard!", {
          description: "Share link copied - paste it anywhere",
        });
      } catch (error) {
        console.error("Error copying to clipboard:", error);
        toast.error("Couldn't share", {
          description: "Please try again",
        });
      }
    }
  };


  const activityLevel = getActivityLevel(venue.activity);

  return (
    <article 
      className="bg-card rounded-3xl sm:rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-border shadow-[var(--shadow-card)] transition-all duration-300 hover-scale flex flex-col max-h-[calc(100dvh-var(--header-total-height)-var(--bottom-nav-total-height)-2rem)]"
      aria-label={`${venue.name} - ${venue.category} in ${venue.neighborhood}`}
    >
      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 bg-background/90 backdrop-blur-md p-2 sm:p-2.5 rounded-full hover:bg-background transition-colors touch-manipulation"
          aria-label="Close"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
        </button>
      )}
      
      {/* Image Header with Gradient Overlay - Fixed height, doesn't scroll */}
      <div className="relative h-32 sm:h-40 md:h-48 flex-shrink-0 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 overflow-hidden">
        {venue.imageUrl ? (
          <OptimizedImage
            src={venue.imageUrl} 
            alt={venue.name}
            className="absolute inset-0 w-full h-full object-cover"
            responsive={true}
            responsiveSizes={['small', 'medium', 'large']}
            sizesConfig={{ mobile: '100vw', tablet: '640px', desktop: '800px' }}
            quality={85}
            aspectRatio="16/10"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        
        {/* Activity Badge */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-background/90 backdrop-blur-md px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full flex items-center gap-1.5 sm:gap-2">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-primary rounded-full animate-pulse" />
          <span className="text-xs sm:text-sm font-bold text-foreground">{venue.activity}% Active</span>
        </div>

        {/* Category Badge */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-muted/90 backdrop-blur-md px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full">
          <span className="text-xs sm:text-sm font-semibold text-foreground">{venue.category}</span>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5">
          {/* Title */}
          <div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1.5 sm:mb-2">{venue.name}</h3>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="text-sm sm:text-base">{venue.neighborhood}</span>
              </div>
              {venue.address && (
                <p className="text-xs sm:text-sm text-muted-foreground/80 pl-6 sm:pl-7">{venue.address}</p>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
            <div className="bg-muted/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center hover-scale transition-all">
              <TrendingUp className={`w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-1.5 ${activityLevel.color}`} />
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Status</p>
              <p className="text-sm sm:text-base md:text-lg font-bold text-foreground">{activityLevel.label.split(" ")[1]}</p>
            </div>
            
            <div className="bg-muted/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center hover-scale transition-all">
              <Star className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-1.5 text-warm" />
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Rating</p>
              <p className="text-sm sm:text-base md:text-lg font-bold text-foreground">4.5</p>
            </div>
            
            <div className="bg-muted/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center hover-scale transition-all">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-1.5 text-secondary" />
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Crowd</p>
              <p className="text-sm sm:text-base md:text-lg font-bold text-foreground">{Math.round(venue.activity / 10) * 10}+</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Fixed at bottom, doesn't scroll */}
      <div className="flex-shrink-0 p-4 sm:p-5 md:p-6 pt-0 sm:pt-0 md:pt-0">
        <div className="grid grid-cols-2 gap-3 sm:gap-4" role="group" aria-label="Venue actions">
          <Button 
            onClick={handleShare}
            variant="outline"
            className="w-full border-border/60 hover:border-primary/60 hover:bg-primary/5 font-semibold h-12 sm:h-14 md:h-16 text-sm sm:text-base rounded-xl sm:rounded-2xl transition-all duration-300 hover-scale focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Share ${venue.name}`}
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" aria-hidden="true" />
            Share
          </Button>
          <Button 
            onClick={handleGetDirections}
            className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground font-semibold h-12 sm:h-14 md:h-16 text-sm sm:text-base rounded-xl sm:rounded-2xl shadow-[var(--shadow-glow)] transition-all duration-300 hover-scale focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Get directions to ${venue.name}`}
          >
            Get Directions
          </Button>
        </div>
      </div>

      <UpgradePrompt
        requiredTier="jet_plus"
        featureName="Venue sharing"
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
      />
    </article>
  );
});
