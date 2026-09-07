import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { runSecurityScan } from '../controllers/securityScanController.js';

const router = express.Router();

router.post(
  '/security-scan',
  authenticate,
  runSecurityScan
);

export default router;
