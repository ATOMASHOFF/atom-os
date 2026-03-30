#!/usr/bin/env node
// scripts/setup.js
// Interactive setup helper for Atom OS local development
// Run with: node scripts/setup.js

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const C = {
  gold:  '\x1b[33m',
  green: '\x1b[32m',
  red:   '\x1b[31m',
  gray:  '\x1b[90m',
  bold:  '\x1b[1m',
  reset: '\x1b[0m',
};

const log  = (msg) => console.log(msg);
const ok   = (msg) => console.log(`${C.green}✅ ${msg}${C.reset}`);
const warn = (msg) => console.log(`${C.gold}⚠️  ${msg}${C.reset}`);
const err  = (msg) => console.log(`${C.red}❌ ${msg}${C.reset}`);
const head = (msg) => console.log(`\n${C.bold}${C.gold}${msg}${C.reset}`);
const hr   = ()    => console.log(`${C.gray}${'─'.repeat(50)}${C.reset}`);

head('ATOM OS — SETUP CHECKER');
hr();

// ── 1. Node version ──────────────────────────────────────────────────────────
head('1. Node.js Version');
const nodeVer = process.version;
const major   = parseInt(nodeVer.slice(1));
if (major >= 18) ok(`Node ${nodeVer} (required: ≥18)`);
else              err(`Node ${nodeVer} — please upgrade to Node 18+`);

// ── 2. npm version ───────────────────────────────────────────────────────────
head('2. Dependencies');
try {
  execSync('npm list --depth=0 --workspaces 2>/dev/null', { stdio: 'pipe' });
  ok('npm workspaces dependencies installed');
} catch {
  warn('Dependencies may not be installed — run: npm install');
}

// ── 3. Check .env files ──────────────────────────────────────────────────────
head('3. Environment Files');

const apiEnv = path.join(__dirname, '../apps/api/.env');
const webEnv = path.join(__dirname, '../apps/web/.env.local');

if (fs.existsSync(apiEnv)) {
  const content = fs.readFileSync(apiEnv, 'utf8');
  if (content.includes('SUPABASE_URL=https://') && !content.includes('your-project')) {
    ok('apps/api/.env — Supabase URL configured');
  } else {
    warn('apps/api/.env exists but SUPABASE_URL looks like a placeholder');
  }
  if (content.includes('SUPABASE_SERVICE_ROLE_KEY=eyJ')) {
    ok('apps/api/.env — service role key present');
  } else {
    warn('apps/api/.env — SUPABASE_SERVICE_ROLE_KEY missing or not set');
  }
} else {
  err('apps/api/.env not found');
  log(`   Run: cp apps/api/.env.example apps/api/.env`);
  log(`   Then fill in your Supabase credentials`);
}

if (fs.existsSync(webEnv)) {
  const content = fs.readFileSync(webEnv, 'utf8');
  if (content.includes('VITE_API_URL=http')) {
    ok('apps/web/.env.local — API URL configured');
  } else {
    warn('apps/web/.env.local — VITE_API_URL not set');
  }
} else {
  err('apps/web/.env.local not found');
  log(`   Run: cp apps/web/.env.example apps/web/.env.local`);
}

// ── 4. Migration files ───────────────────────────────────────────────────────
head('4. Database Migrations');

const m1 = path.join(__dirname, '../supabase/migrations/001_init.sql');
const m2 = path.join(__dirname, '../supabase/migrations/002_exercise_seed.sql');

if (fs.existsSync(m1)) ok(`001_init.sql (${Math.round(fs.statFileSync ? 0 : fs.statSync(m1).size / 1024)}KB — full schema + RLS)`);
else                    err('001_init.sql missing!');

if (fs.existsSync(m2)) ok('002_exercise_seed.sql (60 exercises)');
else                    err('002_exercise_seed.sql missing!');

log(`${C.gray}   → Run both files in Supabase SQL Editor (in order)${C.reset}`);

// ── 5. Port check ────────────────────────────────────────────────────────────
head('5. Quick Reference');
hr();
log(`${C.gold}API:${C.reset}  http://localhost:4000`);
log(`${C.gold}Web:${C.reset}  http://localhost:5173`);
log(`${C.gold}Health:${C.reset} http://localhost:4000/health`);
log('');
log(`${C.bold}Start dev:${C.reset}`);
log(`  Terminal 1: npm run dev:api`);
log(`  Terminal 2: npm run dev:web`);
log('');
log(`${C.bold}Migration order:${C.reset}`);
log(`  1. supabase/migrations/001_init.sql`);
log(`  2. supabase/migrations/002_exercise_seed.sql`);
log(`  3. UPDATE public.users SET role = 'super_admin' WHERE email = 'your@email.com';`);
log('');
log(`${C.gray}Full deploy guide: project/DEPLOY.md${C.reset}`);
hr();
