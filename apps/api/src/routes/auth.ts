// apps/api/src/routes/auth.ts

import { Router } from 'express';
import { supabase, supabaseAdmin } from '../utils/supabase';
import { ok, created, badRequest, serverError, unauthorized } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/roles';
import { SignupSchema, LoginSchema, UpdateProfileSchema } from '@atom-os/shared';

const router = Router();

// POST /api/auth/signup
// Public. Creates Supabase auth user. Trigger auto-creates public.users row.
router.post('/signup', validate(SignupSchema), async (req, res) => {
  try {
    const { email, phone, password, full_name } = req.body;

    // Create user with either email or phone
    const authParams: any = {
      password,
      options: {
        data: { full_name, ...(phone && { phone }) },
      },
    };

    if (email) authParams.email = email;
    if (phone && !email) authParams.phone = phone; // phone login only when no email

    const { data, error } = await supabase.auth.signUp(authParams);

    if (error) {
      if (error.message.includes('already registered')) {
        return badRequest(res, 'Email already registered');
      }
      return badRequest(res, error.message);
    }

    if (!data.user) {
      return serverError(res, 'Signup failed — no user returned');
    }

    return created(res, {
      message: 'Account created successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      // Note: session may be null if email confirmation is required in Supabase settings
      session: data.session,
    });
  } catch (err) {
    return serverError(res, 'Signup error', err);
  }
});

// POST /api/auth/login
router.post('/login', validate(LoginSchema), async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Detect if identifier is email or phone
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    const authParams: any = { password };
    if (isEmail) {
      authParams.email = identifier;
    } else {
      authParams.phone = identifier;
    }

    const { data, error } = await supabase.auth.signInWithPassword(authParams);

    if (error || !data.user || !data.session) {
      return unauthorized(res, 'Invalid email or password');
    }

    // Fetch role + profile from public.users
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, full_name')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      return serverError(res, 'Could not load user profile');
    }

    // For gym_admin, include their gym_id
    let gym_id: string | null = null;
    if (profile.role === 'gym_admin') {
      const { data: gym } = await supabaseAdmin
        .from('gyms')
        .select('id, name, gym_code')
        .eq('owner_id', data.user.id)
        .single();
      gym_id = gym?.id ?? null;
    }

    return ok(res, {
      user: { ...profile, gym_id },
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  } catch (err) {
    return serverError(res, 'Login error', err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return badRequest(res, 'refresh_token is required');

    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error || !data.session) return unauthorized(res, 'Invalid refresh token');

    return ok(res, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  } catch (err) {
    return serverError(res, 'Token refresh error', err);
  }
});

// GET /api/auth/me — protected
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) return serverError(res, 'Could not load profile');

    // Attach membership info for members
    let memberships = [];
    if (req.user.role === 'member') {
      const { data } = await supabaseAdmin
        .from('gym_members')
        .select('*, gym:gyms(id, name, gym_code, city, logo_url, status)')
        .eq('user_id', req.user.id);
      memberships = data ?? [];
    }

    return ok(res, { ...profile, gym_id: req.user.gym_id, memberships });
  } catch (err) {
    return serverError(res, 'Profile fetch error', err);
  }
});

// PATCH /api/auth/me — update own profile
router.patch('/me', authMiddleware, validate(UpdateProfileSchema), async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) return serverError(res, 'Profile update failed', error);
    return ok(res, data);
  } catch (err) {
    return serverError(res, 'Profile update error', err);
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (_req, res) => {
  // Supabase JWT is stateless. Client clears local tokens.
  // Optionally call supabase.auth.signOut() to revoke refresh token.
  return ok(res, { message: 'Logged out successfully' });
});

export default router;
