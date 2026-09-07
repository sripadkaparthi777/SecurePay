const BASE_URL = 'http://localhost:5002';

console.log('--- SecurePay Security Scan API Test ---');

const loginResponse = await fetch(
  `${BASE_URL}/api/auth/login`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'userA@securepay.local',
      password: 'UserA@123',
    }),
  }
);

const loginData = await loginResponse.json();

if (!loginResponse.ok || !loginData.token) {
  console.error(
    `Login failed: HTTP ${loginResponse.status}`
  );
  process.exit(1);
}

const token = loginData.token;

const scanResponse = await fetch(
  `${BASE_URL}/api/security-scan`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const scanData = await scanResponse.json();

console.log(
  `Security scan HTTP status: ${scanResponse.status}`
);

console.dir(scanData, { depth: 8 });

if (!scanResponse.ok || !scanData.success) {
  console.error('Security scan API FAILED.');
  process.exit(1);
}

if (
  !scanData.scan ||
  !Array.isArray(scanData.scan.results)
) {
  console.error(
    'Security scan response structure is invalid.'
  );
  process.exit(1);
}

console.log(
  `Deterministic findings: ${scanData.scan.findingsCount}`
);

console.log(
  `ZAP status: ${scanData.zap?.status}`
);

console.log(
  `ZAP version: ${scanData.zap?.version}`
);

console.log(
  'Security scan API PASS.'
);
