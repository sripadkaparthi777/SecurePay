import { test, expect } from '@playwright/test';

test.describe('SecurePay User/Security Workspace Flow', () => {
  test('performs all 13 workspace-mode steps', async ({ page }) => {
    // =====================================================
    // 1. Login
    // =====================================================

    await page.goto('/');

    await expect(
      page.locator('input[name="identifier"]')
    ).toBeVisible();

    // =====================================================
    // 2. Enter credentials
    // =====================================================

    await page
      .locator('input[name="identifier"]')
      .fill('userA@securepay.local');

    await page
      .locator('input[name="password"]')
      .fill('UserA@123');

    // =====================================================
    // 3. Click Login
    // =====================================================

    await page
      .getByRole('button', {
        name: 'Login',
        exact: true,
      })
      .click();

    // =====================================================
    // 4. Choose User Mode
    // =====================================================

    await expect(
      page.getByRole('heading', {
        name: 'Choose Your Workspace',
      })
    ).toBeVisible();

    await page
      .getByRole('button', {
        name: /User Mode/i,
      })
      .click();

    // =====================================================
    // 5. Dashboard opens
    // =====================================================

    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(
      page.locator('button.profile-mode-button')
    ).toBeVisible();

    // =====================================================
    // 6. Open User/Security switcher
    // =====================================================

    await page
      .locator('button.profile-mode-button')
      .click();

    await expect(
      page
        .locator('button.workspace-mode-option')
        .filter({
          hasText: /Security/i,
        })
    ).toBeVisible();

    // =====================================================
    // 7. Choose Security
    // =====================================================

    await page
      .locator('button.workspace-mode-option')
      .filter({
        hasText: /Security/i,
      })
      .click();

    // =====================================================
    // 8. Confirm Security workspace appears
    // =====================================================

    await expect(
      page.getByText('Security Center', {
        exact: true,
      })
    ).toBeVisible();

    // =====================================================
    // 9. Refresh the page
    // =====================================================

    await page.reload();

    // =====================================================
    // 10. Confirm Security remains selected
    // =====================================================

    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(
      page.getByText('Security Center', {
        exact: true,
      })
    ).toBeVisible();

    await expect(
      page.locator('button.profile-mode-button')
    ).toBeVisible();

    const securityMode =
      await page.evaluate(() =>
        localStorage.getItem(
          'securepay_workspace_mode'
        )
      );

    expect(securityMode).toBe('SECURITY');

    // =====================================================
    // 11. Switch to User
    // =====================================================

    await page
      .locator('button.profile-mode-button')
      .click();

    await expect(
      page
        .locator('button.workspace-mode-option')
        .filter({
          hasText: /User/i,
        })
    ).toBeVisible();

    await page
      .locator('button.workspace-mode-option')
      .filter({
        hasText: /User/i,
      })
      .click();

    await expect(
      page.getByText('Transfer Money', {
        exact: true,
      })
    ).toBeVisible();

    const userMode =
      await page.evaluate(() =>
        localStorage.getItem(
          'securepay_workspace_mode'
        )
      );

    expect(userMode).toBe('USER');

    // =====================================================
    // 12. Refresh
    // =====================================================

    await page.reload();

    // =====================================================
    // 13. Confirm User remains selected
    // =====================================================

    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(
      page.locator('button.profile-mode-button')
    ).toBeVisible();

    await expect(
      page.getByText('Transfer Money', {
        exact: true,
      })
    ).toBeVisible();

    const finalMode =
      await page.evaluate(() =>
        localStorage.getItem(
          'securepay_workspace_mode'
        )
      );

    expect(finalMode).toBe('USER');
  });
});