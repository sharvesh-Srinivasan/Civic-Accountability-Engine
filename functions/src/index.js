import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import reportsRouter from './routes/reports.js';
import commitmentsRouter from './routes/commitments.js';
import wardsRouter from './routes/wards.js';
import adminRouter from './routes/admin.js';
import chatRoutes from './routes/chat.js';
import { checkAndUpdateCommitments } from './services/commitmentChecker.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, etc.)
    if (!origin) return callback(null, true);
    const allowed = [
      /localhost/,
      /\.web\.app$/,
      /\.firebaseapp\.com$/,
      /\.vercel\.app$/,
      /\.render\.com$/,
    ];
    if (allowed.some(pattern => pattern.test(origin))) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive for now — lock down in production
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight for all routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

// Routes
app.use('/api/reports', reportsRouter);
app.use('/api/commitments', commitmentsRouter);
app.use('/api/wards', wardsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/chat', chatRoutes);

// Run commitment check on startup (daily would be via cron)
setTimeout(async () => {
  try {
    await checkAndUpdateCommitments();
    console.log('✅ Commitment check ran on startup');
  } catch (e) {
    console.warn('Commitment check skipped (DB not ready):', e.message);
  }
}, 3000);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

import { onRequest } from 'firebase-functions/v2/https';

// Export the Express app as a Firebase Cloud Function
export const api = onRequest(
  {
    region: "us-central1",
    maxInstances: 10,
    memory: "512MiB" // Since we use Gemini
  },
  app
);
