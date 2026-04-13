// apps/api/src/routes/announcements.ts
// Gym admin manages announcements; members can read them

import { Router } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import { ok, created, badRequest, notFound, serverError, forbidden } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { requireRole, requireGymContext } from '../middleware/roles';

const router = Router();
router.use(authMiddleware);

// GET /api/announcements — gym_admin gets all, member gets active ones for their gyms
router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'gym_admin') {
      if (!req.user.gym_id) return ok(res, { announcements: [] });

      const { data, error } = await supabaseAdmin
        .from('announcements')
        .select('*')
        .eq('gym_id', req.user.gym_id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) return serverError(res, 'Failed to fetch announcements', error);
      return ok(res, { announcements: data ?? [] });
    }

    if (req.user.role === 'member') {
      // Get member's approved gym IDs
      const { data: memberships } = await supabaseAdmin
        .from('gym_members')
        .select('gym_id')
        .eq('user_id', req.user.id)
        .eq('status', 'approved');

      const gymIds = (memberships ?? []).map((m: any) => m.gym_id);
      if (gymIds.length === 0) return ok(res, { announcements: [] });

      const now = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from('announcements')
        .select('*')
        .in('gym_id', gymIds)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) return serverError(res, 'Failed to fetch announcements', error);
      return ok(res, { announcements: data ?? [] });
    }

    return ok(res, { announcements: [] });
  } catch (err) {
    return serverError(res, 'Announcements fetch error', err);
  }
});

// POST /api/announcements — gym_admin creates announcement
router.post('/',
  requireRole('gym_admin'), requireGymContext,
  async (req, res) => {
    try {
      const { title, message, type = 'info', is_pinned = false, expires_at } = req.body;

      if (!title || !message) return badRequest(res, 'Title and message are required');

      const validTypes = ['info', 'warning', 'success', 'urgent'];
      if (!validTypes.includes(type)) return badRequest(res, `Type must be one of: ${validTypes.join(', ')}`);

      const { data, error } = await supabaseAdmin
        .from('announcements')
        .insert({
          gym_id: req.user.gym_id!,
          created_by: req.user.id,
          title,
          message,
          type,
          is_pinned,
          is_active: true,
          expires_at: expires_at || null,
        })
        .select()
        .single();

      if (error) return serverError(res, 'Failed to create announcement', error);
      return created(res, { announcement: data });
    } catch (err) {
      return serverError(res, 'Create announcement error', err);
    }
  }
);

// PATCH /api/announcements/:id — update announcement
router.patch('/:id',
  requireRole('gym_admin'), requireGymContext,
  async (req, res) => {
    try {
      const { data: existing } = await supabaseAdmin
        .from('announcements')
        .select('id, gym_id')
        .eq('id', req.params.id)
        .single();

      if (!existing) return notFound(res, 'Announcement not found');
      if (existing.gym_id !== req.user.gym_id) return forbidden(res, 'Not your announcement');

      const { data, error } = await supabaseAdmin
        .from('announcements')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) return serverError(res, 'Update failed', error);
      return ok(res, { announcement: data });
    } catch (err) {
      return serverError(res, 'Update announcement error', err);
    }
  }
);

// DELETE /api/announcements/:id
router.delete('/:id',
  requireRole('gym_admin'), requireGymContext,
  async (req, res) => {
    try {
      const { data: existing } = await supabaseAdmin
        .from('announcements')
        .select('id, gym_id')
        .eq('id', req.params.id)
        .single();

      if (!existing) return notFound(res, 'Announcement not found');
      if (existing.gym_id !== req.user.gym_id) return forbidden(res, 'Not your announcement');

      await supabaseAdmin.from('announcements').delete().eq('id', req.params.id);
      return ok(res, { message: 'Announcement deleted' });
    } catch (err) {
      return serverError(res, 'Delete announcement error', err);
    }
  }
);

export default router;
