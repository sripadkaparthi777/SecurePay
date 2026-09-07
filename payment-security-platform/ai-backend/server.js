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
import securityScanRoutes from './routes/securityScanRoutes.js';
import api7TestRoutes from './routes/api7TestRoutes.js';
import api9TestRoutes from './routes/api9TestRoutes.js';
import api10TestRoutes from './routes/api10TestRoutes.js';
import api8TestRoutes from './routes/api8TestRoutes.js';
import api6TestRoutes from './routes/api6TestRoutes.js';
import rateLimitTestRoutes from './routes/rateLimitTestRoutes.js';
import { authenticate } from './middleware/authMiddleware.js';
import { getMe } from './controllers/authController.js';
import { attackSimulationRoutes } from './routes/attackSimulationRoutes.js';
import { securityIncidentRoutes } from './routes/securityIncidentRoutes.js';

const app = express();

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  'http://localhost:5173'
)
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser/server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error('CORS origin not allowed.')
      );
    },
    credentials: true,
  })
);
app.use(express.json({
  strict: false,
  limit: '1mb'
}));

// Convert malformed/unsupported JSON bodies into a client error,
// instead of exposing them as HTTP 500 application errors.
app.use((err, req, res, next) => {
  if (
    err?.type === 'entity.parse.failed' ||
    (
      err instanceof SyntaxError &&
      err?.status === 400
    )
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON request body.'
    });
  }

  next(err);
});

app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

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
app.use('/api/attack-simulation', attackSimulationRoutes);
app.use('/api/security-incidents', securityIncidentRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/test', rateLimitTestRoutes);
app.use('/api/api6-test', api6TestRoutes);
app.use('/api/security-test/api7', api7TestRoutes);
app.use('/api/security-test/api8', api8TestRoutes);
app.use('/api/security-test/api9', api9TestRoutes);
app.use('/api/security-test/api10', api10TestRoutes);
app.use('/api', aiRoutes);
app.use('/api', securityScanRoutes); // Contains /api/analyze-security

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












