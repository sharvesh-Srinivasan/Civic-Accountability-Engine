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
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    /\.vercel\.app$/,
    /\.web\.app$/,
    /\.firebaseapp\.com$/,
    'https://civicwatch-d81aa.web.app'
  ],
  credentials: true,
}));
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
