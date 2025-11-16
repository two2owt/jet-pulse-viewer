-- Add website_url and image_url columns to deals table
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deals_venue_id ON public.deals(venue_id);