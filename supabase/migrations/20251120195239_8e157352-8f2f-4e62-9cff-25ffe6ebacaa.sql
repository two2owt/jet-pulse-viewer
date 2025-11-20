-- Add address column to deals table for venue locations
ALTER TABLE public.deals 
ADD COLUMN IF NOT EXISTS venue_address TEXT;

-- Add some sample addresses for existing venues
UPDATE public.deals 
SET venue_address = CASE 
  WHEN venue_name = 'Rooftop 210' THEN '210 E Trade St, Charlotte, NC 28202'
  WHEN venue_name = 'Pin House' THEN '222 S Tryon St, Charlotte, NC 28202'
  WHEN venue_name = 'Wooden Robot' THEN '1440 S Tryon St, Charlotte, NC 28203'
  WHEN venue_name = 'Ink N Ivy' THEN '222 S Church St, Charlotte, NC 28202'
  WHEN venue_name = 'Fitzgerald''s' THEN '1301 Central Ave, Charlotte, NC 28205'
  WHEN venue_name = 'The Punch Room' THEN '128 N Tryon St, Charlotte, NC 28202'
  WHEN venue_name = 'NoDa Brewing' THEN '2921 N Tryon St, Charlotte, NC 28206'
  WHEN venue_name = 'Camp North End' THEN '300 Camp Rd, Charlotte, NC 28206'
  WHEN venue_name = 'Wooden Robot Brewery' THEN '1440 S Tryon St, Charlotte, NC 28203'
  ELSE venue_address
END
WHERE venue_address IS NULL;