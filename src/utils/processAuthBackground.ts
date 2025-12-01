import { supabase } from "@/integrations/supabase/client";
import authBackgroundOriginal from "@/assets/auth-background.webp";

export const processAuthBackground = async (): Promise<string> => {
  try {
    console.log('Processing auth background to remove watermark...');
    
    // Fetch the original image
    const response = await fetch(authBackgroundOriginal);
    const blob = await response.blob();
    
    // Convert to base64
    const reader = new FileReader();
    const imageDataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Call edge function to remove watermark
    const { data, error } = await supabase.functions.invoke('remove-image-watermark', {
      body: { imageUrl: imageDataUrl }
    });

    if (error) throw error;

    if (!data?.imageUrl) {
      throw new Error('No processed image returned');
    }

    console.log('Watermark removed successfully');
    return data.imageUrl;

  } catch (error) {
    console.error('Error processing background:', error);
    // Return original if processing fails
    return authBackgroundOriginal;
  }
};
