import express from 'express';
import { analyzeSecurity } from '../controllers/aiController.js';

const router = express.Router();

router.post('/analyze-security', analyzeSecurity);

export default router;
