const defaultNow = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
const clone = (value) => structuredClone(value);

export const DEFAULT_POLICY = Object.freeze({
  projectId: 'openconsent-demo', policyVersion: 'runtime-alpha.1', noticeVersion: 'demo-notice-1', manifestDigest: 'demo:8f6b1f3a',
  categories: [
    { id: 'required', label: { en: 'Required', zh: '必要' }, description: { en: 'Required to provide the service.', zh: '用于提供服务的必要处理。' }, required: true, order: 1 },
    { id: 'analytics', label: { en: 'Analytics', zh: '分析' }, description: { en: 'Optional product measurement.', zh: '可选的产品衡量。' }, required: false, order: 2 },
    { id: 'marketing', label: { en: 'Marketing', zh: '营销' }, description: { en: 'Optional advertising processing.', zh: '可选的广告处理。' }, required: false, order: 3 }
  ],
  purposes: [
    { id: 'support', activityId: 'ai-support', label: { en: 'Service support', zh: '服务支持' }, description: { en: 'Provides the requested service.', zh: '提供用户请求的服务。' }, legalBasis: 'contract', optional: false, categoryId: 'required' },
    { id: 'optional-analytics', activityId: 'product-analytics', label: { en: 'Product analytics', zh: '产品分析' }, description: { en: 'Measures optional product usage.', zh: '衡量可选的产品使用情况。' }, legalBasis: 'consent', optional: true, categoryId: 'analytics' },
    { id: 'personalized-ads', activityId: 'ad-personalization', label: { en: 'Personalized advertising', zh: '个性化广告' }, description: { en: 'Supports optional advertising personalization.', zh: '支持可选的广告个性化。' }, legalBasis: 'consent', optional: true, sale: true, sharing: true, categoryId: 'marketing' }
  ], vendors: [], services: [], trackers: []
});

function text(value, locale, fallback = '') {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return value[locale] || value.en || Object.values(value).find((entry) => typeof entry === 'string') || fallback;
  return fallback;
}

function hasText(value) {
  if (typeof value === 'string') return Boolean(value.trim());
  return Boolean(value && typeof value === 'object' && Object.values(value).some((entry) => typeof entry === 'string' && entry.trim()));
}

function assertText(value, field) {
  if (!hasText(value)) throw new TypeError(`${field} requires non-empty text`);
}

