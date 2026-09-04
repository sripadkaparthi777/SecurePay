import assert from "node:assert";

const BASE_URL = "http://localhost:5002";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
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
  const result = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  assert.strictEqual(result.status, 200);
  assert.ok(result.data?.token);

  return result.data.token;
}

async function runTests() {
  console.log("--- Phase 3: API3 / API4 / API6 Runtime Tests ---");

  const userAToken = await login(
    "userA@securepay.local",
    "UserA@123"
  );

  const userBToken = await login(
    "userB@securepay.local",
    "UserB@123"
  );

  // API3
  console.log("\nAPI3 — Broken Object Property Level Authorization");

  const ownAccount = await request("/api/accounts/me", {
    headers: {
      Authorization: `Bearer ${userAToken}`,
    },
  });

  console.log(
    `Account response: expected 200, actual ${ownAccount.status}`
  );

  assert.strictEqual(ownAccount.status, 200);

  // Try sending client-controlled identity fields.
  const propertyTamper = await request("/api/payment/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userAToken}`,
    },
    body: JSON.stringify({
      senderUserId: "usr_b",
      senderUpi: "userB@upi",
      senderEmail: "userB@securepay.local",
      receiverUpi: "userB@upi",
      amount: 1,
      idempotencyKey: `API3-${Date.now()}`,
    }),
  });

  console.log(
    `Property tampering response: ${propertyTamper.status}`
  );

  // API4
  console.log("\nAPI4 — Unrestricted Resource Consumption");

  let successfulRequests = 0;
  let rejectedRequests = 0;

  for (let i = 0; i < 25; i++) {
    const result = await request("/api/health");
    if (result.status >= 200 && result.status < 300) {
      successfulRequests++;
    } else if (
      result.status === 429 ||
      result.status === 403
    ) {
      rejectedRequests++;
    }
  }

  console.log(
    `25 requests: successful=${successfulRequests}, rejected=${rejectedRequests}`
  );

  // API6
  console.log("\nAPI6 — Sensitive Business Flow Abuse");

  const key = `API6-${Date.now()}`;

  const first = await request("/api/payment/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userBToken}`,
    },
    body: JSON.stringify({
      receiverUpi: "admin@upi",
      amount: 1,
      idempotencyKey: key,
    }),
  });

  const replay = await request("/api/payment/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userBToken}`,
    },
    body: JSON.stringify({
      receiverUpi: "admin@upi",
      amount: 1,
      idempotencyKey: key,
    }),
  });

  console.log(
    `First payment: ${first.status}`
  );

  console.log(
    `Replay payment: ${replay.status}`
  );

  assert.strictEqual(first.status, 200);

  assert.ok(
    replay.status === 200 || replay.status === 409
  );

  console.log("\nAPI3/API4/API6 basic runtime checks completed.");
}

runTests().catch(error => {
  console.error("Phase 3 API3/API4/API6 tests failed:");
  console.error(error);
  process.exit(1);
});
