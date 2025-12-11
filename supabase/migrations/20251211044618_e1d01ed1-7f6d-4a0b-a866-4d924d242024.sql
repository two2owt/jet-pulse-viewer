-- Enable RLS on discoverable_profiles view and add authentication-required policy
ALTER VIEW public.discoverable_profiles SET (security_invoker = true);

-- Grant access to authenticated users only (revoke from anon)
REVOKE ALL ON public.discoverable_profiles FROM anon;
REVOKE ALL ON public.discoverable_profiles FROM public;
GRANT SELECT ON public.discoverable_profiles TO authenticated;

-- Enable RLS on profiles_secure view (should already have security_invoker, but ensure it)
ALTER VIEW public.profiles_secure SET (security_invoker = true);

-- Revoke access from anonymous users and ensure only authenticated can access
REVOKE ALL ON public.profiles_secure FROM anon;
REVOKE ALL ON public.profiles_secure FROM public;
GRANT SELECT ON public.profiles_secure TO authenticated;

-- Add explicit RLS policies using a wrapper approach for views
-- Since views inherit RLS from underlying tables, we ensure the base profiles table has proper RLS
-- The profiles table already has RLS enabled, so the view respects those policies

-- Add a comment to document the security model
COMMENT ON VIEW public.discoverable_profiles IS 'Public profile discovery view - requires authentication. Shows only users who have discoverable=true. Access restricted to authenticated users via GRANT permissions.';

COMMENT ON VIEW public.profiles_secure IS 'Secure profile view with privacy filtering - requires authentication. Shows profile data respecting privacy_settings. Access restricted to authenticated users via GRANT permissions and underlying profiles table RLS policies.';