import { expect, test } from '@playwright/test';

const demoCookies = <T extends { name: string }>(cookies: T[]) => cookies.filter((cookie) => cookie.name.startsWith('oc_demo_'));

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
  await context.addInitScript(() => localStorage.clear());
});

test('pre-blocks optional resources, allows by purpose, and cleans up on withdrawal', async ({ page, context }) => {
  const vendorRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/vendors/')) vendorRequests.push(request.url());
  });

  await page.goto('./');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(vendorRequests).toEqual([]);
  expect(demoCookies(await context.cookies())).toEqual([]);

  await page.getByRole('button', { name: '拒绝可选', exact: true }).click();
  expect(vendorRequests).toEqual([]);
  expect(demoCookies(await context.cookies())).toEqual([]);

  await page.getByRole('button', { name: 'Privacy choices', exact: true }).click();
  await page.getByRole('switch', { name: /Optional analytics/ }).click();
  await page.getByRole('button', { name: '保存选择', exact: true }).click();
  await expect.poll(async () => (await context.cookies()).find((cookie) => cookie.name === 'oc_demo_analytics')).toMatchObject({ path: '/openConsent/' });
  expect((await context.cookies()).some((cookie) => cookie.name === 'oc_demo_ads')).toBe(false);
  expect(vendorRequests.filter((url) => url.endsWith('/vendors/analytics-demo.js'))).toHaveLength(1);
  expect(vendorRequests.filter((url) => url.endsWith('/vendors/ads-demo.js'))).toHaveLength(0);

  await page.getByRole('button', { name: 'Privacy choices', exact: true }).click();
  await page.getByRole('switch', { name: /Optional analytics/ }).click();
  await page.getByRole('button', { name: '保存选择', exact: true }).click();
  await expect.poll(async () => (await context.cookies()).some((cookie) => cookie.name === 'oc_demo_analytics')).toBe(false);
  await expect(page.locator('.tag-row').filter({ hasText: 'analytics-demo.js' })).toContainText('CLEANED');
});

test('a withdrawal during a delayed load cannot recreate sale/share state', async ({ page, context }) => {
  let releaseRequest: (() => void) | undefined;
  const delayed = new Promise<void>((resolve) => { releaseRequest = resolve; });
  await page.route('**/vendors/ads-demo.js', async (route) => {
    await delayed;
    await route.continue();
  });

  await page.goto('./');
  await page.getByRole('button', { name: '接受可选', exact: true }).click();
  await expect(page.locator('#oc-injected-sale-sharing')).toBeAttached();
  await page.getByRole('button', { name: 'Privacy choices', exact: true }).click();
  await page.getByRole('button', { name: '全部拒绝', exact: true }).click();
  releaseRequest?.();

  await page.waitForTimeout(250);
  expect(demoCookies(await context.cookies())).toEqual([]);
  await expect(page.locator('#oc-injected-sale-sharing')).toHaveCount(0);
  await expect(page.locator('.tag-row').filter({ hasText: 'ads-demo.js' })).toContainText('CLEANED');
});

test('GPC simulation removes sale/share while leaving analytics active', async ({ page, context }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '接受可选', exact: true }).click();
  await expect.poll(async () => demoCookies(await context.cookies()).map((cookie) => cookie.name).sort()).toEqual(['oc_demo_ads', 'oc_demo_analytics']);

  await page.getByRole('button', { name: '模拟 GPC: OFF', exact: true }).click();
  await expect.poll(async () => demoCookies(await context.cookies()).map((cookie) => cookie.name)).toEqual(['oc_demo_analytics']);
  await expect(page.locator('.tag-row').filter({ hasText: 'ads-demo.js' })).toContainText('CLEANED');
  await expect(page.locator('.tag-row').filter({ hasText: 'analytics-demo.js' })).toContainText('ACTIVE');
});

test('developer homepage exposes Google integration and AI audit preview', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Ship consent in one step/ })).toBeVisible();
  await page.getByRole('button', { name: '拒绝可选', exact: true }).click();
  await expect(page.getByRole('button', { name: /Google Analytics 4/ })).toBeVisible();
  await page.getByRole('button', { name: /Google Ads/ }).click();
  await expect(page.locator('.vendor-pill')).toContainText('GOOGLE ADS');
  await page.getByRole('button', { name: /Run AI audit preview/ }).click();
  await expect(page.locator('.audit-console-head')).toContainText('AUDIT COMPLETE');
  await expect(page.locator('.finding')).toHaveCount(4);
});
