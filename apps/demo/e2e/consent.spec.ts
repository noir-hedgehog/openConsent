import { expect, test } from '@playwright/test';

const optionalCookies = <T extends { name: string }>(cookies: T[]) => cookies.filter(cookie => cookie.name.startsWith('oc_demo_'));

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
  await context.addInitScript(() => {
    if (!sessionStorage.getItem('__openconsent_test_started')) {
      localStorage.clear();
      sessionStorage.setItem('__openconsent_test_started', '1');
    }
  });
});

test('pre-blocks optional tags, supports granular consent, and cleans known state on withdrawal', async ({ page, context }) => {
  const requests: string[] = [];
  const thirdPartyRequests: string[] = [];
  page.on('request', request => {
    const host = new URL(request.url()).hostname;
    if (host !== '127.0.0.1') thirdPartyRequests.push(request.url());
  });
  page.on('request', request => { if (request.url().includes('/vendors/') || request.url().includes('googletagmanager.com')) requests.push(request.url()); });
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('./');
  await expect(page.getByText('Your privacy choices', { exact: true })).toBeVisible();
  expect(requests).toEqual([]);
  expect(thirdPartyRequests).toEqual([]);
  expect(optionalCookies(await context.cookies())).toEqual([]);
  await page.evaluate(() => {
    const unknown = document.createElement('script');
    unknown.type = 'text/plain';
    unknown.dataset.openconsentPurpose = 'unknown-purpose';
    unknown.dataset.openconsentSrc = `${location.pathname}vendors/analytics-demo.js`;
    document.body.append(unknown);
  });
  await page.waitForTimeout(50);
  expect(requests).toEqual([]);

  await page.getByRole('button', { name: 'Reject optional', exact: true }).click();
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: 'Privacy choices', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Privacy preferences' })).toBeVisible();
  await page.locator('.oc-purpose').filter({ hasText: 'Analytics' }).locator('label').click();
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await expect.poll(async () => optionalCookies(await context.cookies()).map(cookie => cookie.name)).toEqual(['oc_demo_analytics']);
  expect(requests.some(url => url.endsWith('/vendors/analytics-demo.js'))).toBe(true);
  expect(requests.some(url => url.endsWith('/vendors/ads-demo.js'))).toBe(false);

  await page.getByRole('button', { name: 'Privacy choices', exact: true }).click();
  await page.locator('.oc-purpose').filter({ hasText: 'Analytics' }).locator('label').click();
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await expect.poll(async () => optionalCookies(await context.cookies())).toEqual([]);
  await expect(page.locator('script[data-openconsent-activated="optional-analytics"]')).toHaveCount(0);
});

test('withdrawal aborts a managed script that has started loading', async ({ page }) => {
  let releaseResponse!: () => void;
  let markStarted!: () => void;
  const responseGate = new Promise<void>(resolve => { releaseResponse = resolve; });
  const requestStarted = new Promise<void>(resolve => { markStarted = resolve; });
  await page.route('**/delayed-vendor.js', async route => {
    markStarted();
    await responseGate;
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.__delayedVendorRan = true;' });
  });
  await page.goto('./');
  await page.evaluate(() => {
    const delayed = document.createElement('script');
    delayed.type = 'text/plain';
    delayed.dataset.openconsentPurpose = 'optional-analytics';
    delayed.dataset.openconsentSrc = `${location.pathname}delayed-vendor.js`;
    document.body.append(delayed);
  });
  await page.getByRole('button', { name: 'Accept all', exact: true }).click();
  await requestStarted;
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  releaseResponse();
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as Window & { __delayedVendorRan?: boolean }).__delayedVendorRan)).toBeUndefined();
  await expect(page.locator('script[data-openconsent-activated="optional-analytics"]')).toHaveCount(0);
});

test('restores a valid preference and fails closed for stale or malformed storage', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Accept all', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Your privacy choices', { exact: true })).toHaveCount(0);
  await expect(page.locator('script[data-openconsent-activated="optional-analytics"]')).toHaveCount(1);

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
  await expect(page.locator('script[data-openconsent-activated]')).toHaveCount(0);
});

