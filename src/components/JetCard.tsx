import { Clock, MapPin, Users, Star, TrendingUp, X } from "lucide-react";
import { Button } from "./ui/button";
import type { Venue } from "./Heatmap";

interface JetCardProps {
  venue: Venue;
  onGetDirections: () => void;
  onClose?: () => void;
}

export const JetCard = ({ venue, onGetDirections, onClose }: JetCardProps) => {
  const getActivityLevel = (activity: number) => {
    if (activity >= 80) return { label: "🔥 Very Busy", color: "text-hot" };
    if (activity >= 60) return { label: "🌟 Busy", color: "text-warm" };
    if (activity >= 40) return { label: "✨ Moderate", color: "text-cool" };
    return { label: "😌 Quiet", color: "text-cold" };
  };

  const activityLevel = getActivityLevel(venue.activity);

  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-[var(--shadow-card)] transition-all duration-300 hover-scale">
      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-background/90 backdrop-blur-md p-2 rounded-full hover:bg-background transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-foreground" />
        </button>
      )}
      
      {/* Image Header with Gradient Overlay */}
      <div className="relative h-48 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 overflow-hidden">
        {venue.imageUrl ? (
          <img 
            src={venue.imageUrl} 
            alt={venue.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              // Fallback to emoji if image fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl opacity-50">🍹</div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        
        {/* Activity Badge */}
        <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <div className="w-2 h-2 bg-primary rounded-full" />
          <span className="text-xs font-bold text-foreground">{venue.activity}% Active</span>
        </div>

        {/* Category Badge */}
        <div className="absolute top-3 left-3 bg-muted/90 backdrop-blur-md px-3 py-1.5 rounded-full">
          <span className="text-xs font-semibold text-foreground">{venue.category}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Title */}
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-1">{venue.name}</h3>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{venue.neighborhood}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-xl p-3 text-center hover-scale transition-all">
            <TrendingUp className={`w-5 h-5 mx-auto mb-1 ${activityLevel.color}`} />
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-sm font-bold text-foreground">{activityLevel.label.split(" ")[1]}</p>
          </div>
          
          <div className="bg-muted/50 rounded-xl p-3 text-center hover-scale transition-all">
            <Star className="w-5 h-5 mx-auto mb-1 text-warm" />
            <p className="text-xs text-muted-foreground">Rating</p>
            <p className="text-sm font-bold text-foreground">4.5</p>
          </div>
          
          <div className="bg-muted/50 rounded-xl p-3 text-center hover-scale transition-all">
            <Users className="w-5 h-5 mx-auto mb-1 text-secondary" />
            <p className="text-xs text-muted-foreground">Crowd</p>
            <p className="text-sm font-bold text-foreground">{Math.round(venue.activity / 10) * 10}+</p>
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
          onClick={onGetDirections}
          className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground font-semibold py-6 rounded-xl shadow-[var(--shadow-glow)] transition-all duration-300 hover-scale"
        >
          Get Directions
        </Button>
      </div>
    </div>
  );
};
