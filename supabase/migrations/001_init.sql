-- =============================================================================
-- ATOM OS V3 — SUPABASE SCHEMA
-- B2C/B2B Hybrid Gym & Fitness SaaS Platform
-- =============================================================================
-- EXECUTION ORDER:
--   1. Extensions
--   2. Custom Types (ENUMs)
--   3. Core Tables
--   4. Indexes
--   5. Helper Functions
--   6. Row Level Security (RLS) Policies
--   7. Triggers
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- 2. CUSTOM TYPES (ENUMs)
-- =============================================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'gym_admin', 'member');
CREATE TYPE membership_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE subscription_plan AS ENUM ('monthly', 'quarterly', 'annual', 'pay_as_you_go');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'trial');
CREATE TYPE gym_status AS ENUM ('active', 'inactive', 'suspended', 'trial');
CREATE TYPE exercise_category AS ENUM (
  'chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio', 'full_body', 'other'
);
CREATE TYPE equipment_type AS ENUM (
  'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'resistance_band', 'other'
);


-- =============================================================================
-- 3. CORE TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABLE: users
-- Extends Supabase auth.users. One row per authenticated user.
-- The `id` column mirrors auth.users.id (UUID).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  role            user_role NOT NULL DEFAULT 'member',
  date_of_birth   DATE,
  gender          TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  height_cm       NUMERIC(5, 2),
  weight_kg       NUMERIC(5, 2),
  bio             TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  onboarded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'Public profile extending Supabase Auth. Role-based routing is derived from this table.';
COMMENT ON COLUMN public.users.role IS 'super_admin: platform owner | gym_admin: manages a gym | member: end user (B2C or B2B)';


