-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;

-- Create a new policy that restricts profile visibility to:
-- 1. The user's own profile
-- 2. Profiles of accepted connections
CREATE POLICY "Users can view connected profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.user_connections
    WHERE status = 'accepted'
    AND (
      (user_id = auth.uid() AND friend_id = profiles.id)
      OR (friend_id = auth.uid() AND user_id = profiles.id)
    )
  )
);