test('writes Google denied defaults before loading and updates only after consent', async ({ page }) => {
  const googleRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('googletagmanager.com')) googleRequests.push(request.url()); });
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('./');
  expect(googleRequests).toEqual([]);
  const initial = await page.evaluate(() => (((window as Window & { dataLayer?: unknown[] }).dataLayer) ?? []).map((row: unknown) => Array.from(row as ArrayLike<unknown>)));
  expect(initial[0]?.[0]).toBe('consent'); expect(initial[0]?.[1]).toBe('default');
  expect(initial[0]?.[2]).toMatchObject({ analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });

  await page.getByRole('button', { name: 'Accept all', exact: true }).click();
  await expect.poll(() => googleRequests.length).toBe(1);
  const commands = await page.evaluate(() => (((window as Window & { dataLayer?: unknown[] }).dataLayer) ?? []).map((row: unknown) => Array.from(row as ArrayLike<unknown>)));
  const update = commands.find((row: unknown[]) => row[0] === 'consent' && row[1] === 'update');
  expect(update?.[2]).toMatchObject({ analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });

  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await page.waitForTimeout(50);
  expect(googleRequests).toHaveLength(1);
  const afterWithdrawal = await page.evaluate(() => (((window as Window & { dataLayer?: unknown[] }).dataLayer) ?? []).map((row: unknown) => Array.from(row as ArrayLike<unknown>)));
  const deniedUpdate = afterWithdrawal.filter((row: unknown[]) => row[0] === 'consent' && row[1] === 'update').at(-1);
  expect(deniedUpdate?.[2]).toMatchObject({ analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
});

test('GPC overrides sale/share while analytics can remain active', async ({ page, context }) => {
  await context.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: true }));
  await page.goto('./');
  await page.getByRole('button', { name: 'Accept all', exact: true }).click();
  await expect.poll(async () => optionalCookies(await context.cookies()).map(cookie => cookie.name)).toEqual(['oc_demo_analytics']);
  await expect(page.locator('.runtime-row').filter({ hasText: 'Personalized ads / sale-share' })).toContainText('GPC OVERRIDE');
  await page.getByRole('button', { name: 'Privacy choices', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Personalized advertising' })).toBeDisabled();
});

test('English is default, Chinese switch is complete, and mobile controls stay accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Open-source consent management for modern web apps.' })).toBeVisible();
  await page.getByRole('button', { name: 'Reject optional', exact: true }).click();
  await page.getByRole('button', { name: 'Switch language' }).click();
  await expect(page.getByRole('heading', { name: '面向现代 Web 应用的开源同意管理。' })).toBeVisible();
  await page.getByRole('button', { name: '隐私选择', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '隐私偏好' })).toBeVisible();
  await expect(page.getByRole('button', { name: '保存偏好' })).toBeVisible();
});

test('homepage is product-first and the technical inspector lives in playground', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Open-source consent management for modern web apps.' })).toBeVisible();
  await expect(page.getByText('PRIVACY READINESS CHECKS', { exact: true })).toBeVisible();
  await expect(page.getByText(/Run AI audit preview/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Reject optional', exact: true }).click();
  await page.goto('./playground/');
  await expect(page.getByRole('heading', { name: 'See every consent decision.' })).toBeVisible();
  await expect(page.getByText('Runtime snapshot')).toBeVisible();
  await expect(page.getByText('Latest unsigned receipt')).toBeVisible();
});

test('the published Plain HTML IIFE build initializes from one script tag', async ({ page }) => {
  await page.goto('./iife/');
  await expect(page.getByRole('heading', { name: 'Plain HTML fixture' })).toBeVisible();
  await expect(page.getByText('Your privacy choices', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reject optional', exact: true }).click();
  await expect(page.getByText('Your privacy choices', { exact: true })).toBeHidden();
});
