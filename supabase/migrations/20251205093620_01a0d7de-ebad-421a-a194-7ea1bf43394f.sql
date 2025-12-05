-- Add DELETE policy for profiles table (GDPR compliance)
CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = id);

-- Add DELETE policy for user_preferences table (GDPR compliance)
CREATE POLICY "Users can delete their own preferences" 
ON public.user_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Drop the existing profile SELECT policy for connected users (we'll replace it)
DROP POLICY IF EXISTS "Users can view connected profiles" ON public.profiles;

-- Create a function to get privacy-filtered profile data
-- This function respects the privacy_settings of the profile owner
CREATE OR REPLACE FUNCTION public.can_view_profile_field(
  _profile_id uuid,
  _viewer_id uuid,
  _field_name text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _privacy_settings jsonb;
  _is_owner boolean;
  _is_connected boolean;
BEGIN
  -- Owner can always see their own data
  IF _profile_id = _viewer_id THEN
    RETURN true;
  END IF;

  -- Check if users are connected
  SELECT EXISTS (
    SELECT 1 FROM user_connections
    WHERE status = 'accepted'
      AND ((user_id = _viewer_id AND friend_id = _profile_id)
        OR (friend_id = _viewer_id AND user_id = _profile_id))
  ) INTO _is_connected;

  -- If not connected, deny access
  IF NOT _is_connected THEN
    RETURN false;
  END IF;

  -- Get privacy settings
  SELECT privacy_settings INTO _privacy_settings
  FROM profiles WHERE id = _profile_id;

  -- If no privacy settings, default to showing all
  IF _privacy_settings IS NULL THEN
    RETURN true;
  END IF;

  -- Check specific field visibility
  RETURN COALESCE((_privacy_settings->>_field_name)::boolean, true);
END;
$$;

-- Create new SELECT policy that enforces privacy settings
-- Users can view connected profiles but privacy_settings control field visibility
CREATE POLICY "Users can view connected profiles with privacy" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = id) -- Own profile
  OR 
  (EXISTS (
    SELECT 1 FROM user_connections
    WHERE status = 'accepted'
      AND ((user_connections.user_id = auth.uid() AND user_connections.friend_id = profiles.id)
        OR (user_connections.friend_id = auth.uid() AND user_connections.user_id = profiles.id))
  ))
);