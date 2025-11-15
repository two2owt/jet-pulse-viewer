import { MapPin, Clock, Gift, TrendingUp } from "lucide-react";

interface Notification {
  id: string;
  type: "offer" | "event" | "trending";
  title: string;
  message: string;
  venue: string;
  timestamp: string;
  distance?: string;
}

export const NotificationCard = ({ notification }: { notification: Notification }) => {
  const getIcon = () => {
    switch (notification.type) {
      case "offer":
        return <Gift className="w-5 h-5 text-primary" />;
      case "event":
        return <Clock className="w-5 h-5 text-secondary" />;
      case "trending":
        return <TrendingUp className="w-5 h-5 text-warm" />;
    }
  };

  const getGradient = () => {
    switch (notification.type) {
      case "offer":
        return "from-primary/10 to-primary-glow/10";
      case "event":
        return "from-secondary/10 to-secondary/10";
      case "trending":
        return "from-warm/10 to-hot/10";
    }
  };

  return (
    <div className={`bg-gradient-to-r ${getGradient()} rounded-xl p-4 border border-border/50`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-card rounded-full flex items-center justify-center flex-shrink-0 border border-border">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-foreground mb-1">{notification.title}</h4>
          <p className="text-xs text-muted-foreground mb-2">{notification.message}</p>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{notification.venue}</span>
            </div>
            
            {notification.distance && (
              <span className="text-primary font-medium">{notification.distance}</span>
            )}
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground flex-shrink-0">
          {notification.timestamp}
        </div>
      </div>
    </div>
  );
};

export type { Notification };
