// apps/api/src/utils/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl      = process.env.SUPABASE_URL      ?? '';
const supabaseAnonKey  = process.env.SUPABASE_ANON_KEY ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  // Log clearly but don't crash at import — Express will still bind so
  // Railway health check passes. Routes will fail with 500 which is debuggable.
  console.error('[STARTUP] ⚠️  Missing Supabase env vars:',
    [
      !supabaseUrl       && 'SUPABASE_URL',
      !supabaseAnonKey   && 'SUPABASE_ANON_KEY',
      !supabaseServiceKey && 'SUPABASE_SERVICE_ROLE_KEY',
    ].filter(Boolean).join(', ')
  );
  console.error('[STARTUP] Set these in Railway → Variables tab.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder',
  { auth: { autoRefreshToken: false, persistSession: false } }
);
