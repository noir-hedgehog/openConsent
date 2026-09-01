import { createOpenConsent } from '@openconsent/core';

const STORAGE_SCHEMA_VERSION = 1;
const DEFAULT_STORAGE_PREFIX = 'openconsent';
const CHANGE_EVENT = 'openconsent:change';
const MANAGED_SELECTOR = 'script[type="text/plain"][data-openconsent-purpose],script[type="text/plain"][data-openconsent-service]';

const messages = {
  en: {
    bannerTitle: 'Your privacy choices',
    bannerText: 'We use required technology to run this site. With your permission, we can also use optional analytics and advertising.',
    accept: 'Accept all',
    reject: 'Reject optional',
    settings: 'Manage preferences',
    dialogTitle: 'Privacy preferences',
    dialogText: 'Choose which optional purposes you allow. You can change these choices at any time.',
    required: 'Always active',
    gpc: 'Disabled by your Global Privacy Control signal',
    save: 'Save preferences',
    close: 'Close',
    privacy: 'Privacy policy', trigger: 'Privacy settings', consent: 'Consent', details: 'Details', services: 'Services', trackers: 'Trackers', about: 'About',
    noServices: 'No services are declared.', noTrackers: 'No trackers are declared.', providedBy: 'Provided by', lastUpdated: 'Last updated', notice: 'Notice version', contact: 'Privacy contact', gpcStatus: 'Global Privacy Control', withdraw: 'Use this button at any time to review or withdraw consent.'
  },
  zh: {
    bannerTitle: '你的隐私选择',
    bannerText: '我们使用必要技术来运行此网站。经你允许，我们也可以使用可选的分析和广告功能。',
    accept: '全部接受',
    reject: '拒绝可选项',
    settings: '管理偏好',
    dialogTitle: '隐私偏好',
    dialogText: '选择你允许的可选用途。你可以随时更改这些选择。',
    required: '始终启用',
    gpc: '已由你的全局隐私控制信号停用',
    save: '保存偏好',
    close: '关闭',
    privacy: '隐私政策', trigger: '隐私设置', consent: '同意', details: '详情', services: '服务', trackers: '追踪器', about: '关于',
    noServices: '未声明服务。', noTrackers: '未声明追踪器。', providedBy: '供应商', lastUpdated: '最近更新', notice: '通知版本', contact: '隐私联系人', gpcStatus: '全局隐私控制', withdraw: '你可以随时使用此按钮查看或撤回同意。'
  }
};

const purposeNames = {
  en: {
    'optional-analytics': ['Analytics', 'Helps us understand product usage and improve the experience.'],
    'personalized-ads': ['Personalized advertising', 'Allows advertising measurement and personalization.']
  },
  zh: {
    'optional-analytics': ['分析', '帮助我们了解产品使用情况并改进体验。'],
    'personalized-ads': ['个性化广告', '允许广告衡量和个性化。']
  }
};

