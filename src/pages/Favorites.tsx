import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { useNotifications } from "@/hooks/useNotifications";
import { Heart, Loader2, Compass } from "lucide-react";
import { DealCard } from "@/components/DealCard";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

interface Deal {
  id: string;
  title: string;
  venue_name: string;
  description: string;
  deal_type: string;
  image_url: string | null;
  active_days: number[];
  starts_at: string;
  expires_at: string;
}

export default function Favorites() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"map" | "explore" | "notifications" | "favorites" | "social">("favorites");
  const { notifications } = useNotifications();

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

  const { favorites, loading: favoritesLoading } = useFavorites(user?.id);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (!favoritesLoading && favorites.length > 0) {
      fetchFavoriteDeals();
    } else {
      setLoading(false);
    }
  }, [favorites, favoritesLoading, user]);

  const handleTabChange = (tab: "map" | "explore" | "notifications" | "favorites" | "social") => {
    setActiveTab(tab);
    if (tab === "map") {
      navigate("/");
    } else if (tab === "explore") {
      navigate("/?tab=explore");
    } else if (tab === "notifications") {
      navigate("/?tab=notifications");
    } else if (tab === "social") {
      navigate("/social");
    }
  };

  const fetchFavoriteDeals = async () => {
    try {
      const dealIds = favorites.map((fav) => fav.deal_id);
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .in("id", dealIds)
        .eq("active", true);

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error("Error fetching favorite deals:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <>
        <Header 
          venues={[]}
          deals={[]}
          onVenueSelect={() => {}}
        />
        <div className="min-h-screen bg-background pb-20">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <EmptyState
              icon={Heart}
              title="Sign in to view favorites"
              description="Create an account to save and track your favorite deals across all venues"
              actionLabel="Sign In"
              onAction={() => navigate("/auth")}
            />
          </div>
        </div>
        <BottomNav 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          notificationCount={0}
        />
      </>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Header 
        venues={[]}
        deals={[]}
        onVenueSelect={() => {}}
      />
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Favorites</h1>
          <p className="text-muted-foreground">
            {deals.length} {deals.length === 1 ? "deal" : "deals"} saved
          </p>
        </div>

        {deals.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="No favorites yet"
            description="Start exploring and save deals you love! Your favorite venues and offers will appear here."
            actionLabel="Explore Deals"
            onAction={() => navigate("/")}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        )}
        </div>
      </div>
      
      <BottomNav 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        notificationCount={notifications.filter(n => !n.read).length}
      />
    </>
  );
}
