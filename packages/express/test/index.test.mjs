import test from 'node:test';
import assert from 'node:assert/strict';
import { openConsent, readGpc } from '../src/index.js';

const policy = {
  projectId: 'express-test',
  policyVersion: 'policy-4',
  noticeVersion: 'notice-4',
  manifestDigest: 'sha256:test',
  purposes: [
    {
      id: 'usage-metrics',
      categoryId: 'measurement',
      activityId: 'product-usage',
      label: { en: 'Usage metrics' },
      description: { en: 'Measure aggregate product usage.' },
      legalBasis: 'consent',
      optional: true
    },
    {
      id: 'cross-context-sharing',
      categoryId: 'advertising',
      activityId: 'cross-context-sharing',
      label: { en: 'Cross-context sharing' },
      description: { en: 'Share data across contexts.' },
      legalBasis: 'consent',
      optional: true,
      sharing: true
    }
  ]
};

async function apply(getSnapshot, headers = {}) {
  const request = { headers, get(name) { return this.headers[name.toLowerCase()]; } };
  await new Promise((resolve, reject) => openConsent({ policy, getSnapshot })(request, {}, (error) => error ? reject(error) : resolve()));
  return request;
}

test('missing snapshots fail closed for an enriched purpose', async () => {
  const request = await apply(async () => null);
  assert.equal(request.openConsent.can('usage-metrics').outcome, 'deny');
  assert.equal(request.openConsent.can('usage-metrics').reason, 'OPTIONAL_DEFAULT_DENY');
});

test('server-observed GPC overrides a sharing grant', async () => {
  const snapshot = {
    subjectRef: 'subject-1', revision: 1,
    choices: { 'cross-context-sharing': 'granted' },
    signals: { gpc: false }, policyVersion: 'policy-4',
    updatedAt: '2026-09-01T00:00:00.000Z', receiptId: 'receipt-1'
  };
  const request = await apply(async () => snapshot, { 'sec-gpc': '1' });
  assert.equal(readGpc(request), true);
  assert.equal(request.openConsent.can('cross-context-sharing').reason, 'GPC_SALE_SHARE_OPT_OUT');
});
