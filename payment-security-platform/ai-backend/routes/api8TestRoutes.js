import express from 'express';

const router = express.Router();

router.get('/config-test', (req, res) => {
  const findings = [];

  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS ||
    'http://localhost:5173'
  )
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  // Do not treat development mode itself as a vulnerability.
  // We inspect whether insecure wildcard configuration exists.
  if (allowedOrigins.includes('*')) {
    findings.push({
      check: 'cors',
      issue: 'Wildcard CORS configuration detected.'
    });
  }

  if (allowedOrigins.length === 0) {
    findings.push({
      check: 'cors',
      issue: 'No explicit allowed CORS origins configured.'
    });
  }

  const nodeEnv = process.env.NODE_ENV || 'development';

  res.json({
    success: true,
    securityCategory: 'API8',
    environment: nodeEnv,
    allowedOrigins,
    findings
  });
});

export default router;
