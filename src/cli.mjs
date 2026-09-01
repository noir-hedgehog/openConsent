#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assess, loadPolicyPacks } from './core/check.mjs';
import { makeAssessmentRecord, makeTransparencyCard } from './core/artifacts.mjs';
import { assessWebCmp } from './core/web-cmp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [command = 'help', rawInput, ...rest] = process.argv.slice(2);
const inputArg = rawInput?.startsWith('--') ? null : rawInput;
const args = rawInput?.startsWith('--') ? [rawInput, ...rest] : rest;

function option(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function usage() {
  console.log(`openConsent 0.4.0-beta.1

Usage:
  openconsent init [path]
  openconsent check [manifest] [--json]
                            [--profile web-cmp]
                            [--fail-on review]
  openconsent explain <control-id>
  openconsent transparency [manifest] [--out path]
  openconsent assessment [manifest] [--out path]
  openconsent verify <manifest> <assessment-record>

Defaults: manifest is ./openconsent.json. Generated JSON is printed to stdout unless --out is set.`);
}

async function loadManifest(file) {
  const bytes = await readFile(file);
  try {
    return { bytes, manifest: JSON.parse(bytes.toString('utf8')) };
  } catch (error) {
    throw new Error(`Invalid JSON in ${file}: ${error.message}`);
  }
}

async function writeArtifact(value, output) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  if (output) {
    await writeFile(output, text, 'utf8');
    console.log(`Wrote ${output}`);
  } else {
    process.stdout.write(text);
  }
}

async function main() {
  if (command === 'help' || command === '--help' || command === '-h') return usage();

  if (command === 'init') {
    const destination = inputArg ?? 'openconsent.json';
    const template = await readFile(path.join(root, 'examples', 'openconsent.json'));
    await writeFile(destination, template, { flag: 'wx' });
    console.log(`Created ${destination}. Replace all example facts before relying on checks.`);
    return;
  }

  if (command === 'explain') {
    if (!inputArg) throw new Error('A control ID is required.');
    const packs = await loadPolicyPacks(['gdpr', 'ccpa']);
    const control = packs.flatMap((pack) => pack.controls.map((item) => ({ ...item, pack }))).find((item) => item.id === inputArg.toUpperCase());
    if (!control) throw new Error(`Unknown control ID: ${inputArg}`);
    await writeArtifact({
      id: control.id,
      title: control.title,
      severity: control.severity,
      pack: { id: control.pack.id, version: control.pack.version, status: control.pack.status },
      sources: control.pack.sources ?? [],
      limitations: control.pack.limitations ?? null
    });
    return;
  }

  const input = inputArg ?? 'openconsent.json';
  const { bytes, manifest } = await loadManifest(input);
  const profile = option('--profile');
  if (profile && profile !== 'web-cmp') throw new Error(`Unknown check profile: ${profile}`);
  const assessment = command === 'check' && profile === 'web-cmp' ? assessWebCmp(manifest) : await assess(manifest, bytes);

  if (command === 'verify') {
    const recordPath = args[0];
    if (!recordPath) throw new Error('An assessment-record path is required.');
    const record = JSON.parse(await readFile(recordPath, 'utf8'));
    const expected = makeAssessmentRecord(bytes, assessment);
    expected.generatedAt = record.generatedAt;
    const checks = {
      completeRecord: JSON.stringify(record) === JSON.stringify(expected),
      manifestDigest: record.subject?.manifestDigest === expected.subject.manifestDigest,
      engine: JSON.stringify(record.engine) === JSON.stringify(expected.engine),
      policyPacks: JSON.stringify(record.policyPacks) === JSON.stringify(expected.policyPacks),
      findingsDigest: record.findingsDigest === expected.findingsDigest,
      assessmentDigest: record.assessmentDigest === expected.assessmentDigest,
      unsigned: record.unsigned === true,
      generatedAt: typeof record.generatedAt === 'string' && Number.isFinite(Date.parse(record.generatedAt))
    };
    await writeArtifact({ valid: Object.values(checks).every(Boolean), checks, unsigned: record.unsigned !== false });
    if (!Object.values(checks).every(Boolean)) process.exitCode = 1;
    return;
  }

  if (command === 'check') {
    if (args.includes('--json')) await writeArtifact(assessment);
    else {
      for (const finding of assessment.findings) {
        const mark = finding.status === 'pass' ? 'PASS' : finding.status === 'not_applicable' ? 'N/A ' : finding.status === 'needs_review' ? 'REVIEW' : 'FAIL';
        console.log(`${mark.padEnd(6)} ${finding.ruleId} ${finding.title}`);
        if (finding.status === 'fail' || finding.status === 'needs_review') console.log(`       ${finding.message}`);
      }
      console.log(`\n${assessment.summary.blocking} blocking, ${assessment.summary.needs_review} manual review, ${assessment.summary.pass} pass, ${assessment.summary.not_applicable} not applicable`);
    }
    if (assessment.summary.blocking > 0 || (option('--fail-on') === 'review' && assessment.summary.needs_review > 0)) process.exitCode = 1;
    return;
  }

  if (!assessment.validManifest) throw new Error('Manifest is invalid; run check for details before generating artifacts.');
  if (command === 'transparency') return writeArtifact(makeTransparencyCard(bytes, assessment), option('--out'));
  if (command === 'assessment') return writeArtifact(makeAssessmentRecord(bytes, assessment), option('--out'));
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(`openConsent: ${error.message}`);
  process.exitCode = 2;
});
