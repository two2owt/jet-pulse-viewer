-- Fix storage policies for deal-images bucket to require admin role
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload deal images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own deal images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own deal images" ON storage.objects;

-- Create new admin-only policies for deal-images bucket
CREATE POLICY "Admins can upload deal images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'deal-images' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update deal images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'deal-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete deal images"
ON storage.objects FOR DELETE
USING (bucket_id = 'deal-images' AND public.has_role(auth.uid(), 'admin'));