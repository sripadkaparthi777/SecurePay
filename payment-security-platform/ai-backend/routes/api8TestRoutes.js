import express from 'express';

const router = express.Router();

router.get('/config-test', (req, res) => {
  const findings = [];

  if (process.env.NODE_ENV !== 'production') {
    findings.push({
      check: 'environment',
      issue: 'Application is not running in production mode.'
    });
  }

  const corsHeader = res.getHeader('Access-Control-Allow-Origin');

  if (corsHeader === '*') {
    findings.push({
      check: 'cors',
      issue: 'Wildcard CORS configuration detected.'
    });
  }

  res.json({
    success: true,
    securityCategory: 'API8',
    findings
  });
});

export default router;
