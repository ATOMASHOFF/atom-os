// apps/api/src/middleware/auth.ts
// Validates Supabase JWT on every protected route.
// Attaches req.user = { id, email, role, gym_id } for downstream use.

import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../utils/supabase.js';
import { unauthorized, serverError } from '../utils/response.js';
import type { UserRole } from '@atom-os/shared';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  gym_id?: string;
}

// Extend Express Request to carry our user
declare global {
  namespace Express {
    interface Request {
      user: AuthUser;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      unauthorized(res, 'Missing authorization header');
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      unauthorized(res, 'Invalid or expired token');
      return;
    }

    // Fetch full profile from public.users (includes role and gym context)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      unauthorized(res, 'User profile not found');
      return;
    }

    // For gym_admin: get their gym_id from the gyms table
    let gym_id: string | undefined;
    if (profile.role === 'gym_admin') {
      const { data: gym } = await supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .single();
      gym_id = gym?.id;
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      role: profile.role as UserRole,
      full_name: profile.full_name,
      gym_id,
    };

    next();
  } catch (err) {
    serverError(res, 'Auth middleware error', err);
  }
}
