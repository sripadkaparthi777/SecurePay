import express from 'express';
import { analyzeSecurity } from '../controllers/aiController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/analyze-security',
  authenticate,
  analyzeSecurity
);

export default router;
