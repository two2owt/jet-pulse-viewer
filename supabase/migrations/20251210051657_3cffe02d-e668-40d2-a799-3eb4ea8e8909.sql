-- Drop the existing view
DROP VIEW IF EXISTS public.venue_reviews_public;

-- Recreate view with security_invoker = true (uses caller's permissions, not definer's)
CREATE OR REPLACE VIEW public.venue_reviews_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  venue_id,
  venue_name,
  rating,
  review_text,
  created_at,
  updated_at
FROM public.venue_reviews;

-- Grant SELECT on the view to anonymous and authenticated users
GRANT SELECT ON public.venue_reviews_public TO anon, authenticated;