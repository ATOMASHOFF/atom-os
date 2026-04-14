// packages/shared/src/types/index.ts
// Central TypeScript types shared between API and web

export type UserRole = 'super_admin' | 'gym_admin' | 'member';
export type GymStatus = 'active' | 'inactive' | 'suspended' | 'trial';
export type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type SubscriptionPlan = 'monthly' | 'quarterly' | 'annual' | 'pay_as_you_go';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'trial';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  height_cm?: number;
  weight_kg?: number;
  bio?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Gym {
  id: string;
  owner_id: string;
  name: string;
  gym_code: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  pincode?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  status: GymStatus;
  qr_rotation_interval_s: number;
  total_members: number;
  total_checkins: number;
  created_at: string;
  updated_at: string;
}

export interface GymMember {
  id: string;
  gym_id: string;
  user_id: string;
  status: MembershipStatus;
  subscription_plan?: SubscriptionPlan;
  subscription_status?: SubscriptionStatus;
  subscription_start?: string;
  subscription_end?: string;
  amount_paid: number;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: User;
  gym?: Gym;
}

export interface QRToken {
  id: string;
  gym_id: string;
  token: string;
  is_active: boolean;
  is_used: boolean;
  created_at: string;
  expires_at: string;
  used_at?: string;
  used_by?: string;
}

export interface Checkin {
  id: string;
  gym_id: string;
  user_id: string;
  qr_token_id: string;
  checked_in_at: string;
  created_at: string;
  // Joined
  user?: User;
  gym?: Gym;
}

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  category: string;
  equipment: string;
  muscle_groups?: string[];
  instructions?: string;
  video_url?: string;
  image_url?: string;
  is_global: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  gym_id?: string;
  title?: string;
  notes?: string;
  workout_date: string;
  duration_min?: number;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Joined
  sets?: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  workout_log_id: string;
  exercise_id: string;
  set_number: number;
  reps?: number;
  weight_kg?: number;
  duration_sec?: number;
  distance_m?: number;
  rpe?: number;
  notes?: string;
  created_at: string;
  // Joined
  exercise?: Exercise;
}

// API response wrappers
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  gym_id?: string; // for gym_admin
}

export interface LoginResponse {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
}

// Super admin stats
export interface GlobalStats {
  total_gyms: number;
  active_gyms: number;
  total_members: number;
  total_checkins_today: number;
  new_members_this_month: number;
}

export interface GymStats {
  gym: Gym;
  member_count: number;
  checkins_today: number;
  checkins_this_week: number;
  pending_requests: number;
}

// ─── AI WORKOUT PLAN ──────────────────────────────────────────────────────

export interface PlanExercise {
  exercise_name: string;
  exercise_id: string | null;
  sets: number;
  reps: string;
  rest_sec: number;
  notes: string;
  category: string | null;
  equipment: string | null;
}

export interface PlanDay {
  day_number: number;
  label: string;
  focus: string;
  exercises: PlanExercise[];
}

export interface WorkoutPlan {
  title: string;
  description: string;
  duration_weeks: number;
  days: PlanDay[];
  tips: string[];
}

export interface MembershipPlan {
  id: string;
  gym_id: string;
  name: string;
  duration_days: number;
  price: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberSubscription {
  id: string;
  gym_id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
  payment_status: 'paid' | 'pending' | 'failed';
  created_at: string;
  plan?: MembershipPlan;
}
