-- Add social media columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN instagram_url TEXT,
ADD COLUMN twitter_url TEXT,
ADD COLUMN facebook_url TEXT,
ADD COLUMN linkedin_url TEXT,
ADD COLUMN tiktok_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.instagram_url IS 'User Instagram profile URL';
COMMENT ON COLUMN public.profiles.twitter_url IS 'User Twitter/X profile URL';
COMMENT ON COLUMN public.profiles.facebook_url IS 'User Facebook profile URL';
COMMENT ON COLUMN public.profiles.linkedin_url IS 'User LinkedIn profile URL';
COMMENT ON COLUMN public.profiles.tiktok_url IS 'User TikTok profile URL';