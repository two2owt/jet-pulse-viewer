import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dealId, websiteUrl } = await req.json();
    console.log('Scraping images for deal:', dealId, 'from:', websiteUrl);

    if (!dealId || !websiteUrl) {
      throw new Error('dealId and websiteUrl are required');
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    // Scrape the website using Firecrawl
    console.log('Calling Firecrawl API...');
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: websiteUrl,
        formats: ['html'],
        onlyMainContent: false,
      }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error('Firecrawl API error:', errorText);
      throw new Error(`Firecrawl API error: ${scrapeResponse.status}`);
    }

    const scrapeData = await scrapeResponse.json();
    console.log('Scrape successful, processing HTML...');

    // Extract images from HTML
    const html = scrapeData.data?.html || '';
    const imageRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    const images: string[] = [];
    let match;

    while ((match = imageRegex.exec(html)) !== null) {
      const imgSrc = match[1];
      // Filter for likely venue images (larger images, exclude icons/logos)
      if (!imgSrc.includes('icon') && 
          !imgSrc.includes('logo') && 
          !imgSrc.includes('favicon') &&
          (imgSrc.startsWith('http') || imgSrc.startsWith('//'))) {
        const fullUrl = imgSrc.startsWith('//') ? 'https:' + imgSrc : imgSrc;
        images.push(fullUrl);
      }
    }

    console.log(`Found ${images.length} potential venue images`);

    // Select the best image (first one, or could implement smarter selection)
    const selectedImage = images.length > 0 ? images[0] : null;

    if (selectedImage) {
      // Update the deal with the image URL
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabase
        .from('deals')
        .update({ image_url: selectedImage })
        .eq('id', dealId);

      if (updateError) {
        console.error('Error updating deal:', updateError);
        throw updateError;
      }

      console.log('Successfully updated deal with image:', selectedImage);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: selectedImage,
        totalImagesFound: images.length 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error scraping venue images:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
