// apps/api/src/routes/checkins.ts
// CRITICAL SECURITY: This is where QR token validation happens.
// All writes use supabaseAdmin (service role). Members NEVER write directly.

import { Router } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import {
  ok, created, badRequest, serverError, conflict, forbidden, notFound,
} from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { requireRole, requireGymContext, validate, validateQuery } from '../middleware/roles';
import { ScanQRSchema, CheckinQuerySchema } from '@atom-os/shared';

const router = Router();
router.use(authMiddleware);

// POST /api/checkins/scan — MEMBER scans QR code
// This is the most security-critical endpoint in the entire system.
router.post('/scan', requireRole('member'), validate(ScanQRSchema), async (req, res) => {
  try {
    const { token } = req.body;
    const user_id = req.user.id;

    // ── STEP 1: Look up the token ──────────────────────────────────────────
    const { data: qrToken, error: tokenError } = await supabaseAdmin
      .from('qr_tokens')
      .select('id, gym_id, token, is_active, is_used, expires_at')
      .eq('token', token)
      .single();

    if (tokenError || !qrToken) {
      return badRequest(res, 'Invalid QR code. Please scan again.');
    }

    // ── STEP 2: Expiry check ───────────────────────────────────────────────
    if (new Date(qrToken.expires_at) < new Date()) {
      return badRequest(res, 'QR code has expired. Ask the gym admin to refresh it.');
    }

    // ── STEP 3: Replay attack check ────────────────────────────────────────
    if (qrToken.is_used || !qrToken.is_active) {
      return badRequest(res, 'This QR code has already been used. Please scan the new one.');
    }

    // ── STEP 4: Gym membership check ──────────────────────────────────────
    const { data: membership } = await supabaseAdmin
      .from('gym_members')
      .select('id, status, subscription_status, subscription_end')
      .eq('gym_id', qrToken.gym_id)
      .eq('user_id', user_id)
      .single();

    if (!membership) {
      return forbidden(res, 'You are not a member of this gym.');
    }

    if (membership.status !== 'approved') {
      const msgs: Record<string, string> = {
        pending: 'Your membership is pending approval.',
        rejected: 'Your membership was rejected.',
        suspended: 'Your membership is suspended.',
      };
      return forbidden(res, msgs[membership.status] ?? 'Membership not active.');
    }

    // ── STEP 5: Duplicate check-in prevention ────────────────────────────
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    const { data: existingCheckin } = await supabaseAdmin
      .from('checkins')
      .select('id, checked_in_at')
      .eq('gym_id', qrToken.gym_id)
      .eq('user_id', user_id)
      .gte('checked_in_at', startOfDay)
      .lte('checked_in_at', endOfDay)
      .single();

    if (existingCheckin) {
      return conflict(res, `Already checked in today at ${new Date(existingCheckin.checked_in_at).toLocaleTimeString()}.`);
    }

    // ── STEP 6: Mark token as used (atomic) ───────────────────────────────
    const { error: tokenUpdateError } = await supabaseAdmin
      .from('qr_tokens')
      .update({
        is_used: true,
        is_active: false,
        used_at: new Date().toISOString(),
        used_by: user_id,
      })
      .eq('id', qrToken.id)
      .eq('is_used', false); // optimistic lock: only update if still unused

    if (tokenUpdateError) {
      // Race condition: another request already used it
      return conflict(res, 'This QR code was just used. Please scan the new one.');
    }

    // ── STEP 7: Create check-in record ────────────────────────────────────
    const { data: checkin, error: checkinError } = await supabaseAdmin
      .from('checkins')
      .insert({
        gym_id: qrToken.gym_id,
        user_id,
        qr_token_id: qrToken.id,
        checked_in_at: new Date().toISOString(),
        ip_address: req.ip,
      })
      .select(`
        *,
        gym:gyms(id, name, city)
      `)
      .single();

    if (checkinError) return serverError(res, 'Check-in record failed', checkinError);

    return created(res, {
      message: `✅ Welcome! Checked in to ${checkin.gym?.name}`,
      checkin,
    });
  } catch (err) {
    return serverError(res, 'Check-in error', err);
  }
});

// GET /api/checkins/my — member's own check-in history
router.get('/my', requireRole('member'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query as { page?: number; limit?: number };
    const offset = (Number(page) - 1) * Number(limit);

    const { data, error, count } = await supabaseAdmin
      .from('checkins')
      .select(`
        *,
        gym:gyms(id, name, city, logo_url)
      `, { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('checked_in_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) return serverError(res, 'Failed to fetch check-ins', error);

    return ok(res, {
      checkins: data ?? [],
      total: count ?? 0,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    return serverError(res, 'Check-in history error', err);
  }
});

// GET /api/checkins/gym — gym admin views all check-ins for their gym
router.get('/gym',
  requireRole('gym_admin'), requireGymContext,
  validateQuery(CheckinQuerySchema),
  async (req, res) => {
    try {
      const { date, page = 1, limit = 50 } = req.query as {
        date?: string; page?: number; limit?: number;
      };
      const offset = (Number(page) - 1) * Number(limit);
      const gym_id = req.user.gym_id!;

      let query = supabaseAdmin
        .from('checkins')
        .select(`
          *,
          user:users(id, email, full_name, avatar_url)
        `, { count: 'exact' })
        .eq('gym_id', gym_id)
        .order('checked_in_at', { ascending: false })
        .range(offset, offset + Number(limit) - 1);

      if (date) {
        query = query
          .gte('checked_in_at', `${date}T00:00:00.000Z`)
          .lte('checked_in_at', `${date}T23:59:59.999Z`);
      }

      const { data, error, count } = await query;
      if (error) return serverError(res, 'Failed to fetch check-ins', error);

      return ok(res, {
        checkins: data ?? [],
        total: count ?? 0,
        page: Number(page),
        limit: Number(limit),
      });
    } catch (err) {
      return serverError(res, 'Gym check-in history error', err);
    }
  }
);

// GET /api/checkins/today — gym admin: today's summary
router.get('/today',
  requireRole('gym_admin'), requireGymContext,
  async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const gym_id = req.user.gym_id!;

      const { data, error, count } = await supabaseAdmin
        .from('checkins')
        .select(`
          checked_in_at,
          user:users(id, full_name, avatar_url)
        `, { count: 'exact' })
        .eq('gym_id', gym_id)
        .gte('checked_in_at', `${today}T00:00:00.000Z`)
        .lte('checked_in_at', `${today}T23:59:59.999Z`)
        .order('checked_in_at', { ascending: false });

      if (error) return serverError(res, 'Failed to fetch today check-ins', error);

      return ok(res, {
        date: today,
        total_checkins: count ?? 0,
        checkins: data ?? [],
      });
    } catch (err) {
      return serverError(res, 'Today checkins error', err);
    }
  }
);

export default router;
