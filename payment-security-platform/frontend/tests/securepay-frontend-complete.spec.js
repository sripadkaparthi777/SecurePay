import { test, expect } from '@playwright/test';

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
  const buttons = page
    .getByRole('button')
    .filter({ hasText: pattern });

  const count = await buttons.count();

  if (count === 0) {
    throw new Error(
      `Button matching ${pattern} was not found`
    );
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

  await page
    .locator('input[name="identifier"]')
    .fill('userA@securepay.local');

  await page
    .locator('input[name="password"]')
    .fill('UserA@123');

  await page.getByRole('button', {
    name: 'Login',
    exact: true,
  }).click();

  await expect(
    page.getByRole('heading', {
      name: 'Choose Your Workspace',
    })
  ).toBeVisible({
    timeout: 15000,
  });
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
  const selectors = [
    '.balance-value',
    '.balance-amount',
    '.account-balance',
    '[data-testid="balance"]',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector);
    const count = await locator.count();

    for (let i = 0; i < count; i++) {
      const element = locator.nth(i);

      if (await element.isVisible()) {
        let text = (await element.innerText()).trim();

        if (/^[•*]+$/.test(text)) {
          const showButton = page.getByRole('button', {
            name: /Show balance/i,
          });

          if (
            await showButton.count() &&
            await showButton.first().isVisible()
          ) {
            await showButton.first().click();
            text = (await element.innerText()).trim();
          }
        }

        const match = text.match(
          /(?:₹|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/
        );

        if (match) {
          return Number(
            match[1].replace(/,/g, '')
          );
        }
      }
    }
  }

  const bodyText = (
    await page.locator('body').innerText()
  )
    .replace(/\s+/g, ' ')
    .trim();

  const patterns = [
    /Available Balance\s*(?:₹|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /Available Balance.*?(?:₹|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /BALANCE\s*:\s*(?:₹|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /BALANCE\s*(?:₹|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of patterns) {
    const match = bodyText.match(pattern);

    if (match) {
      const value = Number(
        match[1].replace(/,/g, '')
      );

      if (Number.isFinite(value)) {
        return value;
      }
    }
  }

  throw new Error(
    `Could not read displayed balance. Body text: ${bodyText.slice(
      0,
      1200
    )}`
  );
}
async function waitForDisplayedBalance(
  page,
  expected,
  timeout = 15000
) {
  const started = Date.now();
  let lastError = null;

  while (Date.now() - started < timeout) {
    try {
      const actual = await getDisplayedBalance(page);

      if (
        Number(actual.toFixed(2)) ===
        Number(expected.toFixed(2))
      ) {
        return actual;
      }

      lastError = new Error(
        `Displayed balance=${actual.toFixed(
          2
        )}, expected=${expected.toFixed(2)}`
      );
    } catch (error) {
      lastError = error;
    }

    await page.waitForTimeout(300);
  }

  throw (
    lastError ||
    new Error(
      `Displayed balance did not reach ${expected.toFixed(2)}`
    )
  );
}

async function closePaymentResultIfVisible(page) {
  const buttons = page.getByRole('button', {
    name: 'Continue',
    exact: true,
  });

  const count = await buttons.count();

  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);

    if (await button.isVisible()) {
      await button.click();
      await page.waitForTimeout(300);
      return;
    }
  }
}

async function findVisibleInput(page, selectors) {
  for (const selector of selectors) {
    const inputs = page.locator(selector);
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);

      if (await input.isVisible()) {
        return input;
      }
    }
  }

  throw new Error(
    `No visible input found for selectors: ${selectors.join(
      ' | '
    )}`
  );
}

