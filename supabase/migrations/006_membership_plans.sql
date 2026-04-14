-- 006_membership_plans.sql
-- Membership plans + member subscriptions (gym-scoped, future-ready)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'active_subscription_id'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN active_subscription_id UUID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.membership_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id        UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  price         NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.member_subscriptions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id         UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id        UUID NOT NULL REFERENCES public.membership_plans(id) ON DELETE RESTRICT,
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
  payment_status TEXT NOT NULL CHECK (payment_status IN ('paid', 'pending', 'failed')) DEFAULT 'paid',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_active_subscription_id_fkey'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_active_subscription_id_fkey
      FOREIGN KEY (active_subscription_id)
      REFERENCES public.member_subscriptions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_membership_plans_gym ON public.membership_plans(gym_id);
CREATE INDEX IF NOT EXISTS idx_membership_plans_active ON public.membership_plans(gym_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_plans_unique_name_per_gym ON public.membership_plans(gym_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_member_subscriptions_member ON public.member_subscriptions(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_gym ON public.member_subscriptions(gym_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_status_end ON public.member_subscriptions(status, end_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_subscriptions_one_active_per_member_gym
  ON public.member_subscriptions(gym_id, member_id)
  WHERE status = 'active';

DROP TRIGGER IF EXISTS trg_membership_plans_updated_at ON public.membership_plans;
CREATE TRIGGER trg_membership_plans_updated_at
  BEFORE UPDATE ON public.membership_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_select_all_auth" ON public.membership_plans;
CREATE POLICY "plans_select_all_auth"
  ON public.membership_plans
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "plans_write_super_admin_or_gym_owner" ON public.membership_plans;
CREATE POLICY "plans_write_super_admin_or_gym_owner"
  ON public.membership_plans
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin() OR public.is_gym_admin_of(gym_id)
  )
  WITH CHECK (
    public.is_super_admin() OR public.is_gym_admin_of(gym_id)
  );

DROP POLICY IF EXISTS "subscriptions_select_own_or_admin" ON public.member_subscriptions;
CREATE POLICY "subscriptions_select_own_or_admin"
  ON public.member_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    member_id = auth.uid()
    OR public.is_super_admin()
    OR public.is_gym_admin_of(gym_id)
  );

DROP POLICY IF EXISTS "subscriptions_insert_admin_only" ON public.member_subscriptions;
CREATE POLICY "subscriptions_insert_admin_only"
  ON public.member_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin() OR public.is_gym_admin_of(gym_id)
  );

DROP POLICY IF EXISTS "subscriptions_update_admin_only" ON public.member_subscriptions;
CREATE POLICY "subscriptions_update_admin_only"
  ON public.member_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin() OR public.is_gym_admin_of(gym_id)
  )
  WITH CHECK (
    public.is_super_admin() OR public.is_gym_admin_of(gym_id)
  );
