import crypto from 'node:crypto';
import { getDb } from '../database/db.js';
import { verifyPassword, hashPassword, signJwt } from '../services/cryptoService.js';

function createUserId() {
  return `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function createAccountId(userId) {
  return `acc_${userId}`;
}

function generateUpiId(email, db) {
  const localPart = String(email)
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const base = localPart || 'user';

  let candidate = `${base}@securepay`;
  let counter = 1;

  while (
    db.prepare('SELECT 1 FROM users WHERE LOWER(upi_id) = LOWER(?)').get(candidate)
  ) {
    candidate = `${base}${counter}@securepay`;
    counter += 1;
  }

  return candidate;
}

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

    const user = db.prepare(`
      SELECT *
      FROM users
      WHERE LOWER(email) = ?
         OR LOWER(upi_id) = ?
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
        phone: user.phone || '',
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

export function register(req, res) {
  try {
    const {
      name,
      phone,
      email,
      password,
      confirmPassword,
    } = req.body || {};

    const cleanName = String(name || '').trim();
    const cleanPhone = String(phone || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanName || !cleanPhone || !cleanEmail || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'All registration fields are required.',
      });
    }

    if (!/^\d{10}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number must contain exactly 10 digits.',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.',
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain at least 8 characters.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match.',
      });
    }

    const db = getDb();

    const existingEmail = db.prepare(`
      SELECT id
      FROM users
      WHERE LOWER(email) = ?
    `).get(cleanEmail);

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists.',
      });
    }

    const existingPhone = db.prepare(`
      SELECT id
      FROM users
      WHERE phone = ?
    `).get(cleanPhone);

    if (existingPhone) {
      return res.status(409).json({
        success: false,
        error: 'An account with this mobile number already exists.',
      });
    }

    const userId = createUserId();
    const accountId = createAccountId(userId);
    const upiId = generateUpiId(cleanEmail, db);
    const passwordHash = hashPassword(password);
    const createdAt = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (
        id,
        email,
        name,
        phone,
        role,
        password_hash,
        upi_id,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAccount = db.prepare(`
      INSERT INTO accounts (
        id,
        user_id,
        upi_id,
        balance,
        currency,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const createAccount = db.transaction(() => {
      insertUser.run(
        userId,
        cleanEmail,
        cleanName,
        cleanPhone,
        'USER',
        passwordHash,
        upiId,
        createdAt
      );

      insertAccount.run(
        accountId,
        userId,
        upiId,
        0,
        'INR',
        createdAt
      );
    });

    createAccount();

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: {
        id: userId,
        email: cleanEmail,
        name: cleanName,
        phone: cleanPhone,
        role: 'USER',
        upiId,
        createdAt,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (String(error?.message || '').toLowerCase().includes('unique')) {
      return res.status(409).json({
        success: false,
        error: 'An account with these details already exists.',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'An internal error occurred during account creation.',
    });
  }
}

export function getMe(req, res) {
  try {
    const db = getDb();

    const user = db.prepare(`
      SELECT id, email, name, phone, role, upi_id, created_at
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
        phone: user.phone || '',
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
