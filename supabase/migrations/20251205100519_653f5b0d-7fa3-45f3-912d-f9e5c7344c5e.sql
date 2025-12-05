-- Create a function to clean up old search history
CREATE OR REPLACE FUNCTION public.cleanup_old_search_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete search history entries older than 30 days
  DELETE FROM public.search_history
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  RAISE NOTICE 'Search history cleanup completed at %', NOW();
END;
$$;