const styles = `
.oc-root,.oc-root *{box-sizing:border-box}.oc-root{--oc-bg:#fff;--oc-panel:#f7f7f4;--oc-text:#161815;--oc-muted:#5e625c;--oc-border:#d9ddd5;--oc-accent:#176b45;--oc-accent-text:#fff;position:relative;z-index:2147483000;color:var(--oc-text);font:14px/1.5 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.oc-root[data-theme=dark]{--oc-bg:#171a17;--oc-panel:#222622;--oc-text:#f5f7f3;--oc-muted:#b7bdb4;--oc-border:#3b423a;--oc-accent:#65d39a;--oc-accent-text:#102018}@media(prefers-color-scheme:dark){.oc-root[data-theme=auto]{--oc-bg:#171a17;--oc-panel:#222622;--oc-text:#f5f7f3;--oc-muted:#b7bdb4;--oc-border:#3b423a;--oc-accent:#65d39a;--oc-accent-text:#102018}}.oc-banner{position:fixed;left:16px;right:16px;margin:auto;max-width:1120px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;padding:22px 24px;background:var(--oc-bg);border:1px solid var(--oc-border);border-radius:14px;box-shadow:0 18px 55px rgba(0,0,0,.18)}.oc-banner[data-position=bottom]{bottom:16px}.oc-banner[data-position=top]{top:16px}.oc-copy h2,.oc-dialog h2{font-size:18px;line-height:1.25;margin:0 0 6px}.oc-copy p,.oc-dialog-intro{color:var(--oc-muted);margin:0;max-width:720px}.oc-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.oc-button{appearance:none;border:1px solid var(--oc-border);border-radius:9px;background:var(--oc-bg);color:var(--oc-text);cursor:pointer;font:600 14px/1.2 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:11px 14px}.oc-button:hover{background:var(--oc-panel)}.oc-button:focus-visible,.oc-switch input:focus-visible+span{outline:3px solid color-mix(in srgb,var(--oc-accent) 45%,transparent);outline-offset:2px}.oc-primary{border-color:var(--oc-accent);background:var(--oc-accent);color:var(--oc-accent-text)}.oc-primary:hover{filter:brightness(.96);background:var(--oc-accent)}.oc-backdrop{position:fixed;inset:0;display:grid;place-items:center;padding:18px;background:rgba(12,15,12,.55)}.oc-dialog{width:min(620px,100%);max-height:min(760px,calc(100vh - 36px));overflow:auto;background:var(--oc-bg);border:1px solid var(--oc-border);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.28);padding:24px}.oc-dialog-head{display:flex;align-items:start;justify-content:space-between;gap:20px}.oc-icon-button{appearance:none;border:0;background:transparent;color:var(--oc-text);cursor:pointer;font-size:24px;line-height:1;padding:2px 6px}.oc-purposes{display:grid;gap:10px;margin:20px 0}.oc-purpose{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:15px;background:var(--oc-panel);border:1px solid var(--oc-border);border-radius:11px}.oc-purpose strong{display:block;margin-bottom:2px}.oc-purpose p{color:var(--oc-muted);font-size:13px;margin:0}.oc-status{color:var(--oc-muted);font-size:12px;font-weight:700;white-space:nowrap}.oc-switch{display:inline-flex;align-items:center;cursor:pointer}.oc-switch input{position:absolute;opacity:0;pointer-events:none}.oc-switch span{width:42px;height:24px;border-radius:999px;background:#92978f;position:relative;transition:.16s ease}.oc-switch span:after{content:"";position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:.16s ease}.oc-switch input:checked+span{background:var(--oc-accent)}.oc-switch input:checked+span:after{transform:translateX(18px)}.oc-switch input:disabled+span{cursor:not-allowed;opacity:.48}.oc-dialog-footer{display:flex;align-items:center;justify-content:space-between;gap:12px}.oc-dialog-footer a{color:var(--oc-accent);font-weight:600}.oc-hidden{display:none!important}@media(max-width:760px){.oc-banner{grid-template-columns:1fr;gap:16px;left:10px;right:10px;padding:18px}.oc-actions{justify-content:stretch}.oc-actions .oc-button{flex:1 1 auto}.oc-dialog{padding:20px}.oc-dialog-footer{align-items:stretch;flex-direction:column}.oc-dialog-footer .oc-button{width:100%}}
`;
const catalogStyles = `.oc-tabs{display:flex;gap:4px;margin:20px 0 12px;padding:4px;background:var(--oc-panel);border-radius:10px}.oc-tab{flex:1;border:0;border-radius:7px;padding:9px;background:transparent;color:var(--oc-muted);font-weight:700;cursor:pointer}.oc-tab[aria-selected=true]{background:var(--oc-bg);color:var(--oc-text);box-shadow:0 1px 4px rgba(0,0,0,.1)}.oc-catalog-list{display:grid;gap:10px;margin:0 0 20px}.oc-catalog-row{padding:15px;background:var(--oc-panel);border:1px solid var(--oc-border);border-radius:11px}.oc-catalog-row-head{display:flex;justify-content:space-between;align-items:center;gap:16px}.oc-catalog-row strong{display:block}.oc-catalog-row p,.oc-catalog-row small{color:var(--oc-muted);margin:3px 0 0;font-size:12px}.oc-purpose-detail{margin-top:12px;padding-top:10px;border-top:1px solid var(--oc-border)}.oc-detail-tree{display:grid;gap:4px;margin:10px 0 0 12px;padding-left:12px;border-left:2px solid var(--oc-border)}.oc-detail-tree p{color:var(--oc-text)}.oc-badge{border-radius:999px;padding:4px 8px;background:var(--oc-bg);color:var(--oc-muted);font-size:11px}.oc-empty{padding:24px;text-align:center;color:var(--oc-muted)}.oc-meta{display:flex;gap:12px;flex-wrap:wrap;color:var(--oc-muted);font-size:11px;margin-top:10px}.oc-privacy-trigger{position:fixed;right:16px;bottom:16px;border:1px solid var(--oc-border);border-radius:999px;background:var(--oc-bg);color:var(--oc-text);box-shadow:0 8px 25px rgba(0,0,0,.16);padding:10px 14px;font-weight:700;cursor:pointer}.oc-banner:not(.oc-hidden)~.oc-privacy-trigger{display:none}`;

