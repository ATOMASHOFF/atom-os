// apps/api/src/routes/admin.ts
// Super Admin only — global platform stats + oversight

import { Router } from 'express';
import { supabaseAdmin } from '../utils/supabase.js';
import { ok, serverError } from '../utils/response.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();
router.use(authMiddleware, requireRole('super_admin'));

// GET /api/admin/stats — global KPIs
router.get('/stats', async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      totalGymsRes,
      activeGymsRes,
      totalMembersRes,
      checkinsRes,
      newMembersRes,
      pendingRequestsRes,
    ] = await Promise.all([
      supabaseAdmin.from('gyms').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('gyms').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'member'),
      supabaseAdmin.from('checkins').select('id', { count: 'exact', head: true })
        .gte('checked_in_at', `${today}T00:00:00.000Z`)
        .lte('checked_in_at', `${today}T23:59:59.999Z`),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true })
        .eq('role', 'member')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabaseAdmin.from('gym_members').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    return ok(res, {
      total_gyms: totalGymsRes.count ?? 0,
      active_gyms: activeGymsRes.count ?? 0,
      total_members: totalMembersRes.count ?? 0,
      total_checkins_today: checkinsRes.count ?? 0,
      new_members_this_month: newMembersRes.count ?? 0,
      pending_membership_requests: pendingRequestsRes.count ?? 0,
    });
  } catch (err) {
    return serverError(res, 'Stats fetch error', err);
  }
});

// GET /api/admin/gyms — all gyms with per-gym stats
router.get('/gyms', async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: gyms, error } = await supabaseAdmin
      .from('gyms')
      .select(`
        *,
        owner:users!gyms_owner_id_fkey(id, email, full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) return serverError(res, 'Failed to fetch gyms', error);

    // For each gym, get today's checkin count and pending requests
    const gymIds = (gyms ?? []).map(g => g.id);
    
    const [checkinsRes, pendingRes] = await Promise.all([
      supabaseAdmin
        .from('checkins')
        .select('gym_id')
        .in('gym_id', gymIds)
        .gte('checked_in_at', `${today}T00:00:00.000Z`),
      supabaseAdmin
        .from('gym_members')
        .select('gym_id')
        .in('gym_id', gymIds)
        .eq('status', 'pending'),
    ]);

    // Group by gym_id
    const checkinsByGym: Record<string, number> = {};
    const pendingByGym: Record<string, number> = {};

    (checkinsRes.data ?? []).forEach(c => {
      checkinsByGym[c.gym_id] = (checkinsByGym[c.gym_id] ?? 0) + 1;
    });
    (pendingRes.data ?? []).forEach(p => {
      pendingByGym[p.gym_id] = (pendingByGym[p.gym_id] ?? 0) + 1;
    });

    const enriched = (gyms ?? []).map(gym => ({
      ...gym,
      checkins_today: checkinsByGym[gym.id] ?? 0,
      pending_requests: pendingByGym[gym.id] ?? 0,
    }));

    return ok(res, { gyms: enriched });
  } catch (err) {
    return serverError(res, 'Gym list error', err);
  }
});

// GET /api/admin/users — all users (paginated)
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 50, role, search } = req.query as {
      page?: number; limit?: number; role?: string; search?: string;
    };
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, is_active, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (role) query = query.eq('role', role);
    if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);

    const { data, error, count } = await query;
    if (error) return serverError(res, 'Failed to fetch users', error);

    return ok(res, {
      users: data ?? [],
      total: count ?? 0,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    return serverError(res, 'User list error', err);
  }
});

// PATCH /api/admin/users/:id/role — change user role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['super_admin', 'gym_admin', 'member'];
    if (!validRoles.includes(role)) {
      return serverError(res, 'Invalid role');
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('id, email, role, full_name')
      .single();

    if (error) return serverError(res, 'Role update failed', error);
    return ok(res, { user: data });
  } catch (err) {
    return serverError(res, 'Role update error', err);
  }
});

export default router;
