const defaultNow = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

export const DEFAULT_POLICY = Object.freeze({
  projectId: 'openconsent-demo',
  policyVersion: 'runtime-alpha.1',
  noticeVersion: 'demo-notice-1',
  manifestDigest: 'demo:8f6b1f3a',
  purposes: [
    { id: 'support', activityId: 'ai-support', legalBasis: 'contract', optional: false },
    { id: 'optional-analytics', activityId: 'product-analytics', legalBasis: 'consent', optional: true },
    { id: 'personalized-ads', activityId: 'ad-personalization', legalBasis: 'consent', optional: true, sale: true, sharing: true }
  ]
});

export function evaluatePurpose(policy, snapshot, purposeId, options = {}) {
  const purpose = policy.purposes.find((item) => item.id === purposeId);
  const evaluatedAt = (options.now ?? defaultNow)();
  if (!purpose) return { outcome: 'requires_review', purposeId, reason: 'PURPOSE_UNKNOWN', ruleId: 'CORE-RUNTIME-001', policyVersion: policy.policyVersion, evaluatedAt };
  const gpc = options.gpc ?? snapshot.signals?.gpc ?? false;
  if (gpc && (purpose.sale || purpose.sharing)) {
    return { outcome: 'deny', purposeId, reason: 'GPC_SALE_SHARE_OPT_OUT', ruleId: 'CCPA-RUNTIME-001', policyVersion: policy.policyVersion, receiptId: snapshot.receiptId, evaluatedAt };
  }
  if (purpose.legalBasis !== 'consent') {
    return { outcome: 'allow', purposeId, reason: `DECLARED_${purpose.legalBasis.toUpperCase().replaceAll('-', '_')}_BASIS`, ruleId: 'GDPR-RUNTIME-001', policyVersion: policy.policyVersion, evaluatedAt };
  }
  if (snapshot.policyVersion !== policy.policyVersion) {
    return { outcome: 'deny', purposeId, reason: 'POLICY_VERSION_STALE', ruleId: 'CORE-RUNTIME-002', policyVersion: policy.policyVersion, evaluatedAt };
  }
  const choice = snapshot.choices?.[purposeId] ?? 'unset';
  return {
    outcome: choice === 'granted' ? 'allow' : 'deny',
    purposeId,
    reason: choice === 'granted' ? 'CONSENT_RECEIPT_MATCHED' : choice === 'denied' ? 'PREFERENCE_DENIED' : 'OPTIONAL_DEFAULT_DENY',
    ruleId: 'GDPR-RUNTIME-002',
    policyVersion: policy.policyVersion,
    receiptId: snapshot.receiptId,
    evaluatedAt
  };
}

