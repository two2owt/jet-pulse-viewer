-- Add UPDATE policy for user_locations
CREATE POLICY "Users can update their own locations"
ON public.user_locations
FOR UPDATE
USING (auth.uid() = user_id);

-- Add DELETE policy for user_locations
CREATE POLICY "Users can delete their own locations"
ON public.user_locations
FOR DELETE
USING (auth.uid() = user_id);