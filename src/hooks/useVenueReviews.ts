import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface VenueReview {
  id: string;
  user_id: string;
  venue_id: string;
  venue_name: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
}

export const useVenueReviews = (venueId?: string, userId?: string) => {
  const [reviews, setReviews] = useState<VenueReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [userReview, setUserReview] = useState<VenueReview | null>(null);

  useEffect(() => {
    if (venueId) {
      fetchReviews();
    } else {
      setLoading(false);
    }
  }, [venueId, userId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("venue_reviews")
        .select("*")
        .eq("venue_id", venueId!)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReviews(data || []);
      
      // Find user's review if exists
      if (userId) {
        const userRev = data?.find((r) => r.user_id === userId);
        setUserReview(userRev || null);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const addReview = async (
    venueId: string,
    venueName: string,
    rating: number,
    reviewText?: string
  ) => {
    if (!userId) return { success: false, error: "User not authenticated" };

    try {
      const { data, error } = await supabase
        .from("venue_reviews")
        .insert({
          user_id: userId,
          venue_id: venueId,
          venue_name: venueName,
          rating,
          review_text: reviewText,
        })
        .select()
        .single();

      if (error) throw error;

      setReviews((prev) => [data, ...prev]);
      setUserReview(data);
      return { success: true, data };
    } catch (error) {
      console.error("Error adding review:", error);
      return { success: false, error };
    }
  };

  const updateReview = async (reviewId: string, rating: number, reviewText?: string) => {
    try {
      const { data, error } = await supabase
        .from("venue_reviews")
        .update({ rating, review_text: reviewText })
        .eq("id", reviewId)
        .select()
        .single();

      if (error) throw error;

      setReviews((prev) =>
        prev.map((review) => (review.id === reviewId ? data : review))
      );
      setUserReview(data);
      return { success: true, data };
    } catch (error) {
      console.error("Error updating review:", error);
      return { success: false, error };
    }
  };

  const deleteReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from("venue_reviews")
        .delete()
        .eq("id", reviewId);

      if (error) throw error;

      setReviews((prev) => prev.filter((review) => review.id !== reviewId));
      setUserReview(null);
      return { success: true };
    } catch (error) {
      console.error("Error deleting review:", error);
      return { success: false, error };
    }
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return {
    reviews,
    loading,
    userReview,
    averageRating,
    addReview,
    updateReview,
    deleteReview,
  };
};
