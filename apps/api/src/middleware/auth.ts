// apps/api/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import { unauthorized, serverError } from '../utils/response';
import type { UserRole } from '@atom-os/shared';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  gym_id?: string;
}

function normalizeRole(role: string | null | undefined): UserRole {
  const value = String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (value === 'super_admin' || value === 'superadmin') return 'super_admin';
  if (value === 'gym_admin' || value === 'gymadmin' || value === 'admin' || value === 'owner' || value === 'gym_owner') return 'gym_admin';
  if (value === 'member' || value === 'guest' || value === 'user' || value === 'client') return 'member';
  return 'member';
}

declare global {
  namespace Express {
    interface Request { user: AuthUser; }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      unauthorized(res, 'Missing authorization header');
      return;
    }

    const token = authHeader.split(' ')[1];

    // ✅ PROPER JWT VALIDATION: verifies signature, expiry and revocation status
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      unauthorized(res, 'Invalid or expired token');
      return;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[AUTH] Profile not found for user:', user.id, profileError?.message);
      unauthorized(res, 'User profile not found');
      return;
    }

    let gym_id: string | undefined;

    if (profile.role === 'gym_admin') {
      // Try owner_id match first
      const { data: gym, error: gymError } = await supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (gymError) {
        console.warn('[AUTH] gym lookup error for gym_admin:', gymError.message);
      }

      gym_id = gym?.id;

      if (!gym_id) {
        console.warn('[AUTH] gym_admin has no gym assigned. user_id:', user.id);
        // Don't block — requireGymContext will handle this gracefully
      }
    }

    const normalizedRole = normalizeRole(profile.role as string | null | undefined);

    req.user = {
      id: profile.id,
      email: profile.email,
      role: normalizedRole,
      full_name: profile.full_name,
      gym_id,
    };

    next();
  } catch (err) {
    serverError(res, 'Auth middleware error', err);
  }
}
