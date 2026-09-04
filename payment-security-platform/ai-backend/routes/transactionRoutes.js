import express from 'express';
import {
  getMyTransactions,
  getAllTransactions,
  getTransactionById,
} from '../controllers/transactionController.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/me', getMyTransactions);
router.get('/all', requireRole('ADMIN', 'SECURITY_REVIEWER'), getAllTransactions);
router.get('/:transactionId', getTransactionById);

export default router;
