import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { useNotifications } from "@/hooks/useNotifications";
import { Heart, Loader2 } from "lucide-react";
import { DealCard } from "@/components/DealCard";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";

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
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold text-foreground">Sign in to view favorites</h2>
          <p className="text-muted-foreground">
            Create an account to save and track your favorite deals
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
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
          <div className="text-center py-12">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No favorites yet</h2>
            <p className="text-muted-foreground mb-6">
              Start exploring and save deals you love!
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Explore Deals
            </button>
          </div>
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
