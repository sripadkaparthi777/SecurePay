import crypto from 'node:crypto';
import { getDb } from '../database/db.js';

const BASE_URL = process.env.SECUREPAY_BASE_URL || 'http://localhost:5002';
const SCANNER_NAME = 'SecurePay Deterministic Security Engine';
const SCANNER_VERSION = '1.0.0';

async function httpRequest(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    status: response.status,
    data,
  };
}

async function login(email, password) {
  const result = await httpRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (result.status !== 200 || !result.data?.token) {
    throw new Error(`Login failed for ${email} with status ${result.status}`);
  }

  return result.data.token;
}

export class SecurityScanService {
  static async runSecurityScan() {
    const db = getDb();
    const scanId = `scn_${crypto.randomUUID()}`;
    const startedAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO security_scans
      (id, scan_id, status, scanner, scanner_version, started_at, created_at)
      VALUES (?, ?, 'IN_PROGRESS', ?, ?, ?, ?)
    `).run(
      scanId,
      scanId,
      SCANNER_NAME,
      SCANNER_VERSION,
      startedAt,
      startedAt
    );

    try {
      const userAToken = await login(
        'userA@securepay.local',
        'UserA@123'
      );

      const userBToken = await login(
        'userB@securepay.local',
        'UserB@123'
      );

      const adminToken = await login(
        'admin@securepay.local',
        'Admin@123'
      );

      const reviewerToken = await login(
        'reviewer@securepay.local',
        'Reviewer@123'
      );

      const testResults = [];

      // API2
      testResults.push(
        await this.testAPI2()
      );

      // API5
      testResults.push(
        await this.testAPI5({
          userAToken,
          adminToken,
          reviewerToken,
        })
      );

      // API1
      testResults.push(
        await this.testAPI1({
          db,
          userAToken,
          userBToken,
        })
      );

      const failedResults = testResults.filter(
        (result) => result.status === 'FAIL'
      );

      const insertFinding = db.prepare(`
        INSERT INTO security_findings (
          id,
          owasp_category,
          title,
          severity,
          status,
          endpoint,
          method,
          description,
          evidence,
          recommendation,
          payment_critical,
          scan_id,
          created_at
        )
        VALUES (?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const result of failedResults) {
        insertFinding.run(
          `fnd_${crypto.randomUUID()}`,
          result.owaspCategory,
          result.title,
          result.severity,
          result.endpoint,
          result.method,
          result.description,
          result.evidence,
          result.recommendation,
          result.paymentCritical ? 1 : 0,
          scanId,
          result.timestamp
        );
      }

      const completedAt = new Date().toISOString();

      db.prepare(`
        UPDATE security_scans
        SET status = 'VALID',
            completed_at = ?
        WHERE id = ?
      `).run(completedAt, scanId);

      return {
        scanId,
        status: 'VALID',
        findingsCount: failedResults.length,
        results: testResults,
      };
    } catch (error) {
      console.error('Security Scan Failed:', error);

      db.prepare(`
        UPDATE security_scans
        SET status = 'FAILED',
            completed_at = ?
        WHERE id = ?
      `).run(new Date().toISOString(), scanId);

      throw error;
    }
  }

  static async testAPI2() {
    const timestamp = new Date().toISOString();

    const result = await httpRequest('/api/accounts/me');

    const passed = result.status === 401;

    return {
      testId: 'API2-AUTH-001',
      owaspCategory: 'API2:2023 Broken Authentication',
      title: 'Broken Authentication - Missing Token',
      status: passed ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      endpoint: '/api/accounts/me',
      method: 'GET',
      expectedStatus: 401,
      actualStatus: result.status,
      evidence: `Expected 401, received ${result.status}.`,
      description: passed
        ? 'Protected endpoint correctly rejected a request without authentication.'
        : 'Protected endpoint accepted a request without authentication.',
      recommendation:
        'Require valid authentication on protected endpoints.',
      paymentCritical: false,
      timestamp,
    };
  }

  static async testAPI5({
    userAToken,
    adminToken,
    reviewerToken,
  }) {
    const timestamp = new Date().toISOString();

    const userResult = await httpRequest(
      '/api/transactions/all',
      {
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      }
    );

    const adminResult = await httpRequest(
      '/api/transactions/all',
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );

    const reviewerResult = await httpRequest(
      '/api/transactions/all',
      {
        headers: {
          Authorization: `Bearer ${reviewerToken}`,
        },
      }
    );

    const passed =
      userResult.status === 403 &&
      adminResult.status === 200 &&
      reviewerResult.status === 200;

    return {
      testId: 'API5-BFLA-001',
      owaspCategory: 'API5:2023 Broken Function Level Authorization',
      title: 'Broken Function Level Authorization',
      status: passed ? 'PASS' : 'FAIL',
      severity: 'CRITICAL',
      endpoint: '/api/transactions/all',
      method: 'GET',
      expectedStatus: 'USER=403, ADMIN=200, REVIEWER=200',
      actualStatus:
        `USER=${userResult.status}, ` +
        `ADMIN=${adminResult.status}, ` +
        `REVIEWER=${reviewerResult.status}`,
      evidence:
        `USER expected 403 got ${userResult.status}; ` +
        `ADMIN expected 200 got ${adminResult.status}; ` +
        `REVIEWER expected 200 got ${reviewerResult.status}.`,
      description: passed
        ? 'Role authorization correctly restricted USER access while allowing privileged roles.'
        : 'Role authorization did not match the expected policy.',
      recommendation:
        'Enforce role-based authorization on privileged endpoints.',
      paymentCritical: true,
      timestamp,
    };
  }

  static async testAPI1({
    db,
    userAToken,
    userBToken,
  }) {
    const timestamp = new Date().toISOString();

    const transactionId = `TX-BOLA-${Date.now()}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const now = new Date().toISOString();

    // Insert a controlled fixture directly into the test database.
    // This avoids using the payment endpoint and therefore avoids
    // contaminating the BOLA test with the Security Gate itself.
    db.prepare(`
      INSERT INTO transactions (
        id,
        transaction_id,
        owner_user_id,
        sender_user_id,
        sender_upi,
        receiver_user_id,
        receiver_upi,
        amount,
        status,
        type,
        created_at
      )
      VALUES (?, ?, 'usr_b', 'usr_b', 'userB@upi',
              'usr_admin', 'admin@upi', 1.0,
              'COMPLETED', 'SENT', ?)
    `).run(
      `tx_${crypto.randomUUID()}`,
      transactionId,
      now
    );

    const ownerResult = await httpRequest(
      `/api/transactions/${transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${userBToken}`,
        },
      }
    );

    const attackerResult = await httpRequest(
      `/api/transactions/${transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      }
    );

    const passed =
      ownerResult.status === 200 &&
      (attackerResult.status === 403 ||
        attackerResult.status === 404);

    return {
      testId: 'API1-BOLA-001',
      owaspCategory:
        'API1:2023 Broken Object Level Authorization',
      title: 'Broken Object Level Authorization',
      status: passed ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      endpoint: '/api/transactions/:transactionId',
      method: 'GET',
      expectedStatus: 'OWNER=200, OTHER_USER=403/404',
      actualStatus:
        `OWNER=${ownerResult.status}, ` +
        `OTHER_USER=${attackerResult.status}`,
      evidence:
        `Transaction=${transactionId}; ` +
        `owner request=${ownerResult.status}; ` +
        `cross-user request=${attackerResult.status}.`,
      description: passed
        ? 'Transaction ownership authorization correctly blocked cross-user access.'
        : 'A user was able to access another user transaction object.',
      recommendation:
        'Enforce object ownership authorization for every transaction lookup.',
      paymentCritical: true,
      timestamp,
    };
  }
}