async function clickVisibleText(
  page,
  labels
) {
  for (const label of labels) {
    const exactText = page.getByText(label, {
      exact: true,
    });

    const count = await exactText.count();

    for (let i = 0; i < count; i++) {
      const element = exactText.nth(i);

      if (await element.isVisible()) {
        await element.click();
        return label;
      }
    }
  }

  throw new Error(
    `None of these visible text controls were found: ${labels.join(
      ', '
    )}`
  );
}



 async function openPayTab(page) {
  const receiverVisible =
    await page
      .locator(
        'input[placeholder="UPI ID or 10-digit Mobile"]'
      )
      .first()
      .isVisible()
      .catch(() => false);

  if (receiverVisible) {
    return;
  }

  const actions = [
    page.getByRole('button', {
      name: 'To Mobile',
      exact: true,
    }),
    page.getByText('To Mobile', {
      exact: true,
    }),
    page.getByRole('button', {
      name: /^Pay$/i,
    }),
    page.getByText('Pay', {
      exact: true,
    }),
  ];

  for (const action of actions) {
    const count = await action.count();

    for (let i = 0; i < count; i++) {
      const item = action.nth(i);

      if (await item.isVisible()) {
        await item.click();
        await page.waitForTimeout(500);

        const receiverNowVisible =
          await page
            .locator(
              'input[placeholder="UPI ID or 10-digit Mobile"]'
            )
            .first()
            .isVisible()
            .catch(() => false);

        if (receiverNowVisible) {
          return;
        }

        const genericReceiverVisible =
          await page
            .locator(
              'input[placeholder*="UPI" i]'
            )
            .first()
            .isVisible()
            .catch(() => false);

        if (genericReceiverVisible) {
          return;
        }
      }
    }
  }

  throw new Error(
    'Payment screen could not be opened from the current User Mode UI'
  );
}

async function openHistoryTab(page) {
  const buttonHistory =
    page.getByRole('button', {
      name: /^History$/i,
    });

  const buttonCount =
    await buttonHistory.count();

  for (
    let i = 0;
    i < buttonCount;
    i++
  ) {
    const item =
      buttonHistory.nth(i);

    if (await item.isVisible()) {
      await item.click();
      await page.waitForTimeout(500);
      return;
    }
  }

  const textHistory =
    page.getByText('History', {
      exact: true,
    });

  const textCount =
    await textHistory.count();

  for (
    let i = 0;
    i < textCount;
    i++
  ) {
    const item =
      textHistory.nth(i);

    if (await item.isVisible()) {
      await item.click();
      await page.waitForTimeout(500);
      return;
    }
  }

  throw new Error(
    'History control was not found'
  );
}


async function switchWorkspace(
  page,
  workspace
) {
  await page.locator(
    'button.profile-mode-button'
  ).click();

  await expect(
    page
      .locator(
        'button.workspace-mode-option'
      )
      .filter({
        hasText:
          workspace === 'SECURITY'
            ? /Security/i
            : /User/i,
      })
  ).toBeVisible({
    timeout: 10000,
  });

  await page
    .locator(
      'button.workspace-mode-option'
    )
    .filter({
      hasText:
        workspace === 'SECURITY'
          ? /Security/i
          : /User/i,
    })
    .click();

  await page.waitForTimeout(500);
}

