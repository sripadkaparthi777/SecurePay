import crypto from 'node:crypto';
import { getDb } from '../database/db.js';

export function logAudit({
  transactionId = null,
  authenticatedUserId = null,
  endpoint,
  decision,
  reason,
  score = null,
  findings = [],
  scanId = null,
  policyVersion = "1.0.0"
}) {
  try {
    const db = getDb();
    const id = `aud_${crypto.randomUUID()}`;
    const auditId = `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const timestamp = new Date().toISOString();
    const findingsStr = JSON.stringify(findings);

    const insert = db.prepare(`
      INSERT INTO audit_logs (
        id, audit_id, transaction_id, timestamp, authenticated_user_id, endpoint, 
        decision, reason, security_score, findings, scan_id, policy_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      id,
      auditId,
      transactionId,
      timestamp,
      authenticatedUserId,
      endpoint,
      decision,
      reason,
      score,
      findingsStr,
      scanId,
      policyVersion
    );

    return { id, auditId, timestamp };
  } catch (error) {
    console.error('Failed to write audit log:', error);
    return null;
  }
}

export function getAuditLogs(limit = 100) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?')
    .all(limit);
}
