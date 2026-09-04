import express from 'express';
import { getAuditLogs } from '../services/auditService.js';
import { authenticate, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticate, requireRole('ADMIN', 'SECURITY_REVIEWER'), (req, res) => {
  try {
    const logs = getAuditLogs(Number(req.query.limit) || 100);
    return res.json({
      success: true,
      count: logs.length,
      auditLogs: logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs.',
    });
  }
});

export default router;
