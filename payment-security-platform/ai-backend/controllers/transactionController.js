import { getDb } from '../database/db.js';

export function getMyTransactions(req, res) {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        transaction_id as id,
        transaction_id as transactionId,
        sender_user_id as senderUserId,
        sender_upi as senderUpi,
        receiver_user_id as receiverUserId,
        receiver_upi as receiverUpi,
        amount,
        status,
        type,
        idempotency_key as idempotencyKey,
        created_at as createdAt,
        note
      FROM transactions 
      WHERE owner_user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.userId);

    return res.json({
      success: true,
      count: rows.length,
      transactions: rows,
    });
  } catch (error) {
    console.error('getMyTransactions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve transactions.',
    });
  }
}

export function getAllTransactions(req, res) {
  try {
    const db = getDb();
    // Return unique transactions across the platform
    const rows = db.prepare(`
      SELECT 
        transaction_id as id,
        transaction_id as transactionId,
        sender_user_id as senderUserId,
        sender_upi as senderUpi,
        receiver_user_id as receiverUserId,
        receiver_upi as receiverUpi,
        amount,
        status,
        type,
        idempotency_key as idempotencyKey,
        created_at as createdAt,
        note
      FROM transactions 
      WHERE type = 'SENT'
      ORDER BY created_at DESC
    `).all();

    return res.json({
      success: true,
      count: rows.length,
      transactions: rows,
    });
  } catch (error) {
    console.error('getAllTransactions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve all transactions.',
    });
  }
}

export function getTransactionById(req, res) {
  try {
    const { transactionId } = req.params;
    const db = getDb();

    // Check if any transaction with this ID exists
    const anyTx = db.prepare(`
      SELECT * FROM transactions WHERE transaction_id = ? LIMIT 1
    `).get(transactionId);

    if (!anyTx) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found.',
      });
    }

    // Enforce ownership: user must own this transaction record (or be ADMIN / SECURITY_REVIEWER)
    const userTx = db.prepare(`
      SELECT 
        transaction_id as id,
        transaction_id as transactionId,
        sender_user_id as senderUserId,
        sender_upi as senderUpi,
        receiver_user_id as receiverUserId,
        receiver_upi as receiverUpi,
        amount,
        status,
        type,
        idempotency_key as idempotencyKey,
        created_at as createdAt,
        note
      FROM transactions 
      WHERE transaction_id = ? AND owner_user_id = ?
    `).get(transactionId, req.user.userId);

    if (!userTx && req.user.role !== 'ADMIN' && req.user.role !== 'SECURITY_REVIEWER') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to access this transaction.',
      });
    }

    const result = userTx || {
      id: anyTx.transaction_id,
      transactionId: anyTx.transaction_id,
      senderUserId: anyTx.sender_user_id,
      senderUpi: anyTx.sender_upi,
      receiverUserId: anyTx.receiver_user_id,
      receiverUpi: anyTx.receiver_upi,
      amount: anyTx.amount,
      status: anyTx.status,
      type: anyTx.type,
      idempotencyKey: anyTx.idempotency_key,
      createdAt: anyTx.created_at,
      note: anyTx.note,
    };

    return res.json({
      success: true,
      transaction: result,
    });
  } catch (error) {
    console.error('getTransactionById error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve transaction.',
    });
  }
}
