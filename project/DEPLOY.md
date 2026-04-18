# ATOM OS — DEPLOYMENT GUIDE
# Zero to live in ~30 minutes. Everything free tier.

## Prerequisites
- Node.js 18+ installed
- Git installed
- GitHub account
- Supabase account (supabase.com)
- Fly.io account (fly.io)
- Vercel account (vercel.com)
- Flyctl CLI installed locally (see STEP 4)

---

## STEP 1 — Supabase Setup

1. Go to https://supabase.com → New Project
   - Name: atom-os
   - Region: ap-south-1 (Mumbai) for India
   - Save your DB password

2. Go to SQL Editor → New Query → paste and run:
   supabase/migrations/001_init.sql   (full schema + RLS)
   supabase/migrations/002_exercise_seed.sql  (60 exercises)

3. Create your Super Admin account:
   - Dashboard → Authentication → Users → Invite User
   - Enter your email, set password
   - Then run in SQL Editor:
     UPDATE public.users
     SET role = 'super_admin'
     WHERE email = 'YOUR_EMAIL_HERE';

4. Get your keys:
   - Dashboard → Project Settings → API
   - Copy: Project URL, anon public, service_role (secret)

5. Get JWT secret:
   - Project Settings → API → JWT Settings → JWT Secret

---

## STEP 2 — Local Setup

```bash
# Clone / extract project
cd atom-os
npm install

# Set up API env
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your Supabase keys

# Set up Web env
cp apps/web/.env.example apps/web/.env.local
# Edit apps/web/.env.local with your Supabase URL + anon key

# Test locally
npm run dev:api    # starts on :4000
npm run dev:web    # starts on :5173
```

Visit http://localhost:5173 → login with your super admin email.

---

## STEP 3 — Push to GitHub

```bash
cd atom-os
git init
git add .
git commit -m "feat: Atom OS v1.0.0 MVP"

# Create repo on GitHub: github.com/new
# Name it: atom-os (or atom-os-v3)

git remote add origin https://github.com/YOUR_USERNAME/atom-os.git
git branch -M master
git push -u origin master
```

---

## STEP 4 — Deploy API to Fly.io

### 4a. Install Flyctl CLI

```bash
# macOS
brew install flyctl

# Linux / WSL
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell as Admin)
iwr https://fly.io/install.ps1 -useb | iex
```

Verify: `flyctl version`

### 4b. Authenticate & Create App

```bash
flyctl auth login
# Opens browser → sign in / sign up at fly.io

cd atom-os

# Create Fly.io app (region: sin = Singapore, closest to India)
flyctl launch --name atom-os-api --region sin --no-deploy
# This creates/updates fly.toml

# If prompted about database: choose "Do not set up Postgres" (use Supabase instead)
```

### 4c. Set Environment Variables

```bash
flyctl secrets set \
  NODE_ENV=production \
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_ANON_KEY=eyJ... \
  SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  ANTHROPIC_API_KEY=sk-ant-... \
  FRONTEND_URL=https://your-app.vercel.app

# Verify secrets were set:
flyctl secrets list
```

### 4d. Deploy

```bash
# Deploy app
flyctl deploy

# Watch deployment
flyctl status
flyctl logs

# Get your public URL (e.g., https://atom-os-api.fly.dev)
flyctl info
```

### 4e. Verify Health Check

```bash
curl https://atom-os-api.fly.dev/health
# Should return: { "status": "ok" }
```

Note your Fly.io domain: `https://atom-os-api.fly.dev` (or your custom domain)

---

## STEP 5 — Deploy Frontend to Vercel

1. Go to https://vercel.com → New Project → Import Git Repository
2. Select atom-os repo
3. **Root Directory**: Set to `apps/web` (critical for monorepo!)
4. Framework: Vite (auto-detected)

5. Set Environment Variables:
   ```
   VITE_API_URL=https://atom-os-api.fly.dev
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

6. Deploy → note your Vercel domain

7. Go back to Fly.io → update FRONTEND_URL variable:
   ```bash
   flyctl secrets set FRONTEND_URL=https://your-app.vercel.app
   flyctl deploy --skip-health-checks  # Quick re-deploy with new URL
   ```

---

## STEP 6 — First Login & Gym Setup

1. Visit your Vercel URL → Login with super admin account

2. Create your first gym:
   - Super Admin → Gyms → New Gym
   - Fill in name, city, etc.
   - Note the generated gym code (e.g. ATM001)

3. Assign yourself as gym admin:
   - Super Admin → Gyms → Assign Admin
   - Enter your user ID (from Users page)

4. Create a test member account:
   - Open incognito tab → Signup with different email
   - Login as member → Profile → Enter gym code → Join

5. Back as super admin / gym admin:
   - Admin → Members → Approve the request

6. Test QR check-in:
   - Admin → QR Screen (open on another tab/device)
   - Member tab → Check In → Scan

---

## PRODUCTION CHECKLIST
- [ ] Supabase RLS enabled (verify in Table Editor → RLS tab)
- [ ] Service role key NOT in frontend env vars
- [ ] CORS locked to Vercel domain only
- [ ] Rate limiting active (check Fly.io logs: `flyctl logs`)
- [ ] Health check passing: `curl https://atom-os-api.fly.dev/health`
- [ ] Test full flow: signup → join → approve → QR scan → checkin ✓

---

## TROUBLESHOOTING

**Login fails after deploy:**
```bash
# Check if API is running
flyctl status
# Check VITE_API_URL matches Fly.io domain
flyctl info
# Check FRONTEND_URL on Fly.io
flyctl secrets list | grep FRONTEND_URL
```

**QR tokens not generating:**
→ Verify SUPABASE_SERVICE_ROLE_KEY is set on Fly.io
```bash
flyctl secrets list | grep SUPABASE_SERVICE_ROLE_KEY
```
→ Service role bypasses RLS — required for qr_tokens writes

**Members can't check in:**
→ Confirm gym status is 'active' (super admin panel)
→ Confirm membership status is 'approved'
→ Check token not expired (default 180s)
→ Check Fly.io logs for errors:
```bash
flyctl logs
```

**CORS errors:**
→ FRONTEND_URL on Fly.io must match Vercel URL exactly (no trailing slash)
```bash
flyctl secrets set FRONTEND_URL=https://your-app.vercel.app
flyctl deploy --skip-health-checks
```

**Deployment stuck or slow:**
```bash
# Check current deployment status
flyctl status
# View recent deployments
flyctl history
# Roll back to previous version
flyctl certs show
```

---

## FLY.IO MANAGEMENT

### Monitor Logs
```bash
# Real-time logs
flyctl logs

# Last 100 lines
flyctl logs --lines 100

# Watch for errors
flyctl logs --follow
```

### Scale Up (if needed)
```bash
# Increase VM size (default: shared-cpu-2x 512MB)
flyctl scale vm shared-cpu-4x  # or performance-1x for higher load

# Increase region replicas
flyctl scale count 2  # Run 2 instances
```

### Update Secrets
```bash
# Change an environment variable
flyctl secrets set ANTHROPIC_API_KEY=sk-ant-new-key

# List all secrets
flyctl secrets list

# Remove a secret
flyctl secrets unset SOME_VAR
```

### Redeploy Current Code
```bash
# After git push
flyctl deploy
```

### SSH into Running App (debugging)
```bash
flyctl ssh console
# Then inside the container:
ls /app
node -e "console.log(process.env.NODE_ENV)"
```
