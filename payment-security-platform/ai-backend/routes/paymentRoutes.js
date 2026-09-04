import express from 'express';
import { sendPayment } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { paymentRateLimit } from '../middleware/paymentRateLimit.js';

const router = express.Router();

router.post(
  '/send',
  authenticate,
  paymentRateLimit,
  sendPayment
);

export default router;
