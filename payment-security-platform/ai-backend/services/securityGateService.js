import { getDb } from '../database/db.js';

/**
 * Deterministic Security Gate for SecurePay Phase 2.
 */
export function evaluateSecurityGate({
  authenticatedUserId,
  senderUpi,
  receiverUpi,
  amount,
  idempotencyKey,
}) {
  const db = getDb();
  const findings = [];
  let score = 100;
  let scanStatus = "VALID"; 
  let decision = "ALLOW";
  const reasons = [];

  // 1. Basic Validation (Deterministic)
  if (!authenticatedUserId) return { decision: "BLOCK", score: 0, reasons: ["Authentication failed"], findings, scanStatus: "UNAVAILABLE" };
  
  const cleanReceiverUpi = receiverUpi?.trim().toLowerCase();
  const cleanSenderUpi = String(senderUpi).trim().toLowerCase();

  if (!cleanReceiverUpi) return { decision: "BLOCK", score, reasons: ["Missing receiver UPI"], findings, scanStatus };
  if (cleanReceiverUpi === cleanSenderUpi) return { decision: "BLOCK", score, reasons: ["Self-payment blocked"], findings, scanStatus };
  
  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0) return { decision: "BLOCK", score, reasons: ["Invalid amount"], findings, scanStatus };

  // 2. Account & Balance Check
  const senderAccount = db.prepare('SELECT balance FROM accounts WHERE user_id = ?').get(authenticatedUserId);
  if (!senderAccount || senderAccount.balance < numericAmount) {
    return { decision: "BLOCK", score, reasons: ["Insufficient balance"], findings, scanStatus };
  }

  const receiverAccount = db.prepare('SELECT user_id FROM accounts WHERE LOWER(upi_id) = ?').get(cleanReceiverUpi);
  if (!receiverAccount) {
    return { decision: "BLOCK", score, reasons: ["Receiver not found"], findings, scanStatus };
  }

  // 3. Security Findings & Vulnerability Injection Check
  // We check for active vulnerabilities in the system
  // For Phase 2, we simulate findings that might be present in a "vulnerabilities" table
  // or injected via a global state for demo purposes.
  const activeFindings = db.prepare(`
    SELECT * FROM security_findings 
    WHERE status = 'CONFIRMED' AND (payment_critical = 1 OR severity IN ('CRITICAL', 'HIGH'))
  `).all();

  for (const finding of activeFindings) {
    findings.push(finding.id);
    const penalty = {
      'CRITICAL': 25,
      'HIGH': 15,
      'MEDIUM': 8,
      'LOW': 3
    }[finding.severity] || 0;

    score -= penalty;

    if (finding.payment_critical && (finding.severity === 'CRITICAL' || finding.severity === 'HIGH')) {
      decision = "BLOCK";
      reasons.push(`Security Policy: ${finding.title} (${finding.severity})`);
    }
  }

  // 4. Mock Scan Status Logic (for Demo/Phase 2)
  // TEMPORARY DEFAULT: If no scans exist, we default to ALLOW.
  // This will be replaced by the real scan engine in later phases.
  try {
    const latestScan = db.prepare("SELECT status FROM security_scans ORDER BY created_at DESC LIMIT 1").get();
    if (latestScan) {
      scanStatus = latestScan.status;
      if (["UNAVAILABLE", "TIMEOUT", "CONFLICTING"].includes(scanStatus)) {
        decision = "BLOCK";
        reasons.push(`Scan Status: ${scanStatus}`);
      }
    } else {
      // Default state when no scans have been run yet
      scanStatus = "VALID";
    }
  } catch (e) {
    console.warn("Security Gate: security_scans table check failed, using default VALID status.");
    scanStatus = "VALID";
  }

  score = Math.max(0, Math.min(100, score));

  return {
    decision,
    score,
    reasons,
    findings,
    scanStatus,
    policyVersion: "1.0.0"
  };
}
