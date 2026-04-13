// apps/api/src/routes/membership.ts
// KEY FIX: All gym_members queries that join users MUST use the FK hint
// because gym_members has TWO foreign keys to users:
//   user_id     → gym_members_user_id_fkey
//   approved_by → gym_members_approved_by_fkey
// Without the hint, PostgREST returns: "more than one relationship was found"

import { Router } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import {
  ok, created, badRequest, notFound, serverError, conflict, forbidden,
} from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { requireRole, requireGymContext, validate } from '../middleware/roles';
import { JoinGymSchema, UpdateMembershipSchema } from '@atom-os/shared';

const router = Router();
router.use(authMiddleware);

// The FK hint we must use on EVERY gym_members → users join
const USER_JOIN = 'user:users!gym_members_user_id_fkey(id, email, full_name, phone, avatar_url, created_at)';

// ─── MEMBER ROUTES ─────────────────────────────────────────────────────────

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

router.post('/join', requireRole('member'), validate(JoinGymSchema), async (req, res) => {
  try {
    const { gym_code } = req.body;
    const user_id = req.user.id;

    const { data: gym, error: gymError } = await supabaseAdmin
      .from('gyms')
      .select('id, name, status')
      .eq('gym_code', gym_code.toUpperCase())
      .single();

    if (gymError || !gym) return notFound(res, 'No gym found with that code');
    if (gym.status === 'suspended' || gym.status === 'inactive')
      return badRequest(res, 'This gym is not currently accepting members');

    const { data: existing } = await supabaseAdmin
      .from('gym_members')
      .select('id, status')
      .eq('gym_id', gym.id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (existing) {
      const msgs: Record<string, string> = {
        pending:   'You already have a pending request for this gym',
        approved:  'You are already a member of this gym',
        rejected:  'Your previous request was rejected. Contact the gym admin.',
        suspended: 'Your membership has been suspended. Contact the gym admin.',
      };
      return conflict(res, msgs[existing.status] ?? 'Already requested');
    }

    const { data: membership, error: insertError } = await supabaseAdmin
      .from('gym_members')
      .insert({ gym_id: gym.id, user_id, status: 'pending' })
      .select()
      .single();

    if (insertError) return serverError(res, 'Failed to submit join request', insertError);
    return created(res, { message: `Join request sent to ${gym.name}.`, membership });
  } catch (err) {
    return serverError(res, 'Join request error', err);
  }
});

router.get('/status', requireRole('member'), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('gym_members')
      .select('*, gym:gyms(id, name, gym_code, city, logo_url, status, qr_rotation_interval_s)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) return serverError(res, 'Failed to fetch memberships', error);
    return ok(res, { memberships: data ?? [] });
  } catch (err) {
    return serverError(res, 'Membership status error', err);
  }
});

// ─── GYM ADMIN ROUTES ──────────────────────────────────────────────────────

// GET /api/membership/requests
router.get('/requests', requireRole('gym_admin'), requireGymContext, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('gym_members')
      .select(`*, ${USER_JOIN}`)
      .eq('gym_id', req.user.gym_id!)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[REQUESTS] error:', error.message);
      return serverError(res, `Failed to fetch requests: ${error.message}`, error);
    }
    return ok(res, { requests: data ?? [] });
  } catch (err) {
    return serverError(res, 'Requests fetch error', err);
  }
});

// PATCH /api/membership/requests/:id
router.patch('/requests/:id', requireRole('gym_admin'), requireGymContext, validate(UpdateMembershipSchema), async (req, res) => {
  try {
    const { data: existing, error: findError } = await supabaseAdmin
      .from('gym_members')
      .select('id, gym_id, status')
      .eq('id', req.params.id)
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
      if (req.body.subscription_plan) {
        updatePayload.subscription_plan  = req.body.subscription_plan;
        updatePayload.subscription_status = 'active';
        updatePayload.subscription_start = req.body.subscription_start ?? new Date().toISOString().split('T')[0];
        updatePayload.subscription_end   = req.body.subscription_end;
        updatePayload.amount_paid        = req.body.amount_paid ?? 0;
      }
    }
    if (req.body.notes) updatePayload.notes = req.body.notes;

    const { data, error } = await supabaseAdmin
      .from('gym_members')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select(`*, ${USER_JOIN}`)
      .single();

    if (error) {
      console.error('[UPDATE REQUEST] error:', error.message);
      return serverError(res, `Failed to update membership: ${error.message}`, error);
    }
    return ok(res, { membership: data });
  } catch (err) {
    return serverError(res, 'Membership update error', err);
  }
});

