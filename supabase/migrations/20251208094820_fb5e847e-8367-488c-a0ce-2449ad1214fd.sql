-- Update the notify_admin_of_new_deal function to pass the webhook secret
CREATE OR REPLACE FUNCTION public.notify_admin_of_new_deal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  webhook_secret TEXT;
  supabase_url TEXT;
BEGIN
  -- Get the webhook secret from vault or app settings
  webhook_secret := current_setting('app.settings.notify_admin_hook_secret', true);
  supabase_url := current_setting('app.settings.supabase_url', true);
  
  -- Call the edge function with the secret in Authorization header
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/notify-admin-new-deal',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || webhook_secret
    ),
    body := jsonb_build_object('record', to_jsonb(NEW))
  );
  
  RETURN NEW;
END;
$function$;