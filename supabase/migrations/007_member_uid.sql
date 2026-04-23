-- =============================================================================
-- 007_member_uid.sql
-- Adds a stable numeric UID to gym_members for fast human-friendly lookup.
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS public.gym_members_member_uid_seq;

ALTER TABLE public.gym_members
  ADD COLUMN IF NOT EXISTS member_uid BIGINT;

ALTER SEQUENCE public.gym_members_member_uid_seq OWNED BY public.gym_members.member_uid;

UPDATE public.gym_members
SET member_uid = nextval('public.gym_members_member_uid_seq')
WHERE member_uid IS NULL;

SELECT setval(
  'public.gym_members_member_uid_seq',
  COALESCE((SELECT MAX(member_uid) FROM public.gym_members), 0),
  true
);

ALTER TABLE public.gym_members
  ALTER COLUMN member_uid SET DEFAULT nextval('public.gym_members_member_uid_seq');

ALTER TABLE public.gym_members
  ALTER COLUMN member_uid SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_members_member_uid
  ON public.gym_members(member_uid);

COMMENT ON COLUMN public.gym_members.member_uid IS 'Stable numeric UID for member lookup and support.';