function assertString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field} requires a non-empty string`);
}

function assertId(item, kind, ids) {
  if (!item || typeof item.id !== 'string' || !item.id.trim()) throw new TypeError(`${kind} requires a non-empty id`);
  if (ids.has(item.id)) throw new TypeError(`${kind} ids must be unique: ${item.id}`);
  ids.add(item.id);
}

function assertHttpUrl(value, field) {
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
  } catch { throw new TypeError(`${field} must be an absolute HTTP(S) URL`); }
}

export function normalizeCatalog(policy, locale = 'en') {
  if (!policy || !Array.isArray(policy.purposes)) throw new TypeError('policy.purposes must be an array');
  if (policy.updatedAt && Number.isNaN(Date.parse(policy.updatedAt))) throw new TypeError('policy.updatedAt must be a date or ISO date-time string');
  if (policy.privacyPolicyUrl) assertHttpUrl(policy.privacyPolicyUrl, 'policy.privacyPolicyUrl');
  const purposeIds = new Set();
  for (const purpose of policy.purposes) assertId(purpose, 'purpose', purposeIds);
  const compatibilityCatalog = policy.catalog;
  const topLevelFields = ['categories', 'vendors', 'services', 'trackers'];
  const usesTopLevel = topLevelFields.some((field) => Object.prototype.hasOwnProperty.call(policy, field));
  if (usesTopLevel) {
    for (const field of topLevelFields) {
      if (!Array.isArray(policy[field])) throw new TypeError(`policy.${field} must be an array in the top-level catalog model`);
    }
  }
  const legacy = !usesTopLevel && !compatibilityCatalog;
  if (usesTopLevel) for (const purpose of policy.purposes) {
    assertString(purpose.categoryId, `purpose ${purpose.id} categoryId`);
    assertString(purpose.activityId, `purpose ${purpose.id} activityId`);
    assertText(purpose.label, `purpose ${purpose.id} label`);
    assertText(purpose.description, `purpose ${purpose.id} description`);
    assertString(purpose.legalBasis, `purpose ${purpose.id} legalBasis`);
    if (typeof purpose.optional !== 'boolean') throw new TypeError(`purpose ${purpose.id} requires optional as a boolean`);
  }
  const rawCategories = policy.categories ?? compatibilityCatalog?.categories ?? [...new Set(policy.purposes.map((purpose) => purpose.categoryId || purpose.id))].map((categoryId) => {
    const mapped = policy.purposes.filter((purpose) => (purpose.categoryId || purpose.id) === categoryId);
    return { id: categoryId, label: mapped[0]?.label || categoryId, description: mapped[0]?.description, purposeIds: mapped.map((purpose) => purpose.id), required: mapped.every((purpose) => !purpose.optional || purpose.legalBasis !== 'consent') };
  });
  if (!Array.isArray(rawCategories)) throw new TypeError('policy.categories must be an array');
  const categoryIds = new Set();
  const categories = rawCategories.map((category) => {
    assertId(category, 'category', categoryIds);
    if (usesTopLevel) {
      assertText(category.label, `category ${category.id} label`);
      assertText(category.description, `category ${category.id} description`);
      if (typeof category.required !== 'boolean') throw new TypeError(`category ${category.id} requires required as a boolean`);
    }
    const mapped = policy.purposes.filter((purpose) => purpose.categoryId === category.id).map((purpose) => purpose.id);
    const compatibilityMapped = category.purposeIds;
    const resolved = mapped.length ? mapped : compatibilityMapped;
    if (!Array.isArray(resolved) || resolved.length === 0) throw new TypeError(`category ${category.id} has no purposes; set Purpose.categoryId`);
    for (const purposeId of resolved) if (!purposeIds.has(purposeId)) throw new TypeError(`category ${category.id} references unknown purpose ${purposeId}`);
    const required = Boolean(category.required) || resolved.every((id) => {
      const purpose = policy.purposes.find((entry) => entry.id === id);
      return !purpose.optional || purpose.legalBasis !== 'consent';
    });
    return { id: category.id, label: text(category.label, locale, category.id), description: text(category.description, locale), purposeIds: [...new Set(resolved)], required, ...(Number.isFinite(category.order) ? { order: category.order } : {}) };
  }).sort((left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER));
  const categoryByPurpose = new Map();
  for (const category of categories) for (const purposeId of category.purposeIds) {
    if (categoryByPurpose.has(purposeId)) throw new TypeError(`purpose ${purposeId} belongs to multiple categories`);
    categoryByPurpose.set(purposeId, category.id);
  }
  for (const purpose of policy.purposes) {
    if (!categoryByPurpose.has(purpose.id)) throw new TypeError(`purpose ${purpose.id} requires a category`);
    if (purpose.categoryId && purpose.categoryId !== categoryByPurpose.get(purpose.id)) throw new TypeError(`purpose ${purpose.id} categoryId does not match its category`);
  }

  const vendorIds = new Set();
  const vendors = (policy.vendors ?? compatibilityCatalog?.vendors ?? []).map((vendor) => {
    assertId(vendor, 'vendor', vendorIds);
    if (usesTopLevel) {
      assertText(vendor.name, `vendor ${vendor.id} name`);
      assertString(vendor.privacyPolicyUrl, `vendor ${vendor.id} privacyPolicyUrl`);
    } else if (!text(vendor.name, locale)) throw new TypeError(`vendor ${vendor.id} requires a name`);
    if (vendor.privacyPolicyUrl) assertHttpUrl(vendor.privacyPolicyUrl, `vendor ${vendor.id} privacyPolicyUrl`);
    return { id: vendor.id, name: text(vendor.name, locale, vendor.id), description: text(vendor.description, locale), ...(vendor.privacyPolicyUrl ? { privacyPolicyUrl: vendor.privacyPolicyUrl } : {}) };
  });
  const serviceIds = new Set();
  const services = (policy.services ?? compatibilityCatalog?.services ?? []).map((service) => {
    assertId(service, 'service', serviceIds);
    if (usesTopLevel) {
      assertText(service.name, `service ${service.id} name`);
      assertString(service.vendorId, `service ${service.id} vendorId`);
    }
    if (service.vendorId && !vendorIds.has(service.vendorId)) throw new TypeError(`service ${service.id} references unknown vendor ${service.vendorId}`);
    const compatibilityCategory = service.categoryId ? categories.find((entry) => entry.id === service.categoryId) : null;
    if (service.categoryId && !compatibilityCategory) throw new TypeError(`service ${service.id} references unknown category ${service.categoryId}`);
    const mapped = service.purposeIds ?? compatibilityCategory?.purposeIds;
    if (!Array.isArray(mapped) || mapped.length === 0) throw new TypeError(`service ${service.id} requires purposeIds`);
    for (const purposeId of mapped) if (!purposeIds.has(purposeId)) throw new TypeError(`service ${service.id} references unknown purpose ${purposeId}`);
    const categoryIdsForService = [...new Set(mapped.map((purposeId) => categoryByPurpose.get(purposeId)))];
    return { id: service.id, name: text(service.name, locale, service.id), description: text(service.description, locale), ...(service.vendorId ? { vendorId: service.vendorId } : {}), purposeIds: [...new Set(mapped)], categoryIds: categoryIdsForService, ...(categoryIdsForService.length === 1 ? { categoryId: categoryIdsForService[0] } : {}), trackerIds: [] };
  });
  const trackerIds = new Set();
  const validTrackerKinds = new Set(['cookie', 'script', 'pixel', 'iframe', 'local-storage', 'session-storage', 'other']);
  const trackers = (policy.trackers ?? compatibilityCatalog?.trackers ?? []).map((tracker) => {
    assertId(tracker, 'tracker', trackerIds);
    if (usesTopLevel) {
      assertText(tracker.name, `tracker ${tracker.id} name`);
      assertString(tracker.kind, `tracker ${tracker.id} kind`);
      assertString(tracker.serviceId, `tracker ${tracker.id} serviceId`);
    }
    const service = services.find((entry) => entry.id === tracker.serviceId);
    if (!service) throw new TypeError(`tracker ${tracker.id} references unknown service ${tracker.serviceId}`);
    const kind = tracker.kind || tracker.type || 'other';
    if (!validTrackerKinds.has(kind)) throw new TypeError(`tracker ${tracker.id} has an invalid kind`);
    if (usesTopLevel && !Array.isArray(tracker.purposeIds)) throw new TypeError(`tracker ${tracker.id} requires purposeIds`);
    const mapped = tracker.purposeIds ?? service.purposeIds;
    if (!Array.isArray(mapped) || mapped.length === 0) throw new TypeError(`tracker ${tracker.id} requires purposeIds`);
    for (const purposeId of mapped) if (!service.purposeIds.includes(purposeId)) throw new TypeError(`tracker ${tracker.id} purpose ${purposeId} is outside service ${service.id}`);
    if (usesTopLevel && typeof tracker.firstParty !== 'boolean') throw new TypeError(`tracker ${tracker.id} requires firstParty`);
    return { id: tracker.id, name: text(tracker.name, locale, tracker.id), serviceId: tracker.serviceId, kind, purposeIds: [...new Set(mapped)], ...(tracker.domain ? { domain: tracker.domain } : {}), ...(tracker.duration ? { duration: tracker.duration } : {}), firstParty: Boolean(tracker.firstParty), description: text(tracker.description, locale) };
  });
  for (const service of services) service.trackerIds = trackers.filter((tracker) => tracker.serviceId === service.id).map((tracker) => tracker.id);
  return { projectId: policy.projectId, policyVersion: policy.policyVersion, noticeVersion: policy.noticeVersion, ...(policy.updatedAt ? { updatedAt: policy.updatedAt } : {}), ...(policy.privacyPolicyUrl ? { privacyPolicyUrl: policy.privacyPolicyUrl } : {}), ...(policy.contact ? { contact: text(policy.contact, locale) } : {}), categories, vendors, services, trackers, legacy };
}

export function validateCatalog(policy, locale) { return normalizeCatalog(policy, locale); }

export function getCategoryStates(policy, snapshot, catalog = normalizeCatalog(policy)) {
  return Object.fromEntries(catalog.categories.map((category) => {
    const optional = category.purposeIds.map((id) => policy.purposes.find((purpose) => purpose.id === id)).filter((purpose) => purpose?.optional && purpose.legalBasis === 'consent');
    if (category.required || optional.length === 0) return [category.id, 'required'];
    const states = optional.map((purpose) => snapshot.signals?.gpc && (purpose.sale || purpose.sharing) ? 'denied' : snapshot.choices?.[purpose.id] ?? 'unset');
    if (states.every((state) => state === 'granted')) return [category.id, 'granted'];
    if (states.every((state) => state === 'denied')) return [category.id, 'denied'];
    if (states.every((state) => state === 'unset')) return [category.id, 'unset'];
    return [category.id, 'mixed'];
  }));
}

export function evaluatePurpose(policy, snapshot, purposeId, options = {}) {
  const purpose = policy.purposes.find((item) => item.id === purposeId);
  const evaluatedAt = (options.now ?? defaultNow)();
  if (!purpose) return { outcome: 'requires_review', purposeId, reason: 'PURPOSE_UNKNOWN', ruleId: 'CORE-RUNTIME-001', policyVersion: policy.policyVersion, evaluatedAt };
  const gpc = options.gpc ?? snapshot.signals?.gpc ?? false;
  if (gpc && (purpose.sale || purpose.sharing)) return { outcome: 'deny', purposeId, reason: 'GPC_SALE_SHARE_OPT_OUT', ruleId: 'CCPA-RUNTIME-001', policyVersion: policy.policyVersion, receiptId: snapshot.receiptId, evaluatedAt };
  if (purpose.legalBasis !== 'consent') return { outcome: 'allow', purposeId, reason: `DECLARED_${purpose.legalBasis.toUpperCase().replaceAll('-', '_')}_BASIS`, ruleId: 'GDPR-RUNTIME-001', policyVersion: policy.policyVersion, evaluatedAt };
  if (snapshot.policyVersion !== policy.policyVersion) return { outcome: 'deny', purposeId, reason: 'POLICY_VERSION_STALE', ruleId: 'CORE-RUNTIME-002', policyVersion: policy.policyVersion, evaluatedAt };
  const choice = snapshot.choices?.[purposeId] ?? 'unset';
  return { outcome: choice === 'granted' ? 'allow' : 'deny', purposeId, reason: choice === 'granted' ? 'CONSENT_RECEIPT_MATCHED' : choice === 'denied' ? 'PREFERENCE_DENIED' : 'OPTIONAL_DEFAULT_DENY', ruleId: 'GDPR-RUNTIME-002', policyVersion: policy.policyVersion, receiptId: snapshot.receiptId, evaluatedAt };
}

export function createOpenConsent(options = {}) {
  const policy = options.policy ?? DEFAULT_POLICY;
  const catalog = normalizeCatalog(policy, options.locale || 'en');
  const now = options.now ?? defaultNow;
  const initialGpc = Boolean(options.gpc);
  const optionalPurposes = policy.purposes.filter((purpose) => purpose.optional && purpose.legalBasis === 'consent');
  const defaultChoices = Object.fromEntries(optionalPurposes.map((purpose) => [purpose.id, 'unset']));
  const supplied = options.initialChoices && typeof options.initialChoices === 'object' && !Array.isArray(options.initialChoices) ? options.initialChoices : {};
  let snapshot = { subjectRef: options.subjectRef ?? 'browser-demo', revision: 0, choices: Object.fromEntries(Object.keys(defaultChoices).map((id) => [id, ['granted','denied','unset'].includes(supplied[id]) ? supplied[id] : 'unset'])), signals: { gpc: initialGpc }, policyVersion: policy.policyVersion, updatedAt: now(), receiptId: null };
  const events = []; const listeners = new Set();
  const withCategories = () => ({ ...snapshot, categoryStates: getCategoryStates(policy, snapshot, catalog) });
  const publish = () => listeners.forEach((listener) => listener(clone(withCategories())));
  const record = (type, detail = {}) => events.unshift({ eventId: makeId('evt'), type, at: now(), ...detail });
  const mutate = (action, choices, source = 'preference-center') => {
    const previousReceiptId = snapshot.receiptId;
    snapshot = { ...snapshot, revision: snapshot.revision + 1, choices: { ...snapshot.choices, ...choices }, updatedAt: now(), receiptId: makeId('rcpt') };
    const receipt = { receiptId: snapshot.receiptId, previousReceiptId, projectId: policy.projectId, policyVersion: policy.policyVersion, manifestDigest: policy.manifestDigest, noticeVersion: policy.noticeVersion, revision: snapshot.revision, choices: { ...snapshot.choices }, signalsObserved: { ...snapshot.signals }, action, source, issuedAt: snapshot.updatedAt, unsigned: true, storage: 'browser-memory-only' };
    record(action === 'withdraw' ? 'preference_withdrawn' : 'preference_saved', { receiptId: receipt.receiptId, choices: receipt.choices }); publish(); return receipt;
  };
  const validateChoices = (choices) => {
    if (!choices || typeof choices !== 'object' || Array.isArray(choices) || Object.keys(choices).length === 0) throw new TypeError('choices must include at least one optional consent purpose');
    const ids = new Set(optionalPurposes.map((purpose) => purpose.id));
    for (const [id, choice] of Object.entries(choices)) { if (!ids.has(id)) throw new TypeError('choices require known optional consent purposes'); if (!['granted','denied'].includes(choice)) throw new TypeError('choice must be granted or denied'); }
    return choices;
  };
  const categoryChoices = (categories) => {
    if (!categories || typeof categories !== 'object' || Array.isArray(categories) || Object.keys(categories).length === 0) throw new TypeError('category choices must be a non-empty object');
    const result = {};
    for (const [categoryId, choice] of Object.entries(categories)) {
      if (!['granted','denied'].includes(choice)) throw new TypeError('category choice must be granted or denied');
      const category = catalog.categories.find((entry) => entry.id === categoryId);
      if (!category || category.required) throw new TypeError('category choices require known optional categories');
      for (const purposeId of category.purposeIds) {
        const purpose = optionalPurposes.find((entry) => entry.id === purposeId);
        if (purpose) result[purposeId] = snapshot.signals.gpc && (purpose.sale || purpose.sharing) ? 'denied' : choice;
      }
    }
    return validateChoices(result);
  };
  const api = {
    policy, getCatalog: () => clone(catalog), getSnapshot: () => clone(withCategories()), getEvents: () => clone(events), subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    setChoice(id, choice, source) { const purpose = optionalPurposes.find((entry) => entry.id === id); if (!purpose || !['granted','denied'].includes(choice)) throw new TypeError('setChoice requires a known optional consent purpose and saved choice'); return mutate(choice === 'granted' ? 'save' : snapshot.choices[id] === 'granted' ? 'withdraw' : 'deny', { [id]: choice }, source); },
    savePreferences(choices, source) { const valid = validateChoices(choices); return mutate(Object.entries(valid).some(([id,value]) => value === 'denied' && snapshot.choices[id] === 'granted') ? 'withdraw' : 'save', valid, source); },
    setCategory(id, choice, source) { const choices = categoryChoices({ [id]: choice }); return mutate(choice === 'denied' && Object.keys(choices).some((purposeId) => snapshot.choices[purposeId] === 'granted') ? 'withdraw' : 'save', choices, source); },
    saveCategoryPreferences(choices, source) { const mapped = categoryChoices(choices); return mutate(Object.entries(mapped).some(([id,value]) => value === 'denied' && snapshot.choices[id] === 'granted') ? 'withdraw' : 'save', mapped, source); },
    acceptAll(source) { return mutate('accept_all', Object.fromEntries(optionalPurposes.map((purpose) => [purpose.id, snapshot.signals.gpc && (purpose.sale || purpose.sharing) ? 'denied' : 'granted'])), source); },
    rejectOptional(source) { return mutate('reject_optional', Object.fromEntries(optionalPurposes.map((purpose) => [purpose.id, 'denied'])), source); },
    setGpc(enabled, source = 'sec-gpc') { snapshot = { ...snapshot, signals: { ...snapshot.signals, gpc: Boolean(enabled) }, updatedAt: now() }; record('gpc_observed', { enabled: Boolean(enabled), source }); publish(); },
    evaluate(id, evalOptions) { const decision = evaluatePurpose(policy, snapshot, id, { now, ...evalOptions }); record('decision_evaluated', { purposeId: id, outcome: decision.outcome, reason: decision.reason }); return decision; },
    reset() { snapshot = { ...snapshot, revision: 0, choices: { ...defaultChoices }, signals: { gpc: initialGpc }, updatedAt: now(), receiptId: null }; events.length = 0; publish(); }
  };
  record('runtime_initialized', { policyVersion: policy.policyVersion }); return api;
}
