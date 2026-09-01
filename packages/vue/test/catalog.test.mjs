import test from 'node:test';
import assert from 'node:assert/strict';
import { getCategoryRows, saveCategories, setCategory } from '../src/catalog.js';

const policy = {
  purposes: [
    { id: 'quality', categoryId: 'improvement', activityId: 'quality', label: { en: 'Quality', zh: '质量改进' }, legalBasis: 'consent', optional: true },
    { id: 'personalization', categoryId: 'improvement', activityId: 'personalization', label: { en: 'Personalization' }, legalBasis: 'consent', optional: true }
  ]
};

test('maps a category choice to every authoritative purpose in memory mode', () => {
  let received;
  const client = {
    policy,
    savePreferences(choices, source) { received = { choices, source }; return { action: 'save' }; }
  };
  const snapshot = { choices: { quality: 'unset', personalization: 'unset' } };
  assert.equal(setCategory(client, snapshot, 'improvement', 'granted', 'vue-test').action, 'save');
  assert.deepEqual(received, {
    choices: { quality: 'granted', personalization: 'granted' },
    source: 'vue-test'
  });
});

test('preserves normalized catalog order and rejects invalid batch values', () => {
  const client = {
    policy,
    getCatalog: () => ({
      categories: [
        { id: 'second', label: 'Second', description: '', required: false, order: 2, purposeIds: ['quality'] },
        { id: 'first', label: 'First', description: '', required: false, order: 1, purposeIds: ['personalization'] }
      ],
      purposes: policy.purposes, vendors: [], services: [], trackers: []
    }),
    saveCategoryPreferences() { throw new Error('must not be called'); }
  };
  assert.deepEqual(getCategoryRows(client, { choices: {} }).map((row) => row.id), ['first', 'second']);
  assert.throws(() => saveCategories(client, { choices: {} }, { first: 'mixed' }), /granted or denied/);
});

test('uses top-level categories when a compatibility client has no getCatalog method', () => {
  const client = {
    policy: {
      ...policy,
      categories: [{ id: 'improvement', label: { en: 'Improvement', zh: '产品改进' } }],
      vendors: [], services: [], trackers: []
    }
  };
  const rows = getCategoryRows(client, { choices: { quality: 'granted', personalization: 'granted' } }, 'zh');
  assert.equal(rows[0].label, '产品改进');
  assert.deepEqual(rows[0].purposeIds, ['quality', 'personalization']);
  assert.equal(rows[0].state, 'granted');
});
