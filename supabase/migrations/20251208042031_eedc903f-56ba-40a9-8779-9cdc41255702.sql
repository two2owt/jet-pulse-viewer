-- Add admin read policies for analytics dashboard

-- Admins can view all user favorites for analytics
CREATE POLICY "Admins can view all favorites"
ON public.user_favorites
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all deal shares for analytics
CREATE POLICY "Admins can view all shares"
ON public.deal_shares
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all search history for analytics
CREATE POLICY "Admins can view all search history"
ON public.search_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all user locations for analytics
CREATE POLICY "Admins can view all locations"
ON public.user_locations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all user connections for analytics
CREATE POLICY "Admins can view all connections"
ON public.user_connections
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all profiles for analytics
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all notification logs for analytics
CREATE POLICY "Admins can view all notifications"
ON public.notification_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));