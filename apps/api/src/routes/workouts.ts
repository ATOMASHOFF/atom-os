// apps/api/src/routes/workouts.ts
// B2C core: members log workouts (sets, reps, weight)
// RLS enforces user isolation. All queries also filter by user_id for safety.

import { Router } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import {
  ok, created, badRequest, notFound, serverError, forbidden,
} from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/roles';
import {
  CreateWorkoutLogSchema,
  UpdateWorkoutLogSchema,
  CreateWorkoutSetSchema,
  CreateExerciseSchema,
} from '@atom-os/shared';

const router = Router();
router.use(authMiddleware); // All workout routes require auth

// ─── EXERCISES ────────────────────────────────────────────────────────────────

// GET /api/workouts/exercises — global + own exercises
router.get('/exercises', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('exercises')
      .select('*')
      .or(`is_global.eq.true,created_by.eq.${req.user.id}`)
      .order('name');

    if (error) return serverError(res, 'Failed to fetch exercises', error);
    return ok(res, { exercises: data ?? [] });
  } catch (err) {
    return serverError(res, 'Exercise fetch error', err);
  }
});

// POST /api/workouts/exercises — create custom exercise
router.post('/exercises', validate(CreateExerciseSchema), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('exercises')
      .insert({
        ...req.body,
        is_global: false,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) return serverError(res, 'Failed to create exercise', error);
    return created(res, { exercise: data });
  } catch (err) {
    return serverError(res, 'Exercise creation error', err);
  }
});

// ─── WORKOUT LOGS ─────────────────────────────────────────────────────────────

// GET /api/workouts — member's workout log history
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, month } = req.query as {
      page?: number; limit?: number; month?: string;
    };
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('workout_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('workout_date', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    // Filter by month: YYYY-MM
    if (month && /^\d{4}-\d{2}$/.test(month as string)) {
      query = query
        .gte('workout_date', `${month}-01`)
        .lte('workout_date', `${month}-31`);
    }

    const { data, error, count } = await query;
    if (error) return serverError(res, 'Failed to fetch workouts', error);

    return ok(res, {
      logs: data ?? [],
      total: count ?? 0,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    return serverError(res, 'Workout list error', err);
  }
});

// POST /api/workouts — start a new workout session
router.post('/', validate(CreateWorkoutLogSchema), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('workout_logs')
      .insert({
        ...req.body,
        user_id: req.user.id,
      })
      .select()
      .single();

    if (error) return serverError(res, 'Failed to create workout', error);
    return created(res, { log: data });
  } catch (err) {
    return serverError(res, 'Workout creation error', err);
  }
});

// GET /api/workouts/:id — single workout with all sets
router.get('/:id', async (req, res) => {
  try {
    const { data: log, error: logError } = await supabaseAdmin
      .from('workout_logs')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id) // Ownership check
      .single();

    if (logError || !log) return notFound(res, 'Workout not found');

    const { data: sets, error: setsError } = await supabaseAdmin
      .from('workout_sets')
      .select('*, exercise:exercises(id, name, category, equipment, muscle_groups)')
      .eq('workout_log_id', req.params.id)
      .order('set_number');

    if (setsError) return serverError(res, 'Failed to fetch sets', setsError);

    return ok(res, { log, sets: sets ?? [] });
  } catch (err) {
    return serverError(res, 'Workout fetch error', err);
  }
});

// PATCH /api/workouts/:id — update log (title, notes, complete it)
router.patch('/:id', validate(UpdateWorkoutLogSchema), async (req, res) => {
  try {
    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('workout_logs')
      .select('id, user_id')
      .eq('id', req.params.id)
      .single();

    if (!existing) return notFound(res, 'Workout not found');
    if (existing.user_id !== req.user.id) return forbidden(res, 'Not your workout');

    const updatePayload = { ...req.body, updated_at: new Date().toISOString() };
    if (req.body.is_completed && !req.body.completed_at) {
      updatePayload.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('workout_logs')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return serverError(res, 'Update failed', error);
    return ok(res, { log: data });
  } catch (err) {
    return serverError(res, 'Workout update error', err);
  }
});

// DELETE /api/workouts/:id
router.delete('/:id', async (req, res) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from('workout_logs')
      .select('id, user_id')
      .eq('id', req.params.id)
      .single();

    if (!existing) return notFound(res, 'Workout not found');
    if (existing.user_id !== req.user.id) return forbidden(res, 'Not your workout');

    await supabaseAdmin.from('workout_logs').delete().eq('id', req.params.id);
    return ok(res, { message: 'Workout deleted' });
  } catch (err) {
    return serverError(res, 'Workout delete error', err);
  }
});

// ─── WORKOUT SETS ─────────────────────────────────────────────────────────────

// POST /api/workouts/:id/sets — add a set to a workout
router.post('/:id/sets', validate(CreateWorkoutSetSchema), async (req, res) => {
  try {
    // Verify workout ownership
    const { data: log } = await supabaseAdmin
      .from('workout_logs')
      .select('id, user_id')
      .eq('id', req.params.id)
      .single();

    if (!log) return notFound(res, 'Workout not found');
    if (log.user_id !== req.user.id) return forbidden(res, 'Not your workout');

    // Verify exercise exists
    const { data: exercise } = await supabaseAdmin
      .from('exercises')
      .select('id')
      .eq('id', req.body.exercise_id)
      .single();

    if (!exercise) return notFound(res, 'Exercise not found');

    const { data, error } = await supabaseAdmin
      .from('workout_sets')
      .insert({
        ...req.body,
        workout_log_id: req.params.id,
      })
      .select('*, exercise:exercises(id, name, category)')
      .single();

    if (error) return serverError(res, 'Failed to add set', error);
    return created(res, { set: data });
  } catch (err) {
    return serverError(res, 'Set creation error', err);
  }
});

// DELETE /api/workouts/:id/sets/:setId
router.delete('/:id/sets/:setId', async (req, res) => {
  try {
    // Verify workout ownership (via join)
    const { data: set } = await supabaseAdmin
      .from('workout_sets')
      .select('id, workout_log:workout_logs(user_id)')
      .eq('id', req.params.setId)
      .eq('workout_log_id', req.params.id)
      .single();

    if (!set) return notFound(res, 'Set not found');

    const log = set.workout_log as unknown as { user_id: string } | null;
    if (log?.user_id !== req.user.id) return forbidden(res, 'Not your set');

    await supabaseAdmin.from('workout_sets').delete().eq('id', req.params.setId);
    return ok(res, { message: 'Set deleted' });
  } catch (err) {
    return serverError(res, 'Set delete error', err);
  }
});

// GET /api/workouts/stats/summary — member's fitness summary
router.get('/stats/summary', async (req, res) => {
  try {
    const user_id = req.user.id;

    const [totalLogsRes, thisWeekRes, thisMonthRes] = await Promise.all([
      supabaseAdmin
        .from('workout_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user_id)
        .eq('is_completed', true),
      supabaseAdmin
        .from('workout_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user_id)
        .gte('workout_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]),
      supabaseAdmin
        .from('workout_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user_id)
        .gte('workout_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
    ]);

    return ok(res, {
      total_workouts: totalLogsRes.count ?? 0,
      workouts_this_week: thisWeekRes.count ?? 0,
      workouts_this_month: thisMonthRes.count ?? 0,
    });
  } catch (err) {
    return serverError(res, 'Stats error', err);
  }
});

export default router;
