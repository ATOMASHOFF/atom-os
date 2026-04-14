// apps/api/src/middleware/roles.ts
// Role-based access control. Applied AFTER authMiddleware.
// Usage: router.get('/route', authMiddleware, requireRole('gym_admin'), handler)

import { Request, Response, NextFunction } from 'express';
import { forbidden, validationError } from '../utils/response';
import { ZodSchema } from 'zod';
import type { UserRole } from '@atom-os/shared';

/**
 * Require one or more roles. If user's role is not in the list, return 403.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      forbidden(res, 'Not authenticated');
      return;
    }
    if (!roles.includes(req.user.role)) {
      forbidden(res, `Access denied. Required role: ${roles.join(' or ')}`);
      return;
    }
    next();
  };
}

/**
 * Require that the gym_admin has a gym_id (i.e., is assigned to a gym).
 * Prevents orphan gym_admin accounts from accessing gym routes.
 */
export function requireGymContext(req: Request, res: Response, next: NextFunction): void {
  if (req.user.role === 'gym_admin' && !req.user.gym_id) {
    forbidden(res, 'Gym admin is not assigned to any gym');
    return;
  }
  next();
}

/**
 * Validate Zod schema on req.body. Returns 400 with field errors on failure.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const flattened = result.error.flatten();
      // Surface both field-level and object-level Zod errors to the client.
      const errors = {
        ...flattened.fieldErrors,
        ...(flattened.formErrors.length > 0 ? { formErrors: flattened.formErrors } : {}),
      };
      validationError(res, errors);
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const flattened = result.error.flatten();
      const errors = {
        ...flattened.fieldErrors,
        ...(flattened.formErrors.length > 0 ? { formErrors: flattened.formErrors } : {}),
      };
      validationError(res, errors);
      return;
    }
    req.query = result.data as typeof req.query;
    next();
  };
}
