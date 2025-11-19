-- Add preferences column to profiles table for deal personalization
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{"dealTypes": ["Food", "Drinks", "Nightlife", "Events"], "neighborhoods": []}'::jsonb;

-- Add onboarding_completed column to track onboarding status
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;