let activeClient = null;
let activeFingerprint = null;

function assertBrowser() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('@openconsent/web requires a browser environment');
  }
}

function normalizePolicy(options) {
  if (!options?.policy || !Array.isArray(options.policy.purposes)) {
    throw new TypeError('OpenConsent.init requires a policy with a purposes array');
  }
  const policy = {
    ...options.policy,
    projectId: options.projectId || options.policy.projectId,
    purposes: options.policy.purposes.map((purpose) => ({ ...purpose }))
  };
  for (const field of ['projectId', 'policyVersion', 'noticeVersion', 'manifestDigest']) {
    if (typeof policy[field] !== 'string' || !policy[field]) throw new TypeError(`policy.${field} must be a non-empty string`);
  }
  const ids = new Set();
  for (const purpose of policy.purposes) {
    if (!purpose?.id || ids.has(purpose.id)) throw new TypeError('Every policy purpose requires a unique id');
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
    const probe = '__openconsent_probe__';
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
    const validChoice = (choice) => ['granted', 'denied', 'unset'].includes(choice);
    const valid = value
      && value.schemaVersion === STORAGE_SCHEMA_VERSION
      && value.projectId === policy.projectId
      && value.policyVersion === policy.policyVersion
      && value.noticeVersion === policy.noticeVersion
      && value.choices && typeof value.choices === 'object'
      && Object.values(value.choices).every(validChoice);
    if (!valid) throw new Error('stale or invalid preference');
    return value;
  } catch {
    try { storage.removeItem(key); } catch {}
    return null;
  }
}

function isGpcPurpose(purpose, gpc) {
  return Boolean(gpc && (purpose.sale || purpose.sharing));
}

function optionalPurposes(policy) {
  return policy.purposes.filter((purpose) => purpose.optional && purpose.legalBasis === 'consent');
}

function publicReceipt(receipt) {
  return { ...receipt, storage: 'browser-localStorage' };
}

function addStyle(root) {
  const style = document.createElement('style');
  style.dataset.openconsentStyle = '';
  style.textContent = styles + catalogStyles;
  root.append(style);
}

function resolveContainer(container) {
  if (container instanceof HTMLElement) return container;
  if (typeof container === 'string') return document.querySelector(container);
  return document.body;
}

function purposeCopy(purpose, locale) {
  const declared = purpose.label;
  const description = purpose.description;
  const fallback = purposeNames[locale]?.[purpose.id] || purposeNames.en[purpose.id] || [purpose.id, 'Optional processing purpose.'];
  if (declared && typeof declared === 'object') return [declared[locale] || declared.en || purpose.id, description?.[locale] || description?.en || fallback[1]];
  return [declared || fallback[0], typeof description === 'string' ? description : fallback[1]];
}

