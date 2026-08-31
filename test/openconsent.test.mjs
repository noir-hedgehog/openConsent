import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assess } from '../src/core/check.mjs';
import { makeAssessmentRecord, makeTransparencyCard } from '../src/core/artifacts.mjs';

const exampleBytes = await readFile(new URL('../examples/openconsent.json', import.meta.url));
const example = JSON.parse(exampleBytes);

test('example is schema-valid with no blocking findings', async () => {
  const result = await assess(example);
  assert.equal(result.validManifest, true);
  assert.equal(result.summary.blocking, 0);
  assert.ok(result.summary.needs_review > 0);
  assert.equal(result.packs.map((pack) => pack.id).join(','), 'core,gdpr,ccpa');
  assert.ok(result.packs.every((pack) => pack.digest));
});

test('full JSON Schema rejects an invalid enum and extra property', async () => {
  const manifest = structuredClone(example);
  manifest.creation.origin = 'banana';
  manifest.project.internalToken = 'must-not-pass';
  const result = await assess(manifest);
  assert.equal(result.validManifest, false);
  assert.ok(result.summary.blocking > 0);
});

test('AI enablement and activity references are consistent', async () => {
  const disabled = structuredClone(example);
  disabled.runtime.aiEnabled = false;
  assert.equal((await assess(disabled)).validManifest, false);
  const badReference = structuredClone(example);
  badReference.runtime.aiComponents[0].activityIds = ['missing-activity'];
  assert.equal((await assess(badReference)).validManifest, false);
});

test('project may declare reviewed absence of personal-data processing', async () => {
  const manifest = structuredClone(example);
  manifest.personalData = { processed: false, rationale: 'A reviewed local-only static artifact with no network, storage, logs or support channel.', reviewer: 'Independent scope reviewer', decidedAt: '2026-08-31' };
  manifest.activities = [];
  manifest.runtime = { aiEnabled: false, aiComponents: [] };
  delete manifest.notices;
  delete manifest.rights;
  const result = await assess(manifest);
  assert.equal(result.validManifest, true);
  assert.equal(result.summary.blocking, 0);
  assert.ok(result.summary.needs_review > 0);
});

test('consent activity without withdrawal mechanism fails', async () => {
  const manifest = structuredClone(example);
  delete manifest.activities[1].consent;
  const result = await assess(manifest);
  assert.equal(result.findings.find((item) => item.ruleId === 'GDPR-002').status, 'fail');
});

test('declared consent withdrawal still requires operational review', async () => {
  const result = await assess(example);
  assert.equal(result.findings.find((item) => item.ruleId === 'GDPR-002').status, 'needs_review');
});

test('sale and sharing require GPC enforcement', async () => {
  const manifest = structuredClone(example);
  Object.assign(manifest.activities[0], { sale: true, sharing: false, knownMinorsUnder16: false, optOut: { method: 'link', value: 'https://example.com/opt-out' } });
  manifest.gpc.honored = false;
  const result = await assess(manifest);
  assert.equal(result.findings.find((item) => item.ruleId === 'CCPA-003').status, 'fail');
});

test('CCPA method count does not silently establish legal sufficiency', async () => {
  const result = await assess(example);
  assert.equal(result.findings.find((item) => item.ruleId === 'CCPA-002').status, 'needs_review');
});

test('unsupported processor and service-provider roles stay under review', async () => {
  const manifest = structuredClone(example);
  manifest.applicability.gdpr.role = 'processor';
  manifest.applicability.ccpa.role = 'service-provider';
  const result = await assess(manifest);
  assert.equal(result.summary.blocking, 0);
  assert.ok(result.summary.needs_review >= 3);
  assert.match(result.findings.find((item) => item.ruleId === 'GDPR-001').message, /do not assess role processor/);
  assert.match(result.findings.find((item) => item.ruleId === 'CCPA-001').message, /do not assess role service-provider/);
});

test('significant automated decisions cannot silently pass', async () => {
  const manifest = structuredClone(example);
  manifest.activities[0].automatedDecision = { significant: true, solelyAutomated: true };
  const result = await assess(manifest);
  assert.equal(result.findings.find((item) => item.ruleId === 'GDPR-005').status, 'needs_review');
  assert.equal(result.findings.find((item) => item.ruleId === 'CORE-004').status, 'needs_review');
});

test('public projection uses nested allowlists even with a hostile caller', async () => {
  const injected = structuredClone(example);
  injected.project.privacyContact.internalToken = 'secret-sentinel';
  injected.rights.gdpr.privateRequests = [{ subjectRef: 'person-1', rawPrompt: 'private' }];
  injected.activities[0].retention.privateEvidence = { ip: '127.0.0.1' };
  const injectedBytes = Buffer.from(JSON.stringify(injected));
  const invalidAssessment = await assess(injected, injectedBytes);
  const assessment = { ...invalidAssessment, validManifest: true };
  const card = makeTransparencyCard(injectedBytes, assessment);
  const text = JSON.stringify(card);
  for (const secret of ['secret-sentinel', 'subjectRef', 'rawPrompt', '127.0.0.1']) assert.equal(text.includes(secret), false);
  assert.ok(card.assessment.identity.assessmentDigest);
  assert.equal(card.limitations.length > 0, true);
});

test('unsigned assessment binds manifest, schema, engine, packs and findings', async () => {
  const assessment = await assess(example, exampleBytes);
  const first = makeAssessmentRecord(exampleBytes, assessment);
  assert.equal(first.unsigned, true);
  assert.ok(first.engine.schemaDigest && first.engine.engineDigest && first.findingsDigest && first.assessmentDigest);
  assert.throws(() => makeAssessmentRecord(Buffer.concat([exampleBytes, Buffer.from(' ')]), assessment), /do not match/);
});
