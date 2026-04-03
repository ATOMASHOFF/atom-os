# ATOM OS V3 — Project Memory

## Overview
Hybrid B2C/B2B Gym Management SaaS. B2C: workout logging + progress charts + AI coach.
B2B: member management + QR check-ins + analytics.

## Tech Stack
| Layer | Tech | Host |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind + React Query + Recharts | Vercel |
| Backend | Node.js + Express + Zod + Anthropic Claude SDK | Railway |
| Database | PostgreSQL via Supabase | Supabase Free |
| Auth | Supabase Auth JWT | Supabase Free |
| AI | Anthropic Claude (Sonnet) for workout plan generation | Anthropic API |
| Monorepo | npm workspaces | — |

## Roles
- `super_admin` — Platform owner. Registers gyms, assigns admins, views KPIs.
- `gym_admin` — Manages one gym. Members, attendance, QR (3min–30day rotation), analytics, settings.
- `member` — End user. Logs workouts, tracks progress, QR check-in, AI coach.

## Structure
```
atom-os/
  apps/api/src/           # Express backend
    middleware/           # auth.ts, roles.ts
    routes/               # admin, ai, auth, checkins, gyms, membership, qr, workouts
    utils/                # response.ts, supabase.ts
  apps/web/src/           # React frontend
    components/layout/    # AppLayout (responsive sidebar + bottom nav)
    components/ui/        # Skeleton, EmptyState, Modal, Confirm,
                          # ErrorBoundary, PWABanner
    hooks/                # useMembership, usePWA, useWorkout
    lib/                  # api.ts (typed client)
    pages/admin/          # Dashboard, Members, Attendance, Analytics, QR, Settings
    pages/auth/           # Login, Signup
    pages/member/         # Dashboard, Workouts, AI Plan, Progress, Checkin, Profile
    pages/super/          # Dashboard, Gyms, Users
    store/                # auth.ts (Zustand)
  packages/shared/src/    # Types, Zod validators, utils
  supabase/migrations/    # 001_init.sql, 002_exercise_seed.sql
  project/                # This memory system
```

## Status: v1.7.0 — 69 files / 8,889 lines / 0 TS errors