import { supabase } from "@/integrations/supabase/client";

interface Deal {
  id: string;
  title: string;
  venue_name: string;
  description: string;
}

export const shareDeal = async (deal: Deal, userId: string | undefined) => {
  const shareUrl = `${window.location.origin}/?deal=${deal.id}`;
  const shareText = `Check out this deal: ${deal.title} at ${deal.venue_name}`;

  // Track the share
  if (userId) {
    try {
      await supabase.from("deal_shares").insert({
        user_id: userId,
        deal_id: deal.id,
      });
    } catch (error) {
      console.error("Error tracking share:", error);
    }
  }

  // Use Web Share API if available
  if (navigator.share) {
    try {
      await navigator.share({
        title: deal.title,
        text: shareText,
        url: shareUrl,
      });
      return { success: true, method: "native" };
    } catch (error) {
      // User cancelled or share failed
      if ((error as Error).name !== "AbortError") {
        console.error("Error sharing:", error);
      }
      return { success: false, method: "native" };
    }
  } else {
    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      return { success: true, method: "clipboard" };
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      return { success: false, method: "clipboard" };
    }
  }
};