function createView(client, options) {
  let host = null;
  let banner = null;
  let backdrop = null;
  let trigger = null;
  let settingsOpen = false;
  let previouslyFocused = null;
  let activeTab = 'consent';
  let draftChoices = null;
  const locale = messages[options.locale] ? options.locale : 'en';
  const t = messages[locale];

  function mount() {
    if (host?.isConnected) return;
    const container = resolveContainer(options.banner?.container);
    if (!container) return;
    host = document.createElement('div');
    host.className = 'oc-root';
    host.dataset.theme = options.banner?.theme || 'auto';
    host.dataset.openconsentRoot = '';
    addStyle(host);
    container.append(host);
    if (options.banner?.privacyTrigger !== false) {
      trigger = button(t.trigger, 'oc-privacy-trigger', () => showSettings());
      trigger.setAttribute('aria-label', t.trigger);
      host.append(trigger);
    }
    render();
  }

  function renderBanner() {
    banner?.remove();
    banner = document.createElement('section');
    banner.className = 'oc-banner';
    banner.dataset.position = options.banner?.position || 'bottom';
    banner.setAttribute('aria-label', t.bannerTitle);
    banner.innerHTML = `<div class="oc-copy"><h2>${escapeHtml(t.bannerTitle)}</h2><p>${escapeHtml(t.bannerText)}</p></div><div class="oc-actions"></div>`;
    const actions = banner.querySelector('.oc-actions');
    actions.append(
      button(t.settings, 'oc-button', () => showSettings()),
      button(t.reject, 'oc-button', () => client.rejectOptional('banner')),
      button(t.accept, 'oc-button oc-primary', () => client.acceptAll('banner'))
    );
    host.append(banner);
  }

  function renderDialog() {
    backdrop?.remove();
    backdrop = document.createElement('div');
    backdrop.className = 'oc-backdrop';
    backdrop.addEventListener('mousedown', (event) => {
      if (event.target === backdrop) hideSettings();
    });
    const dialog = document.createElement('section');
    dialog.className = 'oc-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'oc-dialog-title');
    dialog.innerHTML = `<div class="oc-dialog-head"><div><h2 id="oc-dialog-title">${escapeHtml(t.dialogTitle)}</h2><p class="oc-dialog-intro">${escapeHtml(t.dialogText)}</p></div></div><div class="oc-tabs" role="tablist"></div><div class="oc-tabpanel" role="tabpanel"></div><div class="oc-dialog-footer"></div>`;
    const close = button('×', 'oc-icon-button', hideSettings);
    close.setAttribute('aria-label', t.close);
    dialog.querySelector('.oc-dialog-head').append(close);
    const tabs = dialog.querySelector('.oc-tabs');
    for (const [id, label] of [['consent', t.consent], ['details', t.details], ['about', t.about]]) {
      const tab = button(label, 'oc-tab', () => { activeTab = id; renderDialog(); });
      tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(activeTab === id)); tabs.append(tab);
    }
    const panel = dialog.querySelector('.oc-tabpanel');
    const catalog = client.getCatalog();
    const snapshot = client.getSnapshot();
    if (!draftChoices) draftChoices = Object.fromEntries(optionalPurposes(client.policy).map((purpose) => [purpose.id, snapshot.choices[purpose.id] === 'granted' ? 'granted' : 'denied']));
    if (activeTab === 'consent') {
      const list = document.createElement('div'); list.className = 'oc-catalog-list';
      for (const category of catalog.categories) {
        const row = document.createElement('div'); row.className = 'oc-catalog-row';
        const head = document.createElement('div'); head.className = 'oc-catalog-row-head';
        const copy = document.createElement('div'); copy.innerHTML = `<strong>${escapeHtml(category.label)}</strong>${category.description ? `<p>${escapeHtml(category.description)}</p>` : ''}`; head.append(copy);
        const purposes = category.purposeIds.map((id) => client.policy.purposes.find((purpose) => purpose.id === id)).filter(Boolean);
        const optional = purposes.filter((purpose) => purpose.optional && purpose.legalBasis === 'consent');
        if (category.required || !optional.length) { const badge = document.createElement('span'); badge.className = 'oc-badge'; badge.textContent = t.required; head.append(badge); }
        else {
          const label = document.createElement('label'); label.className = 'oc-switch'; const input = document.createElement('input'); input.type = 'checkbox'; input.name = `category:${category.id}`;
          input.checked = optional.every((purpose) => draftChoices[purpose.id] === 'granted' && !isGpcPurpose(purpose, snapshot.signals.gpc)); input.indeterminate = optional.some((purpose) => draftChoices[purpose.id] === 'granted') && !input.checked; input.setAttribute('aria-label', category.label);
          input.addEventListener('change', () => { for (const purpose of optional) draftChoices[purpose.id] = input.checked && !isGpcPurpose(purpose, snapshot.signals.gpc) ? 'granted' : 'denied'; renderDialog(); }); label.append(input, document.createElement('span')); head.append(label);
        }
        row.append(head);
        for (const purpose of purposes) {
          const [name, description] = purposeCopy(purpose, locale); const purposeRow = document.createElement('div'); purposeRow.className = 'oc-catalog-row-head oc-purpose-detail';
          const purposeCopyNode = document.createElement('div'); purposeCopyNode.innerHTML = `<small>${escapeHtml(name)}</small>${description ? `<p>${escapeHtml(description)}</p>` : ''}`; purposeRow.append(purposeCopyNode);
          if (!purpose.optional || purpose.legalBasis !== 'consent') { const badge = document.createElement('span'); badge.className = 'oc-badge'; badge.textContent = t.required; purposeRow.append(badge); }
          else { const label = document.createElement('label'); label.className = 'oc-switch'; const input = document.createElement('input'); input.type = 'checkbox'; input.checked = draftChoices[purpose.id] === 'granted'; input.disabled = isGpcPurpose(purpose, snapshot.signals.gpc); input.setAttribute('aria-label', name); if (input.disabled) { input.checked = false; label.title = t.gpc; } input.addEventListener('change', () => { draftChoices[purpose.id] = input.checked ? 'granted' : 'denied'; }); label.append(input, document.createElement('span')); purposeRow.append(label); }
          row.append(purposeRow);
        }
        list.append(row);
      }
      panel.append(list);
    } else if (activeTab === 'details') {
      const list = document.createElement('div'); list.className = 'oc-catalog-list';
      for (const category of catalog.categories) {
        const row = document.createElement('div'); row.className = 'oc-catalog-row'; row.innerHTML = `<strong>${escapeHtml(category.label)}</strong>`;
        for (const purposeId of category.purposeIds) {
          const purpose = client.policy.purposes.find((entry) => entry.id === purposeId); if (!purpose) continue; const [purposeName] = purposeCopy(purpose, locale); const block = document.createElement('div'); block.className = 'oc-detail-tree'; block.innerHTML = `<small>${escapeHtml(purposeName)} · ${escapeHtml(purpose.legalBasis)}</small>`;
          for (const service of catalog.services.filter((entry) => entry.categoryIds.includes(category.id) && entry.purposeIds.includes(purposeId))) { const vendor = catalog.vendors.find((entry) => entry.id === service.vendorId); const serviceLine = document.createElement('p'); serviceLine.innerHTML = `<b>${escapeHtml(service.name)}</b>${vendor ? ` · ${escapeHtml(t.providedBy)} ${escapeHtml(vendor.name)}` : ''}`; block.append(serviceLine); for (const tracker of catalog.trackers.filter((entry) => service.trackerIds.includes(entry.id) && entry.purposeIds.includes(purposeId))) { const trackerLine = document.createElement('small'); trackerLine.textContent = `↳ ${tracker.name} · ${tracker.kind}${tracker.firstParty ? ' · first party' : ' · third party'}${tracker.domain ? ` · ${tracker.domain}` : ''}${tracker.duration ? ` · ${tracker.duration}` : ''}`; block.append(trackerLine); } }
          row.append(block);
        }
        list.append(row);
      }
      panel.append(list);
    } else {
      const about = document.createElement('div'); about.className = 'oc-catalog-row';
      const privacyUrl = options.banner?.privacyPolicyUrl || catalog.privacyPolicyUrl;
      about.innerHTML = `<strong>${escapeHtml(catalog.projectId)}</strong><p>${escapeHtml(t.notice)}: ${escapeHtml(catalog.noticeVersion)}</p>${catalog.contact ? `<p>${escapeHtml(t.contact)}: ${escapeHtml(catalog.contact)}</p>` : ''}<p>${escapeHtml(t.gpcStatus)}: ${snapshot.signals.gpc ? 'ON' : 'OFF'}</p><p>${escapeHtml(t.withdraw)}</p>${privacyUrl ? `<p><a href="${escapeHtml(privacyUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.privacy)}</a></p>` : ''}<div class="oc-meta"><span>Policy ${escapeHtml(catalog.policyVersion)}</span>${catalog.updatedAt ? `<span>${escapeHtml(t.lastUpdated)}: ${escapeHtml(catalog.updatedAt)}</span>` : ''}<span>${catalog.services.length} ${escapeHtml(t.services.toLowerCase())}</span><span>${catalog.trackers.length} ${escapeHtml(t.trackers.toLowerCase())}</span></div>`;
      panel.append(about);
    }
    const footer = dialog.querySelector('.oc-dialog-footer');
    if (options.banner?.privacyPolicyUrl) {
      const link = document.createElement('a');
      link.href = options.banner.privacyPolicyUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = t.privacy;
      footer.append(link);
    } else footer.append(document.createElement('span'));
    footer.append(button(t.save, 'oc-button oc-primary', () => {
      if (Object.keys(draftChoices).length) client.savePreferences(draftChoices, 'preference-center');
      hideSettings();
    }));
    backdrop.append(dialog);
    host.append(backdrop);
    dialog.addEventListener('keydown', trapDialogFocus);
    queueMicrotask(() => close.focus());
  }

  function render() {
    if (!host) return;
    if (settingsOpen) renderDialog();
  }

  function show() {
    mount();
    if (!banner) renderBanner();
    banner.classList.remove('oc-hidden');
    trigger?.classList.add('oc-hidden');
  }

  function hide() {
    banner?.classList.add('oc-hidden');
    trigger?.classList.remove('oc-hidden');
  }

  function showSettings() {
    mount();
    previouslyFocused = document.activeElement;
    settingsOpen = true;
    activeTab = 'consent';
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
    if (event.key === 'Escape') return hideSettings();
    if (event.key !== 'Tab') return;
    const focusable = [...event.currentTarget.querySelectorAll('button,a[href],input:not([disabled])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return {
    mount,
    show,
    hide,
    showSettings,
    hideSettings,
    refresh() { if (settingsOpen) renderDialog(); },
    destroy() { backdrop?.remove(); host?.remove(); host = banner = backdrop = trigger = null; }
  };
}

function button(label, className, onClick) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.textContent = label;
  element.addEventListener('click', onClick);
  return element;
}

