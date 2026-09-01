// ../core/src/index.js
var defaultNow = () => (/* @__PURE__ */ new Date()).toISOString();
var makeId = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
var clone = (value) => structuredClone(value);
var DEFAULT_POLICY = Object.freeze({
  projectId: "openconsent-demo",
  policyVersion: "runtime-alpha.1",
  noticeVersion: "demo-notice-1",
  manifestDigest: "demo:8f6b1f3a",
  categories: [
    { id: "required", label: { en: "Required", zh: "\u5FC5\u8981" }, description: { en: "Required to provide the service.", zh: "\u7528\u4E8E\u63D0\u4F9B\u670D\u52A1\u7684\u5FC5\u8981\u5904\u7406\u3002" }, required: true, order: 1 },
    { id: "analytics", label: { en: "Analytics", zh: "\u5206\u6790" }, description: { en: "Optional product measurement.", zh: "\u53EF\u9009\u7684\u4EA7\u54C1\u8861\u91CF\u3002" }, required: false, order: 2 },
    { id: "marketing", label: { en: "Marketing", zh: "\u8425\u9500" }, description: { en: "Optional advertising processing.", zh: "\u53EF\u9009\u7684\u5E7F\u544A\u5904\u7406\u3002" }, required: false, order: 3 }
  ],
  purposes: [
    { id: "support", activityId: "ai-support", label: { en: "Service support", zh: "\u670D\u52A1\u652F\u6301" }, description: { en: "Provides the requested service.", zh: "\u63D0\u4F9B\u7528\u6237\u8BF7\u6C42\u7684\u670D\u52A1\u3002" }, legalBasis: "contract", optional: false, categoryId: "required" },
    { id: "optional-analytics", activityId: "product-analytics", label: { en: "Product analytics", zh: "\u4EA7\u54C1\u5206\u6790" }, description: { en: "Measures optional product usage.", zh: "\u8861\u91CF\u53EF\u9009\u7684\u4EA7\u54C1\u4F7F\u7528\u60C5\u51B5\u3002" }, legalBasis: "consent", optional: true, categoryId: "analytics" },
    { id: "personalized-ads", activityId: "ad-personalization", label: { en: "Personalized advertising", zh: "\u4E2A\u6027\u5316\u5E7F\u544A" }, description: { en: "Supports optional advertising personalization.", zh: "\u652F\u6301\u53EF\u9009\u7684\u5E7F\u544A\u4E2A\u6027\u5316\u3002" }, legalBasis: "consent", optional: true, sale: true, sharing: true, categoryId: "marketing" }
  ],
  vendors: [],
  services: [],
  trackers: []
});
function text(value, locale, fallback = "") {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return value[locale] || value.en || Object.values(value).find((entry) => typeof entry === "string") || fallback;
  return fallback;
}
function hasText(value) {
  if (typeof value === "string") return Boolean(value.trim());
  return Boolean(value && typeof value === "object" && Object.values(value).some((entry) => typeof entry === "string" && entry.trim()));
}
function assertText(value, field) {
  if (!hasText(value)) throw new TypeError(`${field} requires non-empty text`);
}
function assertString(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} requires a non-empty string`);
}
function assertId(item, kind, ids) {
  if (!item || typeof item.id !== "string" || !item.id.trim()) throw new TypeError(`${kind} requires a non-empty id`);
  if (ids.has(item.id)) throw new TypeError(`${kind} ids must be unique: ${item.id}`);
  ids.add(item.id);
}
function assertHttpUrl(value, field) {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("unsupported protocol");
  } catch {
    throw new TypeError(`${field} must be an absolute HTTP(S) URL`);
  }
}
function normalizeCatalog(policy, locale = "en") {
  if (!policy || !Array.isArray(policy.purposes)) throw new TypeError("policy.purposes must be an array");
  if (policy.updatedAt && Number.isNaN(Date.parse(policy.updatedAt))) throw new TypeError("policy.updatedAt must be a date or ISO date-time string");
  if (policy.privacyPolicyUrl) assertHttpUrl(policy.privacyPolicyUrl, "policy.privacyPolicyUrl");
  const purposeIds = /* @__PURE__ */ new Set();
  for (const purpose of policy.purposes) assertId(purpose, "purpose", purposeIds);
  const compatibilityCatalog = policy.catalog;
  const topLevelFields = ["categories", "vendors", "services", "trackers"];
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
    if (typeof purpose.optional !== "boolean") throw new TypeError(`purpose ${purpose.id} requires optional as a boolean`);
  }
  const rawCategories = policy.categories ?? compatibilityCatalog?.categories ?? [...new Set(policy.purposes.map((purpose) => purpose.categoryId || purpose.id))].map((categoryId) => {
    const mapped = policy.purposes.filter((purpose) => (purpose.categoryId || purpose.id) === categoryId);
    return { id: categoryId, label: mapped[0]?.label || categoryId, description: mapped[0]?.description, purposeIds: mapped.map((purpose) => purpose.id), required: mapped.every((purpose) => !purpose.optional || purpose.legalBasis !== "consent") };
  });
  if (!Array.isArray(rawCategories)) throw new TypeError("policy.categories must be an array");
  const categoryIds = /* @__PURE__ */ new Set();
  const categories = rawCategories.map((category) => {
    assertId(category, "category", categoryIds);
    if (usesTopLevel) {
      assertText(category.label, `category ${category.id} label`);
      assertText(category.description, `category ${category.id} description`);
      if (typeof category.required !== "boolean") throw new TypeError(`category ${category.id} requires required as a boolean`);
    }
    const mapped = policy.purposes.filter((purpose) => purpose.categoryId === category.id).map((purpose) => purpose.id);
    const compatibilityMapped = category.purposeIds;
    const resolved = mapped.length ? mapped : compatibilityMapped;
    if (!Array.isArray(resolved) || resolved.length === 0) throw new TypeError(`category ${category.id} has no purposes; set Purpose.categoryId`);
    for (const purposeId of resolved) if (!purposeIds.has(purposeId)) throw new TypeError(`category ${category.id} references unknown purpose ${purposeId}`);
    const required = Boolean(category.required) || resolved.every((id) => {
      const purpose = policy.purposes.find((entry) => entry.id === id);
      return !purpose.optional || purpose.legalBasis !== "consent";
    });
    return { id: category.id, label: text(category.label, locale, category.id), description: text(category.description, locale), purposeIds: [...new Set(resolved)], required, ...Number.isFinite(category.order) ? { order: category.order } : {} };
  }).sort((left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER));
  const categoryByPurpose = /* @__PURE__ */ new Map();
  for (const category of categories) for (const purposeId of category.purposeIds) {
    if (categoryByPurpose.has(purposeId)) throw new TypeError(`purpose ${purposeId} belongs to multiple categories`);
    categoryByPurpose.set(purposeId, category.id);
  }
  for (const purpose of policy.purposes) {
    if (!categoryByPurpose.has(purpose.id)) throw new TypeError(`purpose ${purpose.id} requires a category`);
    if (purpose.categoryId && purpose.categoryId !== categoryByPurpose.get(purpose.id)) throw new TypeError(`purpose ${purpose.id} categoryId does not match its category`);
  }
  const vendorIds = /* @__PURE__ */ new Set();
  const vendors = (policy.vendors ?? compatibilityCatalog?.vendors ?? []).map((vendor) => {
    assertId(vendor, "vendor", vendorIds);
    if (usesTopLevel) {
      assertText(vendor.name, `vendor ${vendor.id} name`);
      assertString(vendor.privacyPolicyUrl, `vendor ${vendor.id} privacyPolicyUrl`);
    } else if (!text(vendor.name, locale)) throw new TypeError(`vendor ${vendor.id} requires a name`);
    if (vendor.privacyPolicyUrl) assertHttpUrl(vendor.privacyPolicyUrl, `vendor ${vendor.id} privacyPolicyUrl`);
    return { id: vendor.id, name: text(vendor.name, locale, vendor.id), description: text(vendor.description, locale), ...vendor.privacyPolicyUrl ? { privacyPolicyUrl: vendor.privacyPolicyUrl } : {} };
  });
  const serviceIds = /* @__PURE__ */ new Set();
  const services = (policy.services ?? compatibilityCatalog?.services ?? []).map((service) => {
    assertId(service, "service", serviceIds);
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
    return { id: service.id, name: text(service.name, locale, service.id), description: text(service.description, locale), ...service.vendorId ? { vendorId: service.vendorId } : {}, purposeIds: [...new Set(mapped)], categoryIds: categoryIdsForService, ...categoryIdsForService.length === 1 ? { categoryId: categoryIdsForService[0] } : {}, trackerIds: [] };
  });
  const trackerIds = /* @__PURE__ */ new Set();
  const validTrackerKinds = /* @__PURE__ */ new Set(["cookie", "script", "pixel", "iframe", "local-storage", "session-storage", "other"]);
  const trackers = (policy.trackers ?? compatibilityCatalog?.trackers ?? []).map((tracker) => {
    assertId(tracker, "tracker", trackerIds);
    if (usesTopLevel) {
      assertText(tracker.name, `tracker ${tracker.id} name`);
      assertString(tracker.kind, `tracker ${tracker.id} kind`);
      assertString(tracker.serviceId, `tracker ${tracker.id} serviceId`);
    }
    const service = services.find((entry) => entry.id === tracker.serviceId);
    if (!service) throw new TypeError(`tracker ${tracker.id} references unknown service ${tracker.serviceId}`);
    const kind = tracker.kind || tracker.type || "other";
    if (!validTrackerKinds.has(kind)) throw new TypeError(`tracker ${tracker.id} has an invalid kind`);
    if (usesTopLevel && !Array.isArray(tracker.purposeIds)) throw new TypeError(`tracker ${tracker.id} requires purposeIds`);
    const mapped = tracker.purposeIds ?? service.purposeIds;
    if (!Array.isArray(mapped) || mapped.length === 0) throw new TypeError(`tracker ${tracker.id} requires purposeIds`);
    for (const purposeId of mapped) if (!service.purposeIds.includes(purposeId)) throw new TypeError(`tracker ${tracker.id} purpose ${purposeId} is outside service ${service.id}`);
    if (usesTopLevel && typeof tracker.firstParty !== "boolean") throw new TypeError(`tracker ${tracker.id} requires firstParty`);
    return { id: tracker.id, name: text(tracker.name, locale, tracker.id), serviceId: tracker.serviceId, kind, purposeIds: [...new Set(mapped)], ...tracker.domain ? { domain: tracker.domain } : {}, ...tracker.duration ? { duration: tracker.duration } : {}, firstParty: Boolean(tracker.firstParty), description: text(tracker.description, locale) };
  });
  for (const service of services) service.trackerIds = trackers.filter((tracker) => tracker.serviceId === service.id).map((tracker) => tracker.id);
  return { projectId: policy.projectId, policyVersion: policy.policyVersion, noticeVersion: policy.noticeVersion, ...policy.updatedAt ? { updatedAt: policy.updatedAt } : {}, ...policy.privacyPolicyUrl ? { privacyPolicyUrl: policy.privacyPolicyUrl } : {}, ...policy.contact ? { contact: text(policy.contact, locale) } : {}, categories, vendors, services, trackers, legacy };
}
function getCategoryStates(policy, snapshot, catalog = normalizeCatalog(policy)) {
  return Object.fromEntries(catalog.categories.map((category) => {
    const optional = category.purposeIds.map((id) => policy.purposes.find((purpose) => purpose.id === id)).filter((purpose) => purpose?.optional && purpose.legalBasis === "consent");
    if (category.required || optional.length === 0) return [category.id, "required"];
    const states = optional.map((purpose) => snapshot.signals?.gpc && (purpose.sale || purpose.sharing) ? "denied" : snapshot.choices?.[purpose.id] ?? "unset");
    if (states.every((state) => state === "granted")) return [category.id, "granted"];
    if (states.every((state) => state === "denied")) return [category.id, "denied"];
    if (states.every((state) => state === "unset")) return [category.id, "unset"];
    return [category.id, "mixed"];
  }));
}
function evaluatePurpose(policy, snapshot, purposeId, options = {}) {
  const purpose = policy.purposes.find((item) => item.id === purposeId);
  const evaluatedAt = (options.now ?? defaultNow)();
  if (!purpose) return { outcome: "requires_review", purposeId, reason: "PURPOSE_UNKNOWN", ruleId: "CORE-RUNTIME-001", policyVersion: policy.policyVersion, evaluatedAt };
  const gpc = options.gpc ?? snapshot.signals?.gpc ?? false;
  if (gpc && (purpose.sale || purpose.sharing)) return { outcome: "deny", purposeId, reason: "GPC_SALE_SHARE_OPT_OUT", ruleId: "CCPA-RUNTIME-001", policyVersion: policy.policyVersion, receiptId: snapshot.receiptId, evaluatedAt };
  if (purpose.legalBasis !== "consent") return { outcome: "allow", purposeId, reason: `DECLARED_${purpose.legalBasis.toUpperCase().replaceAll("-", "_")}_BASIS`, ruleId: "GDPR-RUNTIME-001", policyVersion: policy.policyVersion, evaluatedAt };
  if (snapshot.policyVersion !== policy.policyVersion) return { outcome: "deny", purposeId, reason: "POLICY_VERSION_STALE", ruleId: "CORE-RUNTIME-002", policyVersion: policy.policyVersion, evaluatedAt };
  const choice = snapshot.choices?.[purposeId] ?? "unset";
  return { outcome: choice === "granted" ? "allow" : "deny", purposeId, reason: choice === "granted" ? "CONSENT_RECEIPT_MATCHED" : choice === "denied" ? "PREFERENCE_DENIED" : "OPTIONAL_DEFAULT_DENY", ruleId: "GDPR-RUNTIME-002", policyVersion: policy.policyVersion, receiptId: snapshot.receiptId, evaluatedAt };
}
function createOpenConsent(options = {}) {
  const policy = options.policy ?? DEFAULT_POLICY;
  const catalog = normalizeCatalog(policy, options.locale || "en");
  const now = options.now ?? defaultNow;
  const initialGpc = Boolean(options.gpc);
  const optionalPurposes2 = policy.purposes.filter((purpose) => purpose.optional && purpose.legalBasis === "consent");
  const defaultChoices = Object.fromEntries(optionalPurposes2.map((purpose) => [purpose.id, "unset"]));
  const supplied = options.initialChoices && typeof options.initialChoices === "object" && !Array.isArray(options.initialChoices) ? options.initialChoices : {};
  let snapshot = { subjectRef: options.subjectRef ?? "browser-demo", revision: 0, choices: Object.fromEntries(Object.keys(defaultChoices).map((id) => [id, ["granted", "denied", "unset"].includes(supplied[id]) ? supplied[id] : "unset"])), signals: { gpc: initialGpc }, policyVersion: policy.policyVersion, updatedAt: now(), receiptId: null };
  const events = [];
  const listeners = /* @__PURE__ */ new Set();
  const withCategories = () => ({ ...snapshot, categoryStates: getCategoryStates(policy, snapshot, catalog) });
  const publish = () => listeners.forEach((listener) => listener(clone(withCategories())));
  const record = (type, detail = {}) => events.unshift({ eventId: makeId("evt"), type, at: now(), ...detail });
  const mutate = (action, choices, source = "preference-center") => {
    const previousReceiptId = snapshot.receiptId;
    snapshot = { ...snapshot, revision: snapshot.revision + 1, choices: { ...snapshot.choices, ...choices }, updatedAt: now(), receiptId: makeId("rcpt") };
    const receipt = { receiptId: snapshot.receiptId, previousReceiptId, projectId: policy.projectId, policyVersion: policy.policyVersion, manifestDigest: policy.manifestDigest, noticeVersion: policy.noticeVersion, revision: snapshot.revision, choices: { ...snapshot.choices }, signalsObserved: { ...snapshot.signals }, action, source, issuedAt: snapshot.updatedAt, unsigned: true, storage: "browser-memory-only" };
    record(action === "withdraw" ? "preference_withdrawn" : "preference_saved", { receiptId: receipt.receiptId, choices: receipt.choices });
    publish();
    return receipt;
  };
  const validateChoices = (choices) => {
    if (!choices || typeof choices !== "object" || Array.isArray(choices) || Object.keys(choices).length === 0) throw new TypeError("choices must include at least one optional consent purpose");
    const ids = new Set(optionalPurposes2.map((purpose) => purpose.id));
    for (const [id, choice] of Object.entries(choices)) {
      if (!ids.has(id)) throw new TypeError("choices require known optional consent purposes");
      if (!["granted", "denied"].includes(choice)) throw new TypeError("choice must be granted or denied");
    }
    return choices;
  };
  const categoryChoices = (categories) => {
    if (!categories || typeof categories !== "object" || Array.isArray(categories) || Object.keys(categories).length === 0) throw new TypeError("category choices must be a non-empty object");
    const result = {};
    for (const [categoryId, choice] of Object.entries(categories)) {
      if (!["granted", "denied"].includes(choice)) throw new TypeError("category choice must be granted or denied");
      const category = catalog.categories.find((entry) => entry.id === categoryId);
      if (!category || category.required) throw new TypeError("category choices require known optional categories");
      for (const purposeId of category.purposeIds) {
        const purpose = optionalPurposes2.find((entry) => entry.id === purposeId);
        if (purpose) result[purposeId] = snapshot.signals.gpc && (purpose.sale || purpose.sharing) ? "denied" : choice;
      }
    }
    return validateChoices(result);
  };
  const api = {
    policy,
    getCatalog: () => clone(catalog),
    getSnapshot: () => clone(withCategories()),
    getEvents: () => clone(events),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setChoice(id, choice, source) {
      const purpose = optionalPurposes2.find((entry) => entry.id === id);
      if (!purpose || !["granted", "denied"].includes(choice)) throw new TypeError("setChoice requires a known optional consent purpose and saved choice");
      return mutate(choice === "granted" ? "save" : snapshot.choices[id] === "granted" ? "withdraw" : "deny", { [id]: choice }, source);
    },
    savePreferences(choices, source) {
      const valid = validateChoices(choices);
      return mutate(Object.entries(valid).some(([id, value]) => value === "denied" && snapshot.choices[id] === "granted") ? "withdraw" : "save", valid, source);
    },
    setCategory(id, choice, source) {
      const choices = categoryChoices({ [id]: choice });
      return mutate(choice === "denied" && Object.keys(choices).some((purposeId) => snapshot.choices[purposeId] === "granted") ? "withdraw" : "save", choices, source);
    },
    saveCategoryPreferences(choices, source) {
      const mapped = categoryChoices(choices);
      return mutate(Object.entries(mapped).some(([id, value]) => value === "denied" && snapshot.choices[id] === "granted") ? "withdraw" : "save", mapped, source);
    },
    acceptAll(source) {
      return mutate("accept_all", Object.fromEntries(optionalPurposes2.map((purpose) => [purpose.id, snapshot.signals.gpc && (purpose.sale || purpose.sharing) ? "denied" : "granted"])), source);
    },
    rejectOptional(source) {
      return mutate("reject_optional", Object.fromEntries(optionalPurposes2.map((purpose) => [purpose.id, "denied"])), source);
    },
    setGpc(enabled, source = "sec-gpc") {
      snapshot = { ...snapshot, signals: { ...snapshot.signals, gpc: Boolean(enabled) }, updatedAt: now() };
      record("gpc_observed", { enabled: Boolean(enabled), source });
      publish();
    },
    evaluate(id, evalOptions) {
      const decision = evaluatePurpose(policy, snapshot, id, { now, ...evalOptions });
      record("decision_evaluated", { purposeId: id, outcome: decision.outcome, reason: decision.reason });
      return decision;
    },
    reset() {
      snapshot = { ...snapshot, revision: 0, choices: { ...defaultChoices }, signals: { gpc: initialGpc }, updatedAt: now(), receiptId: null };
      events.length = 0;
      publish();
    }
  };
  record("runtime_initialized", { policyVersion: policy.policyVersion });
  return api;
}

// src/index.js
var STORAGE_SCHEMA_VERSION = 1;
var DEFAULT_STORAGE_PREFIX = "openconsent";
var CHANGE_EVENT = "openconsent:change";
var MANAGED_SELECTOR = 'script[type="text/plain"][data-openconsent-purpose],script[type="text/plain"][data-openconsent-service]';
var messages = {
  en: {
    bannerTitle: "Your privacy choices",
    bannerText: "We use required technology to run this site. With your permission, we can also use optional analytics and advertising.",
    accept: "Accept all",
    reject: "Reject optional",
    settings: "Manage preferences",
    dialogTitle: "Privacy preferences",
    dialogText: "Choose which optional purposes you allow. You can change these choices at any time.",
    required: "Always active",
    gpc: "Disabled by your Global Privacy Control signal",
    save: "Save preferences",
    close: "Close",
    privacy: "Privacy policy",
    trigger: "Privacy settings",
    consent: "Consent",
    details: "Details",
    services: "Services",
    trackers: "Trackers",
    about: "About",
    noServices: "No services are declared.",
    noTrackers: "No trackers are declared.",
    providedBy: "Provided by",
    lastUpdated: "Last updated",
    notice: "Notice version",
    contact: "Privacy contact",
    gpcStatus: "Global Privacy Control",
    withdraw: "Use this button at any time to review or withdraw consent."
  },
  zh: {
    bannerTitle: "\u4F60\u7684\u9690\u79C1\u9009\u62E9",
    bannerText: "\u6211\u4EEC\u4F7F\u7528\u5FC5\u8981\u6280\u672F\u6765\u8FD0\u884C\u6B64\u7F51\u7AD9\u3002\u7ECF\u4F60\u5141\u8BB8\uFF0C\u6211\u4EEC\u4E5F\u53EF\u4EE5\u4F7F\u7528\u53EF\u9009\u7684\u5206\u6790\u548C\u5E7F\u544A\u529F\u80FD\u3002",
    accept: "\u5168\u90E8\u63A5\u53D7",
    reject: "\u62D2\u7EDD\u53EF\u9009\u9879",
    settings: "\u7BA1\u7406\u504F\u597D",
    dialogTitle: "\u9690\u79C1\u504F\u597D",
    dialogText: "\u9009\u62E9\u4F60\u5141\u8BB8\u7684\u53EF\u9009\u7528\u9014\u3002\u4F60\u53EF\u4EE5\u968F\u65F6\u66F4\u6539\u8FD9\u4E9B\u9009\u62E9\u3002",
    required: "\u59CB\u7EC8\u542F\u7528",
    gpc: "\u5DF2\u7531\u4F60\u7684\u5168\u5C40\u9690\u79C1\u63A7\u5236\u4FE1\u53F7\u505C\u7528",
    save: "\u4FDD\u5B58\u504F\u597D",
    close: "\u5173\u95ED",
    privacy: "\u9690\u79C1\u653F\u7B56",
    trigger: "\u9690\u79C1\u8BBE\u7F6E",
    consent: "\u540C\u610F",
    details: "\u8BE6\u60C5",
    services: "\u670D\u52A1",
    trackers: "\u8FFD\u8E2A\u5668",
    about: "\u5173\u4E8E",
    noServices: "\u672A\u58F0\u660E\u670D\u52A1\u3002",
    noTrackers: "\u672A\u58F0\u660E\u8FFD\u8E2A\u5668\u3002",
    providedBy: "\u4F9B\u5E94\u5546",
    lastUpdated: "\u6700\u8FD1\u66F4\u65B0",
    notice: "\u901A\u77E5\u7248\u672C",
    contact: "\u9690\u79C1\u8054\u7CFB\u4EBA",
    gpcStatus: "\u5168\u5C40\u9690\u79C1\u63A7\u5236",
    withdraw: "\u4F60\u53EF\u4EE5\u968F\u65F6\u4F7F\u7528\u6B64\u6309\u94AE\u67E5\u770B\u6216\u64A4\u56DE\u540C\u610F\u3002"
  }
};
var purposeNames = {
  en: {
    "optional-analytics": ["Analytics", "Helps us understand product usage and improve the experience."],
    "personalized-ads": ["Personalized advertising", "Allows advertising measurement and personalization."]
  },
  zh: {
    "optional-analytics": ["\u5206\u6790", "\u5E2E\u52A9\u6211\u4EEC\u4E86\u89E3\u4EA7\u54C1\u4F7F\u7528\u60C5\u51B5\u5E76\u6539\u8FDB\u4F53\u9A8C\u3002"],
    "personalized-ads": ["\u4E2A\u6027\u5316\u5E7F\u544A", "\u5141\u8BB8\u5E7F\u544A\u8861\u91CF\u548C\u4E2A\u6027\u5316\u3002"]
  }
};
var styles = `
.oc-root,.oc-root *{box-sizing:border-box}.oc-root{--oc-bg:#fff;--oc-panel:#f7f7f4;--oc-text:#161815;--oc-muted:#5e625c;--oc-border:#d9ddd5;--oc-accent:#176b45;--oc-accent-text:#fff;position:relative;z-index:2147483000;color:var(--oc-text);font:14px/1.5 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.oc-root[data-theme=dark]{--oc-bg:#171a17;--oc-panel:#222622;--oc-text:#f5f7f3;--oc-muted:#b7bdb4;--oc-border:#3b423a;--oc-accent:#65d39a;--oc-accent-text:#102018}@media(prefers-color-scheme:dark){.oc-root[data-theme=auto]{--oc-bg:#171a17;--oc-panel:#222622;--oc-text:#f5f7f3;--oc-muted:#b7bdb4;--oc-border:#3b423a;--oc-accent:#65d39a;--oc-accent-text:#102018}}.oc-banner{position:fixed;left:16px;right:16px;margin:auto;max-width:1120px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;padding:22px 24px;background:var(--oc-bg);border:1px solid var(--oc-border);border-radius:14px;box-shadow:0 18px 55px rgba(0,0,0,.18)}.oc-banner[data-position=bottom]{bottom:16px}.oc-banner[data-position=top]{top:16px}.oc-copy h2,.oc-dialog h2{font-size:18px;line-height:1.25;margin:0 0 6px}.oc-copy p,.oc-dialog-intro{color:var(--oc-muted);margin:0;max-width:720px}.oc-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.oc-button{appearance:none;border:1px solid var(--oc-border);border-radius:9px;background:var(--oc-bg);color:var(--oc-text);cursor:pointer;font:600 14px/1.2 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:11px 14px}.oc-button:hover{background:var(--oc-panel)}.oc-button:focus-visible,.oc-switch input:focus-visible+span{outline:3px solid color-mix(in srgb,var(--oc-accent) 45%,transparent);outline-offset:2px}.oc-primary{border-color:var(--oc-accent);background:var(--oc-accent);color:var(--oc-accent-text)}.oc-primary:hover{filter:brightness(.96);background:var(--oc-accent)}.oc-backdrop{position:fixed;inset:0;display:grid;place-items:center;padding:18px;background:rgba(12,15,12,.55)}.oc-dialog{width:min(620px,100%);max-height:min(760px,calc(100vh - 36px));overflow:auto;background:var(--oc-bg);border:1px solid var(--oc-border);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.28);padding:24px}.oc-dialog-head{display:flex;align-items:start;justify-content:space-between;gap:20px}.oc-icon-button{appearance:none;border:0;background:transparent;color:var(--oc-text);cursor:pointer;font-size:24px;line-height:1;padding:2px 6px}.oc-purposes{display:grid;gap:10px;margin:20px 0}.oc-purpose{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:15px;background:var(--oc-panel);border:1px solid var(--oc-border);border-radius:11px}.oc-purpose strong{display:block;margin-bottom:2px}.oc-purpose p{color:var(--oc-muted);font-size:13px;margin:0}.oc-status{color:var(--oc-muted);font-size:12px;font-weight:700;white-space:nowrap}.oc-switch{display:inline-flex;align-items:center;cursor:pointer}.oc-switch input{position:absolute;opacity:0;pointer-events:none}.oc-switch span{width:42px;height:24px;border-radius:999px;background:#92978f;position:relative;transition:.16s ease}.oc-switch span:after{content:"";position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:.16s ease}.oc-switch input:checked+span{background:var(--oc-accent)}.oc-switch input:checked+span:after{transform:translateX(18px)}.oc-switch input:disabled+span{cursor:not-allowed;opacity:.48}.oc-dialog-footer{display:flex;align-items:center;justify-content:space-between;gap:12px}.oc-dialog-footer a{color:var(--oc-accent);font-weight:600}.oc-hidden{display:none!important}@media(max-width:760px){.oc-banner{grid-template-columns:1fr;gap:16px;left:10px;right:10px;padding:18px}.oc-actions{justify-content:stretch}.oc-actions .oc-button{flex:1 1 auto}.oc-dialog{padding:20px}.oc-dialog-footer{align-items:stretch;flex-direction:column}.oc-dialog-footer .oc-button{width:100%}}
`;
var catalogStyles = `.oc-tabs{display:flex;gap:4px;margin:20px 0 12px;padding:4px;background:var(--oc-panel);border-radius:10px}.oc-tab{flex:1;border:0;border-radius:7px;padding:9px;background:transparent;color:var(--oc-muted);font-weight:700;cursor:pointer}.oc-tab[aria-selected=true]{background:var(--oc-bg);color:var(--oc-text);box-shadow:0 1px 4px rgba(0,0,0,.1)}.oc-catalog-list{display:grid;gap:10px;margin:0 0 20px}.oc-catalog-row{padding:15px;background:var(--oc-panel);border:1px solid var(--oc-border);border-radius:11px}.oc-catalog-row-head{display:flex;justify-content:space-between;align-items:center;gap:16px}.oc-catalog-row strong{display:block}.oc-catalog-row p,.oc-catalog-row small{color:var(--oc-muted);margin:3px 0 0;font-size:12px}.oc-purpose-detail{margin-top:12px;padding-top:10px;border-top:1px solid var(--oc-border)}.oc-detail-tree{display:grid;gap:4px;margin:10px 0 0 12px;padding-left:12px;border-left:2px solid var(--oc-border)}.oc-detail-tree p{color:var(--oc-text)}.oc-badge{border-radius:999px;padding:4px 8px;background:var(--oc-bg);color:var(--oc-muted);font-size:11px}.oc-empty{padding:24px;text-align:center;color:var(--oc-muted)}.oc-meta{display:flex;gap:12px;flex-wrap:wrap;color:var(--oc-muted);font-size:11px;margin-top:10px}.oc-privacy-trigger{position:fixed;right:16px;bottom:16px;border:1px solid var(--oc-border);border-radius:999px;background:var(--oc-bg);color:var(--oc-text);box-shadow:0 8px 25px rgba(0,0,0,.16);padding:10px 14px;font-weight:700;cursor:pointer}.oc-banner:not(.oc-hidden)~.oc-privacy-trigger{display:none}`;
var activeClient = null;
var activeFingerprint = null;
function assertBrowser() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("@openconsent/web requires a browser environment");
  }
}
function normalizePolicy(options) {
  if (!options?.policy || !Array.isArray(options.policy.purposes)) {
    throw new TypeError("OpenConsent.init requires a policy with a purposes array");
  }
  const policy = {
    ...options.policy,
    projectId: options.projectId || options.policy.projectId,
    purposes: options.policy.purposes.map((purpose) => ({ ...purpose }))
  };
  for (const field of ["projectId", "policyVersion", "noticeVersion", "manifestDigest"]) {
    if (typeof policy[field] !== "string" || !policy[field]) throw new TypeError(`policy.${field} must be a non-empty string`);
  }
  const ids = /* @__PURE__ */ new Set();
  for (const purpose of policy.purposes) {
    if (!purpose?.id || ids.has(purpose.id)) throw new TypeError("Every policy purpose requires a unique id");
    ids.add(purpose.id);
  }
  return policy;
}
function safeGpc() {
  return Boolean(navigator.globalPrivacyControl);
}
function storageKeyFor(options, policy) {
  return options.storageKey || `${DEFAULT_STORAGE_PREFIX}:${policy.projectId}:preferences`;
}
function safeStorage() {
  try {
    const probe = "__openconsent_probe__";
    localStorage.setItem(probe, probe);
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}
function readPreference(storage, key, policy) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw);
    const validChoice = (choice) => ["granted", "denied", "unset"].includes(choice);
    const valid = value && value.schemaVersion === STORAGE_SCHEMA_VERSION && value.projectId === policy.projectId && value.policyVersion === policy.policyVersion && value.noticeVersion === policy.noticeVersion && value.choices && typeof value.choices === "object" && Object.values(value.choices).every(validChoice);
    if (!valid) throw new Error("stale or invalid preference");
    return value;
  } catch {
    try {
      storage.removeItem(key);
    } catch {
    }
    return null;
  }
}
function isGpcPurpose(purpose, gpc) {
  return Boolean(gpc && (purpose.sale || purpose.sharing));
}
function optionalPurposes(policy) {
  return policy.purposes.filter((purpose) => purpose.optional && purpose.legalBasis === "consent");
}
function publicReceipt(receipt) {
  return { ...receipt, storage: "browser-localStorage" };
}
function addStyle(root) {
  const style = document.createElement("style");
  style.dataset.openconsentStyle = "";
  style.textContent = styles + catalogStyles;
  root.append(style);
}
function resolveContainer(container) {
  if (container instanceof HTMLElement) return container;
  if (typeof container === "string") return document.querySelector(container);
  return document.body;
}
function purposeCopy(purpose, locale) {
  const declared = purpose.label;
  const description = purpose.description;
  const fallback = purposeNames[locale]?.[purpose.id] || purposeNames.en[purpose.id] || [purpose.id, "Optional processing purpose."];
  if (declared && typeof declared === "object") return [declared[locale] || declared.en || purpose.id, description?.[locale] || description?.en || fallback[1]];
  return [declared || fallback[0], typeof description === "string" ? description : fallback[1]];
}
function createView(client, options) {
  let host = null;
  let banner = null;
  let backdrop = null;
  let trigger = null;
  let settingsOpen = false;
  let previouslyFocused = null;
  let activeTab = "consent";
  let draftChoices = null;
  const locale = messages[options.locale] ? options.locale : "en";
  const t = messages[locale];
  function mount() {
    if (host?.isConnected) return;
    const container = resolveContainer(options.banner?.container);
    if (!container) return;
    host = document.createElement("div");
    host.className = "oc-root";
    host.dataset.theme = options.banner?.theme || "auto";
    host.dataset.openconsentRoot = "";
    addStyle(host);
    container.append(host);
    if (options.banner?.privacyTrigger !== false) {
      trigger = button(t.trigger, "oc-privacy-trigger", () => showSettings());
      trigger.setAttribute("aria-label", t.trigger);
      host.append(trigger);
    }
    render();
  }
  function renderBanner() {
    banner?.remove();
    banner = document.createElement("section");
    banner.className = "oc-banner";
    banner.dataset.position = options.banner?.position || "bottom";
    banner.setAttribute("aria-label", t.bannerTitle);
    banner.innerHTML = `<div class="oc-copy"><h2>${escapeHtml(t.bannerTitle)}</h2><p>${escapeHtml(t.bannerText)}</p></div><div class="oc-actions"></div>`;
    const actions = banner.querySelector(".oc-actions");
    actions.append(
      button(t.settings, "oc-button", () => showSettings()),
      button(t.reject, "oc-button", () => client.rejectOptional("banner")),
      button(t.accept, "oc-button oc-primary", () => client.acceptAll("banner"))
    );
    host.append(banner);
  }
  function renderDialog() {
    backdrop?.remove();
    backdrop = document.createElement("div");
    backdrop.className = "oc-backdrop";
    backdrop.addEventListener("mousedown", (event) => {
      if (event.target === backdrop) hideSettings();
    });
    const dialog = document.createElement("section");
    dialog.className = "oc-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "oc-dialog-title");
    dialog.innerHTML = `<div class="oc-dialog-head"><div><h2 id="oc-dialog-title">${escapeHtml(t.dialogTitle)}</h2><p class="oc-dialog-intro">${escapeHtml(t.dialogText)}</p></div></div><div class="oc-tabs" role="tablist"></div><div class="oc-tabpanel" role="tabpanel"></div><div class="oc-dialog-footer"></div>`;
    const close = button("\xD7", "oc-icon-button", hideSettings);
    close.setAttribute("aria-label", t.close);
    dialog.querySelector(".oc-dialog-head").append(close);
    const tabs = dialog.querySelector(".oc-tabs");
    for (const [id, label] of [["consent", t.consent], ["details", t.details], ["about", t.about]]) {
      const tab = button(label, "oc-tab", () => {
        activeTab = id;
        renderDialog();
      });
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(activeTab === id));
      tabs.append(tab);
    }
    const panel = dialog.querySelector(".oc-tabpanel");
    const catalog = client.getCatalog();
    const snapshot = client.getSnapshot();
    if (!draftChoices) draftChoices = Object.fromEntries(optionalPurposes(client.policy).map((purpose) => [purpose.id, snapshot.choices[purpose.id] === "granted" ? "granted" : "denied"]));
    if (activeTab === "consent") {
      const list = document.createElement("div");
      list.className = "oc-catalog-list";
      for (const category of catalog.categories) {
        const row = document.createElement("div");
        row.className = "oc-catalog-row";
        const head = document.createElement("div");
        head.className = "oc-catalog-row-head";
        const copy = document.createElement("div");
        copy.innerHTML = `<strong>${escapeHtml(category.label)}</strong>${category.description ? `<p>${escapeHtml(category.description)}</p>` : ""}`;
        head.append(copy);
        const purposes = category.purposeIds.map((id) => client.policy.purposes.find((purpose) => purpose.id === id)).filter(Boolean);
        const optional = purposes.filter((purpose) => purpose.optional && purpose.legalBasis === "consent");
        if (category.required || !optional.length) {
          const badge = document.createElement("span");
          badge.className = "oc-badge";
          badge.textContent = t.required;
          head.append(badge);
        } else {
          const label = document.createElement("label");
          label.className = "oc-switch";
          const input = document.createElement("input");
          input.type = "checkbox";
          input.name = `category:${category.id}`;
          input.checked = optional.every((purpose) => draftChoices[purpose.id] === "granted" && !isGpcPurpose(purpose, snapshot.signals.gpc));
          input.indeterminate = optional.some((purpose) => draftChoices[purpose.id] === "granted") && !input.checked;
          input.setAttribute("aria-label", category.label);
          input.addEventListener("change", () => {
            for (const purpose of optional) draftChoices[purpose.id] = input.checked && !isGpcPurpose(purpose, snapshot.signals.gpc) ? "granted" : "denied";
            renderDialog();
          });
          label.append(input, document.createElement("span"));
          head.append(label);
        }
        row.append(head);
        for (const purpose of purposes) {
          const [name, description] = purposeCopy(purpose, locale);
          const purposeRow = document.createElement("div");
          purposeRow.className = "oc-catalog-row-head oc-purpose-detail";
          const purposeCopyNode = document.createElement("div");
          purposeCopyNode.innerHTML = `<small>${escapeHtml(name)}</small>${description ? `<p>${escapeHtml(description)}</p>` : ""}`;
          purposeRow.append(purposeCopyNode);
          if (!purpose.optional || purpose.legalBasis !== "consent") {
            const badge = document.createElement("span");
            badge.className = "oc-badge";
            badge.textContent = t.required;
            purposeRow.append(badge);
          } else {
            const label = document.createElement("label");
            label.className = "oc-switch";
            const input = document.createElement("input");
            input.type = "checkbox";
            input.checked = draftChoices[purpose.id] === "granted";
            input.disabled = isGpcPurpose(purpose, snapshot.signals.gpc);
            input.setAttribute("aria-label", name);
            if (input.disabled) {
              input.checked = false;
              label.title = t.gpc;
            }
            input.addEventListener("change", () => {
              draftChoices[purpose.id] = input.checked ? "granted" : "denied";
            });
            label.append(input, document.createElement("span"));
            purposeRow.append(label);
          }
          row.append(purposeRow);
        }
        list.append(row);
      }
      panel.append(list);
    } else if (activeTab === "details") {
      const list = document.createElement("div");
      list.className = "oc-catalog-list";
      for (const category of catalog.categories) {
        const row = document.createElement("div");
        row.className = "oc-catalog-row";
        row.innerHTML = `<strong>${escapeHtml(category.label)}</strong>`;
        for (const purposeId of category.purposeIds) {
          const purpose = client.policy.purposes.find((entry) => entry.id === purposeId);
          if (!purpose) continue;
          const [purposeName] = purposeCopy(purpose, locale);
          const block = document.createElement("div");
          block.className = "oc-detail-tree";
          block.innerHTML = `<small>${escapeHtml(purposeName)} \xB7 ${escapeHtml(purpose.legalBasis)}</small>`;
          for (const service of catalog.services.filter((entry) => entry.categoryIds.includes(category.id) && entry.purposeIds.includes(purposeId))) {
            const vendor = catalog.vendors.find((entry) => entry.id === service.vendorId);
            const serviceLine = document.createElement("p");
            serviceLine.innerHTML = `<b>${escapeHtml(service.name)}</b>${vendor ? ` \xB7 ${escapeHtml(t.providedBy)} ${escapeHtml(vendor.name)}` : ""}`;
            block.append(serviceLine);
            for (const tracker of catalog.trackers.filter((entry) => service.trackerIds.includes(entry.id) && entry.purposeIds.includes(purposeId))) {
              const trackerLine = document.createElement("small");
              trackerLine.textContent = `\u21B3 ${tracker.name} \xB7 ${tracker.kind}${tracker.firstParty ? " \xB7 first party" : " \xB7 third party"}${tracker.domain ? ` \xB7 ${tracker.domain}` : ""}${tracker.duration ? ` \xB7 ${tracker.duration}` : ""}`;
              block.append(trackerLine);
            }
          }
          row.append(block);
        }
        list.append(row);
      }
      panel.append(list);
    } else {
      const about = document.createElement("div");
      about.className = "oc-catalog-row";
      const privacyUrl = options.banner?.privacyPolicyUrl || catalog.privacyPolicyUrl;
      about.innerHTML = `<strong>${escapeHtml(catalog.projectId)}</strong><p>${escapeHtml(t.notice)}: ${escapeHtml(catalog.noticeVersion)}</p>${catalog.contact ? `<p>${escapeHtml(t.contact)}: ${escapeHtml(catalog.contact)}</p>` : ""}<p>${escapeHtml(t.gpcStatus)}: ${snapshot.signals.gpc ? "ON" : "OFF"}</p><p>${escapeHtml(t.withdraw)}</p>${privacyUrl ? `<p><a href="${escapeHtml(privacyUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.privacy)}</a></p>` : ""}<div class="oc-meta"><span>Policy ${escapeHtml(catalog.policyVersion)}</span>${catalog.updatedAt ? `<span>${escapeHtml(t.lastUpdated)}: ${escapeHtml(catalog.updatedAt)}</span>` : ""}<span>${catalog.services.length} ${escapeHtml(t.services.toLowerCase())}</span><span>${catalog.trackers.length} ${escapeHtml(t.trackers.toLowerCase())}</span></div>`;
      panel.append(about);
    }
    const footer = dialog.querySelector(".oc-dialog-footer");
    if (options.banner?.privacyPolicyUrl) {
      const link = document.createElement("a");
      link.href = options.banner.privacyPolicyUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = t.privacy;
      footer.append(link);
    } else footer.append(document.createElement("span"));
    footer.append(button(t.save, "oc-button oc-primary", () => {
      if (Object.keys(draftChoices).length) client.savePreferences(draftChoices, "preference-center");
      hideSettings();
    }));
    backdrop.append(dialog);
    host.append(backdrop);
    dialog.addEventListener("keydown", trapDialogFocus);
    queueMicrotask(() => close.focus());
  }
  function render() {
    if (!host) return;
    if (settingsOpen) renderDialog();
  }
  function show() {
    mount();
    if (!banner) renderBanner();
    banner.classList.remove("oc-hidden");
    trigger?.classList.add("oc-hidden");
  }
  function hide() {
    banner?.classList.add("oc-hidden");
    trigger?.classList.remove("oc-hidden");
  }
  function showSettings() {
    mount();
    previouslyFocused = document.activeElement;
    settingsOpen = true;
    activeTab = "consent";
    draftChoices = null;
    renderDialog();
  }
  function hideSettings() {
    settingsOpen = false;
    draftChoices = null;
    backdrop?.remove();
    backdrop = null;
    if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
  }
  function trapDialogFocus(event) {
    if (event.key === "Escape") return hideSettings();
    if (event.key !== "Tab") return;
    const focusable = [...event.currentTarget.querySelectorAll("button,a[href],input:not([disabled])")];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  return {
    mount,
    show,
    hide,
    showSettings,
    hideSettings,
    refresh() {
      if (settingsOpen) renderDialog();
    },
    destroy() {
      backdrop?.remove();
      host?.remove();
      host = banner = backdrop = trigger = null;
    }
  };
}
function button(label, className, onClick) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  element.addEventListener("click", onClick);
  return element;
}
function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = String(value);
  return span.innerHTML;
}
function createManagedScripts(runtime) {
  const catalog = runtime.getCatalog();
  const records = /* @__PURE__ */ new Map();
  let observer = null;
  let stopped = false;
  let generation = 0;
  function discover() {
    for (const source of document.querySelectorAll(MANAGED_SELECTOR)) {
      if (!records.has(source)) records.set(source, { source, active: null, controller: null, generation: 0 });
    }
  }
  function requirements(source) {
    const serviceId = source.dataset.openconsentService;
    const purposeId = source.dataset.openconsentPurpose;
    if (serviceId) {
      const service = catalog.services.find((entry) => entry.id === serviceId);
      if (!service) {
        source.dataset.openconsentError = "unknown-service";
        return null;
      }
      if (purposeId && !service.purposeIds.includes(purposeId)) {
        source.dataset.openconsentError = "service-purpose-mismatch";
        return null;
      }
      delete source.dataset.openconsentError;
      return purposeId ? [purposeId] : service.purposeIds;
    }
    if (purposeId) {
      delete source.dataset.openconsentError;
      return [purposeId];
    }
    source.dataset.openconsentError = "missing-service-or-purpose";
    return null;
  }
  function allowed(source) {
    const purposeIds = requirements(source);
    return Boolean(purposeIds?.length) && purposeIds.every((purposeId) => runtime.evaluate(purposeId).outcome === "allow");
  }
  async function activate(record) {
    if (record.active || record.controller || stopped) return;
    const sourceUrl = record.source.dataset.openconsentSrc;
    const inline = record.source.textContent?.trim();
    if (!sourceUrl && !inline) return;
    const activationGeneration = ++generation;
    record.generation = activationGeneration;
    const controller = sourceUrl ? new AbortController() : null;
    record.controller = controller;
    let sourceText = inline;
    if (sourceUrl) {
      try {
        const response = await fetch(new URL(sourceUrl, document.baseURI), {
          signal: controller.signal,
          credentials: record.source.dataset.openconsentCrossorigin === "use-credentials" ? "include" : "same-origin",
          integrity: record.source.dataset.openconsentIntegrity || void 0
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        sourceText = `${await response.text()}
//# sourceURL=${new URL(sourceUrl, document.baseURI).href}`;
      } catch (error) {
        if (error?.name !== "AbortError") {
          record.source.dataset.openconsentError = "load-failed";
          console.warn("[openConsent] managed script stayed blocked because it could not be fetched safely", error);
        }
        if (record.generation === activationGeneration) record.controller = null;
        return;
      }
    }
    if (stopped || record.generation !== activationGeneration || !record.source.isConnected || !allowed(record.source)) {
      if (record.generation === activationGeneration) record.controller = null;
      return;
    }
    const active = document.createElement("script");
    for (const { name, value } of record.source.attributes) {
      if (!["type", "data-openconsent-src", "data-openconsent-purpose", "data-openconsent-service"].includes(name)) active.setAttribute(name, value);
    }
    active.dataset.openconsentActivated = record.source.dataset.openconsentService || record.source.dataset.openconsentPurpose;
    if (record.source.dataset.openconsentService) active.dataset.openconsentActivatedService = record.source.dataset.openconsentService;
    if (record.source.dataset.openconsentPurpose) active.dataset.openconsentActivatedPurpose = record.source.dataset.openconsentPurpose;
    active.type = record.source.dataset.openconsentType || "text/javascript";
    if (record.source.dataset.openconsentIntegrity) active.integrity = record.source.dataset.openconsentIntegrity;
    if (record.source.dataset.openconsentCrossorigin) active.crossOrigin = record.source.dataset.openconsentCrossorigin;
    active.textContent = sourceText;
    record.source.after(active);
    record.controller = null;
    record.active = active;
  }
  function deactivate(record) {
    const wasActive = Boolean(record.active);
    const cleanupName = record.source.dataset.openconsentCleanup;
    record.generation = ++generation;
    record.controller?.abort();
    record.controller = null;
    record.active?.remove();
    record.active = null;
    if (wasActive && cleanupName && typeof window[cleanupName] === "function") {
      try {
        window[cleanupName]();
      } catch (error) {
        console.warn("[openConsent] managed script cleanup failed", error);
      }
    }
  }
  function reconcile() {
    discover();
    for (const [source, record] of records) {
      if (!source.isConnected) {
        deactivate(record);
        records.delete(source);
        continue;
      }
      if (allowed(record.source)) void activate(record);
      else deactivate(record);
    }
  }
  observer = new MutationObserver(() => reconcile());
  observer.observe(document.documentElement, { subtree: true, childList: true });
  return {
    reconcile,
    destroy() {
      stopped = true;
      observer?.disconnect();
      for (const record of records.values()) deactivate(record);
      records.clear();
    }
  };
}
function createClient(options, policy) {
  const storage = safeStorage();
  const storageKey = storageKeyFor(options, policy);
  const persisted = readPreference(storage, storageKey, policy);
  const gpc = safeGpc();
  const runtime = createOpenConsent({ policy, subjectRef: options.subjectRef || "browser", gpc, locale: options.locale });
  let hasSavedPreference = optionalPurposes(policy).length === 0 || Boolean(persisted) && optionalPurposes(policy).every(
    (purpose) => ["granted", "denied"].includes(persisted.choices[purpose.id])
  );
  let destroyed = false;
  let suppressPublish = true;
  const listeners = /* @__PURE__ */ new Set();
  if (persisted) {
    for (const purpose of optionalPurposes(policy)) {
      const choice = persisted.choices[purpose.id];
      if (choice === "granted" || choice === "denied") runtime.setChoice(purpose.id, isGpcPurpose(purpose, gpc) ? "denied" : choice, "storage-restore");
    }
  }
  let view;
  let managedScripts;
  function snapshot() {
    return {
      ...runtime.getSnapshot(),
      noticeVersion: policy.noticeVersion,
      hasSavedPreference
    };
  }
  function emit(receipt) {
    const current = snapshot();
    for (const listener of listeners) listener(current);
    view?.refresh();
    managedScripts?.reconcile();
    document.dispatchEvent(new CustomEvent(CHANGE_EVENT, { bubbles: true, detail: { snapshot: current, receipt } }));
  }
  function persist(receipt) {
    const current = snapshot();
    const value = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      projectId: policy.projectId,
      policyVersion: policy.policyVersion,
      noticeVersion: policy.noticeVersion,
      choices: current.choices,
      savedAt: current.updatedAt,
      receipt
    };
    try {
      storage?.setItem(storageKey, JSON.stringify(value));
    } catch {
    }
  }
  function finalize(rawReceipt, action, source) {
    const receipt = publicReceipt({
      ...rawReceipt,
      action,
      source,
      choices: { ...runtime.getSnapshot().choices },
      signalsObserved: { gpc }
    });
    hasSavedPreference = optionalPurposes(policy).every((purpose) => ["granted", "denied"].includes(receipt.choices[purpose.id]));
    persist(receipt);
    emit(receipt);
    if (hasSavedPreference) view?.hide();
    if (!suppressPublish) options.onPreferenceChange?.(receipt);
    return receipt;
  }
  function commitChoices(choices, action, source) {
    if (destroyed) throw new Error("This openConsent client has been destroyed");
    let rawReceipt = null;
    for (const purpose of optionalPurposes(policy)) {
      if (!(purpose.id in choices)) continue;
      const requested = choices[purpose.id];
      if (!["granted", "denied"].includes(requested)) throw new TypeError("choice must be granted or denied");
      const effective = isGpcPurpose(purpose, gpc) ? "denied" : requested;
      rawReceipt = runtime.setChoice(purpose.id, effective, source);
    }
    if (!rawReceipt) throw new TypeError("No known optional consent purpose was provided");
    return finalize(rawReceipt, action, source);
  }
  const client = {
    policy,
    getCatalog: () => runtime.getCatalog(),
    getSnapshot: snapshot,
    subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("listener must be a function");
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    evaluate: (purposeId) => runtime.evaluate(purposeId),
    show: () => view.show(),
    showSettings: () => view.showSettings(),
    hide: () => view.hide(),
    acceptAll(source = "api") {
      const choices = Object.fromEntries(optionalPurposes(policy).map((purpose) => [purpose.id, "granted"]));
      return commitChoices(choices, "accept_all", source);
    },
    rejectOptional(source = "api") {
      const rawReceipt = runtime.rejectOptional(source);
      return finalize(rawReceipt, "reject_optional", source);
    },
    setChoice(purposeId, choice, source = "api") {
      return commitChoices({ [purposeId]: choice }, choice === "granted" ? "save" : "withdraw", source);
    },
    savePreferences(choices, source = "preference-center") {
      return commitChoices(choices, "save_preferences", source);
    },
    setCategory(categoryId, choice, source = "api") {
      const rawReceipt = runtime.setCategory(categoryId, choice, source);
      return finalize(rawReceipt, choice === "granted" ? "save" : "withdraw", source);
    },
    saveCategoryPreferences(choices, source = "preference-center") {
      const rawReceipt = runtime.saveCategoryPreferences(choices, source);
      return finalize(rawReceipt, "save_preferences", source);
    },
    reset() {
      if (destroyed) return;
      runtime.reset();
      runtime.setGpc(gpc, "navigator.globalPrivacyControl");
      hasSavedPreference = false;
      try {
        storage?.removeItem(storageKey);
      } catch {
      }
      emit(null);
      view.show();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      managedScripts?.destroy();
      view?.destroy();
      listeners.clear();
      if (activeClient === client) {
        activeClient = null;
        activeFingerprint = null;
      }
    }
  };
  view = createView(client, options);
  managedScripts = createManagedScripts(runtime);
  suppressPublish = false;
  const start = () => {
    if (destroyed) return;
    view.mount();
    managedScripts.reconcile();
    const current = snapshot();
    if (options.autoShow !== false && !current.hasSavedPreference) view.show();
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
  return client;
}
function init(options) {
  assertBrowser();
  const policy = normalizePolicy(options);
  const fingerprint = JSON.stringify({
    policy,
    locale: options.locale || "en",
    storageKey: storageKeyFor(options, policy),
    banner: {
      position: options.banner?.position || "bottom",
      theme: options.banner?.theme || "auto",
      privacyPolicyUrl: options.banner?.privacyPolicyUrl || null,
      container: typeof options.banner?.container === "string" ? options.banner.container : null
    }
  });
  if (activeClient && activeFingerprint === fingerprint) return activeClient;
  activeClient?.destroy();
  activeClient = createClient({ locale: "en", autoShow: true, banner: {}, ...options }, policy);
  activeFingerprint = fingerprint;
  return activeClient;
}
function getActiveClient() {
  return activeClient;
}
function autoInit(script) {
  if (typeof document === "undefined") return null;
  const node = script === void 0 ? document.currentScript : script;
  if (!(node instanceof HTMLScriptElement) || node.dataset.openconsentAutostart === "false") return null;
  const configSource = node.dataset.openconsentConfig;
  if (!configSource || node.dataset.openconsentInitialized === "true") return null;
  node.dataset.openconsentInitialized = "true";
  return (async () => {
    let options;
    if (configSource.trim().startsWith("{")) options = JSON.parse(configSource);
    else {
      const response = await fetch(new URL(configSource, document.baseURI), { credentials: "same-origin" });
      if (!response.ok) throw new Error(`Unable to load openConsent config (${response.status})`);
      options = await response.json();
    }
    return init(options);
  })().catch((error) => {
    node.dataset.openconsentInitialized = "error";
    console.error("[openConsent] automatic initialization failed", error);
    throw error;
  });
}
var OpenConsent = { init, autoInit, getActiveClient };
var index_default = OpenConsent;
export {
  autoInit,
  index_default as default,
  getActiveClient,
  init
};
//# sourceMappingURL=index.js.map
