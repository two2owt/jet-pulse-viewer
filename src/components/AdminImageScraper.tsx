import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Image, Loader2 } from "lucide-react";
import { scrapeVenueImage, scrapeAllMissingImages } from "@/utils/scrapeVenueImages";
import { toast } from "sonner";

export const AdminImageScraper = () => {
  const [dealId, setDealId] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isScrapingSingle, setIsScrapingSingle] = useState(false);
  const [isScrapingAll, setIsScrapingAll] = useState(false);

  const handleSingleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dealId || !websiteUrl) {
      toast.error('Please provide both Deal ID and Website URL');
      return;
    }

    setIsScrapingSingle(true);
    
    try {
      const result = await scrapeVenueImage(dealId, websiteUrl);
      
      if (result.success) {
        toast.success(`Image scraped successfully! Found ${result.totalImagesFound} images.`);
        setDealId("");
        setWebsiteUrl("");
      } else {
        toast.error(result.error || 'Failed to scrape image');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to scrape image');
    } finally {
      setIsScrapingSingle(false);
    }
  };

  const handleScrapeAll = async () => {
    setIsScrapingAll(true);
    try {
      await scrapeAllMissingImages();
    } finally {
      setIsScrapingAll(false);
    }
  };

  return (
    <Card className="p-6 space-y-6 bg-card/90 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Image className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Venue Image Scraper</h2>
      </div>

      <div className="space-y-4">
        {/* Scrape All Button */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-3">
            Scrape images for all venues that have a website URL but no image.
          </p>
          <Button
            onClick={handleScrapeAll}
            disabled={isScrapingAll}
            className="w-full"
          >
            {isScrapingAll ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scraping All Venues...
              </>
            ) : (
              <>
                <Image className="w-4 h-4 mr-2" />
                Scrape All Missing Images
              </>
            )}
          </Button>
        </div>

        {/* Manual Single Scrape */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-3">
            Or scrape a single venue by providing the deal ID and website URL.
          </p>
          <form onSubmit={handleSingleScrape} className="space-y-3">
            <Input
              type="text"
              placeholder="Deal ID"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              className="bg-background"
            />
            <Input
              type="url"
              placeholder="Website URL (e.g., https://venue.com)"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="bg-background"
            />
            <Button
              type="submit"
              disabled={isScrapingSingle || !dealId || !websiteUrl}
              className="w-full"
              variant="secondary"
            >
              {isScrapingSingle ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Image className="w-4 h-4 mr-2" />
                  Scrape Single Venue
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
};
