import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getSecurityIncidents,
  getSecurityIncidentById,
  updateSecurityIncidentStatus,
} from '../services/securityIncidentService.js';

const router = express.Router();

function requireSecurityRole(req, res, next) {
  if (!['ADMIN', 'SECURITY_REVIEWER'].includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      error: 'Security administrator access required.',
    });
  }

  next();
}

router.get(
  '/',
  authenticate,
  requireSecurityRole,
  (req, res) => {
    return res.json({
      success: true,
      incidents: getSecurityIncidents(),
    });
  }
);

router.get(
  '/:incidentId',
  authenticate,
  requireSecurityRole,
  (req, res) => {
    const incident = getSecurityIncidentById(
      req.params.incidentId
    );

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Security incident not found.',
      });
    }

    return res.json({
      success: true,
      incident,
    });
  }
);

router.patch(
  '/:incidentId/status',
  authenticate,
  requireSecurityRole,
  (req, res) => {
    const { status } = req.body || {};

    const incident = updateSecurityIncidentStatus(
      req.params.incidentId,
      status
    );

    if (!incident) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status or incident not found.',
      });
    }

    return res.json({
      success: true,
      incident,
    });
  }
);

export { router as securityIncidentRoutes };
