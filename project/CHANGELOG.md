# CHANGELOG.md

## v1.0.0 — 2026-03-27 🎉
### Added — Full MVP Complete
- apps/web: React + Vite + Tailwind frontend
  - Design system: charcoal dark theme + electric gold (#F5C842)
  - Fonts: Barlow Condensed (display) + DM Sans (body)
  - Zustand auth store with JWT persistence + auto-refresh
  - Typed API client (lib/api.ts) with all backend calls
  - Role-based router: RequireAuth + RequireRole guards
  - AppLayout sidebar with role-specific nav items
- Auth pages: unified Login + Signup (single entry point)
- Super Admin pages: Dashboard (KPIs), Gyms (CRUD), Users (role management)
- Gym Admin pages: Dashboard, Members (approve/reject), Attendance (date filter), QR Screen
- Member pages: Dashboard, Workouts (sets/reps/weight), Check-in (camera QR scanner), Profile
- AdminQRScreen: live rotating QR with countdown timer + fullscreen mode + config
- MemberCheckin: html5-qrcode camera scanner + 7-step secure validation flow
- PWA: manifest.json with shortcuts, Add to Home Screen support
- Deployment: vercel.json (SPA routing) + railway.toml (health check)
- .env.example files for both apps
- .gitignore

### Fixed
- TypeScript: ImportMeta.env → vite/client reference
- TypeScript: Zustand partialKey → partialize
- TypeScript: workout_log type cast via unknown


### Added
- Full monorepo scaffold (npm workspaces)
- packages/shared: Zod validators, TypeScript types, shared utils
- apps/api: Full Express backend
  - Auth middleware (Supabase JWT validation)
  - Role middleware (requireRole)
  - Rate limiting (express-rate-limit)
  - Helmet security headers
  - CORS config
  - All routes: /auth, /gyms, /membership, /qr, /checkins, /workouts, /admin
- Supabase SQL schema (atom_os_v3_schema.sql)
- Project memory system (/project/)

### Architecture Decisions
- API-first: backend complete before UI
- Shared Zod schemas used in both API validation and frontend form validation
- QR tokens: server-generated UUID, single-use, gym-isolated
- No client writes to qr_tokens or checkins (service role only)

## v1.3.0 — 2026-03-28
### Added
- MemberProgress page: weekly sessions area chart, day-of-week bar chart,
  monthly trend line chart, gym streak counter, session history log
- AdminAnalytics page: daily check-ins trend chart, peak hours bar chart,
  member growth bar chart, 14/30/60 day range selector
- ErrorBoundary component: class-based, catches render crashes,
  shows error ID + dev-mode stack trace, reset + go home actions
- InlineError component: compact error with retry button
- AdminAnalytics route + nav item wired into gym_admin section
- MemberProgress route + nav item wired into member section
- Recharts added to apps/web package.json dependencies

### Architecture
- All 16 pages now have routes and nav entries
- Error boundaries wrap entire app via BrowserRouter
- recharts used for all charts (AreaChart, BarChart, LineChart)

### Status
- 48 TypeScript files, 6,882 lines, 0 TS errors
- All routes verified: super(3) + admin(6) + member(5) + auth(2)

## v1.4.0 — 2026-03-28
### Added
- 001_init.sql (829 lines, full schema + RLS) now embedded in repo at supabase/migrations/
- scripts/setup.js — local dev environment checker (node scripts/setup.js)
- npm run setup script in root package.json
- SubscriptionModal (components/admin/SubscriptionModal.tsx):
    - Plan selector: Monthly / Quarterly / Annual / Pay As You Go
    - Auto-calculates end date from start + plan
    - Amount paid field (₹ prefix)
    - Notes field
    - Summary preview card
- SubscriptionBanner (components/member/SubscriptionBanner.tsx):
    - Expiry warning (≤7 days) with amber banner
    - Expired state with red banner
    - SubscriptionPill inline status component
- AdminMembers: Subscription button on approved members → opens SubscriptionModal
- MemberDashboard: SubscriptionBanner wired above check-in CTA
- MemberProfile: SubscriptionPill replaces plain subscription_plan badge

### Fixed
- AdminMembers: duplicate StatusBadge function removed
- AdminMembers: broken JSX from bad append operation repaired

### Stats
- 50 TypeScript files | 7,213 lines | 0 TS errors
- 16 pages | 2 migrations | 8 project memory files

## v1.5.0 — 2026-03-30
### Feature: New member onboarding + check-in gating
- NewMemberWelcome (components/member/NewMemberWelcome.tsx)
    - 3-step onboarding modal: Workouts → Progress → Join Gym
    - Animated progress dots, slides up with 600ms delay on first visit
    - Dismissed permanently via localStorage (atom-welcome-seen)
    - Each step has a gold CTA link + skip-to-next option
- AppLayout: Check In tab queries memberships inside layout
    - Desktop sidebar: locked tab shows Lock icon + "Join gym" label
    - Mobile bottom nav: dimmed pill with small lock badge overlay
    - Both: tap → toast "Join a gym first" + navigate to /member/profile
    - Approved member: gold pill fully active as before
- MemberCheckin: replaced 4-line empty state with full onboarding page
    - Locked scanner illustration with lock badge
    - 4-step guide (get code → join → wait → scan)
    - Pending state shows gym name + pulsing amber indicator
    - Gold "Join a Gym Now" CTA links to /member/profile
- MemberDashboard: three-state check-in banner
    - Approved: gold full-width CTA (unchanged)
    - Pending: amber warning with gym name
    - New (no gym): dashed gold border card + "Unlock Check-in" explain card
    - NewMemberWelcome mounted here
- SignupPage: clears atom-welcome-seen on account creation
    so welcome modal always triggers on very first login
- MemberProfile: fixed deprecated useQuery onSuccess (TanStack Query v5)
    - Moved side-effect to useEffect watching profileData
    - Removed `as any` cast workaround

### Stats
- 51 TypeScript files | 7,583 lines | 0 TS errors
