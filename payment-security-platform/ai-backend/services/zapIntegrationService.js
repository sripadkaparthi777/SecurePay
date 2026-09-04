import crypto from 'node:crypto';
import { getDb } from '../database/db.js';

const ZAP_BASE_URL =
  process.env.ZAP_BASE_URL || 'http://127.0.0.1:8090';

const TARGET_BASE_URL =
  process.env.SECUREPAY_BASE_URL || 'http://localhost:5002';

const ZAP_SCANNER_NAME =
  'OWASP ZAP';

const ZAP_SCANNER_VERSION =
  '2.17.0';

function normalizeRisk(risk) {
  const value = String(risk || '').toUpperCase();

  if (value === 'HIGH') return 'HIGH';
  if (value === 'MEDIUM') return 'MEDIUM';
  if (value === 'LOW') return 'LOW';

  return 'INFO';
}

function mapOwaspCategory(alert) {
  const name = String(alert.name || '').toLowerCase();
  const url = String(alert.url || '').toLowerCase();

  if (
    name.includes('authentication') ||
    name.includes('session')
  ) {
    return 'API2:2023 Broken Authentication';
  }

  if (
    name.includes('authorization') ||
    name.includes('access control') ||
    url.includes('/transactions/')
  ) {
    return 'API1:2023 Broken Object Level Authorization';
  }

  if (
    name.includes('parameter tampering') ||
    name.includes('input') ||
    name.includes('validation')
  ) {
    return 'API3:2023 Broken Object Property Level Authorization';
  }

  if (
    name.includes('resource') ||
    name.includes('rate limit') ||
    name.includes('dos') ||
    name.includes('buffer overflow')
  ) {
    return 'API4:2023 Unrestricted Resource Consumption';
  }

  if (
    name.includes('function') ||
    name.includes('privilege')
  ) {
    return 'API5:2023 Broken Function Level Authorization';
  }

  if (
    name.includes('csrf') ||
    name.includes('business')
  ) {
    return 'API6:2023 Unrestricted Access to Sensitive Business Flows';
  }

  if (
    name.includes('ssrf') ||
    name.includes('server side request forgery')
  ) {
    return 'API7:2023 Server Side Request Forgery';
  }

  if (
    name.includes('configuration') ||
    name.includes('security header') ||
    name.includes('debug')
  ) {
    return 'API8:2023 Security Misconfiguration';
  }

  if (
    name.includes('information disclosure') ||
    name.includes('hidden file') ||
    name.includes('directory browsing')
  ) {
    return 'API9:2023 Improper Inventory Management';
  }

  if (
    name.includes('unsafe') ||
    name.includes('external')
  ) {
    return 'API10:2023 Unsafe Consumption of APIs';
  }

  return 'ZAP:Unmapped';
}

function isPaymentCritical(url) {
  const value = String(url || '');

  return (
    value.includes('/api/payment/') ||
    value.includes('/api/transactions/')
  );
}

function buildFingerprint(alert) {
  return [
    alert.name || '',
    alert.risk || '',
    alert.url || '',
    alert.method || '',
    alert.param || '',
    alert.cweid || '',
    alert.wascid || '',
  ].join('|');
}

async function zapRequest(path) {
  const response = await fetch(
    `${ZAP_BASE_URL}${path}`
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      `ZAP API failed: HTTP ${response.status}`
    );
  }

  return data;
}

export class ZapIntegrationService {

  static async getVersion() {
    const result = await zapRequest(
      '/JSON/core/view/version/'
    );

    return result?.version || null;
  }

  static async getAlerts() {
    const encodedBaseUrl =
      encodeURIComponent(TARGET_BASE_URL);

    const result = await zapRequest(
      `/JSON/core/view/alerts/?baseurl=${encodedBaseUrl}`
    );

    return Array.isArray(result?.alerts)
      ? result.alerts
      : [];
  }

  static async collectAndPersist(scanId) {
    const db = getDb();

    const alerts = await this.getAlerts();

    const existing = db.prepare(`
      SELECT title,
             endpoint,
             method,
             evidence
      FROM security_findings
      WHERE scan_id = ?
    `).all(scanId);

    const existingFingerprints =
      new Set(
        existing.map(row =>
          [
            row.title || '',
            '',
            row.endpoint || '',
            row.method || '',
            '',
            '',
            '',
          ].join('|')
        )
      );

    const insert = db.prepare(`
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
        ?, ?, ?, ?, 'ZAP_REPORTED',
        ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    let persisted = 0;
    let skippedDuplicates = 0;

    for (const alert of alerts) {

      const title =
        alert.name ||
        'ZAP Security Alert';

      const endpoint =
        alert.url ||
        '';

      const method =
        alert.method ||
        'UNKNOWN';

      const description =
        alert.description ||
        'ZAP reported a potential security issue.';

      const evidence =
        alert.evidence ||
        '';

      const recommendation =
        alert.solution ||
        'Review the ZAP alert and apply the recommended remediation.';

      const fingerprint =
        [
          title,
          '',
          endpoint,
          method,
          '',
          '',
          '',
        ].join('|');

      if (existingFingerprints.has(fingerprint)) {
        skippedDuplicates++;
        continue;
      }

      insert.run(
        `fnd_zap_${crypto.randomUUID()}`,
        mapOwaspCategory(alert),
        title,
        normalizeRisk(alert.risk),
        endpoint,
        method,
        description,
        evidence,
        recommendation,
        isPaymentCritical(endpoint) ? 1 : 0,
        scanId,
        new Date().toISOString()
      );

      existingFingerprints.add(fingerprint);
      persisted++;
    }

    return {
      scanner: ZAP_SCANNER_NAME,
      scannerVersion: ZAP_SCANNER_VERSION,
      target: TARGET_BASE_URL,
      alertsFound: alerts.length,
      persisted,
      skippedDuplicates,
      alerts: alerts.map(alert => ({
        name: alert.name,
        risk: alert.risk,
        confidence: alert.confidence,
        url: alert.url,
        method: alert.method,
        param: alert.param,
        cweid: alert.cweid,
        wascid: alert.wascid,
        evidence: alert.evidence,
        owaspCategory: mapOwaspCategory(alert),
      })),
    };
  }
}
