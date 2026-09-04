import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/ssrf-test',
  authenticate,
  async (req, res) => {
    const { url } = req.body || {};

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'URL is required.'
      });
    }

    // Safe demonstration only:
    // Do not make outbound requests to arbitrary user-controlled URLs.
    return res.status(400).json({
      success: false,
      error: 'Outbound URL access is disabled by security policy.',
      securityCategory: 'API7'
    });
  }
);

export default router;
