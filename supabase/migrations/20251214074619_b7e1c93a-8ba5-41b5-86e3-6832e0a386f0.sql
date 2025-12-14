-- Add welcome email series tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS welcome_email_1_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS welcome_email_2_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS welcome_email_3_sent BOOLEAN DEFAULT false;