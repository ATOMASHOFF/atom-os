-- 004_fitness_profile_fields.sql
-- Adds fitness-related profile fields and emergency contacts to public.users

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS fitness_goal TEXT,
  ADD COLUMN IF NOT EXISTS activity_level TEXT,
  ADD COLUMN IF NOT EXISTS body_fat_pct NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS injuries TEXT,
  ADD COLUMN IF NOT EXISTS preferred_equipment TEXT[],
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