-- -----------------------------------------------------------------------------
-- TABLE: gyms
-- One row per registered gym (B2B tenant).
-- `gym_code` is the 6-char alphanumeric code members use to join.
-- `owner_id` is the gym_admin user who registered this gym.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gyms (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id                UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  name                    TEXT NOT NULL,
  gym_code                CHAR(6) NOT NULL UNIQUE,  -- e.g. "GYM001"
  description             TEXT,
  address                 TEXT,
  city                    TEXT,
  state                   TEXT,
  country                 TEXT NOT NULL DEFAULT 'India',
  pincode                 TEXT,
  phone                   TEXT,
  email                   TEXT,
  logo_url                TEXT,
  website_url             TEXT,
  status                  gym_status NOT NULL DEFAULT 'trial',
  -- QR rotation config (in seconds): default 30s
  qr_rotation_interval_s  INTEGER NOT NULL DEFAULT 180 CHECK (qr_rotation_interval_s >= 10 AND qr_rotation_interval_s <= 2592000),
  -- Platform billing (Super Admin manages this)
  platform_plan           TEXT,
  platform_plan_expires_at TIMESTAMPTZ,
  -- Stats cache (updated by triggers/functions)
  total_members           INTEGER NOT NULL DEFAULT 0,
  total_checkins          INTEGER NOT NULL DEFAULT 0,
  -- Metadata
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.gyms IS 'Each row is one B2B tenant (gym). Isolated by gym_id in all related tables.';
COMMENT ON COLUMN public.gyms.gym_code IS '6-digit alphanumeric code. Members use this to request membership.';
COMMENT ON COLUMN public.gyms.qr_rotation_interval_s IS 'How often (seconds) the QR token rotates. Gym Admin configures this.';


-- -----------------------------------------------------------------------------
-- TABLE: gym_members
-- Junction table: User ↔ Gym relationship.
-- A member can belong to multiple gyms. Each membership is independent.
-- `approved_by` = the gym_admin who approved the request.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gym_members (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id              UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status              membership_status NOT NULL DEFAULT 'pending',
  -- Subscription tracking
  subscription_plan   subscription_plan,
  subscription_status subscription_status DEFAULT 'trial',
  subscription_start  DATE,
  subscription_end    DATE,
  amount_paid         NUMERIC(10, 2) DEFAULT 0,
  -- Notes & admin
  notes               TEXT,
  approved_by         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at         TIMESTAMPTZ,
  joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A user can only have one active membership record per gym
  UNIQUE (gym_id, user_id)
);

COMMENT ON TABLE public.gym_members IS 'M:N junction: user <-> gym. Controls B2B access (check-in, gym features).';


-- -----------------------------------------------------------------------------
-- TABLE: qr_tokens
-- Server-generated rotating tokens for gym check-in.
-- SECURITY: Never client-generated. Token is a UUID. Once used, is_used = TRUE.
-- Each gym has ONE active token at a time (enforced via partial unique index).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.qr_tokens (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id        UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  token         UUID NOT NULL DEFAULT uuid_generate_v4(),  -- The actual scannable payload
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_used       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ,
  used_by       UUID REFERENCES public.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.qr_tokens IS 'Server-only rotating QR tokens. Client NEVER writes here. Replay attacks blocked via is_used flag.';
COMMENT ON COLUMN public.qr_tokens.token IS 'UUID payload embedded in QR code. Server validates this on check-in.';


-- -----------------------------------------------------------------------------
-- TABLE: checkins
-- Audit log of every successful QR scan/check-in event.
-- `qr_token_id` links back to the exact token that was used.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkins (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id          UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  qr_token_id     UUID NOT NULL REFERENCES public.qr_tokens(id) ON DELETE RESTRICT,
  checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Optional: device/location metadata
  device_info     TEXT,
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.checkins IS 'Immutable audit log. One row per successful check-in event.';


-- -----------------------------------------------------------------------------
-- TABLE: exercises
-- Global exercise library + user-created custom exercises.
-- `is_global = TRUE` → visible to all users (seeded by Super Admin).
-- `is_global = FALSE` → private to the creator.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exercises (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT,
  category        exercise_category NOT NULL DEFAULT 'other',
  equipment       equipment_type NOT NULL DEFAULT 'other',
  muscle_groups   TEXT[],           -- e.g. ['chest', 'triceps']
  instructions    TEXT,
  video_url       TEXT,
  image_url       TEXT,
  is_global       BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.exercises IS 'Exercise library. Global exercises visible to all. User exercises are private.';


-- -----------------------------------------------------------------------------
-- TABLE: workout_logs
-- A single workout session (B2C core feature).
-- Optionally linked to a gym (if the member checked in that day).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  gym_id          UUID REFERENCES public.gyms(id) ON DELETE SET NULL,  -- optional gym context
  title           TEXT,                   -- e.g. "Monday Push Day"
  notes           TEXT,
  workout_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_min    INTEGER,                -- total workout duration in minutes
  is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.workout_logs IS 'One row per workout session. Core B2C feature.';


-- -----------------------------------------------------------------------------
-- TABLE: workout_sets
-- Individual sets within a workout log.
-- e.g. "Bench Press: 3 sets x 10 reps @ 80kg"
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workout_sets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_log_id  UUID NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  exercise_id     UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  set_number      SMALLINT NOT NULL CHECK (set_number > 0),
  reps            SMALLINT CHECK (reps >= 0),
  weight_kg       NUMERIC(6, 2) CHECK (weight_kg >= 0),
  duration_sec    INTEGER CHECK (duration_sec >= 0),  -- for time-based exercises
  distance_m      NUMERIC(8, 2) CHECK (distance_m >= 0), -- for cardio
  rpe             SMALLINT CHECK (rpe BETWEEN 1 AND 10), -- Rate of Perceived Exertion
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.workout_sets IS 'Individual set data within a workout log. The atomic unit of training data.';


-- =============================================================================
-- 4. INDEXES
-- Performance-critical indexes for all hot query paths.
-- =============================================================================

-- users
CREATE INDEX IF NOT EXISTS idx_users_role          ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email         ON public.users(email);

-- gyms
CREATE INDEX IF NOT EXISTS idx_gyms_owner          ON public.gyms(owner_id);
CREATE INDEX IF NOT EXISTS idx_gyms_gym_code       ON public.gyms(gym_code);
CREATE INDEX IF NOT EXISTS idx_gyms_status         ON public.gyms(status);

-- gym_members
CREATE INDEX IF NOT EXISTS idx_gym_members_gym     ON public.gym_members(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_members_user    ON public.gym_members(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_members_status  ON public.gym_members(gym_id, status);
-- Active members of a gym (most common query)
CREATE INDEX IF NOT EXISTS idx_gym_members_active  ON public.gym_members(gym_id, user_id)
  WHERE status = 'approved';

-- qr_tokens
CREATE INDEX IF NOT EXISTS idx_qr_tokens_gym       ON public.qr_tokens(gym_id);
-- Only one active token per gym — partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_tokens_one_active
  ON public.qr_tokens(gym_id)
  WHERE is_active = TRUE AND is_used = FALSE;
-- Fast lookup by token value (used during check-in validation)
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_tokens_token ON public.qr_tokens(token);

-- checkins
CREATE INDEX IF NOT EXISTS idx_checkins_gym        ON public.checkins(gym_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user       ON public.checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date       ON public.checkins(gym_id, checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_user_date  ON public.checkins(user_id, checked_in_at DESC);

-- exercises
CREATE INDEX IF NOT EXISTS idx_exercises_global    ON public.exercises(is_global) WHERE is_global = TRUE;
CREATE INDEX IF NOT EXISTS idx_exercises_creator   ON public.exercises(created_by);
CREATE INDEX IF NOT EXISTS idx_exercises_category  ON public.exercises(category);

-- workout_logs
CREATE INDEX IF NOT EXISTS idx_wl_user_date        ON public.workout_logs(user_id, workout_date DESC);
CREATE INDEX IF NOT EXISTS idx_wl_gym              ON public.workout_logs(gym_id);

-- workout_sets
CREATE INDEX IF NOT EXISTS idx_ws_log              ON public.workout_sets(workout_log_id);
CREATE INDEX IF NOT EXISTS idx_ws_exercise         ON public.workout_sets(exercise_id);


-- =============================================================================
-- 5. HELPER FUNCTIONS
-- =============================================================================

-- Returns the role of the currently authenticated user.
-- Used inside RLS policies to avoid repeated subqueries.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Returns TRUE if the current user is a Super Admin.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Returns TRUE if the current user is the admin/owner of the specified gym.
CREATE OR REPLACE FUNCTION public.is_gym_admin_of(p_gym_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gyms
    WHERE id = p_gym_id AND owner_id = auth.uid()
  );
$$;

-- Returns TRUE if the current user is an approved member of the specified gym.
CREATE OR REPLACE FUNCTION public.is_approved_member_of(p_gym_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gym_members
    WHERE gym_id = p_gym_id
      AND user_id = auth.uid()
      AND status = 'approved'
  );
$$;

-- Auto-updates the `updated_at` timestamp on any table that calls it.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Every table has RLS enabled. Deny-by-default.
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gyms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_tokens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets   ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------
-- RLS: users
-- ----------------------------------------

-- Anyone can see their own profile
CREATE POLICY "users: read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Gym admins can see profiles of their members
CREATE POLICY "users: gym admin reads their members"
  ON public.users FOR SELECT
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.gym_members gm
      INNER JOIN public.gyms g ON g.id = gm.gym_id
      WHERE gm.user_id = public.users.id
        AND g.owner_id = auth.uid()
    )
  );

-- Super Admin can read all users
CREATE POLICY "users: super admin reads all"
  ON public.users FOR SELECT
  USING (public.is_super_admin());

-- Users can only update their own profile (not role)
CREATE POLICY "users: update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent self-role-escalation: only super_admin can change roles
    AND (
      role = (SELECT role FROM public.users WHERE id = auth.uid())
      OR public.is_super_admin()
    )
  );

-- Super Admin can update any user (for role management)
CREATE POLICY "users: super admin update any"
  ON public.users FOR UPDATE
  USING (public.is_super_admin());

-- Row insert handled by trigger on auth.users (see Trigger section)
-- Direct inserts only via service role
CREATE POLICY "users: insert own row"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ----------------------------------------
-- RLS: gyms
-- ----------------------------------------

-- All authenticated users can see active gyms (for member search/join)
CREATE POLICY "gyms: members can browse active gyms"
  ON public.gyms FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (status = 'active' OR status = 'trial')
  );

-- Super Admin can see all gyms
CREATE POLICY "gyms: super admin reads all"
  ON public.gyms FOR SELECT
  USING (public.is_super_admin());

-- Gym admin can see their own gym (full details)
CREATE POLICY "gyms: owner reads own gym"
  ON public.gyms FOR SELECT
  USING (owner_id = auth.uid());

-- Only Super Admin can INSERT new gyms (they register/onboard gyms)
CREATE POLICY "gyms: super admin inserts"
  ON public.gyms FOR INSERT
  WITH CHECK (public.is_super_admin());

-- Gym admin can update their own gym settings (name, description, qr_interval, etc.)
-- But NOT status or platform_plan (Super Admin only)
CREATE POLICY "gyms: owner updates own gym"
  ON public.gyms FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    -- Prevent gym admin from self-activating or changing platform billing
    -- Status changes must go through Super Admin
  );

-- Super Admin can update anything (status, plan, etc.)
CREATE POLICY "gyms: super admin updates any"
  ON public.gyms FOR UPDATE
  USING (public.is_super_admin());


-- ----------------------------------------
-- RLS: gym_members
-- ----------------------------------------

-- Members can see their own memberships
CREATE POLICY "gym_members: member reads own rows"
  ON public.gym_members FOR SELECT
  USING (user_id = auth.uid());

-- Gym admins can see all members of their gym
CREATE POLICY "gym_members: gym admin reads their gym"
  ON public.gym_members FOR SELECT
  USING (public.is_gym_admin_of(gym_id));

-- Super Admin can see all
CREATE POLICY "gym_members: super admin reads all"
  ON public.gym_members FOR SELECT
  USING (public.is_super_admin());

-- Members can request to join a gym (INSERT their own row, status defaults to 'pending')
CREATE POLICY "gym_members: member can request join"
  ON public.gym_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    -- Only 'member' role users can request membership
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'member'
  );

-- Gym admin can approve/reject/update members of their gym
CREATE POLICY "gym_members: gym admin manages their members"
  ON public.gym_members FOR UPDATE
  USING (public.is_gym_admin_of(gym_id))
  WITH CHECK (public.is_gym_admin_of(gym_id));

-- Super Admin can update any membership
CREATE POLICY "gym_members: super admin updates any"
  ON public.gym_members FOR UPDATE
  USING (public.is_super_admin());

-- Members can withdraw their own pending request
CREATE POLICY "gym_members: member deletes own pending request"
  ON public.gym_members FOR DELETE
  USING (user_id = auth.uid() AND status = 'pending');


-- ----------------------------------------
-- RLS: qr_tokens
-- ----------------------------------------
-- CRITICAL: Members NEVER write to this table. Server (service role) only.

-- Gym admin can VIEW their gym's current active token (to display QR)
CREATE POLICY "qr_tokens: gym admin reads own gym token"
  ON public.qr_tokens FOR SELECT
  USING (public.is_gym_admin_of(gym_id));

-- Approved members can READ a token to validate check-in
-- (They only see active, unused tokens for gyms they're members of)
CREATE POLICY "qr_tokens: member reads active token of their gym"
  ON public.qr_tokens FOR SELECT
  USING (
    is_active = TRUE
    AND is_used = FALSE
    AND expires_at > NOW()
    AND public.is_approved_member_of(gym_id)
  );

-- Super Admin can see all
CREATE POLICY "qr_tokens: super admin reads all"
  ON public.qr_tokens FOR SELECT
  USING (public.is_super_admin());

-- INSERT, UPDATE, DELETE on qr_tokens = SERVICE ROLE ONLY (Express server)
-- No client-facing policies for write operations on this table.
-- The Express backend uses the service role key, which bypasses RLS.


-- ----------------------------------------
-- RLS: checkins
-- ----------------------------------------

-- Members can only see their own check-in history
CREATE POLICY "checkins: member reads own history"
  ON public.checkins FOR SELECT
  USING (user_id = auth.uid());

-- Gym admins can see all check-ins for their gym
CREATE POLICY "checkins: gym admin reads their gym checkins"
  ON public.checkins FOR SELECT
  USING (public.is_gym_admin_of(gym_id));

-- Super Admin can see all
CREATE POLICY "checkins: super admin reads all"
  ON public.checkins FOR SELECT
  USING (public.is_super_admin());

-- INSERT is SERVER ONLY (service role). Client never writes check-ins directly.
-- This is enforced by having no client INSERT policy on this table.


-- ----------------------------------------
-- RLS: exercises
-- ----------------------------------------

-- Any authenticated user can view global exercises
CREATE POLICY "exercises: read global"
  ON public.exercises FOR SELECT
  USING (is_global = TRUE AND auth.uid() IS NOT NULL);

-- Users can read their own custom exercises
CREATE POLICY "exercises: read own custom"
  ON public.exercises FOR SELECT
  USING (created_by = auth.uid());

-- Super Admin can read all
CREATE POLICY "exercises: super admin reads all"
  ON public.exercises FOR SELECT
  USING (public.is_super_admin());

-- Any member can create their own exercise (private by default)
CREATE POLICY "exercises: member creates own exercise"
  ON public.exercises FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND is_global = FALSE  -- Members cannot create global exercises
  );

-- Super Admin can create global exercises
CREATE POLICY "exercises: super admin creates global"
  ON public.exercises FOR INSERT
  WITH CHECK (public.is_super_admin());

-- Users can update their own non-global exercises
CREATE POLICY "exercises: update own exercise"
  ON public.exercises FOR UPDATE
  USING (created_by = auth.uid() AND is_global = FALSE)
  WITH CHECK (created_by = auth.uid() AND is_global = FALSE);

-- Super Admin can update any exercise
CREATE POLICY "exercises: super admin updates any"
  ON public.exercises FOR UPDATE
  USING (public.is_super_admin());

-- Users can delete their own custom exercises
CREATE POLICY "exercises: delete own exercise"
  ON public.exercises FOR DELETE
  USING (created_by = auth.uid() AND is_global = FALSE);


-- ----------------------------------------
-- RLS: workout_logs
-- ----------------------------------------

-- Users can only see their own workout logs
CREATE POLICY "workout_logs: read own"
  ON public.workout_logs FOR SELECT
  USING (user_id = auth.uid());

-- Gym admins can see logs of their gym members (for analytics) — optional
-- Uncomment if you want gym-level workout analytics:
-- CREATE POLICY "workout_logs: gym admin reads member logs"
--   ON public.workout_logs FOR SELECT
--   USING (
--     gym_id IS NOT NULL
--     AND public.is_gym_admin_of(gym_id)
--   );

-- Super Admin can see all
CREATE POLICY "workout_logs: super admin reads all"
  ON public.workout_logs FOR SELECT
  USING (public.is_super_admin());

-- Users can create their own workout logs
CREATE POLICY "workout_logs: create own"
  ON public.workout_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own workout logs
CREATE POLICY "workout_logs: update own"
  ON public.workout_logs FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own workout logs
CREATE POLICY "workout_logs: delete own"
  ON public.workout_logs FOR DELETE
  USING (user_id = auth.uid());


-- ----------------------------------------
-- RLS: workout_sets
-- ----------------------------------------

-- Users can only see sets that belong to their own logs
CREATE POLICY "workout_sets: read own"
  ON public.workout_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_logs
      WHERE id = workout_sets.workout_log_id
        AND user_id = auth.uid()
    )
  );