// GET /api/membership/members
router.get('/members', requireRole('gym_admin'), requireGymContext, async (req, res) => {
  try {
    const { status } = req.query;
    const gym_id = req.user.gym_id!;

    console.log(`[MEMBERS] gym_id=${gym_id} filter=${status ?? 'ALL'}`);

    let query = supabaseAdmin
      .from('gym_members')
      .select(`*, ${USER_JOIN}`)
      .eq('gym_id', gym_id)
      .order('created_at', { ascending: false });

    if (status && typeof status === 'string' && ['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[MEMBERS] fetch error:', error.message);
      return serverError(res, `Failed to fetch members: ${error.message}`, error);
    }

    console.log(`[MEMBERS] returning ${data?.length ?? 0} records`);
    return ok(res, { members: data ?? [] });
  } catch (err) {
    return serverError(res, 'Members fetch error', err);
  }
});

// PATCH /api/membership/members/:id
router.patch('/members/:id', requireRole('gym_admin'), requireGymContext, async (req, res) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from('gym_members')
      .select('id, gym_id')
      .eq('id', req.params.id)
      .single();

    if (!existing) return notFound(res, 'Member not found');
    if (existing.gym_id !== req.user.gym_id) return forbidden(res, 'Not your gym member');

    const { data, error } = await supabaseAdmin
      .from('gym_members')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select(`*, ${USER_JOIN}`)
      .single();

    if (error) {
      console.error('[UPDATE MEMBER] error:', error.message);
      return serverError(res, `Update failed: ${error.message}`, error);
    }
    return ok(res, { membership: data });
  } catch (err) {
    return serverError(res, 'Member update error', err);
  }
});

