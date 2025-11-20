-- Create storage bucket for optimized deal images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deal-images',
  'deal-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);

-- RLS policies for deal-images bucket
CREATE POLICY "Anyone can view deal images"
ON storage.objects FOR SELECT
USING (bucket_id = 'deal-images');

CREATE POLICY "Authenticated users can upload deal images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'deal-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own deal images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'deal-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own deal images"
ON storage.objects FOR DELETE
USING (bucket_id = 'deal-images' AND auth.role() = 'authenticated');