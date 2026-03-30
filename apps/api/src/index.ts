// apps/api/src/index.ts
// Main Express server entry point for Atom OS API

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Routes
import authRouter from './routes/auth.js';
import gymsRouter from './routes/gyms.js';
import membershipRouter from './routes/membership.js';
import qrRouter from './routes/qr.js';
import checkinsRouter from './routes/checkins.js';
import workoutsRouter from './routes/workouts.js';
import adminRouter from './routes/admin.js';

const app = express();
const PORT = process.env.PORT ?? 4000;

// ─── SECURITY MIDDLEWARE ──────────────────────────────────────────────────────

app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow QR code image embedding
}));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL ?? 'http://localhost:5173',
    'https://atom-os.vercel.app', // production frontend
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── RATE LIMITING ────────────────────────────────────────────────────────────

// Global: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
});

// Auth routes: stricter — 20 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts. Please wait.', code: 'AUTH_RATE_LIMITED' },
});

// QR check-in: 10 per minute (prevents brute-force token guessing)
const checkinLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many check-in attempts.', code: 'CHECKIN_RATE_LIMITED' },
});

app.use(globalLimiter);

// ─── BODY PARSING ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
  });
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/gyms', gymsRouter);
app.use('/api/membership', membershipRouter);
app.use('/api/qr', qrRouter);
app.use('/api/checkins', checkinLimiter, checkinsRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/admin', adminRouter);

// ─── 404 HANDLER ──────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
  });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'SERVER_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { message: err.message }),
  });
});

// ─── START ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════╗
║     ATOM OS API — v0.1.0          ║
║     Port: ${PORT}                    ║
║     Env:  ${process.env.NODE_ENV ?? 'development'}              ║
╚═══════════════════════════════════╝
  `);
});

export default app;
