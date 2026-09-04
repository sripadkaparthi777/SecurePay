import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { paymentRateLimit } from '../middleware/paymentRateLimit.js';

const router = express.Router();

router.get(
  '/rate-limit-test',
  authenticate,
  paymentRateLimit,
  (req, res) => {
    res.json({
      success: true,
      message: 'Rate limit test request accepted.'
    });
  }
);

export default router;
