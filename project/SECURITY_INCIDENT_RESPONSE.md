# ATOM OS Security Incident Response (Vercel/Supply Chain)

This runbook is for suspected hosting platform or CI/CD compromise.

## 1) Immediate Containment (first 30 minutes)

1. Pause production deploys in Vercel.
2. Rotate Vercel personal/team access tokens.
3. Rotate GitHub tokens and review GitHub App access.
4. Rotate all production secrets in hosting and providers:
   - `SUPABASE_URL` (if project changed)
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - any payment/email/SMS/API keys
5. Invalidate active user sessions/refresh tokens in Supabase.

## 2) Forensics and Verification

1. Check Vercel activity logs for:
   - unknown deployments
   - environment variable changes
   - team member or token changes
2. Check GitHub security logs for:
   - unknown OAuth app grants
   - suspicious workflow runs
   - unusual branch pushes
3. Check Supabase logs for:
   - unusual table scans/exports
   - spikes in auth events

## 3) Required Security Configuration

1. Enforce MFA for all Vercel and GitHub users.
2. Restrict production deploy permissions to minimum required users.
3. Protect `master` branch:
   - required pull request reviews
   - required status checks
   - no force pushes
4. Keep environment variables split by environment (dev/staging/prod).
5. Remove stale integrations and unused tokens.

## 4) ATOM OS Codebase Protections (already implemented)

1. API CORS now uses explicit allowlisting via `CORS_ALLOWED_ORIGINS`.
2. API no longer allows all `*.vercel.app` origins by pattern.
3. API fails fast in production if critical Supabase env vars are missing.
4. API applies `authLimiter` at `/api/auth` router boundary.
5. API sets `trust proxy` and disables `x-powered-by`.

## 5) Required Runtime Env Values (apps/api)

Set in your production environment:

- `NODE_ENV=production`
- `FRONTEND_URL=https://<your-main-frontend-domain>`
- `CORS_ALLOWED_ORIGINS=https://<your-main-frontend-domain>,https://<any-admin-domain>`
- `SUPABASE_URL=...`
- `SUPABASE_ANON_KEY=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`
- `ANTHROPIC_API_KEY=...`

## 6) Recovery Validation Checklist

1. Deploy from a known-good commit only.
2. Confirm health endpoint returns `status: ok`.
3. Test login, token refresh, and admin routes.
4. Confirm blocked origin gets CORS rejection.
5. Confirm rate limit triggers on repeated auth attempts.

## 7) Post-Incident Follow-Up

1. Write incident timeline and root-cause notes.
2. Add alerting for auth spikes, 401/403 spikes, and data export spikes.
3. Schedule quarterly key rotation and access review.
