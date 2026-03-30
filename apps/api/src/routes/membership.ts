// apps/api/src/routes/membership.ts
// Handles: member join requests, gym_admin approvals, member listing

import { Router } from 'express';
import { supabaseAdmin } from '../utils/supabase.js';
import {
  ok, created, badRequest, notFound, serverError, conflict, forbidden,
} from '../utils/response.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole, requireGymContext, validate } from '../middleware/roles.js';
import { JoinGymSchema, UpdateMembershipSchema } from '@atom-os/shared';

const router = Router();
router.use(authMiddleware);

// ─── MEMBER ROUTES ────────────────────────────────────────────────────────────

// GET /api/membership/gyms — browse active gyms (for join flow)
router.get('/gyms', requireRole('member'), async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('gyms')
      .select('id, name, gym_code, description, city, state, logo_url, total_members')
      .in('status', ['active', 'trial'])
      .order('name');

    if (error) return serverError(res, 'Failed to fetch gyms', error);
    return ok(res, { gyms: data ?? [] });
  } catch (err) {
    return serverError(res, 'Gym browse error', err);
  }
});

// POST /api/membership/join — member requests to join a gym using gym_code
router.post('/join', requireRole('member'), validate(JoinGymSchema), async (req, res) => {
  try {
    const { gym_code } = req.body;
    const user_id = req.user.id;

    // Find gym by code
    const { data: gym, error: gymError } = await supabaseAdmin
      .from('gyms')
      .select('id, name, status')
      .eq('gym_code', gym_code.toUpperCase())
      .single();

    if (gymError || !gym) return notFound(res, 'No gym found with that code');
    if (gym.status === 'suspended' || gym.status === 'inactive') {
      return badRequest(res, 'This gym is not currently accepting members');
    }

    // Check if already a member (any status)
    const { data: existing } = await supabaseAdmin
      .from('gym_members')
      .select('id, status')
      .eq('gym_id', gym.id)
      .eq('user_id', user_id)
      .single();

    if (existing) {
      const msgs: Record<string, string> = {
        pending: 'You already have a pending request for this gym',
        approved: 'You are already a member of this gym',
        rejected: 'Your previous request was rejected. Contact the gym admin.',
        suspended: 'Your membership has been suspended. Contact the gym admin.',
      };
      return conflict(res, msgs[existing.status] ?? 'Already requested');
    }

    // Create join request
    const { data: membership, error: insertError } = await supabaseAdmin
      .from('gym_members')
      .insert({
        gym_id: gym.id,
        user_id,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) return serverError(res, 'Failed to submit join request', insertError);
    return created(res, {
      message: `Join request sent to ${gym.name}. Waiting for approval.`,
      membership,
    });
  } catch (err) {
    return serverError(res, 'Join request error', err);
  }
});

// GET /api/membership/status — member's own memberships
router.get('/status', requireRole('member'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('gym_members')
      .select(`
        *,
        gym:gyms(id, name, gym_code, city, logo_url, status, qr_rotation_interval_s)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return serverError(res, 'Failed to fetch memberships', error);
    return ok(res, { memberships: data ?? [] });
  } catch (err) {
    return serverError(res, 'Membership status error', err);
  }
});

// ─── GYM ADMIN ROUTES ─────────────────────────────────────────────────────────

// GET /api/membership/requests — all pending join requests for gym
router.get('/requests',
  requireRole('gym_admin'), requireGymContext,
  async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('gym_members')
        .select(`
          *,
          user:users(id, email, full_name, phone, avatar_url, created_at)
        `)
        .eq('gym_id', req.user.gym_id!)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) return serverError(res, 'Failed to fetch requests', error);
      return ok(res, { requests: data ?? [] });
    } catch (err) {
      return serverError(res, 'Requests fetch error', err);
    }
  }
);

// PATCH /api/membership/requests/:id — approve or reject
router.patch('/requests/:id',
  requireRole('gym_admin'), requireGymContext,
  validate(UpdateMembershipSchema),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Ensure the request belongs to this gym
      const { data: existing, error: findError } = await supabaseAdmin
        .from('gym_members')
        .select('id, gym_id, status')
        .eq('id', id)
        .single();

      if (findError || !existing) return notFound(res, 'Membership request not found');
      if (existing.gym_id !== req.user.gym_id) return forbidden(res, 'Not your gym');

      const updatePayload: Record<string, unknown> = {
        status: req.body.status,
        updated_at: new Date().toISOString(),
      };

      if (req.body.status === 'approved') {
        updatePayload.approved_by = req.user.id;
        updatePayload.approved_at = new Date().toISOString();
        // Set subscription details if provided
        if (req.body.subscription_plan) {
          updatePayload.subscription_plan = req.body.subscription_plan;
          updatePayload.subscription_status = 'active';
          updatePayload.subscription_start = req.body.subscription_start ?? new Date().toISOString().split('T')[0];
          updatePayload.subscription_end = req.body.subscription_end;
          updatePayload.amount_paid = req.body.amount_paid ?? 0;
        }
      }

      if (req.body.notes) updatePayload.notes = req.body.notes;

      const { data, error } = await supabaseAdmin
        .from('gym_members')
        .update(updatePayload)
        .eq('id', id)
        .select('*, user:users(id, email, full_name)')
        .single();

      if (error) return serverError(res, 'Failed to update membership', error);
      return ok(res, { membership: data });
    } catch (err) {
      return serverError(res, 'Membership update error', err);
    }
  }
);

// GET /api/membership/members — all members of the gym
router.get('/members',
  requireRole('gym_admin'), requireGymContext,
  async (req, res) => {
    try {
      const { status } = req.query;

      let query = supabaseAdmin
        .from('gym_members')
        .select(`
          *,
          user:users(id, email, full_name, phone, avatar_url, created_at)
        `)
        .eq('gym_id', req.user.gym_id!)
        .order('joined_at', { ascending: false });

      if (status && typeof status === 'string') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) return serverError(res, 'Failed to fetch members', error);
      return ok(res, { members: data ?? [] });
    } catch (err) {
      return serverError(res, 'Members fetch error', err);
    }
  }
);

// PATCH /api/membership/members/:id — update membership (plan, status, payment)
router.patch('/members/:id',
  requireRole('gym_admin'), requireGymContext,
  validate(UpdateMembershipSchema),
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data: existing } = await supabaseAdmin
        .from('gym_members')
        .select('id, gym_id')
        .eq('id', id)
        .single();

      if (!existing) return notFound(res, 'Member not found');
      if (existing.gym_id !== req.user.gym_id) return forbidden(res, 'Not your gym member');

      const { data, error } = await supabaseAdmin
        .from('gym_members')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, user:users(id, email, full_name)')
        .single();

      if (error) return serverError(res, 'Update failed', error);
      return ok(res, { membership: data });
    } catch (err) {
      return serverError(res, 'Member update error', err);
    }
  }
);

// GET /api/membership/stats — gym admin: quick stats
router.get('/stats',
  requireRole('gym_admin'), requireGymContext,
  async (req, res) => {
    try {
      const gym_id = req.user.gym_id!;

      const [totalRes, pendingRes, activeRes, expiredRes] = await Promise.all([
        supabaseAdmin.from('gym_members').select('id', { count: 'exact', head: true }).eq('gym_id', gym_id),
        supabaseAdmin.from('gym_members').select('id', { count: 'exact', head: true }).eq('gym_id', gym_id).eq('status', 'pending'),
        supabaseAdmin.from('gym_members').select('id', { count: 'exact', head: true }).eq('gym_id', gym_id).eq('status', 'approved'),
        supabaseAdmin.from('gym_members').select('id', { count: 'exact', head: true })
          .eq('gym_id', gym_id).eq('subscription_status', 'expired'),
      ]);

      return ok(res, {
        total_members: totalRes.count ?? 0,
        pending_requests: pendingRes.count ?? 0,
        active_members: activeRes.count ?? 0,
        expired_subscriptions: expiredRes.count ?? 0,
      });
    } catch (err) {
      return serverError(res, 'Stats error', err);
    }
  }
);

export default router;
