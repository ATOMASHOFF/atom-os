# Key Decisions

- Zero paid services — free tier only (Supabase, Railway, Vercel)
- API-first — backend complete before any UI
- Complete file replacements preferred over partial edits
- Single master branch, no feature branches
- npm workspaces monorepo (not Turborepo/Nx — keep it simple)
- No SMS/OTP — Supabase email auth only
- QR tokens: server-generated only, client never writes to qr_tokens
- Tailwind only — no CSS modules, no styled-components
- React Query for all server state — no Redux
- Zustand for auth state only
- Dark theme non-negotiable (#0D0D0D bg, #F5C842 gold)
- PowerShell on Windows dev environment