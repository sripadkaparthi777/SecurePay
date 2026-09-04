import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { getDb } from './database/db.js';

import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import rateLimitTestRoutes from './routes/rateLimitTestRoutes.js';
import { authenticate } from './middleware/authMiddleware.js';
import { getMe } from './controllers/authController.js';

const app = express();

app.use(cors());
app.use(express.json());

// Initialize Database & Seed data
getDb();

// General / Health Endpoints
app.get('/', (req, res) => {
  res.json({
    name: 'SecurePay API Security Testing Platform',
    version: '1.0.0',
    status: 'running',
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// Direct specification requirement: GET /api/me
app.get('/api/me', authenticate, getMe);

// Mount Modular Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/test', rateLimitTestRoutes);
app.use('/api', aiRoutes); // Contains /api/analyze-security

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.originalUrl} not found.`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error.',
  });
});

const PORT = config.port;

// Only listen if not imported by test runner
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`SecurePay Backend running on http://localhost:${PORT}`);
  });
}

export default app;
