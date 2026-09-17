import crypto from 'node:crypto';
import { SecurityScanService } from '../services/securityScanService.js';
import { ZapIntegrationService } from '../services/zapIntegrationService.js';

export async function runSecurityScan(req, res) {
  const requestId = crypto.randomUUID();

  try {
    const deterministic =
      await SecurityScanService.runSecurityScan();

    let zap = null;

    try {
      const version =
        await ZapIntegrationService.getVersion();

      const result =
        await ZapIntegrationService.runScan({
          scanId: deterministic.scanId,
          authenticated:
            typeof req.headers.authorization === 'string' &&
            req.headers.authorization.startsWith('Bearer '),
        });

      zap = {
        scanner: result.scanner,
        version,
        status: result.status,
        target: result.target,
        authenticated: result.authenticated,
        spiderEndpoints: result.spiderEndpoints,
        alertsFound: result.alertsFound,
        persisted: result.persisted,
        skippedDuplicates: result.skippedDuplicates,
        alerts: result.alerts,
      };

    } catch (zapError) {
      console.warn(
        `[ZAP-${requestId}]`,
        zapError?.message || zapError
      );

      zap = {
        scanner: 'OWASP ZAP',
        version: null,
        status: 'UNAVAILABLE',
        authenticated: false,
        spiderEndpoints: 0,
        alertsFound: 0,
        persisted: 0,
        skippedDuplicates: 0,
        alerts: [],
        error:
          zapError?.message ||
          'ZAP scan could not be completed.',
      };
    }

    return res.json({
      success: true,
      requestId,

      scan: {
        scanId: deterministic.scanId,
        status: deterministic.status,
        scanner: deterministic.scanner,
        scannerVersion: deterministic.scannerVersion,
        findingsCount: deterministic.findingsCount,
        results: deterministic.results,
      },

      zap,
    });

  } catch (error) {
    console.error(
      `[SECURITY-SCAN-${requestId}]`,
      error?.message || error
    );

    return res.status(500).json({
      success: false,
      error: 'Security scan could not be completed.',
      requestId,
    });
  }
}
