-- supabase/migrations/005_announcements.sql
-- Run in Supabase SQL Editor after 004_fitness_profile_fields.sql

CREATE TABLE IF NOT EXISTS public.announcements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id       UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  created_by   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'urgent')),
  is_pinned    BOOLEAN NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_gym ON public.announcements(gym_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(gym_id, is_active, expires_at);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Gym admin can do everything with their gym's announcements
CREATE POLICY "announcements: gym admin full access"
  ON public.announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gyms
      WHERE id = announcements.gym_id AND owner_id = auth.uid()
    )
  );

-- Members can read active announcements for their approved gyms
CREATE POLICY "announcements: members read active"
  ON public.announcements FOR SELECT
  USING (
    is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND EXISTS (
      SELECT 1 FROM public.gym_members
      WHERE gym_id = announcements.gym_id
        AND user_id = auth.uid()
        AND status = 'approved'
    )
  );

-- Auto-update updated_at
CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
