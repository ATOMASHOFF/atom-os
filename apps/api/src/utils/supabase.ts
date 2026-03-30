// apps/api/src/utils/supabase.ts
// Two clients:
//   supabase      = anon key (respects RLS — for reads that should be role-scoped)
//   supabaseAdmin = service_role key (bypasses RLS — for server-side writes like check-ins, QR)

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Anon client — used for auth verification, RLS-respecting reads
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client — bypasses RLS. ONLY for server-side privileged operations.
// NEVER expose this client to the frontend.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
