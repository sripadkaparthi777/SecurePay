import { ZapIntegrationService } from '../services/zapIntegrationService.js';

console.log('--- SecurePay ZAP Integration Test ---');

const version = await ZapIntegrationService.getVersion();

console.log(`ZAP version: ${version}`);

if (version !== '2.17.0') {
  console.error(
    `Unexpected ZAP version: ${version}`
  );
  process.exit(1);
}

const result =
  await ZapIntegrationService.collectAndPersist(
    'zap-readonly-baseline'
  );

console.log(
  `ZAP alerts found: ${result.alertsFound}`
);

console.log(
  `Findings persisted: ${result.persisted}`
);

if (result.alerts.length > 0) {
  console.table(
    result.alerts.map(alert => ({
      name: alert.name,
      risk: alert.risk,
      confidence: alert.confidence,
      method: alert.method,
      url: alert.url,
      cwe: alert.cweid,
      owaspCategory: alert.owaspCategory,
    }))
  );
} else {
  console.log(
    'No current ZAP alerts to persist.'
  );
}

console.log(
  'ZAP integration test completed successfully.'
);
