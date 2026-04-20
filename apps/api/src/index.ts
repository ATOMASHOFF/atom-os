// apps/api/src/index.ts
// Main Express server entry point for Atom OS API
console.log('[STARTUP] Initializing process...');

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRouter from './routes/auth';
import gymsRouter from './routes/gyms';
import membershipRouter from './routes/membership';
import qrRouter from './routes/qr';
import checkinsRouter from './routes/checkins';
import workoutsRouter from './routes/workouts';
import aiRouter from './routes/ai';
import adminRouter from './routes/admin';
import announcementsRouter from './routes/announcements';
import plansRouter from './routes/plans';
import subscriptionsRouter from './routes/subscriptions';

const app = express();
const PORT = parseInt(process.env.PORT ?? '4000', 10);

function getAllowedOrigins(): string[] {
  const fromList = (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const defaults = [
    process.env.FRONTEND_URL ?? 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  return Array.from(new Set([...fromList, ...defaults]));
}

function validateCriticalEnv(): string[] {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  return required.filter((key) => !process.env[key]);
}

// ─── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  console.log(`[HEALTH] Check received from ${req.ip}`);
  const missingVars = validateCriticalEnv();

  res.status(200).json({
    status: missingVars.length === 0 ? 'ok' : 'degraded',
    version: '1.8.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
    ...(missingVars.length > 0 && { missing_env: missingVars }),
  });
});

// ─── SECURITY MIDDLEWARE ──────────────────────────────────────────────────────
const missingCriticalEnv = validateCriticalEnv();
if (missingCriticalEnv.length > 0) {
  console.error(`[STARTUP] Missing critical env vars: ${missingCriticalEnv.join(', ')}`);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({ crossOriginEmbedderPolicy: false }));

const allowedOrigins = getAllowedOrigins();
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from non-browser clients (health checks, server-to-server).
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { error: 'Too many auth attempts. Please wait.', code: 'AUTH_RATE_LIMITED' },
});
const checkinLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  message: { error: 'Too many check-in attempts.', code: 'CHECKIN_RATE_LIMITED' },
});

app.use(globalLimiter);

// ─── BODY PARSING ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/gyms', gymsRouter);
app.use('/api/membership', membershipRouter);
app.use('/api/qr', qrRouter);
app.use('/api/checkins', checkinLimiter, checkinsRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/admin', adminRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/plans', plansRouter);
app.use('/api/subscriptions', subscriptionsRouter);

// ─── 404 HANDLER ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found`, code: 'NOT_FOUND' });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({
    error: 'Internal server error', code: 'SERVER_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { message: err.message }),
  });
});

// ─── START ────────────────────────────────────────────────────────────────────
console.log('[STARTUP] Attempting to listen on port', PORT);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n╔═══════════════════════════════════╗\n║     ATOM OS API — v1.8.0          ║\n║     Port: ${PORT}                    ║\n║     Host: 0.0.0.0                 ║\n╚═══════════════════════════════════╝\n`);
});

export default app;