// POST /api/membership/admin-add
router.post('/admin-add', requireRole('gym_admin'), requireGymContext, async (req, res) => {
  try {
    const { full_name, email, phone, subscription_plan, subscription_start, amount_paid, notes } = req.body;
    const gym_id = req.user.gym_id!;

    if (!full_name || full_name.trim().length < 2)
      return badRequest(res, 'Full name is required (min 2 characters)');
    if (!email && !phone)
      return badRequest(res, 'Provide at least an email address or phone number');

    let user_id: string | null = null;

    // Try find by email
    if (email) {
      const { data: found } = await supabaseAdmin
        .from('users')
        .select('id')
        .ilike('email', email.trim())
        .maybeSingle();
      if (found) user_id = found.id;
    }

    // Try find by phone
    if (!user_id && phone) {
      const { data: found } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('phone', phone.trim().replace(/\s+/g, ''))
        .maybeSingle();
      if (found) user_id = found.id;
    }

    // Create new auth user if not found
    if (!user_id) {
      if (!email) return badRequest(res, 'Email is required to create a new member account');

      const tempPw = 'Atom@' + Math.random().toString(36).slice(-8).toUpperCase() + Math.floor(Math.random() * 90 + 10);

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        email_confirm: true,
        user_metadata: { full_name: full_name.trim(), phone: phone?.trim() || null },
        password: tempPw,
      });

      if (authError) {
        console.error('[ADMIN-ADD] auth.admin.createUser error:', authError.message);
        // Maybe user already exists in auth but not in public.users
        if (authError.message?.toLowerCase().includes('already') || authError.message?.toLowerCase().includes('exist')) {
          const { data: { users: allAuthUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
          const match = allAuthUsers.find((u: any) => u.email?.toLowerCase() === email.trim().toLowerCase());
          if (match) {
            user_id = match.id;
            // Ensure public.users row exists
            await supabaseAdmin.from('users').upsert({
              id: user_id, email: email.trim().toLowerCase(),
              full_name: full_name.trim(), phone: phone?.trim() || null, role: 'member',
            }, { onConflict: 'id' });
          } else {
            return serverError(res, `Cannot create user: ${authError.message}`);
          }
        } else {
          return serverError(res, `Failed to create user account: ${authError.message}`);
        }
      } else if (authData?.user) {
        user_id = authData.user.id;
        // Brief wait for the DB trigger to fire
        await new Promise(r => setTimeout(r, 700));
        // Upsert profile row in case trigger didn't fire
        await supabaseAdmin.from('users').upsert({
          id: user_id, email: email.trim().toLowerCase(),
          full_name: full_name.trim(), phone: phone?.trim() || null, role: 'member',
        }, { onConflict: 'id' });
      } else {
        return serverError(res, 'Failed to create user: no data returned');
      }
    }

    if (!user_id) return serverError(res, 'Could not resolve user_id');

    // Check existing membership
    const { data: existingMembership } = await supabaseAdmin
      .from('gym_members')
      .select('id, status')
      .eq('gym_id', gym_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingMembership?.status === 'approved')
      return conflict(res, 'This person is already an active member of your gym');

    const memberPayload = {
      status: 'approved',
      subscription_plan:  subscription_plan || 'monthly',
      subscription_status: 'active',
      subscription_start: subscription_start || new Date().toISOString().split('T')[0],
      amount_paid: Number(amount_paid) || 0,
      notes: notes?.trim() || null,
      approved_by: req.user.id,
      approved_at: new Date().toISOString(),
      updated_at:  new Date().toISOString(),
    };

    let data: any, error: any;

    if (existingMembership) {
      // Upgrade existing pending/rejected to approved
      ({ data, error } = await supabaseAdmin
        .from('gym_members')
        .update(memberPayload)
        .eq('id', existingMembership.id)
        .select(`*, ${USER_JOIN}`)
        .single());
    } else {
      // New membership
      ({ data, error } = await supabaseAdmin
        .from('gym_members')
        .insert({ gym_id, user_id, ...memberPayload })
        .select(`*, ${USER_JOIN}`)
        .single());
    }

    if (error) {
      console.error('[ADMIN-ADD] membership upsert error:', error.message);
      return serverError(res, `Failed to create membership: ${error.message}`, error);
    }

    return created(res, { membership: data, message: `${full_name} added as active member` });
  } catch (err: any) {
    console.error('[ADMIN-ADD] unexpected error:', err?.message);
    return serverError(res, `Add member failed: ${err?.message ?? 'Unknown error'}`, err);
  }
});

router.get('/stats', requireRole('gym_admin'), requireGymContext, async (req, res) => {
  try {
    const gym_id = req.user.gym_id!;
    const [totalRes, pendingRes, activeRes, expiredRes] = await Promise.all([
      supabaseAdmin.from('gym_members').select('id', { count: 'exact', head: true }).eq('gym_id', gym_id),
      supabaseAdmin.from('gym_members').select('id', { count: 'exact', head: true }).eq('gym_id', gym_id).eq('status', 'pending'),
      supabaseAdmin.from('gym_members').select('id', { count: 'exact', head: true }).eq('gym_id', gym_id).eq('status', 'approved'),
      supabaseAdmin.from('gym_members').select('id', { count: 'exact', head: true }).eq('gym_id', gym_id).eq('subscription_status', 'expired'),
    ]);
    return ok(res, {
      total_members:        totalRes.count   ?? 0,
      pending_requests:     pendingRes.count ?? 0,
      active_members:       activeRes.count  ?? 0,
      expired_subscriptions: expiredRes.count ?? 0,
    });
  } catch (err) {
    return serverError(res, 'Stats error', err);
  }
});

export default router;
