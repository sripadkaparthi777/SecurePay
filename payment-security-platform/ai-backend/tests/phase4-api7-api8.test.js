const BASE_URL = "http://localhost:5002";

async function login() {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: "userA@securepay.local",
      password: "UserA@123"
    })
  });

  const data = await response.json();

  if (!response.ok || !data.token) {
    throw new Error(`Login failed: HTTP ${response.status}`);
  }

  return data.token;
}

const token = await login();

console.log("--- API7 SSRF Runtime Test ---");

const ssrfResponse = await fetch(
  `${BASE_URL}/api/security-test/api7/ssrf-test`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      url: "http://127.0.0.1:5002/health"
    })
  }
);

const ssrfData = await ssrfResponse.json();

console.log(
  `SSRF request: expected 400, actual ${ssrfResponse.status}`
);

console.dir(ssrfData, { depth: 5 });

if (ssrfResponse.status !== 400) {
  console.error("API7 FAILED");
  process.exit(1);
}

console.log("API7 PASS: arbitrary outbound URL access blocked.");

console.log("\n--- API8 Security Misconfiguration Runtime Test ---");

const configResponse = await fetch(
  `${BASE_URL}/api/security-test/api8/config-test`
);

const configData = await configResponse.json();

console.log(
  `Config endpoint: HTTP ${configResponse.status}`
);

console.dir(configData, { depth: 5 });

if (!configResponse.ok) {
  console.error("API8 test endpoint failed.");
  process.exit(1);
}

console.log("API8 runtime configuration inspection completed.");
