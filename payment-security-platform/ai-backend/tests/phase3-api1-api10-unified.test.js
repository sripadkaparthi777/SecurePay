import assert from 'node:assert';
import { SecurityScanService } from '../services/securityScanService.js';
import { getDb } from '../database/db.js';

async function runTests() {
  console.log('--- Unified OWASP API1-API10 Security Scan ---');

  const result =
    await SecurityScanService.runSecurityScan();

  console.log('Scan ID:', result.scanId);
  console.log('Status:', result.status);
  console.log('Scanner:', result.scanner);
  console.log('Version:', result.scannerVersion);
  console.log('Findings:', result.findingsCount);

  assert.strictEqual(
    result.status,
    'VALID'
  );

  assert.strictEqual(
    result.results.length,
    10
  );

  for (const test of result.results) {
    console.log(
      `${test.testId} | ${test.status} | expected=${test.expectedStatus} | actual=${test.actualStatus}`
    );

    console.log(
      `Evidence: ${test.evidence}`
    );
  }

  const expectedTests = [
    'API1-BOLA-001',
    'API2-AUTH-001',
    'API3-PROPERTY-001',
    'API4-RESOURCE-001',
    'API5-BFLA-001',
    'API6-FLOW-001',
    'API7-SSRF-001',
    'API8-CONFIG-001',
    'API9-INVENTORY-001',
    'API10-CONSUMPTION-001',
  ];

  for (const testId of expectedTests) {
    const test =
      result.results.find(
        item => item.testId === testId
      );

    assert.ok(
      test,
      `Missing test result: ${testId}`
    );
  }

  const api8 =
    result.results.find(
      item => item.testId === 'API8-CONFIG-001'
    );

  if (api8.status === 'FAIL') {
    console.log(
      'API8 currently reports configuration findings. This is expected until the configuration is hardened.'
    );
  }

  const db = getDb();

  const findings =
    db.prepare(`
      SELECT
        id,
        owasp_category,
        title,
        severity,
        status,
        scan_id
      FROM security_findings
      WHERE scan_id = ?
    `).all(result.scanId);

  assert.strictEqual(
    findings.length,
    result.findingsCount
  );

  console.log(
    `Persisted findings for this scan: ${findings.length}`
  );

  console.log(
    '\nUnified API1-API10 scan completed successfully.'
  );
}

runTests().catch(error => {
  console.error(
    '\nUnified security scan failed:'
  );
  console.error(error);
  process.exit(1);
});
