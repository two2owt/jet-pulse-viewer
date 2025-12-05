-- Create unique index on display_name (excluding nulls)
CREATE UNIQUE INDEX profiles_display_name_unique_idx 
ON public.profiles (display_name) 
WHERE display_name IS NOT NULL;