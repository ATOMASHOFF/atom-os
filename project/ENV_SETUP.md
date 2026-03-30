# ENV_SETUP.md — Environment Configuration

## Quick Start
```bash
# 1. Copy templates
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 2. Fill in Supabase credentials (see below)
# 3. Run setup checker
node scripts/setup.js

# 4. Start dev servers
npm run dev:api   # http://localhost:4000
npm run dev:web   # http://localhost:5173
```

---

## apps/api/.env (full)
```env
PORT=4000
NODE_ENV=development

# From Supabase Dashboard → Project Settings → API
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Set to your Vercel domain in production
FRONTEND_URL=http://localhost:5173
```

## apps/web/.env.local (full)
```env
VITE_API_URL=http://localhost:4000

# From Supabase Dashboard → Project Settings → API
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Where to Get Each Value

### Supabase URL + Anon Key + Service Role Key
1. supabase.com → Your Project → Project Settings → API
2. Copy "Project URL" → SUPABASE_URL / VITE_SUPABASE_URL
3. Copy "anon public" → SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY
4. Copy "service_role" (secret!) → SUPABASE_SERVICE_ROLE_KEY (API only, NEVER web)

### Railway Production Variables
| Key | Value |
|---|---|
| NODE_ENV | production |
| PORT | 4000 |
| SUPABASE_URL | https://xxx.supabase.co |
| SUPABASE_ANON_KEY | eyJ... |
| SUPABASE_SERVICE_ROLE_KEY | eyJ... (secret) |
| FRONTEND_URL | https://your-app.vercel.app |

### Vercel Production Variables
| Key | Value |
|---|---|
| VITE_API_URL | https://your-api.railway.app |
| VITE_SUPABASE_URL | https://xxx.supabase.co |
| VITE_SUPABASE_ANON_KEY | eyJ... |

---

## Security Rules
- NEVER commit .env or .env.local to git (both in .gitignore)
- SUPABASE_SERVICE_ROLE_KEY must ONLY be in Railway (backend)
- NEVER put service_role key in Vercel (frontend) env vars
- VITE_ prefix makes vars available in browser bundle — only public keys
