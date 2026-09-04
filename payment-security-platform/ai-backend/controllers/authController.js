import { getDb } from '../database/db.js';
import { verifyPassword, signJwt } from '../services/cryptoService.js';

export function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email (or UPI ID) and password are required.',
      });
    }

    const cleanIdentifier = String(email).trim().toLowerCase();
    const db = getDb();

    // Support matching by email or UPI ID
    const user = db.prepare(`
      SELECT * FROM users 
      WHERE LOWER(email) = ? OR LOWER(upi_id) = ?
    `).get(cleanIdentifier, cleanIdentifier);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.',
      });
    }

    const isMatch = verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.',
      });
    }

    const token = signJwt({
      userId: user.id,
      role: user.role,
      email: user.email,
      upiId: user.upi_id,
    });

    return res.json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        upiId: user.upi_id,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred during login.',
    });
  }
}

export function getMe(req, res) {
  try {
    const db = getDb();
    const user = db.prepare(`
      SELECT id, email, name, role, upi_id, created_at 
      FROM users 
      WHERE id = ?
    `).get(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.',
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        upiId: user.upi_id,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred.',
    });
  }
}
