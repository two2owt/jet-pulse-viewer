import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Favorite {
  id: string;
  user_id: string;
  deal_id: string;
  created_at: string;
}

export const useFavorites = (userId: string | undefined) => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchFavorites();
    } else {
      setFavorites([]);
      setLoading(false);
    }
  }, [userId]);

  const fetchFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from("user_favorites")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      toast({
        title: "Error",
        description: "Failed to load favorites",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isFavorite = (dealId: string) => {
    return favorites.some((fav) => fav.deal_id === dealId);
  };

  const toggleFavorite = async (dealId: string) => {
    if (!userId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save favorites",
        variant: "destructive",
      });
      return;
    }

    const favorite = favorites.find((fav) => fav.deal_id === dealId);

    try {
      if (favorite) {
        // Remove favorite
        const { error } = await supabase
          .from("user_favorites")
          .delete()
          .eq("id", favorite.id);

        if (error) throw error;

        setFavorites(favorites.filter((fav) => fav.id !== favorite.id));
        toast({
          title: "Removed from favorites",
          description: "Deal removed from your favorites",
        });
      } else {
        // Add favorite
        const { data, error } = await supabase
          .from("user_favorites")
          .insert({ user_id: userId, deal_id: dealId })
          .select()
          .single();

        if (error) throw error;

        setFavorites([data, ...favorites]);
        toast({
          title: "Added to favorites",
          description: "Deal saved to your favorites",
        });
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    }
  };

  return {
    favorites,
    loading,
    isFavorite,
    toggleFavorite,
    refetch: fetchFavorites,
  };
};
