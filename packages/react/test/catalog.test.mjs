import test from 'node:test';
import assert from 'node:assert/strict';
import { getCategoryRows, getDisclosureCatalog, saveCategories } from '../src/catalog.js';

const policy = {
  purposes: [
    { id: 'metric-a', categoryId: 'measurement', activityId: 'metric-a', label: { en: 'Metric A', zh: '指标 A' }, legalBasis: 'consent', optional: true },
    { id: 'metric-b', categoryId: 'measurement', activityId: 'metric-b', label: { en: 'Metric B', zh: '指标 B' }, legalBasis: 'consent', optional: true },
    { id: 'session', categoryId: 'required', activityId: 'session', label: { en: 'Session' }, legalBasis: 'contract', optional: false }
  ]
};

test('derives grouped, localized category rows for a memory client', () => {
  const client = { policy };
  const snapshot = { choices: { 'metric-a': 'granted', 'metric-b': 'denied' } };
  const rows = getCategoryRows(client, snapshot, 'zh');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.find((row) => row.id === 'measurement').purposeIds, ['metric-a', 'metric-b']);
  assert.equal(rows.find((row) => row.id === 'measurement').state, 'mixed');
  assert.equal(rows.find((row) => row.id === 'required').state, 'required');
});

test('uses catalog category states and delegates category batches to a web client', () => {
  let received;
  const client = {
    policy,
    getCatalog: () => ({
      categories: [{ id: 'measurement', label: 'Measurement', description: 'Product metrics', required: false, purposeIds: ['metric-a', 'metric-b'] }],
      purposes: policy.purposes, vendors: [], services: [], trackers: []
    }),
    saveCategoryPreferences(choices, source) { received = { choices, source }; return { action: 'save_categories' }; }
  };
  const snapshot = { choices: {}, categoryStates: { measurement: 'denied' } };
  assert.equal(getCategoryRows(client, snapshot)[0].state, 'denied');
  assert.equal(saveCategories(client, snapshot, { measurement: 'granted' }, 'react-test').action, 'save_categories');
  assert.deepEqual(received, { choices: { measurement: 'granted' }, source: 'react-test' });
});

test('accepts the top-level RuntimePolicy disclosure model in fallback mode', () => {
  const client = {
    policy: {
      ...policy,
      projectId: 'top-level', policyVersion: 'policy-4', noticeVersion: 'notice-4',
      categories: [{ id: 'measurement', label: { en: 'Measurement' } }],
      vendors: [{ id: 'vendor-1', name: 'Metrics vendor' }],
      services: [{ id: 'service-1', name: 'Metrics service', categoryId: 'measurement', vendorId: 'vendor-1', purposeIds: ['metric-a'] }],
      trackers: [{ id: 'tracker-1', name: 'Metrics cookie', serviceId: 'service-1', type: 'cookie' }]
    }
  };
  const catalog = getDisclosureCatalog(client);
  assert.deepEqual(catalog.categories[0].purposeIds, ['metric-a', 'metric-b']);
  assert.deepEqual(catalog.services[0].trackerIds, ['tracker-1']);
  assert.equal(catalog.vendors[0].name, 'Metrics vendor');
});
