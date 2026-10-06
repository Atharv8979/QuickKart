import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import { checkSupabaseConnection } from './config/supabase.js';
import { startReservationExpiryWorker } from './utils/reservationExpiry.js';
import { initializeSocket } from './sockets/socketHandler.js';
import { errorHandler } from './middlewares/errorMiddleware.js';
import { isEmailConfigured } from './utils/emailService.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import productRoutes from './routes/productRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import agentRoutes from './routes/agentRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.set('io', io);
initializeSocket(io);

// Middlewares
// Render (and most PaaS) terminate TLS in front of the app, so the real client
// IP only exists in X-Forwarded-For. Trusting the first hop makes req.ip
// accurate, which is what the rate limiters and the reset-code audit trail use.
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting on sensitive auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Password reset is stricter: every request either sends an email or consumes
// one of the limited OTP verification attempts.
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests from this IP. Please try again in a few minutes.',
  },
});
const resetVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification attempts from this IP. Please try again later.',
  },
});
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/verify-reset-code', resetVerifyLimiter);
app.use('/api/auth/reset-password', resetVerifyLimiter);

// Root & API Health Check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'QuickKart Backend API is Online & Healthy',
    docs: '/api/health',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'QuickKart Hyperlocal API Server is running (Supabase PostgreSQL Target)',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Diagnostic — shows env var presence + live Supabase connection test
app.get('/api/debug/env', async (req, res) => {
  const { supabase } = await import('./config/supabase.js');
  const vars = {
    SUPABASE_URL: process.env.SUPABASE_URL ? `SET (${process.env.SUPABASE_URL.substring(0, 30)}...)` : 'MISSING ❌',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET ✅' : 'MISSING ❌',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET ✅' : 'MISSING ❌',
    JWT_SECRET: process.env.JWT_SECRET ? 'SET ✅' : 'MISSING ❌',
    NODE_ENV: process.env.NODE_ENV || 'not set',
    PORT: process.env.PORT || 'not set',
    supabase_client_initialized: supabase ? 'YES ✅' : 'NO ❌',
  };

  let dbTest = { status: 'skipped', reason: 'Supabase client not initialized' };
  if (supabase) {
    try {
      const { data: users, error: usersErr } = await supabase.from('users').select('id, name, email, role, password_hash');
      const { data: shops, error: shopsErr } = await supabase.from('shops').select('id').limit(1);
      if (usersErr) {
        dbTest = { status: 'USERS_ERROR ❌', error: usersErr.message, code: usersErr.code };
      } else {
        dbTest = {
          status: 'OK ✅',
          usersCount: users?.length ?? 0,
          users: users?.map(u => ({ email: u.email, role: u.role, passHashLength: u.password_hash?.length })),
          shopsConnected: shops ? 'YES ✅' : 'NO ❌',
        };
      }
    } catch (e) {
      dbTest = { status: 'EXCEPTION ❌', error: e.message };
    }
  }

  res.json({ success: true, envCheck: vars, supabaseDbTest: dbTest });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/products', productRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/agent', agentRoutes);

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start Server
const startServer = async () => {
  try {
    await checkSupabaseConnection();
    startReservationExpiryWorker(io);

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use by another process.`);
        console.error(`👉 Tip: Stop other node processes or run: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force`);
      } else {
        console.error('Server error:', err);
      }
    });

    server.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`  🚀 QuickKart Backend API Server running on port ${PORT}`);
      console.log(`  📍 Hyperlocal Product Discovery & Connectivity Ready`);
      console.log(`====================================================`);

      // Password reset codes are delivered by email. Without SMTP credentials
      // they can only be written to this log, so shout about it on boot.
      if (!isEmailConfigured()) {
        console.warn(
          '[Email] SMTP is NOT configured (SMTP_USER / SMTP_PASS missing).\n' +
            '        Password reset codes will be printed to this log instead of emailed.\n' +
            '        Set SMTP_USER + SMTP_PASS (Gmail App Password) to enable delivery.'
        );
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
