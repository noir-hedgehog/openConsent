import { expect, test } from '@playwright/test';

async function setChoice(page: import('@playwright/test').Page, name: string, checked: boolean) {
  await page.getByRole('checkbox', { name, exact: true }).evaluate((node, next) => {
    const input = node as HTMLInputElement;
    input.checked = next;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, checked);
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
  await context.addInitScript(() => {
    if (!sessionStorage.getItem('__openconsent_test_started')) {
      localStorage.clear();
      sessionStorage.setItem('__openconsent_test_started', '1');
    }
  });
});

test('pre-blocks optional technology, validates service mappings, and cleans up on withdrawal', async ({ page, context }) => {
  const optionalRequests: string[] = [];
  const thirdPartyRequests: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1') thirdPartyRequests.push(request.url());
    if (request.url().includes('/vendors/') || request.url().includes('googletagmanager.com')) optionalRequests.push(request.url());
  });
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('./');
  await expect(page.getByText('Your privacy choices', { exact: true })).toBeVisible();
  expect(optionalRequests).toEqual([]);
  expect(thirdPartyRequests).toEqual([]);

  await page.evaluate(() => {
    const mismatched = document.createElement('script');
    mismatched.type = 'text/plain';
    mismatched.dataset.openconsentPurpose = 'interface-preferences';
    mismatched.dataset.openconsentService = 'google-analytics';
    mismatched.dataset.openconsentSrc = `${location.pathname}vendors/preferences-demo.js`;
    document.body.append(mismatched);
  });
  await page.waitForTimeout(50);
  expect(optionalRequests).toEqual([]);

  await page.getByRole('button', { name: 'Reject optional', exact: true }).click();
  await page.getByRole('button', { name: 'Privacy settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Privacy preferences' })).toBeVisible();
  await setChoice(page, 'Preferences', true);
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await expect.poll(async () => (await context.cookies()).some(cookie => cookie.name === 'oc_demo_preferences')).toBe(true);
  expect(optionalRequests.some(url => url.endsWith('/vendors/preferences-demo.js'))).toBe(true);

  await page.getByRole('button', { name: 'Privacy settings', exact: true }).click();
  await setChoice(page, 'Preferences', false);
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await expect.poll(async () => (await context.cookies()).some(cookie => cookie.name === 'oc_demo_preferences')).toBe(false);
  await expect(page.locator('script[data-openconsent-activated-service="interface-demo"]')).toHaveCount(0);
});

test('preference center exposes Consent, Details, and About from category to tracker', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Manage preferences', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Privacy preferences' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('tab', { name: 'Consent', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(dialog.getByText('Necessary', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Always active', { exact: true }).first()).toBeVisible();
  await expect(dialog.getByRole('checkbox', { name: 'Analytics', exact: true })).toBeEnabled();

  await dialog.getByRole('tab', { name: 'Details', exact: true }).click();
  await expect(dialog.getByText('Google Analytics 4', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/Provided by Google LLC/).first()).toBeVisible();
  await expect(dialog.getByText(/↳ _ga · cookie/).first()).toBeVisible();
  await expect(dialog.getByText(/www\.googletagmanager\.com/).first()).toBeVisible();
  await expect(dialog.getByText(/Up to 2 years/).first()).toBeVisible();

  await dialog.getByRole('tab', { name: 'About', exact: true }).click();
  await expect(dialog.getByText(/Notice version: website-notice-2/)).toBeVisible();
  await expect(dialog.getByText(/Last updated: 2026-09-01/)).toBeVisible();
  await expect(dialog.getByText(/Global Privacy Control: (?:ON|OFF)/)).toBeVisible();
});

test('category choices map to purpose choices and expose mixed state', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Manage preferences', exact: true }).click();
  await setChoice(page, 'Advertising measurement', true);
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await expect(page.locator('.runtime-row').filter({ hasText: 'Marketing' })).toContainText('MIXED');

  await page.getByRole('button', { name: 'Privacy settings', exact: true }).click();
  const marketing = page.getByRole('checkbox', { name: 'Marketing', exact: true });
  await expect(marketing).toHaveJSProperty('indeterminate', true);
  await setChoice(page, 'Marketing', true);
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await expect(page.locator('.runtime-row').filter({ hasText: 'Marketing' })).toContainText('ALLOWED');
});

test('restores valid preferences and fails closed for stale or malformed storage', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Accept all', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Your privacy choices', { exact: true })).toHaveCount(0);
  await expect(page.locator('script[data-openconsent-activated-service="interface-demo"]')).toHaveCount(1);

  await page.evaluate(() => {
    const key = 'openconsent:openconsent-site:preferences';
    const value = JSON.parse(localStorage.getItem(key)!);
    value.policyVersion = 'old-policy';
    localStorage.setItem(key, JSON.stringify(value));
  });
  await page.reload();
  await expect(page.getByText('Your privacy choices', { exact: true })).toBeVisible();
  await expect(page.locator('script[data-openconsent-activated]')).toHaveCount(0);

  await page.evaluate(() => localStorage.setItem('openconsent:openconsent-site:preferences', '{broken'));
  await page.reload();
  await expect(page.getByText('Your privacy choices', { exact: true })).toBeVisible();
});

