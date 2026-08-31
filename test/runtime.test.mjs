import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenConsent, DEFAULT_POLICY, evaluatePurpose } from '../packages/core/src/index.js';
import { openConsent, readGpc, requirePurpose } from '../packages/express/src/index.js';

test('optional processing defaults to deny and can be withdrawn', () => {
  const client = createOpenConsent({ now: () => '2026-08-31T00:00:00.000Z' });
  assert.equal(client.evaluate('optional-analytics').outcome, 'deny');
  const receipt = client.setChoice('optional-analytics', 'granted');
  assert.equal(receipt.unsigned, true);
  assert.equal(receipt.action, 'save');
  assert.equal(client.evaluate('optional-analytics').outcome, 'allow');
  const withdrawal = client.setChoice('optional-analytics', 'denied');
  assert.equal(withdrawal.action, 'withdraw');
  assert.equal(client.evaluate('optional-analytics').outcome, 'deny');
});

test('an initial denial is recorded as deny rather than withdrawal', () => {
  const client = createOpenConsent({ now: () => '2026-08-31T00:00:00.000Z' });
  assert.equal(client.setChoice('optional-analytics', 'denied').action, 'deny');
  assert.equal(client.getEvents()[0].type, 'preference_saved');
});

test('preference receipts reject unknown and non-consent purposes', () => {
  const client = createOpenConsent();
  assert.throws(() => client.setChoice('missing-purpose', 'granted'), /known optional consent purpose/);
  assert.throws(() => client.setChoice('support', 'denied'), /known optional consent purpose/);
  assert.equal(client.getSnapshot().receiptId, null);
  assert.equal(client.getSnapshot().revision, 0);
});

test('GPC overrides a granted sale/share preference', () => {
  const snapshot = { choices: { 'personalized-ads': 'granted' }, signals: { gpc: false }, policyVersion: DEFAULT_POLICY.policyVersion };
  assert.equal(evaluatePurpose(DEFAULT_POLICY, snapshot, 'personalized-ads', { gpc: true }).reason, 'GPC_SALE_SHARE_OPT_OUT');
  assert.equal(evaluatePurpose(DEFAULT_POLICY, snapshot, 'support', { gpc: true }).outcome, 'allow');
});

test('reset preserves an initially observed GPC signal', () => {
  const client = createOpenConsent({ gpc: true, now: () => '2026-08-31T00:00:00.000Z' });
  client.setGpc(false, 'demo');
  client.reset();
  assert.equal(client.getSnapshot().signals.gpc, true);
  assert.equal(client.evaluate('personalized-ads').reason, 'GPC_SALE_SHARE_OPT_OUT');
});

test('Express adapter trusts server-observed Sec-GPC', async () => {
  const request = { headers: { 'sec-gpc': '1' }, get(name) { return this.headers[name.toLowerCase()]; } };
  assert.equal(readGpc(request), true);
  const snapshot = { choices: { 'personalized-ads': 'granted' }, signals: {}, policyVersion: DEFAULT_POLICY.policyVersion };
  await new Promise((resolve, reject) => openConsent({ policy: DEFAULT_POLICY, getSnapshot: async () => snapshot })(request, {}, (error) => error ? reject(error) : resolve()));
  assert.equal(request.openConsent.can('personalized-ads').outcome, 'deny');
});

test('requirePurpose fails closed', () => {
  let status;
  const response = { status(value) { status = value; return this; }, json(value) { this.body = value; return this; }, set() {} };
  requirePurpose('optional-analytics')({ openConsent: { can: () => ({ outcome: 'deny' }) } }, response, () => assert.fail('must not call next'));
  assert.equal(status, 403);
});
