import express from 'express';

const router = express.Router();

router.get('/inventory-test', (req, res) => {
  const routes = [
    'GET /health',
    'GET /api/me',
    'POST /api/auth/login',
    'GET /api/accounts/me',
    'POST /api/accounts/add-money',
    'POST /api/payment/send',
    'GET /api/transactions/me',
    'GET /api/transactions/all',
    'GET /api/transactions/:transactionId',
    'GET /api/audit',
    'POST /api/analyze-security',
    'GET /api/api6-test/sensitive-flow-test',
    'GET /api/security-test/api8/config-test'
  ];

  res.json({
    success: true,
    securityCategory: 'API9',
    totalKnownEndpoints: routes.length,
    endpoints: routes
  });
});

export default router;
