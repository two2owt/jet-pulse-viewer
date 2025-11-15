import { useState } from "react";
import { Heatmap, type Venue } from "@/components/Heatmap";
import { JetCard } from "@/components/JetCard";
import { BottomNav } from "@/components/BottomNav";
import { NotificationCard, type Notification } from "@/components/NotificationCard";
import { Zap } from "lucide-react";
import { toast } from "sonner";

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "offer",
    title: "🎉 Flash Deal Alert",
    message: "$3 beers for the next hour",
    venue: "Wooden Robot Brewery",
    timestamp: "2m ago",
    distance: "0.3 mi"
  },
  {
    id: "2",
    type: "trending",
    title: "🔥 Getting Busy",
    message: "Crowd levels rising fast",
    venue: "Rooftop 210",
    timestamp: "15m ago",
    distance: "0.5 mi"
  },
  {
    id: "3",
    type: "event",
    title: "🎵 Live Music Starting",
    message: "Local band performing at 8 PM",
    venue: "NoDa Brewing",
    timestamp: "1h ago",
    distance: "1.2 mi"
  }
];

const Index = () => {
  const [activeTab, setActiveTab] = useState<"map" | "explore" | "notifications" | "profile">("map");
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  const handleVenueSelect = (venue: Venue) => {
    setSelectedVenue(venue);
    toast.success(`Selected ${venue.name}`, {
      description: `${venue.activity}% active in ${venue.neighborhood}`
    });
  };

  const handleGetDirections = () => {
    toast.success("Opening directions...", {
      description: `Navigate to ${selectedVenue?.name}`
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-xl border-b border-border sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-primary to-primary-glow rounded-xl flex items-center justify-center shadow-[var(--shadow-glow)]">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">JET</h1>
                <p className="text-xs text-muted-foreground">Charlotte</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="bg-muted/50 px-3 py-1.5 rounded-full">
                <p className="text-xs font-semibold text-foreground">8:42 PM</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {activeTab === "map" && (
          <>
            {/* Heatmap */}
            <div className="h-[400px] rounded-2xl overflow-hidden">
              <Heatmap onVenueSelect={handleVenueSelect} />
            </div>

            {/* Selected Venue Card */}
            {selectedVenue && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <JetCard venue={selectedVenue} onGetDirections={handleGetDirections} />
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-xl p-4 border border-border text-center">
                <p className="text-2xl font-bold text-primary mb-1">24</p>
                <p className="text-xs text-muted-foreground">Venues Nearby</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border text-center">
                <p className="text-2xl font-bold text-warm mb-1">8</p>
                <p className="text-xs text-muted-foreground">Active Deals</p>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border text-center">
                <p className="text-2xl font-bold text-secondary mb-1">3</p>
                <p className="text-xs text-muted-foreground">Live Events</p>
              </div>
            </div>
          </>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Notifications</h2>
              <p className="text-sm text-muted-foreground">Stay updated with nearby deals and events</p>
            </div>
            
            {mockNotifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))}
          </div>
        )}

        {activeTab === "explore" && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Discover Charlotte</h2>
            <p className="text-sm text-muted-foreground">Explore trending spots and hidden gems</p>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-r from-primary to-primary-glow rounded-full mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Your Profile</h2>
            <p className="text-sm text-muted-foreground">Track your favorite spots and rewards</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        notificationCount={mockNotifications.length}
      />
    </div>
  );
};

export default Index;
