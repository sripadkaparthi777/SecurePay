import crypto from 'node:crypto';
import { resetPaymentRateLimitForTests } from '../middleware/paymentRateLimit.js';
import { getDb } from '../database/db.js';

const BASE_URL =
  process.env.SECUREPAY_BASE_URL || 'http://localhost:5002';

const SCANNER_NAME =
  'SecurePay Deterministic Security Engine';

const SCANNER_VERSION = '2.0.0';

async function httpRequest(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body
        ? { 'Content-Type': 'application/json' }
        : {}),
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
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (
    result.status !== 200 ||
    !result.data?.token
  ) {
    throw new Error(
      `Login failed for ${email}: HTTP ${result.status}`
    );
  }

  return result.data.token;
}

function makeResult({
  testId,
  category,
  title,
  status,
  severity,
  endpoint,
  method,
  expected,
  actual,
  evidence,
  description,
  recommendation,
  paymentCritical = false,
}) {
  return {
    testId,
    owaspCategory: category,
    title,
    status,
    severity,
    endpoint,
    method,
    expectedStatus: expected,
    actualStatus: actual,
    evidence,
    description,
    recommendation,
    paymentCritical,
    timestamp: new Date().toISOString(),
  };
}

export class SecurityScanService {
  static async runSecurityScan() {
      resetPaymentRateLimitForTests();
    const db = getDb();

    const scanId = `scn_${crypto.randomUUID()}`;
    const startedAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO security_scans (
        id,
        scan_id,
        status,
        scanner,
        scanner_version,
        started_at,
        created_at
      )
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

      const results = [];

      results.push(
        await this.testAPI1({
          db,
          userAToken,
          userBToken,
        })
      );

      results.push(
        await this.testAPI2()
      );

      results.push(
        await this.testAPI3({
          userAToken,
        })
      );

      results.push(
        await this.testAPI4({
          userAToken,
        })
      );

      results.push(
        await this.testAPI5({
          userAToken,
          adminToken,
          reviewerToken,
        })
      );

      results.push(
        await this.testAPI6({
          userAToken,
        })
      );

      results.push(
        await this.testAPI7({
          userAToken,
        })
      );

      results.push(
        await this.testAPI8()
      );

      results.push(
        await this.testAPI9()
      );

      results.push(
        await this.testAPI10()
      );

      const failedResults = results.filter(
        result => result.status === 'FAIL'
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
        VALUES (
          ?, ?, ?, ?, 'CONFIRMED',
          ?, ?, ?, ?, ?, ?, ?, ?
        )
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
      `).run(
        completedAt,
        scanId
      );

      return {
        scanId,
        status: 'VALID',
        scanner: SCANNER_NAME,
        scannerVersion: SCANNER_VERSION,
        findingsCount: failedResults.length,
        results,
      };
    } catch (error) {
      db.prepare(`
        UPDATE security_scans
        SET status = 'FAILED',
            completed_at = ?
        WHERE id = ?
      `).run(
        new Date().toISOString(),
        scanId
      );

      throw error;
    }
  }

  // API1 - BOLA
  static async testAPI1({
    db,
    userAToken,
    userBToken,
  }) {
    const transactionId =
      `TX-SCAN-BOLA-${Date.now()}-${Math.floor(
        100 + Math.random() * 900
      )}`;

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
      VALUES (
        ?, ?, 'usr_b', 'usr_b', 'userB@upi',
        'usr_admin', 'admin@upi', 1,
        'COMPLETED', 'SENT', ?
      )
    `).run(
      `tx_${crypto.randomUUID()}`,
      transactionId,
      new Date().toISOString()
    );

    const owner = await httpRequest(
      `/api/transactions/${transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${userBToken}`,
        },
      }
    );

    const otherUser = await httpRequest(
      `/api/transactions/${transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      }
    );

    const passed =
      owner.status === 200 &&
      (otherUser.status === 403 ||
        otherUser.status === 404);

    return makeResult({
      testId: 'API1-BOLA-001',
      category:
        'API1:2023 Broken Object Level Authorization',
      title:
        'Broken Object Level Authorization',
      status: passed ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      endpoint:
        '/api/transactions/:transactionId',
      method: 'GET',
      expected:
        'OWNER=200, OTHER_USER=403/404',
      actual:
        `OWNER=${owner.status}, ` +
        `OTHER_USER=${otherUser.status}`,
      evidence:
        `Transaction=${transactionId}; ` +
        `owner=${owner.status}; ` +
        `cross-user=${otherUser.status}`,
      description:
        passed
          ? 'Cross-user transaction access was blocked.'
          : 'Cross-user transaction access was not blocked.',
      recommendation:
        'Enforce object ownership on transaction retrieval.',
      paymentCritical: true,
    });
  }

  // API2 - Authentication
  static async testAPI2() {
    const missingToken =
      await httpRequest('/api/accounts/me');

    const invalidToken =
      await httpRequest('/api/accounts/me', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

    const passed =
      missingToken.status === 401 &&
      invalidToken.status === 401;

    return makeResult({
      testId: 'API2-AUTH-001',
      category:
        'API2:2023 Broken Authentication',
      title:
        'Broken Authentication',
      status: passed ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      endpoint: '/api/accounts/me',
      method: 'GET',
      expected:
        'MISSING=401, INVALID=401',
      actual:
        `MISSING=${missingToken.status}, ` +
        `INVALID=${invalidToken.status}`,
      evidence:
        `Missing token=${missingToken.status}; ` +
        `invalid token=${invalidToken.status}`,
      description:
        passed
          ? 'Authentication correctly rejected unauthenticated requests.'
          : 'Authentication protection did not match expected behavior.',
      recommendation:
        'Require valid authentication credentials for protected APIs.',
    });
  }

  // API3 - Object Property Authorization
  static async testAPI3({
    userAToken,
  }) {
    resetPaymentRateLimitForTests();
    const response = await httpRequest(
      '/api/payment/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          senderUserId: 'usr_b',
          senderUpi: 'userB@upi',
          senderEmail: 'userB@securepay.local',
          receiverUpi: 'admin@upi',
          amount: 1,
          idempotencyKey:
            `API3-SCAN-${Date.now()}`,
        }),
      }
    );

    const transaction =
      response.data?.transaction;

    const passed =
      response.status === 200 &&
      transaction?.senderUserId === 'usr_a' &&
      transaction?.senderUpi === 'userA@upi';

    return makeResult({
      testId: 'API3-PROPERTY-001',
      category:
        'API3:2023 Broken Object Property Level Authorization',
      title:
        'Broken Object Property Level Authorization',
      status: passed ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      endpoint: '/api/payment/send',
      method: 'POST',
      expected:
        'Authenticated sender identity must override forged sender fields',
      actual:
        `HTTP=${response.status}; ` +
        `senderUserId=${transaction?.senderUserId}`,
      evidence:
        `Forged senderUserId=usr_b; ` +
        `actual senderUserId=${transaction?.senderUserId}; ` +
        `actual senderUpi=${transaction?.senderUpi}`,
      description:
        passed
          ? 'Client-controlled sender identity was ignored.'
          : 'Client-controlled sender identity influenced payment ownership.',
      recommendation:
        'Derive security-sensitive properties from the authenticated identity.',
      paymentCritical: true,
    });
  }

  // API4 - Resource Consumption
  static async testAPI4({
    userAToken,
  }) {
    const statuses = [];

    for (let i = 1; i <= 12; i++) {
      const response = await httpRequest(
        '/api/test/rate-limit-test',
        {
          headers: {
            Authorization: `Bearer ${userAToken}`,
          },
        }
      );

      statuses.push(response.status);
    }

    const throttled =
      statuses.includes(429);

    return makeResult({
      testId: 'API4-RESOURCE-001',
      category:
        'API4:2023 Unrestricted Resource Consumption',
      title:
        'Unrestricted Resource Consumption',
      status: throttled ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      endpoint:
        '/api/test/rate-limit-test',
      method: 'GET',
      expected:
        'Excessive requests must produce HTTP 429',
      actual:
        statuses.join(','),
      evidence:
        `12-request burst statuses=${statuses.join(',')}`,
      description:
        throttled
          ? 'The server throttled excessive requests.'
          : 'The server accepted the excessive request burst without throttling.',
      recommendation:
        'Apply request-rate and resource-consumption controls.',
      paymentCritical: false,
    });
  }

  // API5 - Function Authorization
  static async testAPI5({
    userAToken,
    adminToken,
    reviewerToken,
  }) {
    const user = await httpRequest(
      '/api/transactions/all',
      {
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      }
    );

    const admin = await httpRequest(
      '/api/transactions/all',
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }
    );

    const reviewer = await httpRequest(
      '/api/transactions/all',
      {
        headers: {
          Authorization: `Bearer ${reviewerToken}`,
        },
      }
    );

    const passed =
      user.status === 403 &&
      admin.status === 200 &&
      reviewer.status === 200;

    return makeResult({
      testId: 'API5-BFLA-001',
      category:
        'API5:2023 Broken Function Level Authorization',
      title:
        'Broken Function Level Authorization',
      status: passed ? 'PASS' : 'FAIL',
      severity: 'CRITICAL',
      endpoint:
        '/api/transactions/all',
      method: 'GET',
      expected:
        'USER=403, ADMIN=200, REVIEWER=200',
      actual:
        `USER=${user.status}, ` +
        `ADMIN=${admin.status}, ` +
        `REVIEWER=${reviewer.status}`,
      evidence:
        `USER=${user.status}; ` +
        `ADMIN=${admin.status}; ` +
        `REVIEWER=${reviewer.status}`,
      description:
        passed
          ? 'Privileged transaction access is role restricted.'
          : 'Privileged transaction access policy failed.',
      recommendation:
        'Enforce role-based authorization on privileged functions.',
      paymentCritical: true,
    });
  }

  // API6 - Sensitive Business Flow
  static async testAPI6({
    userAToken,
  }) {
    resetPaymentRateLimitForTests();
    const statuses = [];

    for (let i = 1; i <= 6; i++) {
      const response = await httpRequest(
        '/api/api6-test/sensitive-flow-test',
        {
          headers: {
            Authorization: `Bearer ${userAToken}`,
          },
        }
      );

      statuses.push(response.status);
    }

    const blocked =
      statuses.includes(429);

    return makeResult({
      testId: 'API6-FLOW-001',
      category:
        'API6:2023 Unrestricted Access to Sensitive Business Flows',
      title:
        'Sensitive Payment Flow Protection',
      status: blocked ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      endpoint:
        '/api/api6-test/sensitive-flow-test',
      method: 'GET',
      expected:
        'Repeated sensitive-flow requests must eventually return 429',
      actual:
        statuses.join(','),
      evidence:
        `Sensitive-flow burst statuses=${statuses.join(',')}`,
      description:
        blocked
          ? 'Repeated sensitive-flow access was throttled.'
          : 'Repeated sensitive-flow requests were not throttled.',
      recommendation:
        'Apply business-flow abuse controls to sensitive operations.',
      paymentCritical: true,
    });
  }

  // API7 - SSRF
  static async testAPI7({
    userAToken,
  }) {
    const response = await httpRequest(
      '/api/security-test/api7/ssrf-test',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({
          url: 'http://127.0.0.1:5002/health',
        }),
      }
    );

    const passed =
      response.status === 400;

    return makeResult({
      testId: 'API7-SSRF-001',
      category:
        'API7:2023 Server Side Request Forgery',
      title:
        'Server Side Request Forgery Protection',
      status: passed ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      endpoint:
        '/api/security-test/api7/ssrf-test',
      method: 'POST',
      expected: 400,
      actual: response.status,
      evidence:
        `SSRF candidate URL returned HTTP ${response.status}`,
      description:
        passed
          ? 'Arbitrary outbound URL access was blocked.'
          : 'The SSRF candidate request was not blocked.',
      recommendation:
        'Allow only validated destinations and block internal network targets.',
      paymentCritical: false,
    });
  }

  // API8 - Security Misconfiguration
  static async testAPI8() {
    const response = await httpRequest(
      '/api/security-test/api8/config-test'
    );

    const findings =
      response.data?.findings || [];

    const passed =
      response.status === 200 &&
      findings.length === 0;

    return makeResult({
      testId: 'API8-CONFIG-001',
      category:
        'API8:2023 Security Misconfiguration',
      title:
        'Security Misconfiguration',
      status: passed ? 'PASS' : 'FAIL',
      severity: 'MEDIUM',
      endpoint:
        '/api/security-test/api8/config-test',
      method: 'GET',
      expected:
        'No insecure configuration findings',
      actual:
        findings.length === 0
          ? 'NO_FINDINGS'
          : `${findings.length}_FINDINGS`,
      evidence:
        JSON.stringify(findings).slice(0, 500),
      description:
        passed
          ? 'No tested security misconfiguration was reported.'
          : 'Security configuration weaknesses were detected.',
      recommendation:
        'Disable wildcard CORS and use production configuration for deployment.',
      paymentCritical: false,
    });
  }

  // API9 - Inventory
  static async testAPI9() {
    const response = await httpRequest(
      '/api/security-test/api9/inventory-test'
    );

    const endpoints =
      response.data?.endpoints || [];

    const passed =
      response.status === 200 &&
      endpoints.length >= 10;

    return makeResult({
      testId: 'API9-INVENTORY-001',
      category:
        'API9:2023 Improper Inventory Management',
      title:
        'API Inventory Coverage',
      status: passed ? 'PASS' : 'FAIL',
      severity: 'MEDIUM',
      endpoint:
        '/api/security-test/api9/inventory-test',
      method: 'GET',
      expected:
        'Known API inventory must be available',
      actual:
        `${endpoints.length}_ENDPOINTS`,
      evidence:
        `Inventory contains ${endpoints.length} endpoints.`,
      description:
        passed
          ? 'The application exposes a maintained API inventory.'
          : 'API inventory coverage is insufficient.',
      recommendation:
        'Maintain an accurate inventory of exposed API endpoints and versions.',
      paymentCritical: false,
    });
  }

  // API10 - Unsafe API Consumption
  static async testAPI10() {
    const response = await httpRequest(
      '/api/security-test/api10/external-data-test',
      {
        method: 'POST',
        body: JSON.stringify({
          data: {
            transactionId: 'TX-API10-SCAN',
            status: 'COMPLETED',
            amount: 500,
            currency: 'INR',
            isAdmin: true,
            bypassSecurity: true,
          },
        }),
      }
    );

    const passed =
      response.status === 400;

    return makeResult({
      testId: 'API10-CONSUMPTION-001',
      category:
        'API10:2023 Unsafe Consumption of APIs',
      title:
        'Unsafe External API Data Consumption',
      status: passed ? 'PASS' : 'FAIL',
      severity: 'HIGH',
      endpoint:
        '/api/security-test/api10/external-data-test',
      method: 'POST',
      expected: 400,
      actual: response.status,
      evidence:
        `Unexpected external fields returned HTTP ${response.status}.`,
      description:
        passed
          ? 'Unexpected external fields were rejected.'
          : 'Unexpected external fields were accepted.',
      recommendation:
        'Validate external API data against an explicit schema before use.',
      paymentCritical: false,
    });
  }
}


