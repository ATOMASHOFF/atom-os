// apps/api/src/routes/gyms.ts
// All routes: super_admin only

import { Router } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import { ok, created, badRequest, notFound, serverError, conflict } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { requireRole, requireGymContext, validate } from '../middleware/roles';
import {
  CreateGymSchema,
  UpdateGymSchema,
  UpdateGymStatusSchema,
  AssignAdminSchema,
  generateGymCode,
} from '@atom-os/shared';

const router = Router();

// GET /api/gyms/my — gym_admin reads their own gym (before super_admin lock)
router.get('/my', authMiddleware, requireRole('gym_admin'), requireGymContext, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('gyms')
      .select('*')
      .eq('id', req.user.gym_id!)
      .single();

    if (error || !data) return notFound(res, 'Gym not found');
    return ok(res, { gym: data });
  } catch (err) {
    return serverError(res, 'Gym fetch error', err);
  }
});

// All remaining gym routes require super_admin
router.use(authMiddleware, requireRole('super_admin'));

// GET /api/gyms — list all gyms with stats
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('gyms')
      .select(`
        *,
        owner:users!gyms_owner_id_fkey(id, email, full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) return serverError(res, 'Failed to fetch gyms', error);
    return ok(res, { gyms: data ?? [] });
  } catch (err) {
    return serverError(res, 'Gym list error', err);
  }
});

// GET /api/gyms/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('gyms')
      .select(`
        *,
        owner:users!gyms_owner_id_fkey(id, email, full_name)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !data) return notFound(res, 'Gym not found');
    return ok(res, { gym: data });
  } catch (err) {
    return serverError(res, 'Gym fetch error', err);
  }
});

// POST /api/gyms — create gym (super_admin registers a new gym)
router.post('/', validate(CreateGymSchema), async (req, res) => {
  try {
    // Generate unique gym code
    let gym_code: string;
    let attempts = 0;
    do {
      gym_code = generateGymCode();
      const { data: existing } = await supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('gym_code', gym_code)
        .single();
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) return serverError(res, 'Could not generate unique gym code');

    const { data, error } = await supabaseAdmin
      .from('gyms')
      .insert({
        ...req.body,
        gym_code,
        owner_id: req.user.id, // temporarily set to super_admin; updated when admin assigned
        status: 'trial',
      })
      .select()
      .single();

    if (error) return serverError(res, 'Failed to create gym', error);
    return created(res, { gym: data });
  } catch (err) {
    return serverError(res, 'Gym creation error', err);
  }
});

// PATCH /api/gyms/:id — update gym details
router.patch('/:id', validate(UpdateGymSchema), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('gyms')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) return notFound(res, 'Gym not found');
    return ok(res, { gym: data });
  } catch (err) {
    return serverError(res, 'Gym update error', err);
  }
});

// PATCH /api/gyms/:id/status — activate/suspend/deactivate gym
router.patch('/:id/status', validate(UpdateGymStatusSchema), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('gyms')
      .update({ status: req.body.status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) return notFound(res, 'Gym not found');
    return ok(res, { gym: data });
  } catch (err) {
    return serverError(res, 'Status update error', err);
  }
});

// POST /api/gyms/:id/assign-admin — assign a user as gym_admin
router.post('/:id/assign-admin', validate(AssignAdminSchema), async (req, res) => {
  try {
    const { user_id } = req.body;
    const { id: gym_id } = req.params;

    // Verify target user exists
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .eq('id', user_id)
      .single();

    if (userError || !targetUser) return notFound(res, 'User not found');

    // Bug 2 fix: Guard against assigning the same user to multiple gyms
    // Check if this user is already the owner of a different gym
    const { data: existingGym } = await supabaseAdmin
      .from('gyms')
      .select('id, name')
      .eq('owner_id', user_id)
      .neq('id', gym_id) // allow re-assigning to the same gym (idempotent)
      .maybeSingle();

    if (existingGym) {
      return conflict(res, `This user is already the admin of "${existingGym.name}". Remove them from that gym first.`);
    }

    // Bug 6 fix: Check errors on both DB writes
    const { error: roleError } = await supabaseAdmin
      .from('users')
      .update({ role: 'gym_admin', updated_at: new Date().toISOString() })
      .eq('id', user_id);

    if (roleError) return serverError(res, 'Failed to update user role', roleError);

    const { error: gymError } = await supabaseAdmin
      .from('gyms')
      .update({ owner_id: user_id, updated_at: new Date().toISOString() })
      .eq('id', gym_id);

    if (gymError) return serverError(res, 'Failed to assign gym owner', gymError);

    return ok(res, {
      message: `${targetUser.email} is now the admin of this gym`,
      user_id,
      gym_id,
    });
  } catch (err) {
    return serverError(res, 'Admin assignment error', err);
  }
});

export default router;
