import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { sensitivePaymentFlowLimit } from '../middleware/sensitivePaymentFlowLimit.js';

const router = express.Router();

router.get(
  '/sensitive-flow-test',
  authenticate,
  sensitivePaymentFlowLimit,
  (req, res) => {
    res.json({
      success: true,
      message: 'Sensitive business flow request accepted.',
      securityCategory: 'API6'
    });
  }
);

export default router;
