import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ScrapeResult {
  success: boolean;
  imageUrl?: string;
  totalImagesFound?: number;
  error?: string;
}

export async function scrapeVenueImage(
  dealId: string,
  websiteUrl: string
): Promise<ScrapeResult> {
  try {
    console.log('Initiating venue image scrape for deal:', dealId);
    
    const { data, error } = await supabase.functions.invoke('scrape-venue-images', {
      body: { dealId, websiteUrl }
    });

    if (error) {
      console.error('Error calling scrape function:', error);
      throw error;
    }

    console.log('Scrape result:', data);
    return data as ScrapeResult;
  } catch (error) {
    console.error('Error scraping venue image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scrape venue image'
    };
  }
}

export async function scrapeAllMissingImages() {
  try {
    // Get all deals that have website_url but no image_url
    const { data: deals, error } = await supabase
      .from('deals')
      .select('id, website_url')
      .not('website_url', 'is', null)
      .is('image_url', null);

    if (error) throw error;

    if (!deals || deals.length === 0) {
      toast.info('No deals need image scraping');
      return;
    }

    toast.info(`Starting to scrape images for ${deals.length} venues...`);
    
    let successCount = 0;
    let failCount = 0;

    // Scrape images sequentially to avoid rate limiting
    for (const deal of deals) {
      const result = await scrapeVenueImage(deal.id, deal.website_url!);
      
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }

      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    toast.success(`Scraped ${successCount} images successfully${failCount > 0 ? `, ${failCount} failed` : ''}`);
  } catch (error) {
    console.error('Error scraping all images:', error);
    toast.error('Failed to scrape images');
  }
}
