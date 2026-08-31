import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const schemaBytes = await readFile(path.join(root, 'schema/openconsent.schema.json'));
const validator = new Ajv2020({ allErrors: true, strict: false, validateFormats: true });
addFormats(validator);
const validate = validator.compile(JSON.parse(schemaBytes));
const engineIdentity = {
  schemaDigest: digest(schemaBytes),
  engineDigest: digest(await readFile(fileURLToPath(import.meta.url))),
  dependenciesDigest: digest(await readFile(path.join(root, 'pnpm-lock.yaml')))
};
const present = (value) => typeof value === 'string' && value.trim().length > 0;
const soldOrShared = (activity) => activity.sale === true || activity.sharing === true;

function outcome(control, status, details = {}) {
  return {
    ruleId: control.id, check: control.check, title: control.title, status,
    severity: details.severity ?? control.severity,
    path: details.path ?? '$',
    message: details.message ?? (status === 'pass' ? 'Required declarations are present; legal sufficiency and operating effectiveness are not verified.' : ''),
    fix: details.fix ?? null,
    evidenceLevel: 'declared',
    passScope: status === 'pass' ? 'manifest-presence-only' : null
  };
}

function shapeFindings(manifest) {
  const errors = [];
  if (!validate(manifest)) {
    for (const error of validate.errors) errors.push({ path: error.instancePath || '/', message: `${error.message}${error.params.missingProperty ? `: ${error.params.missingProperty}` : ''}` });
  } else {
    const ids = manifest.activities.map((activity) => activity.id);
    if (new Set(ids).size !== ids.length) errors.push({ path: '/activities', message: 'Activity IDs must be unique.' });
    for (const component of manifest.runtime.aiComponents) {
      if (component.activityIds.some((id) => !ids.includes(id))) errors.push({ path: '/runtime/aiComponents', message: 'Every AI component activityId must reference a declared processing activity.' });
    }
  }
  return errors.map((error) => ({
    ruleId: 'MANIFEST-001', check: 'manifest.schema', title: 'Manifest schema', status: 'fail', severity: 'error',
    path: error.path, message: error.message, fix: 'Match schema/openconsent.schema.json.', evidenceLevel: 'declared', passScope: null
  }));
}

