# ARCHITECTURE.md — Atom OS v1.4.0

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    ATOM OS PLATFORM                      │
│                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  Super Admin │    │  Gym Admin  │    │   Member    │  │
│  │  /super/*   │    │  /admin/*   │    │  /member/*  │  │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │
│         └─────────────────┼─────────────────┘           │
│                           │                              │
│              ┌────────────▼──────────────┐              │
│              │   React Frontend (Vercel)  │              │
│              │   Vite + Tailwind + RQ     │              │
│              └────────────┬──────────────┘              │
│                           │ REST API                     │
│              ┌────────────▼──────────────┐              │
│              │  Express Backend (Railway) │              │
│              │  JWT Auth + Role RBAC      │              │
│              └────────────┬──────────────┘              │
│                           │                              │
│         ┌─────────────────▼──────────────────────┐     │
│         │         Supabase (Free Tier)            │     │
│         │  PostgreSQL + Auth + RLS + Triggers     │     │
│         └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## Multi-Tenancy Model
- Single PostgreSQL database, tenant isolation via `gym_id`
- Every gym-scoped query MUST include `AND gym_id = :gymId`
- Supabase RLS enforces this at the DB level as a second safety net
- Express middleware enforces role + gym ownership at API level

## Auth Flow
```
Browser → POST /api/auth/login
→ Supabase validates credentials → JWT issued
→ API fetches public.users (role + gym_id)
→ Returns { user, access_token, refresh_token }
→ Frontend stores in localStorage via Zustand
→ Each request: Authorization: Bearer <token>
→ authMiddleware validates JWT + loads user profile
→ requireRole() checks role before handler executes
→ On 401: auto-refresh via refresh_token
→ On refresh fail: clear tokens + redirect /login
```

## QR Check-In Security Flow (7 steps)
```
1. Server generates UUID token → qr_tokens table
   { gym_id, token, expires_at: now+interval, is_used: false }
   (Partial unique index: only ONE active token per gym)

2. Gym Admin polls GET /api/qr/current → QR image (data URL)
   Raw token UUID never returned to client — only PNG image

3. Member camera scans → extracts UUID string
   POST /api/checkins/scan { token: "uuid" }

4. Server validates:
   a. Token exists in qr_tokens
   b. expires_at > NOW()
   c. is_used = false AND is_active = true
   d. member has approved gym_membership for token.gym_id
   e. membership.status = 'approved'
   f. No checkin for this user+gym today (duplicate prevention)
   g. UPDATE token: is_used=true, is_active=false (optimistic lock)

5. INSERT checkins row (server only, never client)
6. Return success + gym name to member
7. Token permanently consumed — replay attacks impossible
```

## API Structure
```
/api/auth/*        public + protected user routes
/api/gyms/*        super_admin only
/api/membership/*  member (join) + gym_admin (approve/manage)
/api/qr/*          gym_admin only — never client write
/api/checkins/*    member (scan) + gym_admin (view) — server writes only
/api/workouts/*    member — full ownership isolation
/api/admin/*       super_admin only — global platform stats
```

## Frontend Architecture
```
App.tsx
├── ErrorBoundary (catches all render crashes)
├── QueryClientProvider (React Query cache)
├── AppInit (bootstraps auth from stored JWT)
│   └── BrowserRouter
│       ├── /login, /signup (public)
│       ├── /super/* → RequireAuth → RequireRole('super_admin') → AppLayout
│       ├── /admin/* → RequireAuth → RequireRole('gym_admin') → AppLayout
│       └── /member/* → RequireAuth → RequireRole('member') → AppLayout
│
AppLayout (per role)
├── Desktop: fixed sidebar w/ role-specific nav
├── Mobile: sticky header + hamburger drawer + bottom tab bar
│   └── Member: gold floating pill for Check In tab
└── <Outlet /> → page components

lib/api.ts (typed API client)
├── Auto-injects Authorization header
├── 401 handler: refresh → retry → logout
└── Typed per-domain clients: authApi, gymApi, membershipApi, qrApi, checkinApi, workoutApi, adminApi
```

## PWA Architecture
```
sw.js (service worker)
├── Cache: SHELL_CACHE (app shell — HTML, assets)
├── Cache: DATA_CACHE (API responses)
├── Strategy: navigate requests → app shell (SPA routing)
├── Strategy: /api/* → network-first, cache on success
│   └── Skip cache: /api/auth/*, /api/checkins/scan, /api/qr/rotate
├── Strategy: static assets → cache-first
└── Offline fallback: { error: "OFFLINE" } JSON for API calls

usePWA.ts
├── useServiceWorker() — registers SW, detects updates
├── useInstallPrompt() — captures beforeinstallprompt, install()
└── useOnlineStatus() — window online/offline events
```

## Database Tables
| Table | Purpose |
|---|---|
| users | Auth mirror + role + profile |
| gyms | B2B tenants — gym_code, qr_interval, stats cache |
| gym_members | M:N junction — membership status + subscription |
| qr_tokens | Server-only rotating tokens — replay-safe |
| checkins | Immutable audit log |
| exercises | Global library + user-private exercises |
| workout_logs | One per session |
| workout_sets | Atomic training data (reps/weight/RPE) |
