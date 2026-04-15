// apps/api/src/routes/auth.ts

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { supabase, supabaseAdmin } from '../utils/supabase';
import { ok, created, badRequest, serverError, unauthorized } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/roles';
import { SignupSchema, LoginSchema, UpdateProfileSchema } from '@atom-os/shared';

const router = Router();

const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Please wait.', code: 'AUTH_RATE_LIMITED' },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many refresh attempts. Please wait.', code: 'REFRESH_RATE_LIMITED' },
});

function normalizeRole(role: string | null | undefined): 'super_admin' | 'gym_admin' | 'member' {
  const value = String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (value === 'super_admin' || value === 'superadmin') return 'super_admin';
  if (value === 'gym_admin' || value === 'gymadmin' || value === 'admin' || value === 'owner' || value === 'gym_owner') return 'gym_admin';
  if (value === 'member' || value === 'guest' || value === 'user' || value === 'client') return 'member';
  return 'member';
}

// POST /api/auth/signup
// Public. Creates Supabase auth user. Trigger auto-creates public.users row.
router.post('/signup', authAttemptLimiter, validate(SignupSchema), async (req, res) => {
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
router.post('/login', authAttemptLimiter, validate(LoginSchema), async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const rawIdentifier = String(identifier ?? '').trim();

    // Detect if identifier is email or phone
    // Validate identifier format here with a clear message
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawIdentifier);
    const isPhone = /^\+?[0-9\s\-().]{7,20}$/.test(rawIdentifier);
    if (!isEmail && !isPhone) {
      return badRequest(res, 'Enter a valid email address or phone number');
    }

    const email = rawIdentifier.toLowerCase();
    const normalizedPhone = rawIdentifier.replace(/[\s\-().]/g, '');

    // Try primary + fallback sign-in paths so login works consistently
    // even if users type formatted phone numbers or phone auth is disabled.
    let sessionData: any = null;

    if (isEmail) {
      const { data } = await supabase.auth.signInWithPassword({ email, password });
      sessionData = data;
    } else {
      const phoneCandidates = Array.from(new Set([
        normalizedPhone,
        normalizedPhone.startsWith('+') ? normalizedPhone.slice(1) : `+${normalizedPhone}`,
      ])).filter(Boolean);

      for (const candidate of phoneCandidates) {
        const { data } = await supabase.auth.signInWithPassword({ phone: candidate, password });
        if (data?.user && data?.session) {
          sessionData = data;
          break;
        }
      }

      if (!sessionData?.user || !sessionData?.session) {
        // Fallback: resolve phone -> email from profile table, then login by email.
        const phoneMatches = Array.from(new Set([
          normalizedPhone,
          normalizedPhone.startsWith('+') ? normalizedPhone.slice(1) : normalizedPhone,
          normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`,
        ]));

        let profileByPhone: { email?: string | null } | null = null;
        for (const phoneValue of phoneMatches) {
          const { data } = await supabaseAdmin
            .from('users')
            .select('email')
            .eq('phone', phoneValue)
            .maybeSingle();
          if (data?.email) {
            profileByPhone = data;
            break;
          }
        }

        if (profileByPhone?.email) {
          const { data } = await supabase.auth.signInWithPassword({
            email: profileByPhone.email.toLowerCase(),
            password,
          });
          sessionData = data;
        }
      }
    }

    if (!sessionData?.user || !sessionData?.session) {
      return unauthorized(res, 'Invalid email or password');
    }

    // Fetch role + profile from public.users
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, full_name')
      .eq('id', sessionData.user.id)
      .single();

    if (profileError || !profile) {
      return serverError(res, 'Could not load user profile');
    }

    // For gym_admin, include their gym_id
    let gym_id: string | null = null;
    const userRole = normalizeRole(profile.role as string | null | undefined);
    if (userRole === 'gym_admin') {
      const { data: gym } = await supabaseAdmin
        .from('gyms')
        .select('id, name, gym_code')
        .eq('owner_id', sessionData.user.id)
        .maybeSingle();
      gym_id = gym?.id ?? null;
    }

    return ok(res, {
      user: { ...profile, gym_id },
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_at: sessionData.session.expires_at,
    });
  } catch (err) {
    return serverError(res, 'Login error', err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', refreshLimiter, async (req, res) => {
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
