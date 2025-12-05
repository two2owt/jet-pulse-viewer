-- Create a secure view that enforces privacy settings at the database level
-- This ensures field-level privacy is enforced even if application code has bugs

CREATE OR REPLACE VIEW public.profiles_secure AS
SELECT 
  p.id,
  p.display_name,
  p.avatar_url,
  p.created_at,
  p.updated_at,
  p.onboarding_completed,
  -- Only show sensitive fields based on privacy settings and viewer relationship
  CASE 
    WHEN p.id = auth.uid() THEN p.bio
    WHEN COALESCE((p.privacy_settings->>'show_bio')::boolean, true) THEN p.bio
    ELSE NULL
  END AS bio,
  CASE 
    WHEN p.id = auth.uid() THEN p.birthdate
    WHEN COALESCE((p.privacy_settings->>'show_birthdate')::boolean, false) THEN p.birthdate
    ELSE NULL
  END AS birthdate,
  CASE 
    WHEN p.id = auth.uid() THEN p.gender
    WHEN COALESCE((p.privacy_settings->>'show_gender')::boolean, true) THEN p.gender
    ELSE NULL
  END AS gender,
  CASE 
    WHEN p.id = auth.uid() THEN p.pronouns
    WHEN COALESCE((p.privacy_settings->>'show_pronouns')::boolean, true) THEN p.pronouns
    ELSE NULL
  END AS pronouns,
  CASE 
    WHEN p.id = auth.uid() THEN p.instagram_url
    WHEN COALESCE((p.privacy_settings->>'show_instagram')::boolean, true) THEN p.instagram_url
    ELSE NULL
  END AS instagram_url,
  CASE 
    WHEN p.id = auth.uid() THEN p.twitter_url
    WHEN COALESCE((p.privacy_settings->>'show_twitter')::boolean, true) THEN p.twitter_url
    ELSE NULL
  END AS twitter_url,
  CASE 
    WHEN p.id = auth.uid() THEN p.facebook_url
    WHEN COALESCE((p.privacy_settings->>'show_facebook')::boolean, true) THEN p.facebook_url
    ELSE NULL
  END AS facebook_url,
  CASE 
    WHEN p.id = auth.uid() THEN p.linkedin_url
    WHEN COALESCE((p.privacy_settings->>'show_linkedin')::boolean, true) THEN p.linkedin_url
    ELSE NULL
  END AS linkedin_url,
  CASE 
    WHEN p.id = auth.uid() THEN p.tiktok_url
    WHEN COALESCE((p.privacy_settings->>'show_tiktok')::boolean, true) THEN p.tiktok_url
    ELSE NULL
  END AS tiktok_url,
  -- Preferences and privacy settings only visible to owner
  CASE 
    WHEN p.id = auth.uid() THEN p.preferences
    ELSE NULL
  END AS preferences,
  CASE 
    WHEN p.id = auth.uid() THEN p.privacy_settings
    ELSE NULL
  END AS privacy_settings,
  -- Consent fields only visible to owner
  CASE 
    WHEN p.id = auth.uid() THEN p.location_consent_given
    ELSE NULL
  END AS location_consent_given,
  CASE 
    WHEN p.id = auth.uid() THEN p.location_consent_date
    ELSE NULL
  END AS location_consent_date,
  CASE 
    WHEN p.id = auth.uid() THEN p.data_processing_consent
    ELSE NULL
  END AS data_processing_consent,
  CASE 
    WHEN p.id = auth.uid() THEN p.data_processing_consent_date
    ELSE NULL
  END AS data_processing_consent_date
FROM public.profiles p
WHERE 
  -- User can see their own profile
  p.id = auth.uid()
  OR 
  -- Or profiles of accepted connections
  EXISTS (
    SELECT 1 FROM public.user_connections uc
    WHERE uc.status = 'accepted'
    AND (
      (uc.user_id = auth.uid() AND uc.friend_id = p.id)
      OR (uc.friend_id = auth.uid() AND uc.user_id = p.id)
    )
  );

-- Grant access to the view
GRANT SELECT ON public.profiles_secure TO authenticated;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.profiles_secure IS 'Secure view that enforces field-level privacy settings. Always use this view instead of querying profiles directly when displaying data to other users.';