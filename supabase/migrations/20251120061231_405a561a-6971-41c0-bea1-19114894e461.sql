-- Fix search path for notify_admin_of_new_deal function
CREATE OR REPLACE FUNCTION notify_admin_of_new_deal()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call the edge function to send email notification
  PERFORM net.http_post(
    url := (SELECT current_setting('app.settings.supabase_url', true)) || '/functions/v1/notify-admin-new-deal',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.supabase_anon_key', true))
    ),
    body := jsonb_build_object('record', to_jsonb(NEW))
  );
  
  RETURN NEW;
END;
$$;