function escapeHtml(value) {
  const span = document.createElement('span');
  span.textContent = String(value);
  return span.innerHTML;
}

function cssEscape(value) {
  return globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function createManagedScripts(runtime) {
  const catalog = runtime.getCatalog();
  const records = new Map();
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
      if (!service) { source.dataset.openconsentError = 'unknown-service'; return null; }
      if (purposeId && !service.purposeIds.includes(purposeId)) { source.dataset.openconsentError = 'service-purpose-mismatch'; return null; }
      delete source.dataset.openconsentError;
      return purposeId ? [purposeId] : service.purposeIds;
    }
    if (purposeId) { delete source.dataset.openconsentError; return [purposeId]; }
    source.dataset.openconsentError = 'missing-service-or-purpose';
    return null;
  }

  function allowed(source) {
    const purposeIds = requirements(source);
    return Boolean(purposeIds?.length) && purposeIds.every((purposeId) => runtime.evaluate(purposeId).outcome === 'allow');
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
          credentials: record.source.dataset.openconsentCrossorigin === 'use-credentials' ? 'include' : 'same-origin',
          integrity: record.source.dataset.openconsentIntegrity || undefined
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        sourceText = `${await response.text()}\n//# sourceURL=${new URL(sourceUrl, document.baseURI).href}`;
      } catch (error) {
        if (error?.name !== 'AbortError') {
          record.source.dataset.openconsentError = 'load-failed';
          console.warn('[openConsent] managed script stayed blocked because it could not be fetched safely', error);
        }
        if (record.generation === activationGeneration) record.controller = null;
        return;
      }
    }
    if (stopped || record.generation !== activationGeneration || !record.source.isConnected || !allowed(record.source)) {
      if (record.generation === activationGeneration) record.controller = null;
      return;
    }
    const active = document.createElement('script');
    for (const { name, value } of record.source.attributes) {
      if (!['type', 'data-openconsent-src', 'data-openconsent-purpose', 'data-openconsent-service'].includes(name)) active.setAttribute(name, value);
    }
    active.dataset.openconsentActivated = record.source.dataset.openconsentService || record.source.dataset.openconsentPurpose;
    if (record.source.dataset.openconsentService) active.dataset.openconsentActivatedService = record.source.dataset.openconsentService;
    if (record.source.dataset.openconsentPurpose) active.dataset.openconsentActivatedPurpose = record.source.dataset.openconsentPurpose;
    active.type = record.source.dataset.openconsentType || 'text/javascript';
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
    if (wasActive && cleanupName && typeof window[cleanupName] === 'function') {
      try { window[cleanupName](); } catch (error) { console.warn('[openConsent] managed script cleanup failed', error); }
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
  const runtime = createOpenConsent({ policy, subjectRef: options.subjectRef || 'browser', gpc, locale: options.locale });
  let hasSavedPreference = optionalPurposes(policy).length === 0 || Boolean(persisted) && optionalPurposes(policy).every(
    (purpose) => ['granted', 'denied'].includes(persisted.choices[purpose.id])
  );
  let destroyed = false;
  let suppressPublish = true;
  const listeners = new Set();

  if (persisted) {
    for (const purpose of optionalPurposes(policy)) {
      const choice = persisted.choices[purpose.id];
      if (choice === 'granted' || choice === 'denied') runtime.setChoice(purpose.id, isGpcPurpose(purpose, gpc) ? 'denied' : choice, 'storage-restore');
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
    try { storage?.setItem(storageKey, JSON.stringify(value)); } catch {}
  }

  function finalize(rawReceipt, action, source) {
    const receipt = publicReceipt({
      ...rawReceipt,
      action,
      source,
      choices: { ...runtime.getSnapshot().choices },
      signalsObserved: { gpc }
    });
    hasSavedPreference = optionalPurposes(policy).every((purpose) => ['granted', 'denied'].includes(receipt.choices[purpose.id]));
    persist(receipt);
    emit(receipt);
    if (hasSavedPreference) view?.hide();
    if (!suppressPublish) options.onPreferenceChange?.(receipt);
    return receipt;
  }

  function commitChoices(choices, action, source) {
    if (destroyed) throw new Error('This openConsent client has been destroyed');
    let rawReceipt = null;
    for (const purpose of optionalPurposes(policy)) {
      if (!(purpose.id in choices)) continue;
      const requested = choices[purpose.id];
      if (!['granted', 'denied'].includes(requested)) throw new TypeError('choice must be granted or denied');
      const effective = isGpcPurpose(purpose, gpc) ? 'denied' : requested;
      rawReceipt = runtime.setChoice(purpose.id, effective, source);
    }
    if (!rawReceipt) throw new TypeError('No known optional consent purpose was provided');
    return finalize(rawReceipt, action, source);
  }

  const client = {
    policy,
    getCatalog: () => runtime.getCatalog(),
    getSnapshot: snapshot,
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('listener must be a function');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    evaluate: (purposeId) => runtime.evaluate(purposeId),
    show: () => view.show(),
    showSettings: () => view.showSettings(),
    hide: () => view.hide(),
    acceptAll(source = 'api') {
      const choices = Object.fromEntries(optionalPurposes(policy).map((purpose) => [purpose.id, 'granted']));
      return commitChoices(choices, 'accept_all', source);
    },
    rejectOptional(source = 'api') {
      const rawReceipt = runtime.rejectOptional(source);
      return finalize(rawReceipt, 'reject_optional', source);
    },
    setChoice(purposeId, choice, source = 'api') {
      return commitChoices({ [purposeId]: choice }, choice === 'granted' ? 'save' : 'withdraw', source);
    },
    savePreferences(choices, source = 'preference-center') {
      return commitChoices(choices, 'save_preferences', source);
    },
    setCategory(categoryId, choice, source = 'api') {
      const rawReceipt = runtime.setCategory(categoryId, choice, source);
      return finalize(rawReceipt, choice === 'granted' ? 'save' : 'withdraw', source);
    },
    saveCategoryPreferences(choices, source = 'preference-center') {
      const rawReceipt = runtime.saveCategoryPreferences(choices, source);
      return finalize(rawReceipt, 'save_preferences', source);
    },
    reset() {
      if (destroyed) return;
      runtime.reset();
      runtime.setGpc(gpc, 'navigator.globalPrivacyControl');
      hasSavedPreference = false;
      try { storage?.removeItem(storageKey); } catch {}
      emit(null);
      view.show();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      managedScripts?.destroy();
      view?.destroy();
      listeners.clear();
      if (activeClient === client) { activeClient = null; activeFingerprint = null; }
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
  else document.addEventListener('DOMContentLoaded', start, { once: true });

  return client;
}

export function init(options) {
  assertBrowser();
  const policy = normalizePolicy(options);
  const fingerprint = JSON.stringify({
    policy,
    locale: options.locale || 'en',
    storageKey: storageKeyFor(options, policy),
    banner: {
      position: options.banner?.position || 'bottom',
      theme: options.banner?.theme || 'auto',
      privacyPolicyUrl: options.banner?.privacyPolicyUrl || null,
      container: typeof options.banner?.container === 'string' ? options.banner.container : null
    }
  });
  if (activeClient && activeFingerprint === fingerprint) return activeClient;
  activeClient?.destroy();
  activeClient = createClient({ locale: 'en', autoShow: true, banner: {}, ...options }, policy);
  activeFingerprint = fingerprint;
  return activeClient;
}

export function getActiveClient() {
  return activeClient;
}

export function autoInit(script) {
  if (typeof document === 'undefined') return null;
  const node = script === undefined ? document.currentScript : script;
  if (!(node instanceof HTMLScriptElement) || node.dataset.openconsentAutostart === 'false') return null;
  const configSource = node.dataset.openconsentConfig;
  if (!configSource || node.dataset.openconsentInitialized === 'true') return null;
  node.dataset.openconsentInitialized = 'true';
  return (async () => {
    let options;
    if (configSource.trim().startsWith('{')) options = JSON.parse(configSource);
    else {
      const response = await fetch(new URL(configSource, document.baseURI), { credentials: 'same-origin' });
      if (!response.ok) throw new Error(`Unable to load openConsent config (${response.status})`);
      options = await response.json();
    }
    return init(options);
  })().catch((error) => {
    node.dataset.openconsentInitialized = 'error';
    console.error('[openConsent] automatic initialization failed', error);
    throw error;
  });
}

const OpenConsent = { init, autoInit, getActiveClient };

export default OpenConsent;
