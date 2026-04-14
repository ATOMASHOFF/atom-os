# TASKS.md — v1.7.0

## ✅ Completed — Full MVP

### Infrastructure
- [x] npm workspaces monorepo
- [x] packages/shared — Zod validators, TypeScript types, utils
- [x] tsconfig.base.json shared TS config
- [x] .gitignore, .env.example files
- [x] scripts/setup.js — local environment checker
- [x] project/DEPLOY.md — step-by-step deploy guide

### Database
- [x] supabase/migrations/001_init.sql — 8 tables, 40+ RLS policies, triggers
- [x] supabase/migrations/002_exercise_seed.sql — 60 global exercises

### Backend (apps/api)
- [x] Supabase dual-client (anon + service role)
- [x] authMiddleware — JWT validation → req.user
- [x] requireRole / validate / validateQuery middleware
- [x] Rate limiting: 100/15min global, 20/15min auth, 10/min checkins
- [x] Helmet security headers + CORS
- [x] /api/auth — signup, login, refresh, me, update, logout
- [x] /api/gyms — CRUD, status toggle, assign-admin (super_admin)
- [x] /api/membership — join, approve/reject, member list, stats
- [x] /api/qr — generate, auto-rotate, config
- [x] /api/checkins — 7-step secure scan, gym history, today
- [x] /api/workouts — logs CRUD, sets CRUD, exercise library, stats
- [x] /api/ai — generate-plan (Anthropic Claude, exercise-grounded)
- [x] /api/admin — global KPIs, all-gym stats, user management
- [x] vercel.json, railway.toml deployment configs

### Frontend (apps/web)
- [x] Vite + React 18 + TypeScript
- [x] Tailwind design system (dark charcoal + gold, custom classes)
- [x] Fonts: Barlow Condensed + DM Sans + JetBrains Mono
- [x] Zustand auth store with JWT persistence + auto-refresh
- [x] Typed API client (lib/api.ts) with 401 auto-refresh
- [x] Role-based router: RequireAuth + RequireRole + RoleRedirect
- [x] AppLayout: desktop sidebar + mobile bottom nav + drawer
- [x] Error boundaries wrapping entire app

#### Auth (2 pages)
- [x] LoginPage — split-panel branding + form
- [x] SignupPage — member self-registration

#### Super Admin (3 pages)
- [x] SuperDashboard — KPIs + live gym table
- [x] SuperGyms — create/manage/suspend + assign admin
- [x] SuperUsers — search/filter + role toggle

#### Gym Admin (6 pages + 2 components)
- [x] AdminDashboard — stats, pending requests, today checkins, QR CTA
- [x] AdminMembers — tabs: pending/approved/all, approve flow, subscription mgmt
- [x] AdminAttendance — date-filtered check-in log
- [x] AdminAnalytics — daily trend, peak hours, member growth (Recharts)
- [x] AdminQRScreen — live rotating QR + countdown + fullscreen + config
- [x] AdminSettings — gym profile, gym code copy, QR interval presets
- [x] SubscriptionModal — plan picker, date auto-calc, amount, notes
- [x] SubscriptionBanner — expiry warnings for members

#### Member (6 pages + 2 components)
- [x] MemberDashboard — status, subscription alerts, CTA, recent activity
- [x] MemberWorkouts — workout sessions + sets/reps/weight CRUD
- [x] MemberAIPlan — 4-step wizard + plan results + log workout per day
- [x] MemberProgress — weekly/monthly charts + streak + session log
- [x] MemberCheckin — camera QR scanner + validation + history
- [x] MemberProfile — edit profile + join gym by code + gym list
- [x] SubscriptionBanner — expiry/expired alerts
- [x] SubscriptionPill — inline status badge

#### UI Component Library (9 components)
- [x] Skeleton (card/row/table variants)
- [x] EmptyState
- [x] Modal (keyboard-dismissable)
- [x] useConfirm (async dialog hook)
- [x] ErrorBoundary + InlineError
- [x] InstallBanner + UpdateBanner + OfflineBanner

#### PWA
- [x] manifest.json with shortcuts + display_override
- [x] sw.js — network-first API, cache-first shell, offline fallback
- [x] usePWA hooks — SW registration, install prompt, online status
- [x] iOS meta tags — apple-mobile-web-app-capable etc.
- [x] atom-icon.svg

## 🚀 Deployment Checklist (manual steps)
- [ ] Supabase: new project → ap-south-1 (Mumbai)
- [ ] Supabase SQL Editor → run 001_init.sql
- [ ] Supabase SQL Editor → run 002_exercise_seed.sql
- [ ] Supabase Auth → create your user → run UPDATE role = 'super_admin'
- [ ] git init + push to GitHub
- [ ] Railway: import repo → build/start commands → set env vars
- [ ] Vercel: import repo → root=apps/web → set env vars
- [ ] Update FRONTEND_URL in Railway to Vercel domain
- [ ] Smoke test: signup → join gym → approve → QR display → scan → checkin ✅

## 🔮 Phase 2 (future)

- [ ] Email/WhatsApp notifications on membership approval
- [ ] Razorpay payment integration + invoice PDF generation
- [x] AI workout plan generator (Anthropic Claude API) ← DONE in v1.6.0
- [ ] React Native mobile app (same APIs, zero rewrite)
- [ ] Multi-gym member support (member joins multiple gyms)
- [ ] Body measurements / progress photos tracker
- [ ] Gym revenue dashboard with MRR tracking

## ✅ Completed in v1.7.0
- [x] QR Generation fix + Dynamic Time Limits (3min → 30 days)
  - Fixed `badRequest` import in qr.ts route
  - DB constraint: `qr_rotation_interval_s` now allows up to 2,592,000s (30 days)
  - Default interval: 30s → 180s (3 min)
  - AdminSettings: 8 presets (3min → 1 month)
  - AdminQRScreen: quick preset buttons + formatInterval helper
  - 69 TypeScript files | 8,889 lines | 0 TS errors

## ✅ Completed in v1.6.0
- [x] AI Workout Plan Generator (Anthropic Claude API)
  - Backend: `/api/ai/generate-plan` endpoint with exercise grounding
  - Shared: `WorkoutPlan`, `PlanDay`, `PlanExercise` types + `GeneratePlanSchema`
  - Frontend: 4-step wizard → plan results → "Log Workout" per day

## ✅ Completed in v1.5.0
- [x] New member onboarding flow (3-step welcome modal, first-login only)
- [x] Check-in nav lock in desktop sidebar + mobile bottom tab
- [x] MemberCheckin: full onboarding page when no gym joined
- [x] MemberDashboard: 3-state check-in banner (approved/pending/new)
- [x] MemberProfile: TanStack Query v5 useQuery onSuccess fix
- [x] SignupPage: clears welcome flag so new accounts always see onboarding