import { getDb } from '../database/db.js';

export function getMyAccount(req, res) {
  try {
    const db = getDb();
    const account = db.prepare(`
      SELECT id, user_id, upi_id, balance, currency, updated_at 
      FROM accounts 
      WHERE user_id = ?
    `).get(req.user.userId);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found for authenticated user.',
      });
    }

    return res.json({
      success: true,
      account: {
        id: account.id,
        userId: account.user_id,
        upiId: account.upi_id,
        balance: account.balance,
        currency: account.currency,
        updatedAt: account.updated_at,
      },
    });
  } catch (error) {
    console.error('getMyAccount error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve account details.',
    });
  }
}

export function addMoney(req, res) {
  try {
    const { amount } = req.body || {};
    const numericAmount = Number(amount);

    if (!numericAmount || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Amount must be a positive number greater than 0.',
      });
    }

    if (numericAmount > 1000000) {
      return res.status(400).json({
        success: false,
        error: 'Amount exceeds maximum single deposit limit (₹10,00,000).',
      });
    }

    const db = getDb();
    const now = new Date().toISOString();

    // Enforce server-side update on authenticated user only
    const update = db.prepare(`
      UPDATE accounts 
      SET balance = balance + ?, updated_at = ? 
      WHERE user_id = ?
    `);

    update.run(numericAmount, now, req.user.userId);

    const updatedAccount = db.prepare(`
      SELECT balance, currency FROM accounts WHERE user_id = ?
    `).get(req.user.userId);

    return res.json({
      success: true,
      message: `Successfully added ₹${numericAmount.toFixed(2)} to your account.`,
      balance: updatedAccount.balance,
      currency: updatedAccount.currency,
    });
  } catch (error) {
    console.error('addMoney error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process deposit.',
    });
  }
}