export function createOpenConsent(options = {}) {
  const policy = options.policy ?? DEFAULT_POLICY;
  const now = options.now ?? defaultNow;
  const initialGpc = Boolean(options.gpc);
  const optionalPurposes = policy.purposes.filter((purpose) => purpose.optional && purpose.legalBasis === 'consent');
  const defaultChoices = Object.fromEntries(optionalPurposes.map((purpose) => [purpose.id, 'unset']));
  const suppliedChoices = options.initialChoices && typeof options.initialChoices === 'object' && !Array.isArray(options.initialChoices)
    ? options.initialChoices
    : {};
  const initialChoices = Object.fromEntries(Object.entries(defaultChoices).map(([purposeId, fallback]) => {
    const choice = suppliedChoices[purposeId];
    return [purposeId, ['granted', 'denied', 'unset'].includes(choice) ? choice : fallback];
  }));
  let snapshot = {
    subjectRef: options.subjectRef ?? 'browser-demo',
    revision: 0,
    choices: initialChoices,
    signals: { gpc: initialGpc },
    policyVersion: policy.policyVersion,
    updatedAt: now(),
    receiptId: null
  };
  const events = [];
  const listeners = new Set();
  const publish = () => listeners.forEach((listener) => listener(api.getSnapshot()));
  const record = (type, detail = {}) => events.unshift({ eventId: makeId('evt'), type, at: now(), ...detail });
  const mutate = (action, choices, source = 'preference-center') => {
    const previousReceiptId = snapshot.receiptId;
    snapshot = {
      ...snapshot,
      revision: snapshot.revision + 1,
      choices: { ...snapshot.choices, ...choices },
      updatedAt: now(),
      receiptId: makeId('rcpt')
    };
    const receipt = {
      receiptId: snapshot.receiptId,
      previousReceiptId,
      projectId: policy.projectId,
      policyVersion: policy.policyVersion,
      manifestDigest: policy.manifestDigest,
      noticeVersion: policy.noticeVersion,
      revision: snapshot.revision,
      choices: { ...snapshot.choices },
      signalsObserved: { ...snapshot.signals },
      action,
      source,
      issuedAt: snapshot.updatedAt,
      unsigned: true,
      storage: 'browser-memory-only'
    };
    record(action === 'withdraw' ? 'preference_withdrawn' : 'preference_saved', { receiptId: receipt.receiptId, choices: receipt.choices });
    publish();
    return receipt;
  };
  const validateChoices = (choices) => {
    if (!choices || typeof choices !== 'object' || Array.isArray(choices)) throw new TypeError('choices must be an object');
    if (Object.keys(choices).length === 0) throw new TypeError('choices must include at least one optional consent purpose');
    const optionalPurposeIds = new Set(optionalPurposes.map((purpose) => purpose.id));
    for (const [purposeId, choice] of Object.entries(choices)) {
      if (!optionalPurposeIds.has(purposeId)) throw new TypeError('choices require known optional consent purposes');
      if (!['granted', 'denied'].includes(choice)) throw new TypeError('choice must be granted or denied');
    }
    return choices;
  };
  const api = {
    policy,
    getSnapshot: () => structuredClone(snapshot),
    getEvents: () => structuredClone(events),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    setChoice(purposeId, choice, source) {
      if (!['granted', 'denied'].includes(choice)) throw new TypeError('choice must be granted or denied');
      const purpose = policy.purposes.find((item) => item.id === purposeId);
      if (!purpose || !purpose.optional || purpose.legalBasis !== 'consent') throw new TypeError('setChoice requires a known optional consent purpose');
      const wasGranted = snapshot.choices?.[purposeId] === 'granted';
      return mutate(choice === 'granted' ? 'save' : wasGranted ? 'withdraw' : 'deny', { [purposeId]: choice }, source);
    },
    savePreferences(choices, source) {
      const validated = validateChoices(choices);
      const withdrew = Object.entries(validated).some(([purposeId, choice]) => choice === 'denied' && snapshot.choices[purposeId] === 'granted');
      return mutate(withdrew ? 'withdraw' : 'save', validated, source);
    },
    acceptAll(source) {
      return mutate('accept_all', Object.fromEntries(optionalPurposes.map((purpose) => [purpose.id, 'granted'])), source);
    },
    rejectOptional(source) {
      const choices = Object.fromEntries(optionalPurposes.map((purpose) => [purpose.id, 'denied']));
      return mutate('reject_optional', choices, source);
    },
    setGpc(enabled, source = 'sec-gpc') {
      snapshot = { ...snapshot, signals: { ...snapshot.signals, gpc: Boolean(enabled) }, updatedAt: now() };
      record('gpc_observed', { enabled: Boolean(enabled), source });
      publish();
    },
    evaluate(purposeId, evalOptions) {
      const decision = evaluatePurpose(policy, snapshot, purposeId, { now, ...evalOptions });
      record('decision_evaluated', { purposeId, outcome: decision.outcome, reason: decision.reason });
      return decision;
    },
    reset() {
      snapshot = { ...snapshot, revision: 0, choices: { ...defaultChoices }, signals: { gpc: initialGpc }, updatedAt: now(), receiptId: null };
      events.length = 0;
      publish();
    }
  };
  record('runtime_initialized', { policyVersion: policy.policyVersion });
  return api;
}