const checks = {
  'core.applicability': (m, c) => {
    const unresolved = m.jurisdictions.filter((id) => !m.applicability[id] || m.applicability[id].status === 'needs-review' || m.applicability[id].role === 'needs-review');
    const unsupported = m.jurisdictions.filter((id) => (id === 'gdpr' && m.applicability[id]?.role !== 'controller') || (id === 'ccpa' && m.applicability[id]?.role !== 'business'));
    if (unresolved.length) return outcome(c, 'needs_review', { path: '$.applicability', message: `Applicability or role needs review: ${unresolved.join(', ')}.`, fix: 'Record the role, territorial/threshold facts, exceptions, reviewer, rationale and decision date.' });
    if (unsupported.length) return outcome(c, 'needs_review', { path: '$.applicability', message: `v0.1 does not assess the declared role for: ${unsupported.join(', ')}. Controller/business controls will remain under review.`, fix: 'Use a future role-specific profile and qualified review.' });
    const contradiction = m.jurisdictions.filter((id) => m.applicability[id].status === 'out-of-scope');
    if (contradiction.length) return outcome(c, 'fail', { path: '$.jurisdictions', message: `Selected packs are declared out of scope: ${contradiction.join(', ')}.`, fix: 'Remove these selected packs or correct the reviewed scope.' });
    return outcome(c, 'pass');
  },
  'core.personal-data-scope': (m, c) => {
    if (m.personalData.processed === true) return outcome(c, 'pass');
    return outcome(c, 'needs_review', {
      path: '$.personalData',
      message: m.personalData.processed === false
        ? 'The claimed absence of personal-data processing needs independent review, including hosting, CDN, update, telemetry and support paths.'
        : 'Whether personal data is processed is unresolved.',
      fix: 'Keep strict release gating enabled until reviewer/evidence fields are implemented.'
    });
  },
  'core.identity': (m, c) => outcome(c, 'pass', { path: '$.project', message: 'The openConsent public identity/contact baseline is declared; this is a product transparency requirement.' }),
  'core.privacy-notice': (m, c) => {
    if (!m.notices?.privacy) return outcome(c, 'fail', { path: '$.notices.privacy', message: 'This Web-project baseline requires a public privacy notice declaration.', fix: 'Declare a versioned notice. Non-Web notice delivery is a future profile.' });
    return outcome(c, 'pass');
  },
  'core.activities': (m, c) => {
    if (m.personalData.processed === 'needs-review') return outcome(c, 'needs_review', { path: '$.personalData', message: 'Whether personal data is processed is unresolved, including hosting/CDN and support services.' });
    const missing = [];
    const reviews = [];
    for (const a of m.activities) {
      if (m.jurisdictions.includes('gdpr') && !present(a.legalBasis)) missing.push(`${a.id}: GDPR legal basis`);
      if (m.jurisdictions.includes('gdpr') && ['needs-review', 'not-applicable'].includes(a.legalBasis)) reviews.push(`${a.id}: GDPR legal basis`);
      if (m.jurisdictions.includes('ccpa') && (typeof a.sale !== 'boolean' || typeof a.sharing !== 'boolean')) missing.push(`${a.id}: separate sale and sharing declarations`);
    }
    if (missing.length) return outcome(c, 'fail', { path: '$.activities', message: `Missing profile-specific declarations: ${missing.join('; ')}.`, fix: 'Declare facts for the selected profiles; do not guess unknown legal conclusions.' });
    if (reviews.length) return outcome(c, 'needs_review', { path: '$.activities', message: `Unresolved declarations: ${reviews.join('; ')}.` });
    return outcome(c, 'pass');
  },
  'core.risk-review': (m, c) => {
    const risky = m.activities.filter((a) => a.sensitiveData || a.automatedDecision.significant);
    return outcome(c, risky.length ? 'needs_review' : 'pass', { path: '$.activities', message: risky.length ? `Special-category/criminal/sensitive-data or automated-decision conditions need qualified review: ${risky.map((a) => a.id).join(', ')}.` : undefined });
  },
  'gdpr.rights': (m, c) => {
    const okay = (m.rights?.gdpr?.methods?.length ?? 0) > 0;
    return outcome(c, okay ? 'pass' : 'fail', { path: '$.rights.gdpr', message: okay ? undefined : 'No GDPR rights contact/request method is declared.', fix: okay ? null : 'Declare an accessible request method; a dedicated URL is not mandatory.' });
  },
  'gdpr.withdrawal': (m, c) => {
    const consent = m.activities.filter((a) => a.legalBasis === 'consent');
    const missing = consent.filter((a) => !a.consent?.withdrawal);
    if (missing.length) return outcome(c, 'fail', { path: '$.activities[*].consent', message: `No withdrawal mechanism is declared for: ${missing.map((a) => a.id).join(', ')}.`, fix: 'Declare an in-product, email, webform, API or other withdrawal route.' });
    if (consent.length) return outcome(c, 'needs_review', { path: '$.activities[*].consent', message: 'Withdrawal routes are declared. Equal ease, valid consent and downstream stopping require operational evidence.' });
    return outcome(c, 'not_applicable', { message: 'No consent-based processing is declared.' });
  },
  'gdpr.transfers': (m, c) => {
    const unknown = m.activities.filter((a) => !Array.isArray(a.transfers));
    if (unknown.length) return outcome(c, 'needs_review', { path: '$.activities[*].transfers', message: `Transfer inventory is missing for: ${unknown.map((a) => a.id).join(', ')}.` });
    const transfers = m.activities.flatMap((a) => a.transfers.filter((t) => t.outsideEea));
    if (transfers.some((t) => t.safeguard === 'none')) return outcome(c, 'fail', { path: '$.activities[*].transfers', message: 'An outside-EEA transfer is explicitly declared without a mechanism.', fix: 'Stop or review the transfer and document the applicable mechanism/exception.' });
    if (transfers.length) return outcome(c, 'needs_review', { path: '$.activities[*].transfers', message: 'A declared transfer mechanism is not proof of valid implementation. Review scope, SCC/BCR/adequacy conditions, assessments and safeguards.' });
    return outcome(c, 'not_applicable', { message: 'The manifest declares no outside-EEA transfers.' });
  },
  'gdpr.legitimate-interests': (m, c) => {
    const affected = m.activities.filter((a) => a.legalBasis === 'legitimate-interests');
    if (!affected.length) return outcome(c, 'not_applicable', { message: 'No legitimate-interest basis is declared.' });
    return outcome(c, 'needs_review', { path: '$.activities', message: 'Review purpose, necessity, balancing and safeguards; an assessment reference alone does not establish lawfulness.' });
  },
  'gdpr.automated-decisions': (m, c) => {
    const affected = m.activities.filter((a) => a.automatedDecision.significant);
    return outcome(c, affected.length ? 'needs_review' : 'not_applicable', { path: '$.activities[*].automatedDecision', message: affected.length ? 'Assess solely automated decisions, legal/similarly significant effect, Article 22 exceptions, information and contest/intervention safeguards. A public URL or human-review boolean alone is not decisive.' : 'No significant automated decision is declared.' });
  },
  'ccpa.notice-at-collection': (m, c) => outcome(c, m.notices?.collection ? 'pass' : 'fail', { path: '$.notices.collection', message: m.notices?.collection ? undefined : 'No notice-at-collection declaration exists for this Web-project profile.', fix: m.notices?.collection ? null : 'Declare the notice and review its delivery at or before collection.' }),
  'ccpa.rights': (m, c) => {
    if (!m.rights?.ccpa?.methods?.length) return outcome(c, 'fail', { path: '$.rights.ccpa', message: 'No California rights-request method is declared.' });
    return outcome(c, 'needs_review', { path: '$.rights.ccpa.methods', message: 'Review method type, toll-free/website requirements and online-only exceptions. Counting two methods is not a legal sufficiency test.' });
  },
  'ccpa.sale-share-gpc': (m, c) => {
    const affected = m.activities.filter(soldOrShared);
    if (!affected.length) return outcome(c, 'not_applicable', { message: 'Neither sale nor cross-context behavioural-advertising sharing is declared.' });
    if (m.gpc?.honored !== true) return outcome(c, 'fail', { path: '$.gpc', message: 'Sale/sharing is declared without honoured opt-out preference signals.', fix: 'Implement GPC handling and downstream opt-out enforcement.' });
    if (affected.some((a) => !a.optOut)) return outcome(c, 'fail', { path: '$.activities[*].optOut', message: 'Sale/sharing has no declared link or frictionless-signal mechanism.', fix: 'Declare the mechanism; a frictionless-signal exception requires qualified review.' });
    return outcome(c, 'needs_review', { path: '$.activities[*].optOut', message: 'Review link or frictionless-signal conditions, device/account scope, status display, downstream enforcement, and test evidence.' });
  },
  'ccpa.sensitive-limit': (m, c) => {
    const sensitive = m.activities.filter((a) => a.sensitiveData);
    if (sensitive.some((a) => a.sensitiveUseOutsidePermittedPurposes === true && !a.limitUseUrl)) return outcome(c, 'fail', { path: '$.activities', message: 'Sensitive use outside permitted purposes is declared without a limit-use mechanism.' });
    return outcome(c, sensitive.length ? 'needs_review' : 'not_applicable', { message: sensitive.length ? 'Review sensitive categories, inference/use purpose, permitted-purpose exception, and limit-use mechanism.' : 'No sensitive personal information is declared.' });
  },
  'ccpa.minors': (m, c) => {
    const affected = m.activities.filter(soldOrShared);
    if (!affected.length) return outcome(c, 'not_applicable', { message: 'No sale or sharing is declared.' });
    if (affected.some((a) => a.knownMinorsUnder16 !== false)) return outcome(c, 'needs_review', { path: '$.activities', message: 'Review actual knowledge/age facts and, when required, under-13 parental or age-13–15 consumer affirmative authorisation. A design-review boolean is not authorisation.' });
    return outcome(c, 'pass');
  }
};

