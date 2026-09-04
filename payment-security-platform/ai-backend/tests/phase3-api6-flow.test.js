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

console.log("--- API6 Sensitive Business Flow Runtime Test ---");

const counts = {};

for (let i = 1; i <= 6; i++) {
  const response = await fetch(
    `${BASE_URL}/api/api6-test/sensitive-flow-test`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  counts[response.status] =
    (counts[response.status] || 0) + 1;

  console.log(
    `Request ${i}: HTTP ${response.status}`
  );
}

console.log("\nHTTP status counts:");
console.table(counts);

if (counts[200] !== 3 || counts[429] !== 3) {
  console.error(
    "API6 FAILED: expected exactly 3 accepted requests and 3 rate-limited requests."
  );
  process.exit(1);
}

console.log(
  "API6 PASS: sensitive business flow is throttled after 3 requests."
);
