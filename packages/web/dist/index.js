// ../core/src/index.js
var defaultNow = () => (/* @__PURE__ */ new Date()).toISOString();
var makeId = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
var DEFAULT_POLICY = Object.freeze({
  projectId: "openconsent-demo",
  policyVersion: "runtime-alpha.1",
  noticeVersion: "demo-notice-1",
  manifestDigest: "demo:8f6b1f3a",
  purposes: [
    { id: "support", activityId: "ai-support", legalBasis: "contract", optional: false },
    { id: "optional-analytics", activityId: "product-analytics", legalBasis: "consent", optional: true },
    { id: "personalized-ads", activityId: "ad-personalization", legalBasis: "consent", optional: true, sale: true, sharing: true }
  ]
});
function evaluatePurpose(policy, snapshot, purposeId, options = {}) {
  const purpose = policy.purposes.find((item) => item.id === purposeId);
  const evaluatedAt = (options.now ?? defaultNow)();
  if (!purpose) return { outcome: "requires_review", purposeId, reason: "PURPOSE_UNKNOWN", ruleId: "CORE-RUNTIME-001", policyVersion: policy.policyVersion, evaluatedAt };
  const gpc = options.gpc ?? snapshot.signals?.gpc ?? false;
  if (gpc && (purpose.sale || purpose.sharing)) {
    return { outcome: "deny", purposeId, reason: "GPC_SALE_SHARE_OPT_OUT", ruleId: "CCPA-RUNTIME-001", policyVersion: policy.policyVersion, receiptId: snapshot.receiptId, evaluatedAt };
  }
  if (purpose.legalBasis !== "consent") {
    return { outcome: "allow", purposeId, reason: `DECLARED_${purpose.legalBasis.toUpperCase().replaceAll("-", "_")}_BASIS`, ruleId: "GDPR-RUNTIME-001", policyVersion: policy.policyVersion, evaluatedAt };
  }
  if (snapshot.policyVersion !== policy.policyVersion) {
    return { outcome: "deny", purposeId, reason: "POLICY_VERSION_STALE", ruleId: "CORE-RUNTIME-002", policyVersion: policy.policyVersion, evaluatedAt };
  }
  const choice = snapshot.choices?.[purposeId] ?? "unset";
  return {
    outcome: choice === "granted" ? "allow" : "deny",
    purposeId,
    reason: choice === "granted" ? "CONSENT_RECEIPT_MATCHED" : choice === "denied" ? "PREFERENCE_DENIED" : "OPTIONAL_DEFAULT_DENY",
    ruleId: "GDPR-RUNTIME-002",
    policyVersion: policy.policyVersion,
    receiptId: snapshot.receiptId,
    evaluatedAt
  };
}
function createOpenConsent(options = {}) {
  const policy = options.policy ?? DEFAULT_POLICY;
  const now = options.now ?? defaultNow;
  const initialGpc = Boolean(options.gpc);
  const optionalPurposes2 = policy.purposes.filter((purpose) => purpose.optional && purpose.legalBasis === "consent");
  const defaultChoices = Object.fromEntries(optionalPurposes2.map((purpose) => [purpose.id, "unset"]));
  const suppliedChoices = options.initialChoices && typeof options.initialChoices === "object" && !Array.isArray(options.initialChoices) ? options.initialChoices : {};
  const initialChoices = Object.fromEntries(Object.entries(defaultChoices).map(([purposeId, fallback]) => {
    const choice = suppliedChoices[purposeId];
    return [purposeId, ["granted", "denied", "unset"].includes(choice) ? choice : fallback];
  }));
  let snapshot = {
    subjectRef: options.subjectRef ?? "browser-demo",
    revision: 0,
    choices: initialChoices,
    signals: { gpc: initialGpc },
    policyVersion: policy.policyVersion,
    updatedAt: now(),
    receiptId: null
  };
  const events = [];
  const listeners = /* @__PURE__ */ new Set();
  const publish = () => listeners.forEach((listener) => listener(api.getSnapshot()));
  const record = (type, detail = {}) => events.unshift({ eventId: makeId("evt"), type, at: now(), ...detail });
  const mutate = (action, choices, source = "preference-center") => {
    const previousReceiptId = snapshot.receiptId;
    snapshot = {
      ...snapshot,
      revision: snapshot.revision + 1,
      choices: { ...snapshot.choices, ...choices },
      updatedAt: now(),
      receiptId: makeId("rcpt")
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
      storage: "browser-memory-only"
    };
    record(action === "withdraw" ? "preference_withdrawn" : "preference_saved", { receiptId: receipt.receiptId, choices: receipt.choices });
    publish();
    return receipt;
  };
  const validateChoices = (choices) => {
    if (!choices || typeof choices !== "object" || Array.isArray(choices)) throw new TypeError("choices must be an object");
    if (Object.keys(choices).length === 0) throw new TypeError("choices must include at least one optional consent purpose");
    const optionalPurposeIds = new Set(optionalPurposes2.map((purpose) => purpose.id));
    for (const [purposeId, choice] of Object.entries(choices)) {
      if (!optionalPurposeIds.has(purposeId)) throw new TypeError("choices require known optional consent purposes");
      if (!["granted", "denied"].includes(choice)) throw new TypeError("choice must be granted or denied");
    }
    return choices;
  };
  const api = {
    policy,
    getSnapshot: () => structuredClone(snapshot),
    getEvents: () => structuredClone(events),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setChoice(purposeId, choice, source) {
      if (!["granted", "denied"].includes(choice)) throw new TypeError("choice must be granted or denied");
      const purpose = policy.purposes.find((item) => item.id === purposeId);
      if (!purpose || !purpose.optional || purpose.legalBasis !== "consent") throw new TypeError("setChoice requires a known optional consent purpose");
      const wasGranted = snapshot.choices?.[purposeId] === "granted";
      return mutate(choice === "granted" ? "save" : wasGranted ? "withdraw" : "deny", { [purposeId]: choice }, source);
    },
    savePreferences(choices, source) {
      const validated = validateChoices(choices);
      const withdrew = Object.entries(validated).some(([purposeId, choice]) => choice === "denied" && snapshot.choices[purposeId] === "granted");
      return mutate(withdrew ? "withdraw" : "save", validated, source);
    },
    acceptAll(source) {
      return mutate("accept_all", Object.fromEntries(optionalPurposes2.map((purpose) => [purpose.id, "granted"])), source);
    },
    rejectOptional(source) {
      const choices = Object.fromEntries(optionalPurposes2.map((purpose) => [purpose.id, "denied"]));
      return mutate("reject_optional", choices, source);
    },
    setGpc(enabled, source = "sec-gpc") {
      snapshot = { ...snapshot, signals: { ...snapshot.signals, gpc: Boolean(enabled) }, updatedAt: now() };
      record("gpc_observed", { enabled: Boolean(enabled), source });
      publish();
    },
    evaluate(purposeId, evalOptions) {
      const decision = evaluatePurpose(policy, snapshot, purposeId, { now, ...evalOptions });
      record("decision_evaluated", { purposeId, outcome: decision.outcome, reason: decision.reason });
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
var MANAGED_SELECTOR = 'script[type="text/plain"][data-openconsent-purpose]';
var GOOGLE_COOKIE_PREFIXES = ["_ga", "_gid", "_gat", "_gcl_", "_gac_"];
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
    privacy: "Privacy policy"
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
    privacy: "\u9690\u79C1\u653F\u7B56"
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
  style.textContent = styles;
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
  let settingsOpen = false;
  let previouslyFocused = null;
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
    dialog.innerHTML = `<div class="oc-dialog-head"><div><h2 id="oc-dialog-title">${escapeHtml(t.dialogTitle)}</h2><p class="oc-dialog-intro">${escapeHtml(t.dialogText)}</p></div></div><div class="oc-purposes"></div><div class="oc-dialog-footer"></div>`;
    const close = button("\xD7", "oc-icon-button", hideSettings);
    close.setAttribute("aria-label", t.close);
    dialog.querySelector(".oc-dialog-head").append(close);
    const purposeList = dialog.querySelector(".oc-purposes");
    const snapshot = client.getSnapshot();
    for (const purpose of client.policy.purposes) {
      const [name, description] = purposeCopy(purpose, locale);
      const row = document.createElement("div");
      row.className = "oc-purpose";
      const copy = document.createElement("div");
      copy.innerHTML = `<strong>${escapeHtml(name)}</strong><p>${escapeHtml(description)}</p>`;
      row.append(copy);
      if (!purpose.optional || purpose.legalBasis !== "consent") {
        const required = document.createElement("span");
        required.className = "oc-status";
        required.textContent = t.required;
        row.append(required);
      } else {
        const label = document.createElement("label");
        label.className = "oc-switch";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = purpose.id;
        input.checked = snapshot.choices[purpose.id] === "granted";
        input.disabled = isGpcPurpose(purpose, snapshot.signals.gpc);
        input.setAttribute("aria-label", name);
        if (input.disabled) {
          input.checked = false;
          label.title = t.gpc;
        }
        label.append(input, document.createElement("span"));
        row.append(label);
      }
      purposeList.append(row);
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
      const choices = {};
      for (const purpose of optionalPurposes(client.policy)) {
        const input = dialog.querySelector(`input[name="${cssEscape(purpose.id)}"]`);
        choices[purpose.id] = input?.checked && !input.disabled ? "granted" : "denied";
      }
      client.savePreferences(choices, "preference-center");
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
  }
  function hide() {
    banner?.classList.add("oc-hidden");
  }
  function showSettings() {
    mount();
    previouslyFocused = document.activeElement;
    settingsOpen = true;
    renderDialog();
  }
  function hideSettings() {
    settingsOpen = false;
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
      host = banner = backdrop = null;
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
function cssEscape(value) {
  return globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
function createManagedScripts(runtime) {
  const records = /* @__PURE__ */ new Map();
  let observer = null;
  let stopped = false;
  let generation = 0;
  function discover() {
    for (const source of document.querySelectorAll(MANAGED_SELECTOR)) {
      if (!records.has(source)) records.set(source, { source, active: null, controller: null, generation: 0 });
    }
  }
  function allowed(purposeId) {
    return runtime.evaluate(purposeId).outcome === "allow";
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
    if (stopped || record.generation !== activationGeneration || !record.source.isConnected || !allowed(record.source.dataset.openconsentPurpose)) {
      if (record.generation === activationGeneration) record.controller = null;
      return;
    }
    const active = document.createElement("script");
    for (const { name, value } of record.source.attributes) {
      if (!["type", "data-openconsent-src", "data-openconsent-purpose"].includes(name)) active.setAttribute(name, value);
    }
    active.dataset.openconsentActivated = record.source.dataset.openconsentPurpose;
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
      const purposeId = record.source.dataset.openconsentPurpose;
      if (allowed(purposeId)) void activate(record);
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
function ensureGtag() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
  return window.gtag;
}
function clearGoogleCookies() {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (!name || !GOOGLE_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;
    const hostParts = location.hostname.split(".");
    const domains = ["", location.hostname, `.${location.hostname}`];
    if (hostParts.length > 2) domains.push(`.${hostParts.slice(-2).join(".")}`);
    for (const domain of new Set(domains)) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? `; domain=${domain}` : ""}`;
    }
  }
}
function createGoogleIntegration(runtime, integrations = {}) {
  const analytics = integrations.ga4;
  const ads = integrations.googleAds;
  if (!analytics && !ads) return { reconcile() {
  }, destroy() {
  } };
  const gtag = ensureGtag();
  const denied = {
    ad_storage: "denied",
    analytics_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500
  };
  gtag("consent", "default", denied);
  gtag("set", "ads_data_redaction", true);
  let loader = null;
  let lastPermissions = { analyticsAllowed: false, adsAllowed: false };
  let configuredLoader = null;
  function isAllowed(purposeId) {
    return runtime.evaluate(purposeId).outcome === "allow";
  }
  function reconcile() {
    const analyticsAllowed = Boolean(analytics && isAllowed(analytics.purposeId || "optional-analytics"));
    const adsAllowed = Boolean(ads && isAllowed(ads.purposeId || "personalized-ads"));
    const changed = analyticsAllowed !== lastPermissions.analyticsAllowed || adsAllowed !== lastPermissions.adsAllowed;
    if (changed) {
      gtag("consent", "update", {
        analytics_storage: analyticsAllowed ? "granted" : "denied",
        ad_storage: adsAllowed ? "granted" : "denied",
        ad_user_data: adsAllowed ? "granted" : "denied",
        ad_personalization: adsAllowed ? "granted" : "denied"
      });
    }
    if (!analyticsAllowed && !adsAllowed) {
      loader?.remove();
      loader = null;
      configuredLoader = null;
      clearGoogleCookies();
      lastPermissions = { analyticsAllowed, adsAllowed };
      return;
    }
    if (!loader) {
      loader = document.createElement("script");
      loader.async = true;
      loader.dataset.openconsentGoogle = "";
      const primaryId = analyticsAllowed ? analytics.measurementId : ads.tagId;
      loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryId)}`;
      document.head.append(loader);
    }
    if (configuredLoader !== loader) {
      gtag("js", /* @__PURE__ */ new Date());
      if (analyticsAllowed) gtag("config", analytics.measurementId);
      if (adsAllowed) gtag("config", ads.tagId);
      configuredLoader = loader;
    } else {
      if (analyticsAllowed && !lastPermissions.analyticsAllowed) gtag("config", analytics.measurementId);
      if (adsAllowed && !lastPermissions.adsAllowed) gtag("config", ads.tagId);
    }
    lastPermissions = { analyticsAllowed, adsAllowed };
  }
  return {
    reconcile,
    destroy() {
      gtag("consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      loader?.remove();
      clearGoogleCookies();
    }
  };
}
function createClient(options, policy) {
  const storage = safeStorage();
  const storageKey = storageKeyFor(options, policy);
  const persisted = readPreference(storage, storageKey, policy);
  const gpc = safeGpc();
  const runtime = createOpenConsent({ policy, subjectRef: options.subjectRef || "browser", gpc });
  let hasSavedPreference = Boolean(persisted) && optionalPurposes(policy).every(
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
  let google;
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
    google?.reconcile();
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
      google?.destroy();
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
  google = createGoogleIntegration(runtime, options.integrations);
  suppressPublish = false;
  const start = () => {
    if (destroyed) return;
    view.mount();
    managedScripts.reconcile();
    google.reconcile();
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
    },
    integrations: options.integrations || {}
  });
  if (activeClient && activeFingerprint === fingerprint) return activeClient;
  activeClient?.destroy();
  activeClient = createClient({ locale: "en", autoShow: true, banner: {}, integrations: {}, ...options }, policy);
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
