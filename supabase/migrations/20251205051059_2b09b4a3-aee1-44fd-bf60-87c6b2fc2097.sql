-- Add birthdate, gender, and pronouns columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN birthdate date,
ADD COLUMN gender text,
ADD COLUMN pronouns text;