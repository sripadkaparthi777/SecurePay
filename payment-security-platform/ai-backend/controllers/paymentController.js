import crypto from 'node:crypto';
import { getDb } from '../database/db.js';
import { logAudit } from '../services/auditService.js';
import { evaluateSecurityGate } from '../services/securityGateService.js';

export function sendPayment(req, res) {
  const endpoint = '/api/payment/send';
  const authenticatedUserId = req.user?.userId;

  try {
    const { receiverUpi, amount, idempotencyKey, note } = req.body || {};

    // 1. Identify Sender strictly from JWT
    const senderUserId = req.user.userId;
    const senderUpi = req.user.upiId;

    // 2. Validate receiver input
    if (!receiverUpi || typeof receiverUpi !== 'string') {
      logAudit({
        authenticatedUserId,
        endpoint,
        decision: 'REJECTED',
        reason: 'Missing receiver UPI ID',
      });
      return res.status(400).json({
        success: false,
        error: 'Receiver UPI ID is required.',
      });
    }

    const cleanReceiverUpi = receiverUpi.trim().toLowerCase();
    const cleanSenderUpi = String(senderUpi).trim().toLowerCase();

    // 3. Reject self-payment
    if (cleanReceiverUpi === cleanSenderUpi) {
      logAudit({
        authenticatedUserId,
        endpoint,
        decision: 'REJECTED',
        reason: 'Self-payment attempt',
      });
      return res.status(400).json({
        success: false,
        error: 'You cannot make a payment to your own UPI ID.',
      });
    }

    // 4. Validate amount
    const numericAmount = Number(amount);
    if (!numericAmount || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      logAudit({
        authenticatedUserId,
        endpoint,
        decision: 'REJECTED',
        reason: 'Invalid amount',
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Amount must be greater than ₹0.',
      });
    }

    const db = getDb();

    // 5. Find receiver account
    const receiverAccount = db.prepare(`
      SELECT a.id as account_id, a.user_id, a.upi_id, u.name as receiver_name 
      FROM accounts a
      JOIN users u ON u.id = a.user_id
      WHERE LOWER(a.upi_id) = ?
    `).get(cleanReceiverUpi);

    if (!receiverAccount) {
      logAudit({
        authenticatedUserId,
        endpoint,
        decision: 'REJECTED',
        reason: `Receiver UPI not found: ${cleanReceiverUpi}`,
      });
      return res.status(404).json({
        success: false,
        error: 'Receiver UPI ID not found in system.',
      });
    }

    // Double check that receiver is not the same user ID
    if (receiverAccount.user_id === senderUserId) {
      logAudit({
        authenticatedUserId,
        endpoint,
        decision: 'REJECTED',
        reason: 'Self-payment attempt via alternate alias',
      });
      return res.status(400).json({
        success: false,
        error: 'You cannot make a payment to your own UPI ID.',
      });
    }

    // 6. Check Sender Balance
    const senderAccount = db.prepare(`
      SELECT id, balance FROM accounts WHERE user_id = ?
    `).get(senderUserId);

    if (!senderAccount || senderAccount.balance < numericAmount) {
      logAudit({
        authenticatedUserId,
        endpoint,
        decision: 'REJECTED',
        reason: 'Insufficient balance',
      });
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
      });
    }

    // 7. Check Idempotency / Duplicate submission
    if (idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.trim() !== '') {
      const existingSentTx = db.prepare(`
        SELECT transaction_id, sender_user_id, sender_upi, receiver_user_id, receiver_upi, 
               amount, status, type, created_at, idempotency_key 
        FROM transactions 
        WHERE sender_user_id = ? AND idempotency_key = ? AND status = 'COMPLETED' AND type = 'SENT'
      `).get(senderUserId, idempotencyKey.trim());

      if (existingSentTx) {
        logAudit({
          transactionId: existingSentTx.transaction_id,
          authenticatedUserId,
          endpoint,
          decision: 'IDEMPOTENT_REPLAY',
          reason: `Replay detected with key: ${idempotencyKey.trim()}`,
        });

        const currentSenderAccount = db.prepare(`
          SELECT balance FROM accounts WHERE user_id = ?
        `).get(senderUserId);

        return res.json({
          success: true,
          message: 'Payment already processed (idempotent replay).',
          isIdempotentReplay: true,
          transaction: {
            id: existingSentTx.transaction_id,
            transactionId: existingSentTx.transaction_id,
            senderUserId: existingSentTx.sender_user_id,
            senderUpi: existingSentTx.sender_upi,
            receiverUserId: existingSentTx.receiver_user_id,
            receiverUpi: existingSentTx.receiver_upi,
            amount: existingSentTx.amount,
            status: existingSentTx.status,
            type: existingSentTx.type,
            createdAt: existingSentTx.created_at,
            idempotencyKey: existingSentTx.idempotency_key,
          },
          balance: currentSenderAccount ? currentSenderAccount.balance : 0,
        });
      }
    }


    // 8. SECURITY GATE (Phase 2) - Evaluated after business validation
    const securityGate = evaluateSecurityGate({
      authenticatedUserId,
      senderUpi,
      receiverUpi,
      amount,
      idempotencyKey
    });

    if (securityGate.decision === 'BLOCK') {
      logAudit({
        authenticatedUserId,
        endpoint,
        decision: 'BLOCK',
        reason: securityGate.reasons.join(', '),
        score: securityGate.score,
        findings: securityGate.findings,
        policyVersion: securityGate.policyVersion
      });

      return res.status(403).json({
        success: false,
        decision: 'BLOCK',
        error: 'Payment blocked by security policy.',
        reason: securityGate.reasons[0],
        securityScore: securityGate.score,
        findings: securityGate.findings
      });
    }

    // 9. Atomic Settlement
    const txId = `TX-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();
    const cleanIdempotencyKey = idempotencyKey ? String(idempotencyKey).trim() : null;

    db.exec('BEGIN TRANSACTION;');
    try {
      // Debit sender
      db.prepare(`
        UPDATE accounts 
        SET balance = balance - ?, updated_at = ? 
        WHERE user_id = ?
      `).run(numericAmount, now, senderUserId);

      // Credit receiver
      db.prepare(`
        UPDATE accounts 
        SET balance = balance + ?, updated_at = ? 
        WHERE user_id = ?
      `).run(numericAmount, now, receiverAccount.user_id);

      // Create Sender Transaction Record (SENT)
      const senderRowId = `tx_${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO transactions (
          id, transaction_id, owner_user_id, sender_user_id, sender_upi,
          receiver_user_id, receiver_upi, amount, status, type,
          idempotency_key, created_at, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        senderRowId,
        txId,
        senderUserId,
        senderUserId,
        senderUpi,
        receiverAccount.user_id,
        receiverAccount.upi_id,
        numericAmount,
        'COMPLETED',
        'SENT',
        cleanIdempotencyKey,
        now,
        note || null
      );

      // Create Receiver Transaction Record (RECEIVED)
      const receiverRowId = `tx_${crypto.randomUUID()}`;
      db.prepare(`
        INSERT INTO transactions (
          id, transaction_id, owner_user_id, sender_user_id, sender_upi,
          receiver_user_id, receiver_upi, amount, status, type,
          idempotency_key, created_at, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        receiverRowId,
        txId,
        receiverAccount.user_id,
        senderUserId,
        senderUpi,
        receiverAccount.user_id,
        receiverAccount.upi_id,
        numericAmount,
        'COMPLETED',
        'RECEIVED',
        cleanIdempotencyKey,
        now,
        note || null
      );

      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    // 9. Audit Record
    logAudit({
      transactionId: txId,
      authenticatedUserId,
      endpoint,
      decision: 'ALLOW',
      reason: 'Payment settled successfully',
      score: securityGate.score,
      findings: securityGate.findings,
      policyVersion: securityGate.policyVersion
    });

    // 10. Fetch updated sender balance
    const updatedSenderAccount = db.prepare(`
      SELECT balance FROM accounts WHERE user_id = ?
    `).get(senderUserId);

    const transactionRecord = {
      id: txId,
      transactionId: txId,
      senderUserId,
      senderUpi,
      receiverUserId: receiverAccount.user_id,
      receiverUpi: receiverAccount.upi_id,
      receiverName: receiverAccount.receiver_name,
      amount: numericAmount,
      status: 'COMPLETED',
      type: 'SENT',
      createdAt: now,
      idempotencyKey: cleanIdempotencyKey,
    };

    return res.json({
      success: true,
      decision: 'ALLOW',
      securityScore: securityGate.score,
      message: `Payment of ₹${numericAmount.toFixed(2)} sent successfully to ${receiverAccount.receiver_name} (${receiverAccount.upi_id}).`,
      transaction: transactionRecord,
      balance: updatedSenderAccount.balance,
    });
  } catch (error) {
    console.error('sendPayment error:', error);
    logAudit({
      authenticatedUserId,
      endpoint,
      decision: 'FAILED',
      reason: error.message || 'Internal processing failure',
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to process payment.',
    });
  }
}
