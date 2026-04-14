// apps/api/src/routes/admin.ts
// Super Admin only — global platform stats, gym oversight, all-members view

import { Router } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import { badRequest, forbidden, notFound, ok, serverError } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();
router.use(authMiddleware);

// GET /api/admin/stats
router.get('/stats', requireRole('super_admin'), async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [totalGymsRes, activeGymsRes, totalMembersRes, checkinsRes, newMembersRes, pendingRequestsRes] =
      await Promise.all([
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

// GET /api/admin/gyms — all gyms with enriched stats
router.get('/gyms', requireRole('super_admin'), async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: gyms, error } = await supabaseAdmin
      .from('gyms')
      .select('*, owner:users!gyms_owner_id_fkey(id, email, full_name)')
      .order('created_at', { ascending: false });

    if (error) return serverError(res, 'Failed to fetch gyms', error);

    const gymIds = (gyms ?? []).map(g => g.id);

    const [checkinsRes, pendingRes] = await Promise.all([
      supabaseAdmin.from('checkins').select('gym_id').in('gym_id', gymIds)
        .gte('checked_in_at', `${today}T00:00:00.000Z`),
      supabaseAdmin.from('gym_members').select('gym_id').in('gym_id', gymIds).eq('status', 'pending'),
    ]);

    const checkinsByGym: Record<string, number> = {};
    const pendingByGym: Record<string, number> = {};

    (checkinsRes.data ?? []).forEach(c => { checkinsByGym[c.gym_id] = (checkinsByGym[c.gym_id] ?? 0) + 1; });
    (pendingRes.data ?? []).forEach(p => { pendingByGym[p.gym_id] = (pendingByGym[p.gym_id] ?? 0) + 1; });

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

// GET /api/admin/users — all platform users (paginated + filtered)
router.get('/users', requireRole('super_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, role, search } = req.query as {
      page?: number; limit?: number; role?: string; search?: string;
    };
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, phone, is_active, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (role) query = query.eq('role', role);
    if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);

    const { data, error, count } = await query;
    if (error) return serverError(res, 'Failed to fetch users', error);

    return ok(res, { users: data ?? [], total: count ?? 0, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return serverError(res, 'User list error', err);
  }
});

// GET /api/admin/members 
// ✅ Super Admin: sees ALL members across entire platform
// ✅ Gym Admin: sees ONLY members registered under their own gym
// Supports filters: gym_id, status, search, page
router.get('/members', requireRole('super_admin', 'gym_admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      gym_id,
      status,
      search,
    } = req.query as {
      page?: number; limit?: number;
      gym_id?: string; status?: string; search?: string;
    };
    const offset = (Number(page) - 1) * Number(limit);

    // gym_members has two FKs to users — must specify which one
    let query = supabaseAdmin
      .from('gym_members')
      .select(
        `id, status, subscription_plan, subscription_status, subscription_start, subscription_end,
         amount_paid, joined_at, created_at, updated_at,
         user:users!gym_members_user_id_fkey(id, email, full_name, phone, created_at),
         gym:gyms(id, name, gym_code, city, status)`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    // Role based filtering
    if (req.user.role === 'gym_admin') {
      // Gym Admin can ONLY see members from their own gym
      query = query.eq('gym_id', req.user.gym_id!);
    } else if (gym_id) {
      // Super Admin can filter by any gym if requested
      query = query.eq('gym_id', gym_id);
    }
    if (status && ['pending', 'approved', 'rejected', 'suspended'].includes(status as string)) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[ADMIN MEMBERS] error:', error.message);
      return serverError(res, `Failed to fetch members: ${error.message}`, error);
    }

    // If search provided, filter in-memory (Supabase doesn't easily do nested field search)
    let results = data ?? [];
    if (search) {
      const q = (search as string).toLowerCase();
      results = results.filter((m: any) =>
        m.user?.full_name?.toLowerCase().includes(q) ||
        m.user?.email?.toLowerCase().includes(q) ||
        m.user?.phone?.toLowerCase().includes(q) ||
        m.gym?.name?.toLowerCase().includes(q)
      );
    }

    return ok(res, {
      members: results,
      total: count ?? 0,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    return serverError(res, 'Admin members error', err);
  }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', requireRole('super_admin'), async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['super_admin', 'gym_admin', 'member'];
    if (!validRoles.includes(role)) return serverError(res, 'Invalid role');

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

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const targetUserId = req.params.id;

    if (targetUserId === req.user.id) {
      return badRequest(res, 'You cannot delete your own account');
    }

    const { data: targetUser, error: targetLookupError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', targetUserId)
      .maybeSingle();

    if (targetLookupError) {
      return serverError(res, 'Failed to load target user', targetLookupError);
    }

    if (!targetUser) {
      return notFound(res, 'User not found');
    }

    if (targetUser.role === 'super_admin') {
      return forbidden(res, 'Super admin users cannot be deleted');
    }

    // Delete from auth.users (this cascades to all user related data)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (error) return serverError(res, 'User delete failed', error);
    return ok(res, { success: true, message: 'User deleted successfully' });
  } catch (err) {
    return serverError(res, 'User delete error', err);
  }
});

// DELETE /api/admin/gyms/:id
router.delete('/gyms/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('gyms')
      .delete()
      .eq('id', req.params.id);

    if (error) return serverError(res, 'Gym delete failed', error);
    return ok(res, { success: true, message: 'Gym deleted successfully' });
  } catch (err) {
    return serverError(res, 'Gym delete error', err);
  }
});

export default router;
