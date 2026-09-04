import express from 'express';
import { getMyAccount, addMoney } from '../controllers/accountController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/me', getMyAccount);
router.post('/add-money', addMoney);

export default router;
