-- Add location data consent tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS location_consent_given boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS location_consent_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS data_processing_consent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS data_processing_consent_date timestamp with time zone;

-- Create function to obfuscate coordinates (reduce precision to ~100m radius)
-- This prevents exact location tracking while maintaining neighborhood-level accuracy
CREATE OR REPLACE FUNCTION public.obfuscate_coordinates(lat numeric, lng numeric)
RETURNS TABLE(obfuscated_lat numeric, obfuscated_lng numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Round to 3 decimal places (~111m precision) and add small random offset
  RETURN QUERY SELECT 
    ROUND(lat, 3) + (RANDOM() * 0.001 - 0.0005)::numeric,
    ROUND(lng, 3) + (RANDOM() * 0.001 - 0.0005)::numeric;
END;
$$;

-- Create function to automatically obfuscate location data older than 7 days
-- and delete data older than 30 days
CREATE OR REPLACE FUNCTION public.process_location_data_retention()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete location data older than 30 days (data retention limit)
  DELETE FROM public.user_locations
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Obfuscate location data older than 7 days but newer than 30 days
  -- This reduces precision for historical data while maintaining recent accuracy
  UPDATE public.user_locations
  SET 
    latitude = ROUND(latitude, 3),
    longitude = ROUND(longitude, 3),
    accuracy = GREATEST(accuracy, 100) -- Minimum 100m accuracy for older data
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND created_at >= NOW() - INTERVAL '30 days'
    AND accuracy IS NOT NULL 
    AND accuracy < 100;
    
  RAISE NOTICE 'Location data retention processing completed at %', NOW();
END;
$$;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create comment to document the security measures
COMMENT ON TABLE public.user_locations IS 'User location data with automatic 30-day retention limit and 7-day obfuscation policy for privacy protection. See process_location_data_retention() function.';

COMMENT ON COLUMN public.profiles.location_consent_given IS 'User explicitly consented to location tracking during signup or in settings';
COMMENT ON COLUMN public.profiles.data_processing_consent IS 'User consented to data processing and privacy policy terms';