
-- Revoke anonymous access to profiles_secure view for defense-in-depth
REVOKE ALL ON public.profiles_secure FROM anon;

-- Ensure only authenticated users can access the view
GRANT SELECT ON public.profiles_secure TO authenticated;

-- Add review text length constraint to fix another open finding
ALTER TABLE public.venue_reviews 
ADD CONSTRAINT review_text_length CHECK (length(review_text) <= 1000);
