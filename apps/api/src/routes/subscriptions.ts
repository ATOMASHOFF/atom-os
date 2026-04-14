// apps/api/src/routes/subscriptions.ts
// Member subscription lifecycle: assign, list, auto-expire.

import { Router } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import {
  ok, created, badRequest, notFound, forbidden, serverError,
} from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { requireRole, requireGymContext, validate } from '../middleware/roles';
import { AssignMemberSubscriptionSchema } from '@atom-os/shared';

const router = Router();
router.use(authMiddleware);

function toDateOnly(input: Date): string {
  return input.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateOnly(d);
}

async function syncExpiredSubscriptions(gymId?: string, memberId?: string) {
  const today = toDateOnly(new Date());

  let expiredQuery = supabaseAdmin
    .from('member_subscriptions')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lt('end_date', today);

  if (gymId) expiredQuery = expiredQuery.eq('gym_id', gymId);
  if (memberId) expiredQuery = expiredQuery.eq('member_id', memberId);

  await expiredQuery;

  let selectExpired = supabaseAdmin
    .from('member_subscriptions')
    .select('id, member_id, gym_id')
    .eq('status', 'expired')
    .lt('end_date', today);

  if (gymId) selectExpired = selectExpired.eq('gym_id', gymId);
  if (memberId) selectExpired = selectExpired.eq('member_id', memberId);

  const { data: expiredRows } = await selectExpired;
  const expiredIds = (expiredRows ?? []).map((row) => row.id);

  if (expiredIds.length > 0) {
    await supabaseAdmin
      .from('users')
      .update({ active_subscription_id: null })
      .in('active_subscription_id', expiredIds);

    const grouped = new Map<string, string[]>();
    for (const row of expiredRows ?? []) {
      const key = row.gym_id;
      const list = grouped.get(key) ?? [];
      list.push(row.member_id);
      grouped.set(key, list);
    }

    for (const [gId, memberIds] of grouped.entries()) {
      await supabaseAdmin
        .from('gym_members')
        .update({ subscription_status: 'expired', updated_at: new Date().toISOString() })
        .eq('gym_id', gId)
        .in('user_id', memberIds)
        .eq('status', 'approved');
    }
  }
}

router.post('/', requireRole('gym_admin'), requireGymContext, validate(AssignMemberSubscriptionSchema), async (req, res) => {
  try {
    const gym_id = req.user.gym_id!;
    const member_id = req.body.member_id;
    const start_date = req.body.start_date ?? toDateOnly(new Date());

    await syncExpiredSubscriptions(gym_id, member_id);

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('gym_members')
      .select('id, status')
      .eq('gym_id', gym_id)
      .eq('user_id', member_id)
      .single();

    if (membershipError || !membership) return notFound(res, 'Member is not part of your gym');
    if (membership.status !== 'approved') return badRequest(res, 'Member must be approved before assigning a plan');

    const { data: plan, error: planError } = await supabaseAdmin
      .from('membership_plans')
      .select('id, gym_id, name, duration_days, price, is_active')
      .eq('id', req.body.plan_id)
      .single();

    if (planError || !plan) return notFound(res, 'Plan not found');
    if (plan.gym_id !== gym_id) return forbidden(res, 'Not your plan');
    if (!plan.is_active) return badRequest(res, 'Cannot assign an inactive plan');

    const end_date = addDays(start_date, Math.max(0, plan.duration_days - 1));
    const legacyPlan: 'monthly' | 'quarterly' | 'annual' | 'pay_as_you_go' =
      plan.duration_days <= 31 ? 'monthly'
      : plan.duration_days <= 100 ? 'quarterly'
      : plan.duration_days <= 400 ? 'annual'
      : 'pay_as_you_go';

    await supabaseAdmin
      .from('member_subscriptions')
      .update({ status: 'cancelled' })
      .eq('gym_id', gym_id)
      .eq('member_id', member_id)
      .eq('status', 'active');

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('member_subscriptions')
      .insert({
        gym_id,
        member_id,
        plan_id: plan.id,
        start_date,
        end_date,
        status: 'active',
        payment_status: req.body.payment_status ?? 'paid',
      })
      .select('*, plan:membership_plans(*)')
      .single();

    if (insertError || !inserted) return serverError(res, 'Failed to assign subscription', insertError);

    await supabaseAdmin
      .from('users')
      .update({ active_subscription_id: inserted.id })
      .eq('id', member_id);

    await supabaseAdmin
      .from('gym_members')
      .update({
        subscription_plan: legacyPlan,
        subscription_status: 'active',
        subscription_start: start_date,
        subscription_end: end_date,
        amount_paid: plan.price,
        updated_at: new Date().toISOString(),
      })
      .eq('gym_id', gym_id)
      .eq('user_id', member_id)
      .eq('status', 'approved');

    return created(res, { subscription: inserted });
  } catch (err) {
    return serverError(res, 'Assign subscription error', err);
  }
});

router.get('/me', requireRole('member'), async (req, res) => {
  try {
    await syncExpiredSubscriptions(undefined, req.user.id);

    const { data, error } = await supabaseAdmin
      .from('member_subscriptions')
      .select('*, plan:membership_plans(*)')
      .eq('member_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return serverError(res, 'Failed to fetch subscriptions', error);
    return ok(res, { subscriptions: data ?? [], active: (data ?? []).find((s: any) => s.status === 'active') ?? null });
  } catch (err) {
    return serverError(res, 'Subscription fetch error', err);
  }
});

router.get('/', requireRole('gym_admin'), requireGymContext, async (req, res) => {
  try {
    const gym_id = req.user.gym_id!;
    await syncExpiredSubscriptions(gym_id);

    const { data, error } = await supabaseAdmin
      .from('member_subscriptions')
      .select('*, plan:membership_plans(*), member:users(id, full_name, email, phone)')
      .eq('gym_id', gym_id)
      .order('created_at', { ascending: false });

    if (error) return serverError(res, 'Failed to fetch subscriptions', error);
    return ok(res, { subscriptions: data ?? [] });
  } catch (err) {
    return serverError(res, 'Subscription list error', err);
  }
});

router.get('/:memberId', requireRole('gym_admin'), requireGymContext, async (req, res) => {
  try {
    const gym_id = req.user.gym_id!;
    const memberId = req.params.memberId;

    await syncExpiredSubscriptions(gym_id, memberId);

    const { data: memberInGym } = await supabaseAdmin
      .from('gym_members')
      .select('id')
      .eq('gym_id', gym_id)
      .eq('user_id', memberId)
      .maybeSingle();

    if (!memberInGym) return notFound(res, 'Member not found in your gym');

    const { data, error } = await supabaseAdmin
      .from('member_subscriptions')
      .select('*, plan:membership_plans(*)')
      .eq('gym_id', gym_id)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) return serverError(res, 'Failed to fetch member subscriptions', error);

    return ok(res, {
      subscriptions: data ?? [],
      active: (data ?? []).find((s: any) => s.status === 'active') ?? null,
    });
  } catch (err) {
    return serverError(res, 'Member subscription fetch error', err);
  }
});

export default router;
