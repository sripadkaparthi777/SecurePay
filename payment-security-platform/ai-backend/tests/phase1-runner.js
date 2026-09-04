import http from 'http';
import app from '../server.js';
import { getDb, resetDatabase } from '../database/db.js';

const TEST_PORT = 5009;
const BASE_URL = `http://localhost:${TEST_PORT}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING SECUREPAY PHASE 1 TEST SUITE & DEMO RUNNER');
  console.log('====================================================\n');

  // Reset database to a clean initial state
  const db = getDb();
  resetDatabase(db);

  const results = [];

  async function step(title, fn) {
    process.stdout.write(`Testing: ${title} ... `);
    try {
      await fn();
      console.log('✅ PASS');
      results.push({ title, status: 'PASS' });
    } catch (err) {
      console.log(`❌ FAIL (${err.message})`);
      results.push({ title, status: 'FAIL', error: err.message });
    }
  }

  let tokenUserA = '';
  let tokenUserB = '';
  let lastTxId = '';
  const demoIdempotencyKey = 'demo-idempotency-key-001';

  // 1. Successful login
  await step('1. Successful login for userA and userB', async () => {
    const resA = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'userA@securepay.local', password: 'UserA@123' },
    });
    assert(resA.status === 200, `Expected 200, got ${resA.status}`);
    assert(resA.data.success === true, 'Login success should be true');
    assert(typeof resA.data.token === 'string', 'Token should be returned');
    assert(resA.data.user.upiId === 'userA@upi', 'UPI should be userA@upi');
    tokenUserA = resA.data.token;

    const resB = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'userB@securepay.local', password: 'UserB@123' },
    });
    assert(resB.status === 200, `Expected 200, got ${resB.status}`);
    tokenUserB = resB.data.token;
  });

  // 2. Invalid login
  await step('2. Invalid login rejected with 401', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'userA@securepay.local', password: 'WrongPassword' },
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.data.success === false, 'Expected success: false');
  });

  // 3. Authenticated current-user endpoint
  await step('3. Authenticated current-user endpoint (GET /api/me)', async () => {
    const res = await request('/api/me', {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.email === 'userA@securepay.local', 'Expected userA email');
    assert(res.data.user.role === 'USER', 'Expected role USER');
  });

  // 4. Add Money
  await step('4. Add Money to authenticated account (POST /api/accounts/add-money)', async () => {
    const res = await request('/api/accounts/add-money', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUserA}` },
      body: { amount: 1000 },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.balance === 1000, `Expected balance 1000, got ${res.data.balance}`);

    // Verify account retrieval
    const accRes = await request('/api/accounts/me', {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert(accRes.data.account.balance === 1000, 'Balance in /api/accounts/me must be 1000');
  });

  // 5. Successful userA -> userB payment
  await step('5. Successful payment: userA -> userB ₹500', async () => {
    const res = await request('/api/payment/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUserA}` },
      body: {
        receiverUpi: 'userB@upi',
        amount: 500,
        idempotencyKey: demoIdempotencyKey,
      },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Payment should succeed');
    assert(res.data.balance === 500, `Sender balance should be 500, got ${res.data.balance}`);
    lastTxId = res.data.transaction.transactionId;
    assert(lastTxId.startsWith('TX-'), 'Transaction ID should start with TX-');
  });

  // 6. UserB receives money
  await step('6. UserB receives money (balance = 500 and RECEIVED transaction)', async () => {
    const accB = await request('/api/accounts/me', {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    assert(accB.data.account.balance === 500, `UserB balance should be 500, got ${accB.data.account.balance}`);

    const txB = await request('/api/transactions/me', {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    assert(txB.data.transactions.length > 0, 'UserB should have at least 1 transaction');
    const receivedTx = txB.data.transactions[0];
    assert(receivedTx.type === 'RECEIVED', `Expected type RECEIVED, got ${receivedTx.type}`);
    assert(receivedTx.amount === 500, `Expected amount 500, got ${receivedTx.amount}`);
    assert(receivedTx.senderUpi === 'userA@upi', 'Sender UPI should be userA@upi');
  });

  // 7. Self-payment rejection
  await step('7. Self-payment rejection (userB -> userB@upi)', async () => {
    const res = await request('/api/payment/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUserB}` },
      body: {
        receiverUpi: 'userB@upi',
        amount: 100,
      },
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(
      res.data.error === 'You cannot make a payment to your own UPI ID.',
      `Expected self-payment error message, got: ${res.data.error}`
    );
  });

  // 8. Insufficient balance rejection
  await step('8. Insufficient balance rejection (userB -> userA ₹99999)', async () => {
    const res = await request('/api/payment/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUserB}` },
      body: {
        receiverUpi: 'userA@upi',
        amount: 99999,
      },
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.error === 'Insufficient balance', `Expected 'Insufficient balance', got '${res.data.error}'`);
  });

  // 9. Invalid receiver
  await step('9. Invalid receiver rejected with 404', async () => {
    const res = await request('/api/payment/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUserA}` },
      body: {
        receiverUpi: 'ghost_user@upi',
        amount: 50,
      },
    });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  // 10. Duplicate/idempotency replay
  await step('10. Duplicate/idempotency replay prevents double debit/credit', async () => {
    // Replay identical payment with demoIdempotencyKey from userA
    const resReplay = await request('/api/payment/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUserA}` },
      body: {
        receiverUpi: 'userB@upi',
        amount: 500,
        idempotencyKey: demoIdempotencyKey,
      },
    });
    assert(resReplay.status === 200, `Expected 200, got ${resReplay.status}`);
    assert(resReplay.data.isIdempotentReplay === true, 'Should indicate idempotent replay');
    assert(resReplay.data.balance === 500, `UserA balance must remain 500, got ${resReplay.data.balance}`);

    // Verify UserB balance did NOT increase again
    const accB = await request('/api/accounts/me', {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    assert(accB.data.account.balance === 500, `UserB balance must remain 500, got ${accB.data.account.balance}`);
  });

  // 11. User A cannot access User B's transaction
  await step("11. User A cannot access User B's transaction (BOLA check returning 403)", async () => {
    // Have User B send ₹50 to admin@upi
    const resBPayment = await request('/api/payment/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenUserB}` },
      body: {
        receiverUpi: 'admin@upi',
        amount: 50,
      },
    });
    assert(resBPayment.status === 200, 'User B payment to admin should succeed');
    const bOnlyTxId = resBPayment.data.transaction.transactionId;

    // Now User A (an unrelated third party) attempts to retrieve this transaction
    const resUnauthorizedAccess = await request(`/api/transactions/${bOnlyTxId}`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert(resUnauthorizedAccess.status === 403, `Expected 403 Forbidden, got ${resUnauthorizedAccess.status}`);
    assert(resUnauthorizedAccess.data.success === false, 'Expected success: false on unauthorized access');
  });

  // Section 16: Required Demo Scenario verification summary
  console.log('\n====================================================');
  console.log('SECTION 16: REQUIRED DEMO SCENARIO SUMMARY');
  console.log('====================================================');
  console.log('1. userA logged in and added ₹1000.');
  console.log('2. userA sent ₹500 to userB@upi.');
  console.log('   - userA balance: ₹500.00');
  console.log('   - userB balance: ₹500.00');
  console.log('3. Authenticated as userB:');
  console.log('   - GET /api/accounts/me: ₹500.00 confirmed');
  console.log('   - GET /api/transactions/me: received ₹500 from userA@upi confirmed');
  console.log('4. userB sent ₹100 to userB@upi:');
  console.log('   - Rejected: "You cannot make a payment to your own UPI ID."');
  console.log('5. Replayed userA -> userB payment with same idempotency key:');
  console.log('   - No second debit, no second credit. Balances remained ₹500 each.');
  console.log('====================================================\n');

  const failed = results.filter((r) => r.status === 'FAIL');
  if (failed.length > 0) {
    console.error(`FAILED ${failed.length} / ${results.length} tests.`);
    process.exit(1);
  } else {
    console.log(`ALL ${results.length} TESTS PASSED SUCCESSFULLY! ✨`);
    process.exit(0);
  }
}

// Start temporary test server
const server = http.createServer(app);
server.listen(TEST_PORT, async () => {
  try {
    await runTests();
  } catch (err) {
    console.error('Test runner fatal error:', err);
    process.exit(1);
  } finally {
    const db = getDb();
    resetDatabase(db);
    server.close();
  }
});
