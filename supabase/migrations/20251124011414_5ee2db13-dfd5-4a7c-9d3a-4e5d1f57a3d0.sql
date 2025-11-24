-- Grant admin role to specific email addresses
-- This runs after users sign up, so we'll need to handle it via a function

-- First, let's create a function that will be called to check and assign admin roles
CREATE OR REPLACE FUNCTION public.assign_admin_role_if_authorized()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  authorized_emails TEXT[] := ARRAY[
    'creativebreakroominfo@gmail.com',
    'hodgesb02@gmail.com', 
    'ed43gamble@gmail.com'
  ];
BEGIN
  -- Get the user's email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- If the email is in the authorized list, assign admin role
  IF user_email = ANY(authorized_emails) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to automatically assign admin role on profile creation
DROP TRIGGER IF EXISTS assign_admin_on_profile_creation ON public.profiles;
CREATE TRIGGER assign_admin_on_profile_creation
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_admin_role_if_authorized();

-- Also run it for existing users with those emails
DO $$
DECLARE
  admin_user RECORD;
  authorized_emails TEXT[] := ARRAY[
    'creativebreakroominfo@gmail.com',
    'hodgesb02@gmail.com',
    'ed43gamble@gmail.com'
  ];
BEGIN
  FOR admin_user IN 
    SELECT id FROM auth.users WHERE email = ANY(authorized_emails)
  LOOP
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END $$;