test('official-site Google example writes denied defaults first, then gates configured tags', async ({ page }) => {
  const googleRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('googletagmanager.com')) googleRequests.push(request.url()); });
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('./');
  expect(googleRequests).toEqual([]);
  const initial = await page.evaluate(() => (((window as Window & { dataLayer?: unknown[] }).dataLayer) ?? []).map(row => Array.from(row as ArrayLike<unknown>)));
  expect(initial[0]?.[0]).toBe('consent');
  expect(initial[0]?.[1]).toBe('default');
  expect(initial[0]?.[2]).toMatchObject({ analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });

  await page.getByRole('button', { name: 'Manage preferences', exact: true }).click();
  await setChoice(page, 'Analytics', true);
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await expect.poll(() => googleRequests.length).toBe(1);
  expect(googleRequests[0]).toContain('G-TEST123');

  await page.getByRole('button', { name: 'Privacy settings', exact: true }).click();
  await setChoice(page, 'Marketing', true);
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  expect(googleRequests).toHaveLength(1);
  const commands = await page.evaluate(() => (((window as Window & { dataLayer?: unknown[] }).dataLayer) ?? []).map(row => Array.from(row as ArrayLike<unknown>)));
  expect(commands.some(row => row[0] === 'config' && row[1] === 'G-TEST123')).toBe(true);
  expect(commands.some(row => row[0] === 'config' && row[1] === 'AW-TEST123')).toBe(true);

  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await page.waitForTimeout(50);
  expect(googleRequests).toHaveLength(1);
  const after = await page.evaluate(() => (((window as Window & { dataLayer?: unknown[] }).dataLayer) ?? []).map(row => Array.from(row as ArrayLike<unknown>)));
  const denied = after.filter(row => row[0] === 'consent' && row[1] === 'update').at(-1);
  expect(denied?.[2]).toMatchObject({ analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  await expect(page.getByText(/It never sends a fake conversion/)).toBeVisible();
});

test('GPC locks sale and sharing purposes while analytics remains selectable', async ({ page, context }) => {
  await context.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: true }));
  await page.goto('./');
  await page.getByRole('button', { name: 'Manage preferences', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Advertising measurement', exact: true })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: 'Advertising personalization', exact: true })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: 'Analytics', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('.gpc-row')).toContainText('ON');
});

test('English, Chinese, mobile controls, and the persistent trigger remain accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Open-source consent management for modern web apps.' })).toBeVisible();
  await page.getByRole('button', { name: 'Reject optional', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Privacy settings', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Switch language' }).click();
  await expect(page.getByRole('heading', { name: '面向现代 Web 应用的开源同意管理。' })).toBeVisible();
  await page.getByRole('button', { name: '隐私设置', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '隐私偏好' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '同意', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: '详情', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: '关于', exact: true })).toBeVisible();
});

test('public Cookie Declaration lists the catalog without a personal receipt', async ({ page }) => {
  await page.goto('./cookie-declaration/');
  await expect(page.getByRole('heading', { name: 'Cookie and browser storage declaration' })).toBeVisible();
  await expect(page.getByText('Google LLC · third party', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('_ga', { exact: true })).toBeVisible();
  await expect(page.getByText('Up to 2 years', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Why this page contains no receipt' })).toBeVisible();
  await expect(page.getByText(/receiptId/)).toHaveCount(0);
});

test('public Roadmap separates shipped, building, planned, and research work', async ({ page }) => {
  await page.goto('./roadmap/');
  await expect(page.getByRole('heading', { name: 'A consent layer teams can inspect, ship, and improve.' })).toBeVisible();
  for (const status of ['Shipped', 'Building', 'Planned', 'Research']) await expect(page.getByText(status, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Automatic tracker discovery', { exact: true })).toBeVisible();
  await expect(page.getByText(/TCF\/GPP/).first()).toBeVisible();
});

test('technical inspector and Plain HTML IIFE use the 0.4 model', async ({ page }) => {
  await page.goto('./playground/');
  await expect(page.getByRole('heading', { name: 'See every consent decision.' })).toBeVisible();
  await expect(page.getByText('Runtime snapshot')).toBeVisible();
  await page.goto('./iife/');
  await expect(page.getByRole('heading', { name: 'Plain HTML fixture' })).toBeVisible();
  await expect(page.getByText('Your privacy choices', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reject optional', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Privacy settings', exact: true })).toBeVisible();
});