test('SecurePay Frontend User Business Workflow', async ({
  page,
  request,
}) => {
  results.length = 0;

  printStepHeader(
    'FRONTEND TEST 1: USER BUSINESS WORKFLOW'
  );

  await runStep(
    1,
    'Login page',
    'Login page with Email/UPI and Password fields is displayed',
    async () => {
      await page.goto('/');

      await expect(
        page.locator(
          'input[name="identifier"]'
        )
      ).toBeVisible();

      await expect(
        page.locator(
          'input[name="password"]'
        )
      ).toBeVisible();

      return 'Login form visible';
    }
  );

  await runStep(
    2,
    'Create Account navigation',
    'Create Account control is available',
    async () => {
      const button =
        await visibleButton(
          page,
          /create account/i
        );

      await button.click();

      await expect(
        page.getByText(
          /Confirm Password/i
        ).first()
      ).toBeVisible({
        timeout: 10000,
      });

      return 'Registration page opened';
    }
  );

  await runStep(
    3,
    'Registration validation',
    'Mismatched passwords are rejected',
    async () => {
      const inputs =
        page.locator('input:visible');

      const metadata =
        await inputs.evaluateAll(
          (elements) =>
            elements.map((el) => ({
              name:
                el.getAttribute('name') ||
                '',
              placeholder:
                el.getAttribute(
                  'placeholder'
                ) || '',
              type:
                el.getAttribute('type') ||
                '',
              id:
                el.getAttribute('id') ||
                '',
            }))
        );

      function inputByHint(hints) {
        for (
          let i = 0;
          i < metadata.length;
          i++
        ) {
          const text = [
            metadata[i].name,
            metadata[i].placeholder,
            metadata[i].id,
          ]
            .join(' ')
            .toLowerCase();

          if (
            hints.some((hint) =>
              text.includes(
                hint.toLowerCase()
              )
            )
          ) {
            return inputs.nth(i);
          }
        }

        throw new Error(
          `Input not found for hints: ${hints.join(
            ', '
          )}`
        );
      }

      const fullName =
        inputByHint([
          'full name',
          'name',
        ]);

      const mobile =
        inputByHint([
          'mobile',
          'phone',
        ]);

      const email =
        inputByHint([
          'email',
        ]);

      const password =
        inputByHint([
          'password',
        ]);

      const confirm =
        inputByHint([
          'confirm',
        ]);

      await fullName.fill(
        'SecurePay Frontend Test'
      );

      await mobile.fill(
        `900${Date.now()
          .toString()
          .slice(-7)}`
      );

      await email.fill(
        `frontendtest${Date.now()}@securepay.local`
      );

      await password.fill(
        'Frontend@123'
      );

      await confirm.fill(
        'Frontend@999'
      );

      const createButton =
        await visibleButton(
          page,
          /create account/i
        );

      await createButton.click();

      await page.waitForTimeout(500);

      const body =
        await page.locator('body')
          .innerText();

      if (
        !/password|match|same|confirm/i.test(
          body
        )
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

      await expect(page).toHaveURL(
        /\/dashboard$/
      );

      await expect(
        page.locator(
          'button.profile-mode-button'
        )
      ).toBeVisible({
        timeout: 15000,
      });

      await expect(
        page.getByText(
          'Transfer Money',
          {
            exact: true,
          }
        )
      ).toBeVisible({
        timeout: 15000,
      });

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
    const body =
      await page.locator('body').innerText();

    const hasBalanceLabel =
      /Available Balance|BALANCE\s*:/i.test(
        body
      );

    if (!hasBalanceLabel) {
      throw new Error(
        'Balance information was not present on the Home dashboard'
      );
    }

    await expect(
      page.getByText(
        'Recent Payments',
        {
          exact: true,
        }
      )
    ).toBeVisible({
      timeout: 15000,
    });

    backendBalanceBeforeAdd =
      await getBalanceFromBackend(
        page,
        request
      );

    const displayedBalance =
      await getDisplayedBalance(page);

    const backendRounded =
      Number(
        backendBalanceBeforeAdd.toFixed(
          2
        )
      );

    const uiRounded =
      Number(
        displayedBalance.toFixed(2)
      );

    if (
      backendRounded !== uiRounded
    ) {
      throw new Error(
        `UI/server balance mismatch. UI=${uiRounded}, Server=${backendRounded}`
      );
    }

    return `Home loaded | Server balance=${backendRounded.toFixed(
      2
    )}`;
  }
);

  await runStep(
    7,
    'Add Money',
    'Adding ₹5 increases server balance by exactly ₹5',
    async () => {
      if (
        backendBalanceBeforeAdd ===
        null
      ) {
        backendBalanceBeforeAdd =
          await getBalanceFromBackend(
            page,
            request
          );
      }

      const addButton =
        await visibleButton(
          page,
          /^Add Money$/i
        );

      await addButton.click();

      const modal =
        page.locator('.qr-modal')
          .last();

      await expect(
        modal
      ).toBeVisible({
        timeout: 10000,
      });

      const amountInput =
        modal
          .locator(
            'input[type="number"]'
          )
          .first();

      await expect(
        amountInput
      ).toBeVisible();

      await amountInput.fill('5');

      const confirmButton =
        modal.locator(
          'button.send-payment-button'
        );

      await expect(
        confirmButton
      ).toBeVisible();

      await expect(
        confirmButton
      ).toBeEnabled();

      await confirmButton.click();

      await page.waitForTimeout(
        1000
      );

      backendBalanceAfterAdd =
        await getBalanceFromBackend(
          page,
          request
        );

      const expected =
        Number(
          (
            backendBalanceBeforeAdd +
            5
          ).toFixed(2)
        );

      const backendActual =
        Number(
          backendBalanceAfterAdd.toFixed(
            2
          )
        );

      if (
        backendActual !== expected
      ) {
        throw new Error(
          `Backend balance mismatch. Expected ${expected}, got ${backendActual}`
        );
      }

      displayedBalanceAfterAdd =
        await waitForDisplayedBalance(
          page,
          backendActual,
          15000
        );

      const uiActual =
        Number(
          displayedBalanceAfterAdd.toFixed(
            2
          )
        );

      if (
        uiActual !== backendActual
      ) {
        throw new Error(
          `UI/server balance mismatch. UI=${uiActual}, server=${backendActual}`
        );
      }

      return `Expected=${expected.toFixed(
        2
      )}, UI=${uiActual.toFixed(
        2
      )}, Server=${backendActual.toFixed(
        2
      )}`;
    }
  );

let paymentTransactionId = null;

await runStep(
  8,
  'Send Payment',
  '₹1 payment to User B completes with ALLOW and a transaction ID',
  async () => {
    await page.goto('/dashboard');

    await expect(
      page.getByText(
        'Transfer Money',
        {
          exact: true,
        }
      )
    ).toBeVisible({
      timeout: 15000,
    });

    await openPayTab(page);

    const receiverInput =
      await findVisibleInput(
        page,
        [
          'input[placeholder="UPI ID or 10-digit Mobile"]',
          'input[placeholder*="UPI" i]',
          'input[placeholder*="Mobile" i]',
          'input[name*="receiver" i]',
          'input[name*="recipient" i]',
        ]
      );

    const amountInput =
      await findVisibleInput(
        page,
        [
          'input[placeholder="Enter amount"]',
          'input[placeholder*="amount" i]',
          'input[name*="amount" i]',
          'input[type="number"]',
        ]
      );

    await receiverInput.fill('8765432109');
    await amountInput.fill('1');

    const sendButtons =
      page.locator(
        'button.send-payment-button'
      );

    const sendCount =
      await sendButtons.count();

    let sendButton = null;

    for (
      let i = 0;
      i < sendCount;
      i++
    ) {
      const button =
        sendButtons.nth(i);

      if (await button.isVisible()) {
        sendButton = button;
      }
    }

    if (!sendButton) {
      const fallback =
        page
          .getByRole('button')
          .filter({
            hasText: /Send|Pay|Transfer/i,
          });

      const count =
        await fallback.count();

      for (
        let i = 0;
        i < count;
        i++
      ) {
        const button =
          fallback.nth(i);

        if (await button.isVisible()) {
          sendButton = button;
        }
      }
    }

    if (!sendButton) {
      throw new Error(
        'Payment submission button was not found'
      );
    }

    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    await expect(
      page.getByText(
        /Payment Successful|Payment Blocked/i
      ).first()
    ).toBeVisible({
      timeout: 20000,
    });

    const body =
      await page.locator('body').innerText();

    if (/Payment Blocked/i.test(body)) {
      const reasonMatch =
        body.match(
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

    const scoreMatch =
      body.match(
        /Security Score:\s*(\d+)\s*\/\s*100/i
      );

    if (!scoreMatch) {
      throw new Error(
        'Security Score was not displayed'
      );
    }

    const txMatch =
      body.match(
        /Transaction ID:\s*([A-Za-z0-9_-]+)/i
      );

    if (!txMatch) {
      throw new Error(
        'Transaction ID was not displayed'
      );
    }

    paymentTransactionId =
      txMatch[1];

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

    await page.goto('/dashboard');

    await expect(
      page.getByText(
        'Recent Payments',
        {
          exact: true,
        }
      )
    ).toBeVisible({
      timeout: 15000,
    });

    // The current UI does not necessarily render
    // the transaction ID inside the Recent Payments cards.
    const body =
      await page.locator('body').innerText();

    const hasUserB =
      /User B|8765432109|userB@upi/i.test(body);

    const hasAmount =
      /₹\s*1(?:\.00)?\b|\b1\.00\b/.test(body);

    if (!hasUserB) {
      throw new Error(
        'User B payment was not visible in Recent Payments'
      );
    }

    if (!hasAmount) {
      throw new Error(
        '₹1 payment was not visible in Recent Payments'
      );
    }

    // Confirm the exact transaction ID from the backend.
    const token =
      await page.evaluate(() =>
        localStorage.getItem(
          'securepay_token'
        )
      );

    if (!token) {
      throw new Error(
        'securepay_token not available'
      );
    }

    const response =
      await request.get(
        'http://localhost:5002/api/transactions/me',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

    if (!response.ok()) {
      throw new Error(
        `Transactions API returned HTTP ${response.status()}`
      );
    }

    const transactionData =
      await response.json();

    const transactionJson =
      JSON.stringify(transactionData);

    if (
      !transactionJson.includes(
        paymentTransactionId
      )
    ) {
      throw new Error(
        `Transaction ${paymentTransactionId} was not found in backend history`
      );
    }

    return `Payment History visible | User B ₹1 payment confirmed | Transaction=${paymentTransactionId}`;
  }
);


   

  await runStep(
    10,
    'Self Payment Protection',
    'Payment to User A own account is blocked',
    async () => {
      await page.goto('/dashboard');

      await expect(
        page.getByText(
          'Transfer Money',
          {
            exact: true,
          }
        )
      ).toBeVisible({
        timeout: 15000,
      });

      const selfButton =
        page.getByRole('button', {
          name: /^To Self$/i,
        }).first();

      if (
        await selfButton.count() &&
        await selfButton.isVisible()
      ) {
        await selfButton.click();
      } else {
        await clickVisibleText(
          page,
          ['To Self']
        );
      }

      await page.waitForTimeout(400);

      const amountInput =
        await findVisibleInput(
          page,
          [
            'input[placeholder="Enter amount"]',
            'input[placeholder*="amount" i]',
            'input[name*="amount" i]',
            'input[type="number"]',
          ]
        );

      await amountInput.fill('1');

      const sendButtons =
        page.locator(
          'button.send-payment-button'
        );

      const count =
        await sendButtons.count();

      let sendButton = null;

      for (
        let i = 0;
        i < count;
        i++
      ) {
        const button =
          sendButtons.nth(i);

        if (
          await button.isVisible()
        ) {
          sendButton = button;
        }
      }

      if (!sendButton) {
        throw new Error(
          'Self-payment submit button was not found'
        );
      }

      await sendButton.click();

      await expect(
        page.getByText(
          'Payment Blocked',
          {
            exact: true,
          }
        )
      ).toBeVisible({
        timeout: 15000,
      });

      const body =
        await page.locator('body')
          .innerText();

      if (
        !/self|own|same|yourself/i.test(
          body
        )
      ) {
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
      await page.goto('/dashboard');

      await page
        .locator(
          'button.profile-mode-button'
        )
        .click();

      await expect(
        page
          .locator(
            'button.workspace-mode-option'
          )
          .filter({
            hasText: /Security/i,
          })
      ).toBeVisible({
        timeout: 10000,
      });

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
          {
            exact: true,
          }
        )
      ).toBeVisible({
        timeout: 15000,
      });

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
        page
      ).toHaveURL(
        /\/dashboard$/
      );

      await expect(
        page.getByText(
          'Security Center',
          {
            exact: true,
          }
        )
      ).toBeVisible({
        timeout: 15000,
      });

      const securityMode =
        await page.evaluate(() =>
          localStorage.getItem(
            'securepay_workspace_mode'
          )
        );

      if (
        securityMode !== 'SECURITY'
      ) {
        throw new Error(
          `Expected SECURITY workspace, got ${securityMode}`
        );
      }

      return 'Security workspace persisted after refresh';
    }
  );

  await runStep(
    14,
    'Switch back to User Mode',
    'User workspace becomes active and Home dashboard is displayed',
    async () => {
      await switchWorkspace(
        page,
        'USER'
      );

      await expect(
        page.getByText(
          'Transfer Money',
          {
            exact: true,
          }
        )
      ).toBeVisible({
        timeout: 15000,
      });

      const userMode =
        await page.evaluate(() =>
          localStorage.getItem(
            'securepay_workspace_mode'
          )
        );

      if (
        userMode !== 'USER'
      ) {
        throw new Error(
          `Expected USER workspace, got ${userMode}`
        );
      }

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
        page
      ).toHaveURL(
        /\/dashboard$/
      );

      await expect(
        page.getByText(
          'Transfer Money',
          {
            exact: true,
          }
        )
      ).toBeVisible({
        timeout: 15000,
      });

      const finalMode =
        await page.evaluate(() =>
          localStorage.getItem(
            'securepay_workspace_mode'
          )
        );

      if (
        finalMode !== 'USER'
      ) {
        throw new Error(
          `Expected USER workspace after refresh, got ${finalMode}`
        );
      }

      return 'User workspace persisted after refresh';
    }
  );

  console.log('');
  console.log(
    'USER FRONTEND WORKFLOW RESULTS'
  );
  console.table(results);

  test.info().attach(
    'user-frontend-results.json',
    {
      body: JSON.stringify(
        results,
        null,
        2
      ),
      contentType:
        'application/json',
    }
  );

  const failed =
    results.filter(
      (item) =>
        item.status === 'FAIL'
    );

  expect(
    failed,
    `Frontend user workflow has ${failed.length} failed step(s)`
  ).toHaveLength(0);
});

test(
  'SecurePay Frontend Security Pages Workflow',
  async ({ page }) => {
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

        await page
          .getByRole('button', {
            name: /User Mode/i,
          })
          .click();

        await expect(
          page
        ).toHaveURL(
          /\/dashboard$/
        );

        return 'Authenticated User A';
      }
    );

    await runStep(
      16.5,
      'Switch to Security Mode',
      'Security workspace is selected before opening security pages',
      async () => {
        await switchWorkspace(
          page,
          'SECURITY'
        );

        await expect(
          page.getByText(
            'Security Center',
            {
              exact: true,
            }
          )
        ).toBeVisible({
          timeout: 15000,
        });

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

        await expect(
          page
        ).toHaveURL(
          /\/api-explorer$/
        );

        await expect(
          page.getByRole('heading', {
            name: 'API Explorer',
            exact: true,
          })
        ).toBeVisible({
          timeout: 15000,
        });

        return 'API Explorer page displayed';
      }
    );

    await runStep(
      18,
      'API Explorer request operation',
      'An authenticated endpoint can be tested and response data is displayed',
      async () => {
        const endpointCell =
          page.getByText(
            '/accounts/me',
            {
              exact: true,
            }
          );

        await expect(
          endpointCell
        ).toBeVisible({
          timeout: 10000,
        });

        const row =
          endpointCell.locator(
            'xpath=ancestor::tr[1]'
          );

        const testButton =
          row.getByRole(
            'button',
            {
              name: 'Test',
              exact: true,
            }
          );

        await expect(
          testButton
        ).toBeVisible();

        await testButton.click();

        const pre =
          page.locator('pre').last();

        await expect(
          pre
        ).toBeVisible({
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
        await page
          .getByRole('link', {
            name: 'Payments',
            exact: true,
          })
          .click();

        await expect(
          page
        ).toHaveURL(
          /\/dashboard$/
        );

        return '/payment redirected to /dashboard';
      }
    );

    await runStep(
      20,
      'Security Scan navigation',
      'Security Scan page opens',
      async () => {
        await page.goto(
          '/security-scan'
        );

        await expect(
          page
        ).toHaveURL(
          /\/security-scan$/
        );

        await expect(
          page.getByText(
            /Security Scan/i
          ).first()
        ).toBeVisible({
          timeout: 15000,
        });

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

        await expect(
          scanButton
        ).toBeVisible();

        await scanButton.click();

        await expect(
          page.getByText(
            'Security Scan Results',
            {
              exact: true,
            }
          )
        ).toBeVisible({
          timeout: 180000,
        });

        const body =
          await page
            .locator('body')
            .innerText();

        for (
          let i = 1;
          i <= 10;
          i++
        ) {
          if (
            !new RegExp(
              `API${i}`,
              'i'

            ).test(body)
          ) {
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
        const body =
          await page
            .locator('body')
            .innerText();

        const apiLines = [];

        for (
          let i = 1;
          i <= 10;
          i++
        ) {
          const regex =
            new RegExp(
              `API${i}[\\s\\S]{0,100}PASS`,
              'i'
            );

          if (
            regex.test(body)
          ) {
            apiLines.push(
              `API${i} PASS`
            );
          }
        }

        const failLines =
          [];

        for (
          let i = 1;
          i <= 10;
          i++
        ) {
          const regex =
            new RegExp(
              `API${i}[\\s\\S]{0,100}FAIL`,
              'i'
            );

          if (
            regex.test(body)
          ) {
            failLines.push(
              `API${i} FAIL`
            );
          }
        }

        if (
          failLines.length > 0
        ) {
          throw new Error(
            `Frontend displayed OWASP failures: ${failLines.join(
              ' | '
            )}`
          );
        }

        if (
          apiLines.length < 10
        ) {
          throw new Error(
            `Expected 10 OWASP PASS results, found ${apiLines.length}`
          );
        }

        if (
          !/\bCOMPLETED\b/i.test(
            body
          )
        ) {
          throw new Error(
            'Frontend did not display completed ZAP result'
          );
        }

        return `OWASP PASS=${apiLines.length}, OWASP FAIL=${failLines.length}, ZAP=COMPLETED`;
      }
    );

    await runStep(
      23,
      'Return to Dashboard',
      'Dashboard opens from sidebar',
      async () => {
        await page
          .getByRole('link', {
            name: 'Dashboard',
            exact: true,
          })
          .click();

        await expect(
          page
        ).toHaveURL(
          /\/dashboard$/
        );

        return 'Dashboard displayed';
      }
    );

    console.log('');
    console.log(
      'SECURITY PAGES FRONTEND RESULTS'
    );
    console.table(results);

    test.info().attach(
      'security-pages-results.json',
      {
        body: JSON.stringify(
          results,
          null,
          2
        ),
        contentType:
          'application/json',
      }
    );

    const failed =
      results.filter(
        (item) =>
          item.status === 'FAIL'
      );

    expect(
      failed,
      `Security frontend workflow has ${failed.length} failed step(s)`
    ).toHaveLength(0);
  }
);

test(
  'SecurePay Frontend Admin and Incident Workflow',
  async ({ page }) => {
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

        await expect(
          adminButton
        ).toBeVisible();

        await adminButton.click();

        await expect(
          page.getByRole('heading', {
            name: 'Choose Your Workspace',
          })
        ).toBeVisible({
          timeout: 15000,
        });

        await page
          .getByRole('button', {
            name: /Security Mode/i,
          })
          .click();

        await expect(
          page
        ).toHaveURL(
          /\/dashboard$/
        );

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

        await expect(
          incidentLink
        ).toBeVisible();

        return 'Security Incidents link visible';
      }
    );

    await runStep(
      27,
      'Security Incident Center',
      'Security Incident Center page opens',
      async () => {
        await page
          .getByRole('link', {
            name: 'Security Incidents',
            exact: true,
          })
          .click();

        await expect(
          page.getByText(
            'Security Incident Center',
            {
              exact: true,
            }
          )
        ).toBeVisible({
          timeout: 15000,
        });

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

        await expect(
          refreshButton
        ).toBeVisible();

        await refreshButton.click();

        await page.waitForTimeout(
          700
        );

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

        if (
          rowCount === 0
        ) {
          const body =
            await page
              .locator('body')
              .innerText();

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
            {
              exact: true,
            }
          )
        ).toBeVisible({
          timeout: 10000,
        });

        return `Incident selected; rows=${rowCount}`;
      }
    );

    await runStep(
      30,
      'Incident status update',
      'Incident status can be updated when an incident exists, or valid empty state is verified',
      async () => {
        const rows =
          page.locator(
            '.incidents-table tbody tr'
          );

        const rowCount =
          await rows.count();

        if (
          rowCount === 0
        ) {
          await expect(
            page.getByText(
              'No Security Incidents Found',
              {
                exact: true,
              }
            )
          ).toBeVisible();

          return 'No security incidents currently exist; empty state verified';
        }

        const select =
          page.locator(
            '.status-selector select'
          );

        await expect(
          select
        ).toBeVisible();

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
            (value) =>
              value !== original
          );

        if (!alternate) {
          throw new Error(
            `No alternate status available from ${original}`
          );
        }

        await select.selectOption(
          alternate
        );

        await expect(
          select
        ).toHaveValue(
          alternate
        );

        await select.selectOption(
          original
        );

        await expect(
          select
        ).toHaveValue(
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
        contentType:
          'application/json',
      }
    );

    const failed =
      results.filter(
        (item) =>
          item.status === 'FAIL'
      );

    expect(
      failed,
      `Admin frontend workflow has ${failed.length} failed step(s)`
    ).toHaveLength(0);
  }
);


