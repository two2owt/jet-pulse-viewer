-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.venue_reviews;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can view reviews"
ON public.venue_reviews
FOR SELECT
TO authenticated
USING (true);

-- Create a safe public view that excludes user_id for anonymous display
CREATE OR REPLACE VIEW public.venue_reviews_public AS
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