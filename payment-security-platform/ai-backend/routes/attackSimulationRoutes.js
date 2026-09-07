import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { simulateAmountManipulation } from '../services/attackSimulationService.js';

const router = express.Router();

router.post('/amount-manipulation', authenticate, (req, res) => {
  const {
    targetUserId = 'usr_a',
    originalAmount = 500,
    modifiedAmount = 50000,
  } = req.body || {};

  const result = simulateAmountManipulation({
    testUserId: req.user?.userId,
    targetUserId,
    originalAmount: Number(originalAmount),
    modifiedAmount: Number(modifiedAmount),
  });

  return res.status(200).json(result);
});

export { router as attackSimulationRoutes };
