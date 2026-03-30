// packages/shared/src/validators/index.ts
// Zod schemas — used in API (request validation) AND web (form validation)

import { z } from 'zod';

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const UpdateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional().nullable(),
  height_cm: z.number().min(50).max(300).optional().nullable(),
  weight_kg: z.number().min(20).max(500).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
});

// ─── GYMS ─────────────────────────────────────────────────────────────────────

export const CreateGymSchema = z.object({
  name: z.string().min(2, 'Gym name required').max(100),
  description: z.string().max(500).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(10).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  qr_rotation_interval_s: z.number().min(10).max(3600).default(180),
});

export const UpdateGymSchema = CreateGymSchema.partial();

export const UpdateGymStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended']),
});

export const AssignAdminSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
});

// ─── MEMBERSHIP ───────────────────────────────────────────────────────────────

export const JoinGymSchema = z.object({
  gym_code: z.string().length(6, 'Gym code must be exactly 6 characters').toUpperCase(),
});

export const UpdateMembershipSchema = z.object({
  status: z.enum(['approved', 'rejected', 'suspended']),
  notes: z.string().max(500).optional(),
  subscription_plan: z.enum(['monthly', 'quarterly', 'annual', 'pay_as_you_go']).optional(),
  subscription_start: z.string().optional(),
  subscription_end: z.string().optional(),
  amount_paid: z.number().min(0).optional(),
});

// ─── QR ───────────────────────────────────────────────────────────────────────

export const ScanQRSchema = z.object({
  token: z.string().uuid('Invalid QR token format'),
});

// ─── WORKOUTS ─────────────────────────────────────────────────────────────────

export const CreateWorkoutLogSchema = z.object({
  title: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  workout_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  gym_id: z.string().uuid().optional().nullable(),
});

export const UpdateWorkoutLogSchema = CreateWorkoutLogSchema.partial().extend({
  is_completed: z.boolean().optional(),
  duration_min: z.number().min(1).max(1440).optional(),
});

export const CreateWorkoutSetSchema = z.object({
  exercise_id: z.string().uuid('Invalid exercise ID'),
  set_number: z.number().int().min(1).max(100),
  reps: z.number().int().min(0).max(9999).optional(),
  weight_kg: z.number().min(0).max(9999).optional(),
  duration_sec: z.number().int().min(0).optional(),
  distance_m: z.number().min(0).optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(200).optional(),
});

// ─── EXERCISES ────────────────────────────────────────────────────────────────

export const CreateExerciseSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio', 'full_body', 'other']),
  equipment: z.enum(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'resistance_band', 'other']),
  muscle_groups: z.array(z.string()).optional(),
  instructions: z.string().max(2000).optional(),
});

// ─── QUERY PARAMS ─────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CheckinQuerySchema = PaginationSchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  user_id: z.string().uuid().optional(),
});

// Type exports from schemas
export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateGymInput = z.infer<typeof CreateGymSchema>;
export type UpdateGymInput = z.infer<typeof UpdateGymSchema>;
export type JoinGymInput = z.infer<typeof JoinGymSchema>;
export type UpdateMembershipInput = z.infer<typeof UpdateMembershipSchema>;
export type CreateWorkoutLogInput = z.infer<typeof CreateWorkoutLogSchema>;
export type CreateWorkoutSetInput = z.infer<typeof CreateWorkoutSetSchema>;
export type CreateExerciseInput = z.infer<typeof CreateExerciseSchema>;
export type ScanQRInput = z.infer<typeof ScanQRSchema>;
