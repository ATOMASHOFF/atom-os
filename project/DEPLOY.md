# ATOM OS — DEPLOYMENT GUIDE
# Zero to live in ~30 minutes. Everything free tier.

## Prerequisites
- Node.js 18+ installed
- Git installed
- GitHub account
- Supabase account (supabase.com)
- Railway account (railway.app)
- Vercel account (vercel.com)

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

## STEP 4 — Deploy API to Railway

1. Go to https://railway.app → New Project → Deploy from GitHub
2. Select your atom-os repo
3. Railway will detect it automatically

4. Set Environment Variables (Railway dashboard → Variables):
   ```
   NODE_ENV=production
   PORT=4000
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ANTHROPIC_API_KEY=sk-ant-...     (optional: for AI Coach feature)
   FRONTEND_URL=https://your-app.vercel.app  (set after Vercel deploy)
   ```

5. Settings → Deploy:
   - Build Command: cd apps/api && npm run build
   - Start Command: node apps/api/dist/index.js
   - Health Check: /health

6. Note your Railway domain: https://atom-os-api-xxxx.railway.app

---

## STEP 5 — Deploy Frontend to Vercel

1. Go to https://vercel.com → New Project → Import Git Repository
2. Select atom-os repo
3. **Root Directory**: Set to `apps/web` (critical for monorepo!)
4. Framework: Vite (auto-detected)

5. Set Environment Variables:
   ```
   VITE_API_URL=https://atom-os-api-xxxx.railway.app
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

6. Deploy → note your Vercel domain

7. Go back to Railway → add to Variables:
   FRONTEND_URL=https://your-app.vercel.app

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
- [ ] Rate limiting active (check Railway logs)
- [ ] Health check passing: https://your-api.railway.app/health
- [ ] Test full flow: signup → join → approve → QR scan → checkin ✓

---

## TROUBLESHOOTING

**Login fails after deploy:**
→ Check VITE_API_URL is correct Railway domain
→ Check FRONTEND_URL in Railway matches Vercel domain exactly

**QR tokens not generating:**
→ Verify SUPABASE_SERVICE_ROLE_KEY is set in Railway
→ Service role bypasses RLS — required for qr_tokens writes

**Members can't check in:**
→ Confirm gym status is 'active' (super admin panel)
→ Confirm membership status is 'approved'
→ Check token not expired (default 180s)

**CORS errors:**
→ FRONTEND_URL in Railway must match Vercel URL exactly (no trailing slash)
