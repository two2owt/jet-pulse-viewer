import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useRemoveWatermark = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const removeWatermark = async (imageFile: File): Promise<string | null> => {
    setIsProcessing(true);
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      toast.loading("Removing watermark...");

      const { data, error } = await supabase.functions.invoke('remove-image-watermark', {
        body: { imageUrl: imageDataUrl }
      });

      if (error) throw error;

      if (!data?.imageUrl) {
        throw new Error('No image returned');
      }

      // Convert base64 back to blob
      const base64Response = await fetch(data.imageUrl);
      const blob = await base64Response.blob();

      // Create object URL for the cleaned image
      const cleanImageUrl = URL.createObjectURL(blob);

      toast.success("Watermark removed successfully!");
      return cleanImageUrl;

    } catch (error) {
      console.error('Error removing watermark:', error);
      toast.error("Failed to remove watermark");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return { removeWatermark, isProcessing };
};
