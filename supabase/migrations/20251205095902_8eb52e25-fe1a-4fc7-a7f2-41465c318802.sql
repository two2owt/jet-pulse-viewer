-- Create a function to check connection request rate limit
CREATE OR REPLACE FUNCTION public.check_connection_rate_limit(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count integer;
  rate_limit integer := 10;
  time_window interval := '1 hour';
BEGIN
  -- Count connection requests made by this user in the last hour
  SELECT COUNT(*) INTO request_count
  FROM user_connections
  WHERE user_id = _user_id
    AND created_at > NOW() - time_window;
  
  -- Return true if under the limit, false if over
  RETURN request_count < rate_limit;
END;
$$;

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create connection requests" ON public.user_connections;

-- Create new INSERT policy with rate limiting
CREATE POLICY "Users can create connection requests with rate limit" 
ON public.user_connections 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND public.check_connection_rate_limit(auth.uid())
);