export async function loadPolicyPacks(jurisdictions = []) {
  return Promise.all(['core', ...jurisdictions].map(async (id) => {
    if (!['core', 'gdpr', 'ccpa'].includes(id)) throw new Error(`Unsupported pack: ${id}`);
    const bytes = await readFile(path.join(root, 'rules', `${id}.json`));
    return { ...JSON.parse(bytes), digest: digest(bytes) };
  }));
}

export async function assess(manifest, manifestBytes = Buffer.from(JSON.stringify(manifest))) {
  const findings = shapeFindings(manifest);
  const subjectDigest = digest(manifestBytes);
  if (findings.length) return { validManifest: false, subjectDigest, engine: engineIdentity, packs: [], findings, summary: summarise(findings) };
  const packs = await loadPolicyPacks(manifest.jurisdictions);
  for (const pack of packs) {
    for (const control of pack.controls) {
      if (!checks[control.check]) throw new Error(`Unknown check implementation: ${control.check}`);
      const unsupportedRole = (pack.id === 'gdpr' && manifest.applicability.gdpr?.role !== 'controller') || (pack.id === 'ccpa' && manifest.applicability.ccpa?.role !== 'business');
      const noData = manifest.personalData.processed === false && !['core.applicability', 'core.personal-data-scope', 'core.identity'].includes(control.check);
      findings.push(unsupportedRole
        ? outcome(control, 'needs_review', { message: `The ${pack.id} v0.1 checks target controller/business duties and do not assess role ${manifest.applicability[pack.id].role}.` })
        : noData
          ? outcome(control, 'not_applicable', { message: 'The manifest declares no personal-data processing. CORE-00A keeps that claim under independent review.' })
          : checks[control.check](manifest, control));
    }
  }
  findings.sort((a, b) => a.ruleId.localeCompare(b.ruleId));
  return {
    validManifest: true, subjectDigest, engine: engineIdentity,
    packs: packs.map(({ id, version, sourceVerifiedAt, status, legalReviewStatus, digest }) => ({ id, version, sourceVerifiedAt, status, legalReviewStatus, digest })),
    findings, summary: summarise(findings)
  };
}

export function summarise(findings) {
  const summary = { pass: 0, fail: 0, needs_review: 0, not_applicable: 0, blocking: 0 };
  for (const finding of findings) {
    summary[finding.status] += 1;
    if (finding.status === 'fail' && finding.severity === 'error') summary.blocking += 1;
  }
  return summary;
}
