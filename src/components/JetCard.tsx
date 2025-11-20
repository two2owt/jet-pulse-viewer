import { memo } from "react";
import { Clock, MapPin, Users, Star, TrendingUp, X } from "lucide-react";
import { Button } from "./ui/button";
import { OptimizedImage } from "./ui/optimized-image";
import { glideHaptic } from "@/lib/haptics";
import type { Venue } from "./Heatmap";

interface JetCardProps {
  venue: Venue;
  onGetDirections: () => void;
  onClose?: () => void;
}

export const JetCard = memo(({ venue, onGetDirections, onClose }: JetCardProps) => {
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


  const activityLevel = getActivityLevel(venue.activity);

  return (
    <div className="bg-card rounded-xl sm:rounded-2xl overflow-hidden border border-border shadow-[var(--shadow-card)] transition-all duration-300 hover-scale">
      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 bg-background/90 backdrop-blur-md p-1.5 sm:p-2 rounded-full hover:bg-background transition-colors"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground" />
        </button>
      )}
      
      {/* Image Header with Gradient Overlay */}
      <div className="relative h-40 sm:h-48 md:h-56 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 overflow-hidden">
        {venue.imageUrl ? (
          <OptimizedImage
            src={venue.imageUrl} 
            alt={venue.name}
            className="absolute inset-0 w-full h-full object-cover"
            responsive={true}
            responsiveSizes={['small', 'medium', 'large']}
            sizesConfig={{ mobile: '100vw', tablet: '640px', desktop: '800px' }}
            quality={85}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        
        {/* Activity Badge */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-background/90 backdrop-blur-md px-2 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center gap-1 sm:gap-1.5">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full" />
          <span className="text-[10px] sm:text-xs font-bold text-foreground">{venue.activity}% Active</span>
        </div>

        {/* Category Badge */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-muted/90 backdrop-blur-md px-2 py-1 sm:px-3 sm:py-1.5 rounded-full">
          <span className="text-[10px] sm:text-xs font-semibold text-foreground">{venue.category}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
        {/* Title */}
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-1">{venue.name}</h3>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">{venue.neighborhood}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-muted/50 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center hover-scale transition-all">
            <TrendingUp className={`w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-0.5 sm:mb-1 ${activityLevel.color}`} />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Status</p>
            <p className="text-xs sm:text-sm font-bold text-foreground">{activityLevel.label.split(" ")[1]}</p>
          </div>
          
          <div className="bg-muted/50 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center hover-scale transition-all">
            <Star className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-0.5 sm:mb-1 text-warm" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Rating</p>
            <p className="text-xs sm:text-sm font-bold text-foreground">4.5</p>
          </div>
          
          <div className="bg-muted/50 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center hover-scale transition-all">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-0.5 sm:mb-1 text-secondary" />
            <p className="text-[10px] sm:text-xs text-muted-foreground">Crowd</p>
            <p className="text-xs sm:text-sm font-bold text-foreground">{Math.round(venue.activity / 10) * 10}+</p>
          </div>
        </div>

        {/* Current Offer */}
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 rounded-xl p-4 border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground mb-1">Happy Hour Special</p>
              <p className="text-xs text-muted-foreground">$5 cocktails until 7 PM • Today only</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Button 
          onClick={handleGetDirections}
          className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground font-semibold py-6 rounded-xl shadow-[var(--shadow-glow)] transition-all duration-300 hover-scale"
        >
          Get Directions
        </Button>
      </div>
    </div>
  );
});
