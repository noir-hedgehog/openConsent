import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenConsent, normalizeCatalog } from '../src/index.js';

const policy = {
  projectId: 'catalog-test', policyVersion: '1', noticeVersion: '1', manifestDigest: 'test', updatedAt: '2026-09-01',
  categories: [
    { id: 'necessary', label: { en: 'Necessary', zh: '必要' }, description: 'Required operation', required: true, order: 1 },
    { id: 'measurement', label: { en: 'Measurement', zh: '衡量' }, description: 'Optional measurement', required: false, order: 2 },
    { id: 'marketing', label: { en: 'Marketing', zh: '营销' }, description: 'Optional marketing', required: false, order: 3 }
  ],
  purposes: [
    { id: 'required', activityId: 'site', label: 'Site operation', description: 'Runs the site', legalBasis: 'contract', optional: false, categoryId: 'necessary' },
    { id: 'analytics', activityId: 'measure', label: 'Analytics', description: 'Measures usage', legalBasis: 'consent', optional: true, categoryId: 'measurement' },
    { id: 'ads', activityId: 'advertise', label: 'Ads', description: 'Measures ads', legalBasis: 'consent', optional: true, sale: true, sharing: true, categoryId: 'marketing' }
  ],
  vendors: [{ id: 'acme', name: 'Acme', privacyPolicyUrl: 'https://example.com/privacy' }],
  services: [{ id: 'acme-analytics', name: { en: 'Acme Analytics', zh: 'Acme 分析' }, vendorId: 'acme', purposeIds: ['analytics'] }],
  trackers: [{ id: 'acme-cookie', name: 'acme_id', serviceId: 'acme-analytics', purposeIds: ['analytics'], kind: 'cookie', firstParty: true, duration: '13 months' }]
};

test('normalizes localized catalog and derives service tracker relations', () => {
  const catalog = normalizeCatalog(policy, 'zh');
  assert.equal(catalog.categories[1].label, '衡量');
  assert.equal(catalog.services[0].name, 'Acme 分析');
  assert.deepEqual(catalog.services[0].trackerIds, ['acme-cookie']);
  assert.deepEqual(catalog.services[0].categoryIds, ['measurement']);
  assert.equal(catalog.trackers[0].kind, 'cookie');
  assert.equal(catalog.trackers[0].firstParty, true);
  assert.equal(catalog.updatedAt, '2026-09-01');
});

test('rejects invalid catalog references', () => {
  const invalid = structuredClone(policy);
  invalid.services[0].vendorId = 'missing';
  assert.throws(() => normalizeCatalog(invalid), /unknown vendor/);
});

test('strict top-level catalog rejects initialization for every incomplete required field', () => {
  const cases = [
    ['categories', 0, 'label', /category necessary label/],
    ['categories', 0, 'description', /category necessary description/],
    ['categories', 0, 'required', /category necessary requires required as a boolean/],
    ['purposes', 0, 'categoryId', /purpose required categoryId/],
    ['purposes', 0, 'activityId', /purpose required activityId/],
    ['purposes', 0, 'label', /purpose required label/],
    ['purposes', 0, 'description', /purpose required description/],
    ['purposes', 0, 'legalBasis', /purpose required legalBasis/],
    ['purposes', 0, 'optional', /purpose required requires optional as a boolean/],
    ['vendors', 0, 'name', /vendor acme name/],
    ['vendors', 0, 'privacyPolicyUrl', /vendor acme privacyPolicyUrl/],
    ['services', 0, 'name', /service acme-analytics name/],
    ['services', 0, 'vendorId', /service acme-analytics vendorId/],
    ['services', 0, 'purposeIds', /service acme-analytics requires purposeIds/],
    ['trackers', 0, 'name', /tracker acme-cookie name/],
    ['trackers', 0, 'kind', /tracker acme-cookie kind/],
    ['trackers', 0, 'serviceId', /tracker acme-cookie serviceId/],
    ['trackers', 0, 'purposeIds', /tracker acme-cookie requires purposeIds/],
    ['trackers', 0, 'firstParty', /tracker acme-cookie requires firstParty/]
  ];
  for (const [collection, index, field, expected] of cases) {
    const incomplete = structuredClone(policy);
    delete incomplete[collection][index][field];
    assert.throws(() => createOpenConsent({ policy: incomplete }), expected, `${collection}[${index}].${field}`);
  }
});

test('top-level catalog requires all four disclosure collections', () => {
  for (const field of ['categories', 'vendors', 'services', 'trackers']) {
    const incomplete = structuredClone(policy);
    delete incomplete[field];
    assert.throws(() => createOpenConsent({ policy: incomplete }), new RegExp(`policy\\.${field} must be an array`));
  }
  const malformed = structuredClone(policy);
  malformed.categories = null;
  delete malformed.vendors;
  delete malformed.services;
  delete malformed.trackers;
  assert.throws(() => createOpenConsent({ policy: malformed }), /policy\.categories must be an array/);
});

test('category states and mutations keep purpose choices authoritative', () => {
  const client = createOpenConsent({ policy });
  assert.deepEqual(client.getSnapshot().categoryStates, { necessary: 'required', measurement: 'unset', marketing: 'unset' });
  client.setCategory('measurement', 'granted');
  assert.equal(client.getSnapshot().choices.analytics, 'granted');
  assert.equal(client.getSnapshot().categoryStates.measurement, 'granted');
  client.saveCategoryPreferences({ measurement: 'denied', marketing: 'granted' });
  assert.equal(client.getSnapshot().categoryStates.measurement, 'denied');
  assert.equal(client.getSnapshot().categoryStates.marketing, 'granted');
});

test('legacy purpose-only policies receive a compatible disclosure catalog', () => {
  const legacy = { projectId: 'legacy', policyVersion: '1', noticeVersion: '1', manifestDigest: 'x', purposes: [{ id: 'analytics', activityId: 'a', legalBasis: 'consent', optional: true }] };
  const client = createOpenConsent({ policy: legacy });
  assert.equal(client.getCatalog().legacy, true);
  assert.deepEqual(client.getCatalog().categories[0].purposeIds, ['analytics']);
});

test('GPC keeps a sale/share category denied through category APIs', () => {
  const client = createOpenConsent({ policy, gpc: true });
  client.setCategory('marketing', 'granted');
  assert.equal(client.getSnapshot().choices.ads, 'denied');
  assert.equal(client.getSnapshot().categoryStates.marketing, 'denied');
});
