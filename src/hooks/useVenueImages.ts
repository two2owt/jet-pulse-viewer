import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface VenueImage {
  venue_name: string;
  image_url: string | null;
}

export const useVenueImages = () => {
  const [venueImages, setVenueImages] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Small defer to not block critical render, but still load early
    const timer = setTimeout(() => {
      loadVenueImages();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const loadVenueImages = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('venue_name, image_url')
        .not('image_url', 'is', null)
        .eq('active', true);

      if (error) throw error;

      const imageMap = new Map<string, string>();
      data?.forEach((deal: VenueImage) => {
        if (deal.image_url && !imageMap.has(deal.venue_name)) {
          imageMap.set(deal.venue_name, deal.image_url);
        }
      });

      setVenueImages(imageMap);
    } catch (error) {
      console.error('Error loading venue images:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVenueImage = (venueName: string): string | undefined => {
    return venueImages.get(venueName);
  };

  return { venueImages, getVenueImage, loading };
};