test('SecurePay Controlled Attack Simulation Workflow', async ({ page }) => {
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

  await page.getByRole('button', {
    name: /User Mode/i,
  }).click();

  await expect(page).toHaveURL(/\/dashboard$/);

  await page.locator(
    'button.profile-mode-button'
  ).click();

  const securityOption = page.locator(
    'button.workspace-mode-option'
  ).filter({
    hasText: /Security/i,
  });

  await expect(securityOption).toBeVisible();
  await securityOption.click();

  await expect(
    page.getByText(
      'Security Center',
      { exact: true }
    )
  ).toBeVisible();

  await page.goto('/attack-simulation');

  await expect(page).toHaveURL(
    /\/attack-simulation$/
  );

  await expect(
    page.getByRole('heading', {
      name: 'Controlled Attack Simulation',
      exact: true,
    })
  ).toBeVisible();

  const inputs = page.locator('input:visible');

  await expect(inputs).toHaveCount(2);

  await inputs.nth(0).fill('500');
  await inputs.nth(1).fill('50000');

  await page.getByRole('button', {
    name: 'RUN AMOUNT MANIPULATION',
    exact: true,
  }).click();

  await expect(
    page.getByText(
      'Simulation Result',
      { exact: true }
    )
  ).toBeVisible();

  await expect(
    page.getByText(
      'BLOCKED',
      { exact: true }
    ).first()
  ).toBeVisible();

  await expect(
    page.getByText(
      'SECURITY INCIDENT CREATED',
      { exact: true }
    )
  ).toBeVisible();

  await expect(
    page.getByText(
      'AMOUNT_MANIPULATION',
      { exact: true }
    ).first()
  ).toBeVisible();

  await expect(
    page.getByText(
      'HIGH',
      { exact: true }
    ).first()
  ).toBeVisible();

  await expect(
    page.getByText(
      'OPEN',
      { exact: true }
    ).first()
  ).toBeVisible();

  await expect(
    page.getByText(
      'Transaction Created',
      { exact: true }
    )
  ).toBeVisible();

  await expect(
    page.getByText(
      'Funds Transferred',
      { exact: true }
    )
  ).toBeVisible();

  console.log(
    'CONTROLLED ATTACK SIMULATION PERMANENT TEST: PASS'
  );
});
