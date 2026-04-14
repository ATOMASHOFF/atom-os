// apps/api/src/routes/plans.ts
// Membership plans management for gym admins + member-facing active plan list.

import { Router } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import {
  ok, created, badRequest, notFound, forbidden, serverError, conflict,
} from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { requireRole, requireGymContext, validate } from '../middleware/roles';
import { CreateMembershipPlanSchema, UpdateMembershipPlanSchema } from '@atom-os/shared';

const router = Router();
router.use(authMiddleware);

router.post('/', requireRole('gym_admin'), requireGymContext, validate(CreateMembershipPlanSchema), async (req, res) => {
  try {
    const gym_id = req.user.gym_id!;
    const payload = {
      gym_id,
      name: req.body.name.trim(),
      duration_days: req.body.duration_days,
      price: req.body.price,
      description: req.body.description?.trim() || null,
      is_active: req.body.is_active ?? true,
    };

    const { data, error } = await supabaseAdmin
      .from('membership_plans')
      .insert(payload)
      .select('*')
      .single();

    if (error?.code === '23505') return conflict(res, 'A plan with this name already exists');
    if (error || !data) return serverError(res, 'Failed to create plan', error);

    return created(res, { plan: data });
  } catch (err) {
    return serverError(res, 'Create plan error', err);
  }
});

router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'gym_admin') {
      const { data, error } = await supabaseAdmin
        .from('membership_plans')
        .select('*')
        .eq('gym_id', req.user.gym_id!)
        .order('created_at', { ascending: false });

      if (error) return serverError(res, 'Failed to fetch plans', error);
      return ok(res, { plans: data ?? [] });
    }

    if (req.user.role !== 'member') {
      return forbidden(res, 'Only gym admins or members can view plans');
    }

    const gymIdQuery = typeof req.query.gym_id === 'string' ? req.query.gym_id : undefined;

    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('gym_members')
      .select('gym_id')
      .eq('user_id', req.user.id)
      .eq('status', 'approved');

    if (membershipsError) return serverError(res, 'Failed to resolve member gyms', membershipsError);

    const approvedGymIds = (memberships ?? []).map((m) => m.gym_id);
    if (approvedGymIds.length === 0) return ok(res, { plans: [] });

    const targetGymIds = gymIdQuery ? approvedGymIds.filter((id) => id === gymIdQuery) : approvedGymIds;
    if (targetGymIds.length === 0) return ok(res, { plans: [] });

    const { data, error } = await supabaseAdmin
      .from('membership_plans')
      .select('*')
      .in('gym_id', targetGymIds)
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) return serverError(res, 'Failed to fetch plans', error);
    return ok(res, { plans: data ?? [] });
  } catch (err) {
    return serverError(res, 'Plan list error', err);
  }
});

router.put('/:id', requireRole('gym_admin'), requireGymContext, validate(UpdateMembershipPlanSchema), async (req, res) => {
  try {
    const gym_id = req.user.gym_id!;

    const { data: existing, error: findError } = await supabaseAdmin
      .from('membership_plans')
      .select('id, gym_id')
      .eq('id', req.params.id)
      .single();

    if (findError || !existing) return notFound(res, 'Plan not found');
    if (existing.gym_id !== gym_id) return forbidden(res, 'Not your plan');

    const updatePayload: Record<string, unknown> = {};
    if (req.body.name !== undefined) updatePayload.name = req.body.name.trim();
    if (req.body.duration_days !== undefined) updatePayload.duration_days = req.body.duration_days;
    if (req.body.price !== undefined) updatePayload.price = req.body.price;
    if (req.body.description !== undefined) updatePayload.description = req.body.description?.trim() || null;
    if (req.body.is_active !== undefined) updatePayload.is_active = req.body.is_active;

    const { data, error } = await supabaseAdmin
      .from('membership_plans')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error?.code === '23505') return conflict(res, 'A plan with this name already exists');
    if (error || !data) return serverError(res, 'Failed to update plan', error);

    return ok(res, { plan: data });
  } catch (err) {
    return serverError(res, 'Update plan error', err);
  }
});

router.delete('/:id', requireRole('gym_admin'), requireGymContext, async (req, res) => {
  try {
    const gym_id = req.user.gym_id!;

    const { data: existing, error: findError } = await supabaseAdmin
      .from('membership_plans')
      .select('id, gym_id')
      .eq('id', req.params.id)
      .single();

    if (findError || !existing) return notFound(res, 'Plan not found');
    if (existing.gym_id !== gym_id) return forbidden(res, 'Not your plan');

    const { data, error } = await supabaseAdmin
      .from('membership_plans')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error || !data) return serverError(res, 'Failed to deactivate plan', error);
    return ok(res, { plan: data, message: 'Plan deactivated' });
  } catch (err) {
    return serverError(res, 'Deactivate plan error', err);
  }
});

export default router;
