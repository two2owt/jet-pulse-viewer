-- Fix security issues identified in security scan

-- 1. Add INSERT policy for user_locations (users can only insert their own location data)
CREATE POLICY "Users can insert their own location data"
ON public.user_locations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. Add INSERT policy for notification_logs (only system can create notifications)
-- This prevents users from creating fake notifications
CREATE POLICY "Only authenticated system can create notifications"
ON public.notification_logs
FOR INSERT
TO authenticated
WITH CHECK (false); -- Block all user inserts, edge functions will bypass this

-- 3. Add admin-only policies for deals table
CREATE POLICY "Admins can insert deals"
ON public.deals
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update deals"
ON public.deals
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete deals"
ON public.deals
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Add admin-only policies for neighborhoods table
CREATE POLICY "Admins can insert neighborhoods"
ON public.neighborhoods
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update neighborhoods"
ON public.neighborhoods
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete neighborhoods"
ON public.neighborhoods
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Add public SELECT policy for profiles (social features)
-- Users should be able to see other users' public profile information
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);