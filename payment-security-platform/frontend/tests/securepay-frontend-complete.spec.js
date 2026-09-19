import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const results = [];

function printStepHeader(title) {
  console.log('');
  console.log('============================================================');
  console.log(title);
  console.log('============================================================');
}

async function runStep(stepNo, name, expected, action) {
  const started = Date.now();

  try {
    const actual = await action();

    results.push({
      step: stepNo,
      operation: name,
      expected,
      actual: actual ?? 'Completed',
      status: 'PASS',
      ms: Date.now() - started,
    });

    console.log(
      `STEP ${stepNo} | ${name} | EXPECTED: ${expected} | ACTUAL: ${
        actual ?? 'Completed'
      } | PASS`
    );
  } catch (error) {
    const actual = error?.message || String(error);

    results.push({
      step: stepNo,
      operation: name,
      expected,
      actual,
      status: 'FAIL',
      ms: Date.now() - started,
    });

    console.log(
      `STEP ${stepNo} | ${name} | EXPECTED: ${expected} | ACTUAL: ${actual} | FAIL`
    );
  }
}

async function visibleButton(page, pattern) {
  const buttons = page.getByRole('button').filter({ hasText: pattern });
  const count = await buttons.count();

  if (count === 0) {
    throw new Error(`Button matching ${pattern} was not found`);
  }

  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);

    if (await button.isVisible()) {
      return button;
    }
  }

  throw new Error(
    `Button matching ${pattern} exists but is not visible`
  );
}

async function loginUserA(page) {
  await page.goto('/');

  await page.locator('input[name="identifier"]').fill(
    'userA@securepay.local'
  );

  await page.locator('input[name="password"]').fill(
    'UserA@123'
  );

  await page.getByRole('button', {
    name: 'Login',
    exact: true,
  }).click();

  await expect(
    page.getByRole('heading', {
      name: 'Choose Your Workspace',
    })
  ).toBeVisible();
}

async function getBalanceFromBackend(page, request) {
  const token = await page.evaluate(() =>
    localStorage.getItem('securepay_token')
  );

  if (!token) {
    throw new Error('securepay_token not available');
  }

  const response = await request.get(
    'http://localhost:5002/api/accounts/me',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok()) {
    throw new Error(
      `Account API returned HTTP ${response.status()}`
    );
  }

  const data = await response.json();
  const balance = Number(data?.account?.balance);

  if (!Number.isFinite(balance)) {
    throw new Error(
      `Invalid account balance returned: ${data?.account?.balance}`
    );
  }

  return balance;
}