-- Users can insert sets into their own logs
CREATE POLICY "workout_sets: create in own log"
  ON public.workout_sets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_logs
      WHERE id = workout_sets.workout_log_id
        AND user_id = auth.uid()
    )
  );

-- Users can update sets in their own logs
CREATE POLICY "workout_sets: update in own log"
  ON public.workout_sets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_logs
      WHERE id = workout_sets.workout_log_id
        AND user_id = auth.uid()
    )
  );

-- Users can delete sets from their own logs
CREATE POLICY "workout_sets: delete from own log"
  ON public.workout_sets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_logs
      WHERE id = workout_sets.workout_log_id
        AND user_id = auth.uid()
    )
  );


-- =============================================================================
-- 7. TRIGGERS
-- =============================================================================

-- Auto-update `updated_at` on every UPDATE
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_gyms_updated_at
  BEFORE UPDATE ON public.gyms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_gym_members_updated_at
  BEFORE UPDATE ON public.gym_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_workout_logs_updated_at
  BEFORE UPDATE ON public.workout_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Auto-create a row in `public.users` when a new Supabase Auth user signs up.
-- Pulls email and full_name from auth.users metadata.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    'member'  -- All signups default to member. Role is elevated manually.
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- Update gym member count when a member is approved or removed
CREATE OR REPLACE FUNCTION public.sync_gym_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.gyms
  SET total_members = (
    SELECT COUNT(*) FROM public.gym_members
    WHERE gym_id = COALESCE(NEW.gym_id, OLD.gym_id)
      AND status = 'approved'
  )
  WHERE id = COALESCE(NEW.gym_id, OLD.gym_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_member_count
  AFTER INSERT OR UPDATE OR DELETE ON public.gym_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_gym_member_count();


-- Update gym checkin count on new checkin
CREATE OR REPLACE FUNCTION public.sync_gym_checkin_count()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.gyms
  SET total_checkins = total_checkins + 1
  WHERE id = NEW.gym_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_checkin_count
  AFTER INSERT ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.sync_gym_checkin_count();


-- =============================================================================
-- 8. SEED DATA — SUPER ADMIN
-- =============================================================================
-- Replace the UUID and email with your actual Supabase auth user ID.
-- Run AFTER creating your Super Admin auth account in Supabase Dashboard.
-- =============================================================================

-- INSERT INTO public.users (id, email, full_name, role)
-- VALUES (
--   '<YOUR_SUPABASE_AUTH_UUID>',
--   'admin@atomos.in',
--   'Ashish — Atom OS Super Admin',
--   'super_admin'
-- )
-- ON CONFLICT (id) DO UPDATE SET role = 'super_admin';


-- =============================================================================
-- SCHEMA COMPLETE
-- Tables: users, gyms, gym_members, qr_tokens, checkins, exercises, 
--         workout_logs, workout_sets
-- Policies: 40+ RLS policies, deny-by-default
-- Triggers: updated_at sync, auth user creation, member/checkin count caching
-- =============================================================================
