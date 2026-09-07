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
      zap = {
        scanner: 'OWASP ZAP',
        version:
          await ZapIntegrationService.getVersion(),
        status: 'AVAILABLE',
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
