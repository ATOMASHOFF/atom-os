// apps/api/src/routes/qr.ts
// CRITICAL SECURITY ROUTES
// - Only gym_admin can view/manage QR tokens for their gym
// - Only supabaseAdmin (service role) writes to qr_tokens
// - Tokens are server-generated UUIDs, never client-provided
// - Partial unique index guarantees one active token per gym

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { supabaseAdmin } from '../utils/supabase';
import { ok, badRequest, serverError, forbidden, notFound } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { requireRole, requireGymContext } from '../middleware/roles';

const router = Router();
router.use(authMiddleware, requireRole('gym_admin'), requireGymContext);

/**
 * Creates or rotates the QR token for a gym.
 * - Deactivates any existing active token (partial unique index allows only one)
 * - Creates new token with TTL = gym.qr_rotation_interval_s
 */
async function rotateToken(gym_id: string): Promise<{
  token: string;
  expires_at: string;
  qr_data_url: string;
} | null> {
  // Concurrent rotates can race between deactivate and insert.
  // Retry on unique-constraint collisions from the partial unique index.
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { error: deactivateError } = await supabaseAdmin
      .from('qr_tokens')
      .update({ is_active: false })
      .eq('gym_id', gym_id)
      .eq('is_active', true);

    if (deactivateError) {
      return null;
    }

    // Get rotation interval from gym config
    const { data: gym, error: gymError } = await supabaseAdmin
      .from('gyms')
      .select('qr_rotation_interval_s')
      .eq('id', gym_id)
      .single();

    if (gymError) {
      return null;
    }

    const intervalSeconds = gym?.qr_rotation_interval_s ?? 180; // default 3 min
    const expires_at = new Date(Date.now() + intervalSeconds * 1000).toISOString();
    const token = uuidv4();

    const { data, error } = await supabaseAdmin
      .from('qr_tokens')
      .insert({
        gym_id,
        token,
        is_active: true,
        is_used: false,
        expires_at,
      })
      .select()
      .single();

    if (!error && data) {
      // Generate QR code as data URL (contains only the token UUID)
      // The gym_id is NOT in the QR — server validates gym context from the member's JWT
      const qr_data_url = await QRCode.toDataURL(token, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 400,
        color: { dark: '#000000', light: '#FFFFFF' },
      });

      return { token, expires_at, qr_data_url };
    }

    const isUniqueViolation =
      error?.code === '23505' ||
      /duplicate key value|unique/i.test(error?.message ?? '') ||
      /already exists/i.test(error?.details ?? '');

    if (!isUniqueViolation || attempt === maxAttempts) {
      return null;
    }
  }

  return null;
}

// GET /api/qr/current
// Returns current active token for the gym, auto-rotates if expired
router.get('/current', async (req, res) => {
  try {
    const gym_id = req.user.gym_id!;

    // Check for valid active token
    const { data: existing } = await supabaseAdmin
      .from('qr_tokens')
      .select('id, token, expires_at, is_active, is_used')
      .eq('gym_id', gym_id)
      .eq('is_active', true)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existing) {
      // Token still valid — regenerate QR image (never return raw token to client in prod)
      const qr_data_url = await QRCode.toDataURL(existing.token, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 400,
      });

      return ok(res, {
        token_id: existing.id,
        expires_at: existing.expires_at,
        qr_data_url,
        // Don't send raw token to frontend — QR image only
      });
    }

    // No valid token — rotate
    const result = await rotateToken(gym_id);
    if (!result) return serverError(res, 'Failed to generate QR token');

    return ok(res, {
      expires_at: result.expires_at,
      qr_data_url: result.qr_data_url,
      rotated: true,
    });
  } catch (err) {
    return serverError(res, 'QR fetch error', err);
  }
});

// POST /api/qr/rotate — force rotate (admin manually triggers)
router.post('/rotate', async (req, res) => {
  try {
    const gym_id = req.user.gym_id!;
    const result = await rotateToken(gym_id);
    if (!result) return serverError(res, 'Failed to rotate QR token');

    return ok(res, {
      expires_at: result.expires_at,
      qr_data_url: result.qr_data_url,
      rotated: true,
    });
  } catch (err) {
    return serverError(res, 'QR rotation error', err);
  }
});

// GET /api/qr/config — get/set rotation interval
router.get('/config', async (req, res) => {
  try {
    const { data: gym } = await supabaseAdmin
      .from('gyms')
      .select('id, qr_rotation_interval_s')
      .eq('id', req.user.gym_id!)
      .single();

    if (!gym) return notFound(res, 'Gym not found');
    return ok(res, { qr_rotation_interval_s: gym.qr_rotation_interval_s });
  } catch (err) {
    return serverError(res, 'QR config fetch error', err);
  }
});

// PATCH /api/qr/config — update rotation interval
router.patch('/config', async (req, res) => {
  try {
    const { qr_rotation_interval_s } = req.body;
    if (!qr_rotation_interval_s || qr_rotation_interval_s < 10 || qr_rotation_interval_s > 2592000) {
      return badRequest(res, 'Interval must be between 10 seconds and 30 days (2,592,000 seconds)');
    }

    const { data, error } = await supabaseAdmin
      .from('gyms')
      .update({ qr_rotation_interval_s, updated_at: new Date().toISOString() })
      .eq('id', req.user.gym_id!)
      .select('id, qr_rotation_interval_s')
      .single();

    if (error) return serverError(res, 'Config update failed', error);
    return ok(res, { qr_rotation_interval_s: data.qr_rotation_interval_s });
  } catch (err) {
    return serverError(res, 'QR config update error', err);
  }
});

export { rotateToken };
export default router;
