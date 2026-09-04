import assert from "node:assert";
import { SecurityScanService } from "../services/securityScanService.js";

async function runTests() {
  console.log("--- Phase 3: Security Engine Runtime Tests ---");

  const result = await SecurityScanService.runSecurityScan();

  console.log("Scan ID:", result.scanId);
  console.log("Scan Status:", result.status);
  console.log("Findings:", result.findingsCount);

  assert.strictEqual(result.status, "VALID");
  assert.ok(Array.isArray(result.results));
  assert.strictEqual(result.results.length, 3);

  for (const test of result.results) {
    console.log(
      `${test.testId}: ${test.status} | expected=${test.expectedStatus} | actual=${test.actualStatus}`
    );
    console.log(`Evidence: ${test.evidence}`);
  }

  assert.strictEqual(
    result.results.find(r => r.testId === "API1-BOLA-001")?.status,
    "PASS"
  );

  assert.strictEqual(
    result.results.find(r => r.testId === "API2-AUTH-001")?.status,
    "PASS"
  );

  assert.strictEqual(
    result.results.find(r => r.testId === "API5-BFLA-001")?.status,
    "PASS"
  );

  assert.strictEqual(
    result.findingsCount,
    0,
    "Secure runtime should not create confirmed vulnerability findings"
  );

  console.log("All API1/API2/API5 runtime tests passed.");
}

runTests().catch(error => {
  console.error("Phase 3 tests failed:", error);
  process.exit(1);
});