async function getDisplayedBalance(page) {
  const balanceValue = page.locator('.balance-value').first();

  await expect(balanceValue).toBeVisible();

  let text = (await balanceValue.innerText()).trim();

  // If balance is hidden, reveal it.
  if (/^[•*]+$/.test(text)) {
    const showButton = page.getByRole('button', {
      name: /Show balance/i,
    });

    if (await showButton.count()) {
      await showButton.first().click();
      await expect(balanceValue).toBeVisible();
      text = (await balanceValue.innerText()).trim();
    }
  }

  const match = text.match(
    /(?:₹|Rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/
  );

  if (!match) {
    throw new Error(
      `Could not parse displayed balance from: "${text}"`
    );
  }

  return Number(match[1].replace(/,/g, ''));
}

async function closePaymentResultIfVisible(page) {
  const continueButton = page.getByRole('button', {
    name: 'Continue',
    exact: true,
  });

  if (await continueButton.count()) {
    if (await continueButton.first().isVisible()) {
      await continueButton.first().click();
    }
  }
}

async function openPayTab(page) {
  const payButton = page.getByRole('button', {
    name: 'Pay',
    exact: true,
  });

  await expect(payButton).toBeVisible();
  await payButton.click();

  await expect(
    page.getByRole('heading', {
      name: /Send Money|Self Transfer/i,
    })
  ).toBeVisible();
}

async function openHistoryTab(page) {
  const historyButton = page.getByRole('button', {
    name: 'History',
    exact: true,
  });

  await expect(historyButton).toBeVisible();
  await historyButton.click();

  await expect(
    page.getByRole('heading', {
      name: 'Payment History',
      exact: true,
    })
  ).toBeVisible();
}

test('SecurePay Frontend User Business Workflow', async ({
  page,
  request,
}) => {
  results.length = 0;
  printStepHeader('FRONTEND TEST 1: USER BUSINESS WORKFLOW');

  await runStep(
    1,
    'Login page',
    'Login page with Email/UPI and Password fields is displayed',
    async () => {
      await page.goto('/');

      await expect(
        page.locator('input[name="identifier"]')
      ).toBeVisible();

      await expect(
        page.locator('input[name="password"]')
      ).toBeVisible();

      return 'Login form visible';
    }
  );

  await runStep(
    2,
    'Create Account navigation',
    'Create Account control is available',
    async () => {
      const button = await visibleButton(
        page,
        /create account/i
      );

      await button.click();

      await expect(
        page.getByRole('heading', {
          name: /Create|Register|Account/i,
        }).first()
      ).toBeVisible().catch(() => {});

      const body = await page.locator('body').innerText();

      if (!/confirm password/i.test(body)) {
        throw new Error(
          'Registration page did not display Confirm Password'
        );
      }

      return 'Registration page opened';
    }
  );

  await runStep(
    3,
    'Registration validation',
    'Mismatched passwords are rejected',
    async () => {
      const inputs = page.locator('input:visible');

      const metadata = await inputs.evaluateAll((elements) =>
        elements.map((el) => ({
          name: el.getAttribute('name') || '',
          placeholder: el.getAttribute('placeholder') || '',
          type: el.getAttribute('type') || '',
          id: el.getAttribute('id') || '',
        }))
      );

      function inputByHint(hints) {
        for (let i = 0; i < metadata.length; i++) {
          const text = [
            metadata[i].name,
            metadata[i].placeholder,
            metadata[i].id,
          ]
            .join(' ')
            .toLowerCase();

          if (
            hints.some((hint) =>
              text.includes(hint.toLowerCase())
            )
          ) {
            return inputs.nth(i);
          }
        }

        throw new Error(
          `Input not found for hints: ${hints.join(', ')}`
        );
      }

      const fullName = inputByHint([
        'full name',
        'name',
      ]);

      const mobile = inputByHint([
        'mobile',
        'phone',
      ]);

      const email = inputByHint([
        'email',
      ]);

      const password = inputByHint([
        'password',
      ]);

      const confirm = inputByHint([
        'confirm',
      ]);

      await fullName.fill(
        'SecurePay Frontend Test'
      );

      await mobile.fill(
        `900${Date.now().toString().slice(-7)}`
      );

      await email.fill(
        `frontendtest${Date.now()}@securepay.local`
      );

      await password.fill('Frontend@123');
      await confirm.fill('Frontend@999');

      const createButton = await visibleButton(
        page,
        /create account/i
      );

      await createButton.click();

      await page.waitForTimeout(500);

      const body = await page.locator('body').innerText();

      if (
        !/password|match|same|confirm/i.test(body)
      ) {
        throw new Error(
          'Expected password validation message was not displayed'
        );
      }

      return 'Password mismatch rejected';
    }
  );

  await runStep(
    4,
    'User A login',
    'Valid User A login redirects to workspace selection',
    async () => {
      await loginUserA(page);
      return 'User A authenticated';
    }
  );

  await runStep(
    5,
    'Select User Mode',
    'User Mode opens the unified payment dashboard',
    async () => {
      await page.getByRole('button', {
        name: /User Mode/i,
      }).click();

      await expect(page).toHaveURL(/\/dashboard$/);

      await expect(
        page.locator('button.profile-mode-button')
      ).toBeVisible();

      await expect(
        page.getByText('Transfer Money', {
          exact: true,
        })
      ).toBeVisible();

      return 'Dashboard opened in USER workspace';
    }
  );

  let backendBalanceBeforeAdd = null;
  let backendBalanceAfterAdd = null;
  let displayedBalanceAfterAdd = null;

  await runStep(
    6,
    'Dashboard data loading',
    'Server balance and Recent Payments are displayed on Home',
    async () => {
      await expect(
        page.getByText('Available Balance', {
          exact: true,
        })
      ).toBeVisible();

      await expect(
        page.getByText('Recent Payments', {
          exact: true,
        })
      ).toBeVisible();

      backendBalanceBeforeAdd =
        await getBalanceFromBackend(page, request);

      const displayedBalance =
        await getDisplayedBalance(page);

      const backendRounded =
        Number(backendBalanceBeforeAdd.toFixed(2));

      const uiRounded =
        Number(displayedBalance.toFixed(2));

      if (backendRounded !== uiRounded) {
        throw new Error(
          `UI/server balance mismatch. UI=${uiRounded}, Server=${backendRounded}`
        );
      }

      return `Home loaded | Server balance=${backendRounded.toFixed(2)}`;
    }
  );

  await runStep(
    7,
    'Add Money',
    'Adding ₹5 increases server balance by exactly ₹5',
    async () => {
      if (backendBalanceBeforeAdd === null) {
        backendBalanceBeforeAdd =
          await getBalanceFromBackend(page, request);
      }

      const addButton = await visibleButton(
        page,
        /^Add Money$/i
      );

      await addButton.click();

      const modal = page.locator('.qr-modal').last();

      await expect(modal).toBeVisible();

      const amountInput =
        modal.locator('input[type="number"]').first();

      await expect(amountInput).toBeVisible();
      await amountInput.fill('5');

      const confirmButton =
        modal.locator(
          'button.send-payment-button'
        );

      await expect(confirmButton).toBeVisible();
      await confirmButton.click();

      await page.waitForTimeout(1000);

      backendBalanceAfterAdd =
        await getBalanceFromBackend(page, request);

      displayedBalanceAfterAdd =
        await getDisplayedBalance(page);

      const expected =
        Number(
          (backendBalanceBeforeAdd + 5).toFixed(2)
        );

      const backendActual =
        Number(
          backendBalanceAfterAdd.toFixed(2)
        );

      const uiActual =
        Number(
          displayedBalanceAfterAdd.toFixed(2)
        );

      if (backendActual !== expected) {
        throw new Error(
          `Backend balance mismatch. Expected ${expected}, got ${backendActual}`
        );
      }

      if (uiActual !== backendActual) {
        throw new Error(
          `UI/server balance mismatch. UI=${uiActual}, server=${backendActual}`
        );
      }

      return `Expected=${expected.toFixed(
        2
      )}, UI=${uiActual.toFixed(
        2
      )}, Server=${backendActual.toFixed(2)}`;
    }
  );

  let paymentTransactionId = null;

 await runStep(
  8,
  'Send Payment',
  '₹1 payment to User B completes with ALLOW and a transaction ID',
  async () => {
    await openPayTab(page);

    const receiverInput = page.locator(
      'input[placeholder="UPI ID or 10-digit Mobile"]'
    );

    const amountInput = page.locator(
      'input[placeholder="Enter amount"]'
    ).first();

    await expect(receiverInput).toBeVisible();
    await expect(amountInput).toBeVisible();

    await receiverInput.fill('8765432109');
    await amountInput.fill('1');

    const sendButton = page.locator(
      'button.send-payment-button'
    ).filter({
      hasText: /Send|Pay|Transfer/i,
    }).last();

    await expect(sendButton).toBeVisible();
    await expect(sendButton).toBeEnabled();

    await sendButton.click();

    // Wait for either success or blocked result.
    await expect(
      page.getByText(
        /Payment Successful|Payment Blocked/i
      ).first()
    ).toBeVisible({
      timeout: 20000,
    });

    const body = await page.locator('body').innerText();

    // Give the real application response if the payment was blocked.
    if (/Payment Blocked/i.test(body)) {
      const reasonMatch = body.match(
        /Reason:\s*([^\n]+)/i
      );

      const reason =
        reasonMatch?.[1]?.trim() ||
        'No blocking reason displayed';

      throw new Error(
        `Payment was BLOCKED instead of ALLOW. Reason: ${reason}`
      );
    }

    if (!/Payment Successful/i.test(body)) {
      throw new Error(
        'Payment result was not displayed'
      );
    }

    if (!/Decision:\s*ALLOW/i.test(body)) {
      throw new Error(
        'Payment did not display Decision: ALLOW'
      );
    }

    const scoreMatch = body.match(
      /Security Score:\s*(\d+)\s*\/\s*100/i
    );

    if (!scoreMatch) {
      throw new Error(
        'Security Score was not displayed'
      );
    }

    const txMatch = body.match(
      /Transaction ID:\s*([A-Za-z0-9_-]+)/i
    );

    if (!txMatch) {
      throw new Error(
        'Transaction ID was not displayed'
      );
    }

    paymentTransactionId = txMatch[1];

    return `Payment Successful | Transaction=${paymentTransactionId} | Decision=ALLOW | Score=${scoreMatch[1]}/100`;
  }
);

  await runStep(
    9,
    'Payment History',
    'The successful transaction appears in frontend history',
    async () => {
      if (!paymentTransactionId) {
        throw new Error(
          'No transaction ID available from previous step'
        );
      }

      await closePaymentResultIfVisible(page);
      await openHistoryTab(page);

      await expect(
        page.getByText(
          `ID: ${paymentTransactionId}`,
          { exact: false }
        ).first()
      ).toBeVisible({
        timeout: 10000,
      });

      return `Transaction ${paymentTransactionId} visible in Payment History`;
    }
  );

  await runStep(
    10,
    'Self Payment Protection',
    'Payment to User A own UPI is blocked',
    async () => {
      await closePaymentResultIfVisible(page);
      await openPayTab(page);

      const selfButton = page.getByRole(
        'button',
        {
          name: 'To Self Account',
          exact: true,
        }
      );

      await expect(selfButton).toBeVisible();
      await selfButton.click();

      await expect(
        page.getByRole('heading', {
          name: 'Self Transfer',
          exact: true,
        })
      ).toBeVisible();

      const amountInput = page.locator(
        'input[placeholder="Enter amount"]'
      ).first();

      await expect(amountInput).toBeVisible();
      await amountInput.fill('1');

      await page.locator(
        'button.send-payment-button'
      ).click();

      await expect(
        page.getByText(
          'Payment Blocked',
          { exact: true }
        )
      ).toBeVisible({
        timeout: 15000,
      });

      const body = await page.locator('body').innerText();

      if (!/self|own|same/i.test(body)) {
        throw new Error(
          'Self-payment rejection reason was not displayed'
        );
      }

      return 'Payment Blocked | Self-payment rejected';
    }
  );

 await runStep(
  11,
  'Open workspace switcher',
  'User/Security workspace switcher opens',
  async () => {
    await closePaymentResultIfVisible(page);

    await page.locator(
      'button.profile-mode-button'
    ).click();

    await expect(
      page.locator(
        'button.workspace-mode-option'
      ).filter({
        hasText: /Security/i,
      })
    ).toBeVisible();

    return 'Workspace switcher opened';
  }
);

  await runStep(
    12,
    'Switch to Security Mode',
    'Security Center is displayed',
    async () => {
      await page
        .locator(
          'button.workspace-mode-option'
        )
        .filter({
          hasText: /Security/i,
        })
        .click();

      await expect(
        page.getByText(
          'Security Center',
          { exact: true }
        )
      ).toBeVisible();

      return 'Security Center displayed';
    }
  );

  await runStep(
    13,
    'Security Mode persistence',
    'Security workspace remains selected after refresh',
    async () => {
      await page.reload();

      await expect(
        page.getByText(
          'Security Center',
          { exact: true }
        )
      ).toBeVisible();

      await expect(
        page.locator(
          'button.workspace-toggle'
        ).filter({
          hasText: /Security/i,
        })
      ).toHaveClass(/security-active/);

      return 'Security workspace persisted after refresh';
    }
  );

  await runStep(
    14,
    'Switch back to User Mode',
    'User workspace becomes active and Home dashboard is displayed',
    async () => {
      await page
        .locator(
          'button.workspace-toggle'
        )
        .filter({
          hasText: /User/i,
        })
        .click();

      await expect(
        page.locator(
          'button.workspace-toggle'
        ).filter({
          hasText:/User/i,
        })
      ).toHaveClass(/active/);

      await expect(
        page.getByText(
          'Transfer Money',
          { exact: true }
        )
      ).toBeVisible();

      return 'User workspace active; Home dashboard displayed';
    }
  );

  await runStep(
    15,
    'User Mode persistence',
    'User workspace remains selected after refresh',
    async () => {
      await page.reload();

      await expect(
        page.locator(
          'button.workspace-toggle'
        ).filter({
          hasText: /User/i,
        })
      ).toHaveClass(/active/);

      await expect(
        page.getByText(
          'Transfer Money',
          { exact: true }
        )
      ).toBeVisible();

      return 'User workspace persisted after refresh';
    }
  );

  console.log('');
  console.log('USER FRONTEND WORKFLOW RESULTS');
  console.table(results);

  test.info().attach(
    'user-frontend-results.json',
    {
      body: JSON.stringify(results, null, 2),
      contentType: 'application/json',
    }
  );

  const failed = results.filter(
    (item) => item.status === 'FAIL'
  );

  expect(
    failed,
    `Frontend user workflow has ${failed.length} failed step(s)`
  ).toHaveLength(0);
});

test('SecurePay Frontend Security Pages Workflow', async ({
  page,
}) => {
  const localResults = [];
  results.length = 0;

  printStepHeader(
    'FRONTEND TEST 2: SECURITY PAGES WORKFLOW'
  );

  await runStep(
    16,
    'User login for security pages',
    'User A reaches dashboard',
    async () => {
      await loginUserA(page);

      await page.getByRole('button', {
        name: /User Mode/i,
      }).click();

      await expect(page).toHaveURL(/\/dashboard$/);

      return 'Authenticated User A';
    }
  );
 await runStep(
  16.5,
  'Switch to Security Mode',
  'Security workspace is selected before opening security pages',
  async () => {
    await page.locator(
      'button.profile-mode-button'
    ).click();

    await expect(
      page.locator(
        'button.workspace-mode-option'
      ).filter({
        hasText: /Security/i,
      })
    ).toBeVisible();

    await page
      .locator(
        'button.workspace-mode-option'
      )
      .filter({
        hasText: /Security/i,
      })
      .click();

    await expect(
      page.getByText(
        'Security Center',
        { exact: true }
      )
    ).toBeVisible();

    return 'Security workspace selected';
  }
);

 await runStep(
  17,
  'API Explorer navigation',
  'API Explorer page opens',
  async () => {
    await page.goto(
      'http://localhost:5173/api-explorer'
    );

    await expect(page).toHaveURL(
      /\/api-explorer$/
    );

    await expect(
      page.getByRole('heading', {
        name: 'API Explorer',
        exact: true,
      })
    ).toBeVisible();

    return 'API Explorer page displayed';
  }
);

  await runStep(
    18,
    'API Explorer request operation',
    'An authenticated endpoint can be tested and response data is displayed',
    async () => {
      const endpointCell = page.getByText(
        '/accounts/me',
        { exact: true }
      );

      await expect(endpointCell).toBeVisible();

      const row = endpointCell.locator(
        'xpath=ancestor::tr[1]'
      );

      await expect(
        row.getByRole('button', {
          name: 'Test',
          exact: true,
        })
      ).toBeVisible();

      await row.getByRole('button', {
        name: 'Test',
        exact: true,
      }).click();

      const pre = page.locator('pre').last();

      await expect(pre).toBeVisible({
        timeout: 10000,
      });

      const responseText =
        await pre.innerText();

      if (
        !/success|account|balance/i.test(
          responseText
        )
      ) {
        throw new Error(
          `Unexpected API Explorer response: ${responseText}`
        );
      }

      return 'GET /accounts/me tested and response displayed';
    }
  );

  await runStep(
    19,
    'Payments route',
    '/payment route redirects to unified dashboard',
    async () => {
      await page.getByRole('link', {
        name: 'Payments',
        exact: true,
      }).click();

      await expect(page).toHaveURL(/\/dashboard$/);

      return '/payment redirected to /dashboard';
    }
  );

  await runStep(
    20,
    'Security Scan navigation',
    'Security Scan page opens',
    async () => {
      await page.getByRole('link', {
        name: 'Security Scan',
        exact: true,
      }).click();

      await expect(
        page.getByText(
          'Security Scan Results',
          { exact: true }
        ).or(
          page.getByText(
            /Security Scan/i
          ).first()
        )
      ).toBeVisible();

      return 'Security Scan page displayed';
    }
  );

  await runStep(
    21,
    'Run frontend security scan',
    'API1-API10 results and ZAP result are shown',
    async () => {
      const scanButton =
        page.getByRole('button', {
          name: 'Start Security Scan',
          exact: true,
        });

      await expect(scanButton).toBeVisible();
      await scanButton.click();

      await expect(
        page.getByText(
          'Security Scan Results',
          { exact: true }
        )
      ).toBeVisible({
        timeout: 180000,
      });

      const body =
        await page.locator('body').innerText();

      for (let i = 1; i <= 10; i++) {
        const exists =
          new RegExp(`API${i}`, 'i').test(body);

        if (!exists) {
          throw new Error(
            `Missing OWASP API${i} result in frontend`
          );
        }
      }

      if (!/ZAP/i.test(body)) {
        throw new Error(
          'OWASP ZAP result was not displayed'
        );
      }

      return 'Frontend displayed API1-API10 and ZAP results';
    }
  );

  await runStep(
    22,
    'Security scan result tally',
    'All displayed OWASP test statuses are PASS and ZAP is completed',
    async () => {
      const headings =
        page.locator('h3').filter({
          hasText: /API(?:10|[1-9])/i,
        });

      const count =
        await headings.count();

      const texts = [];

      for (let i = 0; i < count; i++) {
        if (await headings.nth(i).isVisible()) {
          texts.push(
            await headings.nth(i).innerText()
          );
        }
      }

      const apiLines = texts.filter((text) =>
        /API(?:10|[1-9])/i.test(text)
      );

      const passCount =
        apiLines.filter((text) =>
          /\bPASS\b/i.test(text)
        ).length;

      const failCount =
        apiLines.filter((text) =>
          /\bFAIL\b/i.test(text)
        ).length;

      const body =
        await page.locator('body').innerText();

      const zapCompleted =
        /ZAP:[\s\S]{0,80}COMPLETED/i.test(body) ||
        /\bCOMPLETED\b/i.test(body);

      if (failCount > 0) {
        throw new Error(
          `Frontend displayed ${failCount} OWASP failure(s): ${apiLines.join(
            ' | '
          )}`
        );
      }

      if (passCount < 10) {
        throw new Error(
          `Expected 10 OWASP PASS results, found ${passCount}`
        );
      }

      if (!zapCompleted) {
        throw new Error(
          'Frontend did not display completed ZAP result'
        );
      }

      return `OWASP PASS=${passCount}, OWASP FAIL=${failCount}, ZAP=COMPLETED`;
    }
  );

  await runStep(
    23,
    'Return to Dashboard',
    'Dashboard opens from sidebar',
    async () => {
      await page.getByRole('link', {
        name: 'Dashboard',
        exact: true,
      }).click();

      await expect(page).toHaveURL(/\/dashboard$/);

      return 'Dashboard displayed';
    }
  );

  console.log('');
  console.log(
    'SECURITY PAGES FRONTEND RESULTS'
  );
  console.table(results);

  localResults.push(...results);

  test.info().attach(
    'security-pages-results.json',
    {
      body: JSON.stringify(
        localResults,
        null,
        2
      ),
      contentType: 'application/json',
    }
  );

  const failed = results.filter(
    (item) => item.status === 'FAIL'
  );

  expect(
    failed,
    `Security frontend workflow has ${failed.length} failed step(s)`
  ).toHaveLength(0);
});

test('SecurePay Frontend Admin and Incident Workflow', async ({
  page,
}) => {
  results.length = 0;

  printStepHeader(
    'FRONTEND TEST 3: ADMIN / SECURITY INCIDENT WORKFLOW'
  );

  await runStep(
    24,
    'Open login page',
    'Login page is displayed',
    async () => {
      await page.goto('/');

      await expect(
        page.locator(
          'input[name="identifier"]'
        )
      ).toBeVisible();

      return 'Login page displayed';
    }
  );

  await runStep(
    25,
    'Admin demo login',
    'Admin demo account reaches security workspace',
    async () => {
      const adminButton =
        page.getByRole('button', {
          name: 'Admin',
          exact: true,
        });

      await expect(adminButton).toBeVisible();
      await adminButton.click();

      await expect(
        page.getByRole('heading', {
          name: 'Choose Your Workspace',
        })
      ).toBeVisible();

      await page.getByRole('button', {
        name: /Security Mode/i,
      }).click();

      await expect(page).toHaveURL(/\/dashboard$/);

      return 'Admin authenticated and security dashboard opened';
    }
  );

  await runStep(
    26,
    'Security Incidents visibility',
    'Security Incidents is available to privileged user',
    async () => {
      const incidentLink =
        page.getByRole('link', {
          name: 'Security Incidents',
          exact: true,
        });

      await expect(incidentLink).toBeVisible();

      return 'Security Incidents link visible';
    }
  );

  await runStep(
    27,
    'Security Incident Center',
    'Security Incident Center page opens',
    async () => {
      await page.getByRole('link', {
        name: 'Security Incidents',
        exact: true,
      }).click();

      await expect(
        page.getByText(
          'Security Incident Center',
          { exact: true }
        )
      ).toBeVisible();

      return 'Security Incident Center displayed';
    }
  );

  await runStep(
    28,
    'Refresh incidents',
    'Incident Refresh control works',
    async () => {
      const refreshButton =
        page.getByRole('button', {
          name: 'Refresh',
          exact: true,
        });

      await expect(refreshButton).toBeVisible();
      await refreshButton.click();

      await page.waitForTimeout(700);

      return 'Incident list refreshed';
    }
  );

  await runStep(
    29,
    'Incident inspection',
    'Existing incident can be selected and inspected',
    async () => {
      const rows =
        page.locator(
          '.incidents-table tbody tr'
        );

      const rowCount =
        await rows.count();

      if (rowCount === 0) {
        const body =
          await page.locator('body').innerText();

        if (
          /No Security Incidents Found/i.test(
            body
          )
        ) {
          return 'No persisted incidents currently exist; empty-state displayed correctly';
        }

        throw new Error(
          'No incident rows found and no empty-state message was displayed'
        );
      }

      await rows.first().click();

      await expect(
        page.getByText(
          'Incident Inspection',
          { exact: true }
        )
      ).toBeVisible();

      return `Incident selected; rows=${rowCount}`;
    }
  );

  await runStep(
    30,
    'Incident status update',
    'Incident status selector can change and restore status',
    async () => {
      const select =
        page.locator(
          '.status-selector select'
        );

      await expect(select).toBeVisible();

      const original =
        await select.inputValue();

      const statuses = [
        'OPEN',
        'INVESTIGATING',
        'BLOCKED',
        'RESOLVED',
      ];

      const alternate =
        statuses.find(
          (value) => value !== original
        );

      if (!alternate) {
        throw new Error(
          `No alternate status available from ${original}`
        );
      }

      await select.selectOption(
        alternate
      );

      await expect(select).toHaveValue(
        alternate
      );

      await expect(
        page.getByText(
          new RegExp(
            `successfully updated to ${alternate}`,
            'i'
          )
        )
      ).toBeVisible({
        timeout: 5000,
      });

      await select.selectOption(
        original
      );

      await expect(select).toHaveValue(
        original
      );

      return `Changed ${original} -> ${alternate} -> ${original}`;
    }
  );

  console.log('');
  console.log(
    'ADMIN / INCIDENT FRONTEND RESULTS'
  );
  console.table(results);

  test.info().attach(
    'admin-incident-results.json',
    {
      body: JSON.stringify(
        results,
        null,
        2
      ),
      contentType: 'application/json',
    }
  );

  const failed = results.filter(
    (item) => item.status === 'FAIL'
  );

  expect(
    failed,
    `Admin frontend workflow has ${failed.length} failed step(s)`
  ).toHaveLength(0);
});