# FEATURE_LOG.md — v1.4.0

| # | Feature | Status | Location |
|---|---|---|---|
| 1 | Full DB schema + RLS (8 tables, 40+ policies) | ✅ | supabase/migrations/001_init.sql |
| 2 | Exercise seed (60 global exercises) | ✅ | supabase/migrations/002_exercise_seed.sql |
| 3 | npm workspaces monorepo | ✅ | package.json |
| 4 | Shared types + Zod validators + utils | ✅ | packages/shared/src/ |
| 5 | Supabase dual client (anon + service role) | ✅ | apps/api/src/utils/supabase.ts |
| 6 | JWT auth middleware | ✅ | apps/api/src/middleware/auth.ts |
| 7 | Role + validation middleware | ✅ | apps/api/src/middleware/roles.ts |
| 8 | Rate limiting (3 tiers) + Helmet + CORS | ✅ | apps/api/src/index.ts |
| 9 | Auth API (signup/login/refresh/me/update) | ✅ | apps/api/src/routes/auth.ts |
| 10 | Gyms API (CRUD + status + assign-admin) | ✅ | apps/api/src/routes/gyms.ts |
| 11 | Membership API (join/approve/reject/list) | ✅ | apps/api/src/routes/membership.ts |
| 12 | QR API (generate/rotate/config) | ✅ | apps/api/src/routes/qr.ts |
| 13 | Check-in API (7-step secure scan + history) | ✅ | apps/api/src/routes/checkins.ts |
| 14 | Workout API (logs + sets + exercises + stats) | ✅ | apps/api/src/routes/workouts.ts |
| 15 | Admin API (global KPIs + gym list + users) | ✅ | apps/api/src/routes/admin.ts |
| 16 | Vercel + Railway deploy configs | ✅ | vercel.json, railway.toml |
| 17 | Setup checker script | ✅ | scripts/setup.js |
| 18 | Vite + Tailwind + design system | ✅ | apps/web/ |
| 19 | Zustand auth store + JWT persistence | ✅ | apps/web/src/store/auth.ts |
| 20 | Typed API client + auto token refresh | ✅ | apps/web/src/lib/api.ts |
| 21 | Role-based router + guards | ✅ | apps/web/src/App.tsx |
| 22 | AppLayout (desktop sidebar + mobile nav) | ✅ | apps/web/src/components/layout/ |
| 23 | Error boundary (app-level + inline) | ✅ | apps/web/src/components/ui/ |
| 24 | UI library (9 components) | ✅ | apps/web/src/components/ui/ |
| 25 | Login page (split-panel branding) | ✅ | apps/web/src/pages/auth/ |
| 26 | Signup page | ✅ | apps/web/src/pages/auth/ |
| 27 | Super Admin — Dashboard + Gyms + Users | ✅ | apps/web/src/pages/super/ |
| 28 | Gym Admin — Dashboard | ✅ | apps/web/src/pages/admin/ |
| 29 | Gym Admin — Members (approve + subscribe) | ✅ | apps/web/src/pages/admin/ |
| 30 | Gym Admin — Attendance (date filter) | ✅ | apps/web/src/pages/admin/ |
| 31 | Gym Admin — Analytics (3 Recharts) | ✅ | apps/web/src/pages/admin/ |
| 32 | Gym Admin — QR Screen (fullscreen + countdown) | ✅ | apps/web/src/pages/admin/ |
| 33 | Gym Admin — Settings (profile + QR interval) | ✅ | apps/web/src/pages/admin/ |
| 34 | Subscription Modal (plan + dates + amount) | ✅ | apps/web/src/components/admin/ |
| 35 | Member — Dashboard (CTA + alerts + activity) | ✅ | apps/web/src/pages/member/ |
| 36 | Member — Workouts (full CRUD) | ✅ | apps/web/src/pages/member/ |
| 37 | Member — Progress (charts + streak) | ✅ | apps/web/src/pages/member/ |
| 38 | Member — Check-in (camera QR scanner) | ✅ | apps/web/src/pages/member/ |
| 39 | Member — Profile (edit + join gym) | ✅ | apps/web/src/pages/member/ |
| 40 | Subscription Banner (expiry/expired alerts) | ✅ | apps/web/src/components/member/ |
| 41 | PWA manifest + service worker | ✅ | apps/web/public/ |
| 42 | Install prompt + offline banner | ✅ | apps/web/src/components/ui/PWABanner.tsx |
| 43 | iOS PWA meta tags | ✅ | apps/web/index.html |
| 44 | NewMemberWelcome (3-step onboarding modal) | ✅ | apps/web/src/components/member/ |
| 45 | Check-in nav lock (sidebar + bottom tab) | ✅ | apps/web/src/components/layout/AppLayout.tsx |
| 46 | MemberCheckin no-gym onboarding page | ✅ | apps/web/src/pages/member/MemberCheckin.tsx |
| 47 | MemberDashboard 3-state check-in banner | ✅ | apps/web/src/pages/member/MemberDashboard.tsx |
| 48 | useQuery onSuccess → useEffect (v5 fix) | ✅ | apps/web/src/pages/member/MemberProfile.tsx |
| 49 | AI Workout Plan Generator (Anthropic Claude) | ✅ | apps/api/src/routes/ai.ts, apps/web/src/pages/member/MemberAIPlan.tsx |
