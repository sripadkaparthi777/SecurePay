import { verifyJwt } from '../services/cryptoService.js';
import { getDb } from '../database/db.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.',
    });
  }

  const token = authHeader.substring(7).trim();
  const decoded = verifyJwt(token);

  if (!decoded || !decoded.userId) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token.',
    });
  }

  const db = getDb();
  const user = db.prepare('SELECT id, email, name, role, upi_id FROM users WHERE id = ?').get(decoded.userId);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authenticated user no longer exists.',
    });
  }

  req.user = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    upiId: user.upi_id,
  };

  next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to access this resource.',
      });
    }

    next();
  };
}
