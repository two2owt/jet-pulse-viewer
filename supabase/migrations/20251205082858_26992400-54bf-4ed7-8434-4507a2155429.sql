-- Add privacy_settings column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN privacy_settings jsonb DEFAULT '{
  "show_birthdate": false,
  "show_gender": true,
  "show_pronouns": true,
  "show_bio": true,
  "show_instagram": true,
  "show_twitter": true,
  "show_facebook": true,
  "show_linkedin": true,
  "show_tiktok": true
}'::jsonb;