import { createHash } from 'node:crypto';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const pickNotice = (notice) => notice ? ({ url: notice.url, version: notice.version, reviewedAt: notice.reviewedAt }) : null;
const pickChannel = (channel) => channel ? ({
  url: channel.url ?? null,
  methods: channel.methods.map(({ type, value }) => ({ type, value }))
}) : null;
const assessmentIdentity = (assessment) => hash(JSON.stringify({ engine: assessment.engine, packs: assessment.packs, findings: assessment.findings }));

export function makeTransparencyCard(manifestBytes, assessment) {
  const manifestDigest = hash(manifestBytes);
  if (assessment.subjectDigest !== manifestDigest) throw new Error('Assessment and manifest bytes do not match.');
  if (!assessment.validManifest) throw new Error('Cannot publish a transparency card for an invalid manifest.');
  const manifest = JSON.parse(Buffer.from(manifestBytes).toString('utf8'));
  return {
    specification: 'openconsent-transparency/0.1.0',
    generatedAt: new Date().toISOString(),
    project: {
      id: manifest.project.id,
      name: manifest.project.name,
      version: manifest.project.version,
      owner: manifest.project.owner.name,
      publicUrl: manifest.project.publicUrl ?? null,
      privacyContact: { email: manifest.project.privacyContact.email ?? null, url: manifest.project.privacyContact.url ?? null },
      privacyNotice: pickNotice(manifest.notices?.privacy),
      collectionNotice: pickNotice(manifest.notices?.collection)
    },
    selectedRulePacks: assessment.packs,
    applicability: Object.fromEntries(Object.entries(manifest.applicability).map(([id, item]) => [id, {
      status: item.status, role: item.role, rationale: item.rationale, reviewer: item.reviewer, decidedAt: item.decidedAt
    }])),
    personalData: { processed: manifest.personalData.processed, rationale: manifest.personalData.rationale, reviewer: manifest.personalData.reviewer, decidedAt: manifest.personalData.decidedAt },
    creation: { origin: manifest.creation.origin, tools: (manifest.creation.tools ?? []).map(({ name, usage }) => ({ name, usage })) },
    runtimeAI: {
      enabled: manifest.runtime.aiEnabled,
      components: manifest.runtime.aiComponents.map(({ id, kind, purpose, provider }) => ({ id, kind, purpose, provider }))
    },
    activities: manifest.activities.map((activity) => ({
      id: activity.id,
      name: activity.name,
      purpose: activity.purpose,
      dataCategories: activity.dataCategories,
      legalBasis: activity.legalBasis,
      retention: { period: activity.retention.period, rationale: activity.retention.rationale },
      recipientCategories: activity.recipients,
      sale: activity.sale ?? null,
      sharing: activity.sharing ?? null,
      sensitiveData: activity.sensitiveData,
      automatedDecisionSignificant: activity.automatedDecision.significant,
      controls: {
        withdrawal: activity.consent?.withdrawal ? { method: activity.consent.withdrawal.method, value: activity.consent.withdrawal.value } : null,
        optOut: activity.optOut ? { method: activity.optOut.method, value: activity.optOut.value ?? null } : null,
        limitUseUrl: activity.limitUseUrl ?? null
      }
    })),
    rights: { gdpr: pickChannel(manifest.rights?.gdpr), ccpa: pickChannel(manifest.rights?.ccpa) },
    gpc: { honored: manifest.gpc?.honored ?? false, statusUrl: manifest.gpc?.statusUrl ?? null },
    assessment: {
      identity: { algorithm: 'sha256', manifestDigest, assessmentDigest: assessmentIdentity(assessment) },
      summary: assessment.summary,
      unresolved: assessment.findings
        .filter((finding) => ['fail', 'needs_review'].includes(finding.status))
        .map(({ ruleId, status, title, message }) => ({ ruleId, status, title, message }))
    },
    limitations: [
      'The project facts are self-declared unless a higher evidence level is shown.',
      'This artifact is not a legal opinion, certification, or guarantee of compliance.',
      'Protected evidence and identifiable user records are intentionally excluded.'
    ]
  };
}

export function makeAssessmentRecord(manifestBytes, assessment, toolVersion = '0.1.0') {
  const manifestDigest = hash(manifestBytes);
  if (assessment.subjectDigest !== manifestDigest) throw new Error('Assessment and manifest bytes do not match.');
  return {
    specification: 'openconsent-assessment/0.1.0',
    generatedAt: new Date().toISOString(),
    tool: { name: 'openConsent', version: toolVersion },
    unsigned: true,
    evidenceLevel: 'declared',
    subject: {
      algorithm: 'sha256',
      manifestDigest
    },
    engine: assessment.engine,
    policyPacks: assessment.packs,
    findingsDigest: hash(JSON.stringify(assessment.findings)),
    assessmentDigest: assessmentIdentity(assessment),
    result: assessment.summary,
    claim: 'This record identifies the manifest bytes and rule-pack versions assessed. It does not prove that manifest declarations are true or that the project is legally compliant.'
  };
}
