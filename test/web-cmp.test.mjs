import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { assessWebCmp } from '../src/core/web-cmp.mjs';

test('web-cmp profile accepts the complete public disclosure example', async () => {
  const policy = JSON.parse(await readFile(new URL('../examples/openconsent.web.json', import.meta.url), 'utf8'));
  const result = assessWebCmp(policy);
  assert.equal(result.profile, 'web-cmp');
  assert.equal(result.summary.blocking, 0);
  assert.equal(result.summary.pass, 5);
});

test('web-cmp profile rejects purpose-only compatibility policies', () => {
  const result = assessWebCmp({ projectId: 'legacy', policyVersion: '1', noticeVersion: '1', manifestDigest: 'sha256:legacy', purposes: [{ id: 'analytics', categoryId: 'analytics', activityId: 'measure', legalBasis: 'consent', optional: true }] });
  assert.ok(result.summary.blocking > 0);
  assert.equal(result.findings.find(item => item.ruleId === 'CMP-002')?.status, 'fail');
});
