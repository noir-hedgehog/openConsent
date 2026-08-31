import { useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { DEFAULT_POLICY, evaluatePurpose } from '@openconsent/core';
import {
  Activity, ArrowRight, BarChart3, Bot, Braces, Check, CheckCircle2,
  ChevronRight, Clipboard, Code2, Cookie, ExternalLink, FileCheck2,
  Gauge, LockKeyhole, Megaphone, Menu, Network, Play, RotateCcw,
  ShieldCheck, Signal, Sparkles, Upload, X,
} from 'lucide-react';

type Choice = 'granted' | 'denied' | 'unset';
type Purpose = 'analytics' | 'sale-sharing';
type TagStatus = 'pre-blocked' | 'loading' | 'active' | 'cleaned' | 'error';
type ConsentMode = 'banner' | 'settings' | null;
type EventRow = { id: number; type: string; detail: string; at: string };
type Preferences = { policyVersion: string; noticeVersion: string; analytics: Choice; ads: Choice; savedAt?: string };

declare global {
  interface Window {
    __openConsentDemoVendors?: Record<string, { loadedAt: string }>;
    __openConsentDemoPermissions?: Record<Purpose, { allowed: boolean; generation: number }>;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __openConsentGoogleInitialized?: boolean;
  }
}

const POLICY_VERSION = DEFAULT_POLICY.policyVersion;
const NOTICE_VERSION = DEFAULT_POLICY.noticeVersion;
const STORAGE_KEY = 'openconsent_demo_preferences';
const emptyPreferences: Preferences = { policyVersion: POLICY_VERSION, noticeVersion: NOTICE_VERSION, analytics: 'unset', ads: 'unset' };
const repo = 'https://github.com/noir-hedgehog/openConsent';
const googleAnalyticsId = import.meta.env.VITE_GA_MEASUREMENT_ID ?? '';
const googleAdsId = import.meta.env.VITE_GOOGLE_ADS_ID ?? '';

const googleSnippets = {
  analytics: `<!-- Load only after optional-analytics is granted -->
<script type="text/plain" data-openconsent-purpose="optional-analytics"
  data-openconsent-src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>

openConsent.on('grant', 'optional-analytics', () => {
  gtag('config', 'G-XXXXXXX', { anonymize_ip: true });
});`,
  ads: `<!-- Load only after sale/sharing purpose is allowed -->
<script type="text/plain" data-openconsent-purpose="personalized-ads"
  data-openconsent-src="https://www.googletagmanager.com/gtag/js?id=AW-XXXXXXX"></script>

openConsent.on('grant', 'personalized-ads', () => {
  gtag('config', 'AW-XXXXXXX');
  gtag('event', 'conversion', { send_to: 'AW-XXXXXXX/label' });
});`,
};

const auditFindings = [
  { tone: 'pass', title: 'Consent gate found', detail: 'Optional analytics is declared and defaults to deny.' },
  { tone: 'pass', title: 'Google tags are purpose mapped', detail: 'GA4 and Ads are held inert until an explicit decision.' },
  { tone: 'review', title: 'Retention needs a human answer', detail: 'AI suggests a retention period; an owner must confirm the legal basis.' },
  { tone: 'review', title: 'Agent tool flow needs evidence', detail: 'Add the downstream processor and deletion path to the manifest.' },
];

const snippets = {
  React: `import { OpenConsentProvider, ConsentGate } from '@openconsent/react';\n\n<OpenConsentProvider options={{ policy }}>\n  <ConsentGate purpose="optional-analytics">\n    <Analytics />\n  </ConsentGate>\n</OpenConsentProvider>`,
  Vue: `app.use(createOpenConsentPlugin({ policy }))\n\nconst { can, save, rejectOptional } = useOpenConsent()\nawait save('optional-analytics', 'granted')`,
  Express: `app.use(openConsent({ policy, getSnapshot }))\n\napp.post('/analytics',\n  requirePurpose('optional-analytics'),\n  handler\n) // reads Sec-GPC server-side`,
  Spring: `OpenConsentDecision decision = evaluator.evaluate(\n  "optional-analytics", "consent",\n  false, gpc, choices\n);\n\nif (!decision.allowed()) deny();`,
};

function readInitialPreferences(): { preferences: Preferences; saved: boolean } {
  const realGpc = Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl);
  const fallback = realGpc ? { ...emptyPreferences, ads: 'denied' as Choice } : emptyPreferences;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { preferences: fallback, saved: false };
    const parsed = JSON.parse(raw) as Preferences;
    if (parsed.policyVersion !== POLICY_VERSION || parsed.noticeVersion !== NOTICE_VERSION) return { preferences: fallback, saved: false };
    if (!['granted', 'denied', 'unset'].includes(parsed.analytics) || !['granted', 'denied', 'unset'].includes(parsed.ads)) return { preferences: fallback, saved: false };
    const preferences = realGpc ? { ...parsed, ads: 'denied' as Choice } : parsed;
    if (realGpc) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Current-session GPC still fails closed. */ }
    }
    return { preferences, saved: Boolean(parsed.savedAt) };
  } catch {
    return { preferences: fallback, saved: false };
  }
}

const time = () => new Date().toLocaleTimeString('zh-CN', { hour12: false });
const cookiePresent = (name: string) => document.cookie.split(';').some((part) => part.trim().startsWith(`${name}=`));
const cookiePrefixPresent = (prefix: string) => document.cookie.split(';').some((part) => part.trim().startsWith(`${prefix}=`) || part.trim().startsWith(`${prefix}_`));
const cookiePath = () => import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
const coreSnapshot = (preferences: Preferences) => ({ policyVersion: preferences.policyVersion, choices: { 'optional-analytics': preferences.analytics, 'personalized-ads': preferences.ads }, signals: { gpc: false }, receiptId: null });
const coreDecision = (preferences: Preferences, purpose: Purpose, gpc: boolean) => evaluatePurpose(DEFAULT_POLICY, coreSnapshot(preferences), purpose === 'analytics' ? 'optional-analytics' : 'personalized-ads', { gpc });

export default function App() {
  const [initial] = useState(readInitialPreferences);
  const [preferences, setPreferences] = useState(initial.preferences);
  const [draft, setDraft] = useState(initial.preferences);
  const detectedGpc = Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl);
  const [simulatedGpc, setSimulatedGpc] = useState(false);
  const gpc = detectedGpc || simulatedGpc;
  const [consentMode, setConsentMode] = useState<ConsentMode>(initial.saved ? null : 'banner');
  const [tags, setTags] = useState<Record<Purpose, TagStatus>>({ analytics: 'pre-blocked', 'sale-sharing': 'pre-blocked' });
  const [events, setEvents] = useState<EventRow[]>([{ id: 1, type: 'bootstrap_ready', detail: '2 optional tags registered · 0 requested', at: time() }]);
  const [framework, setFramework] = useState<keyof typeof snippets>('React');
  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [auditRan, setAuditRan] = useState(false);
  const [integration, setIntegration] = useState<'analytics' | 'ads'>('analytics');
  const [cookieState, setCookieState] = useState({ analytics: cookiePresent('oc_demo_analytics'), ads: cookiePresent('oc_demo_ads') });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const eventId = useRef(2);

  const addEvent = (type: string, detail: string) => {
    setEvents((current) => [{ id: eventId.current++, type, detail, at: time() }, ...current].slice(0, 10));
  };

  const cleanupTag = (purpose: Purpose, cookieName: string, nextStatus: TagStatus) => {
    const prior = window.__openConsentDemoPermissions?.[purpose];
    window.__openConsentDemoPermissions ??= { analytics: { allowed: false, generation: 0 }, 'sale-sharing': { allowed: false, generation: 0 } };
    window.__openConsentDemoPermissions[purpose] = { allowed: false, generation: (prior?.generation ?? 0) + 1 };
    const hadResource = Boolean(document.getElementById(`oc-injected-${purpose}`)) || cookiePresent(cookieName);
    const configuredGoogleId = purpose === 'analytics' ? googleAnalyticsId : googleAdsId;
    if (configuredGoogleId && window.gtag) {
      window.gtag('consent', 'update', purpose === 'analytics'
        ? { analytics_storage: 'denied' }
        : { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    }
    document.getElementById(`oc-injected-${purpose}`)?.remove();
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${cookieName}=; Max-Age=0; path=${cookiePath()}; SameSite=Lax${secure}`;
    if (window.__openConsentDemoVendors) delete window.__openConsentDemoVendors[purpose === 'analytics' ? 'analytics' : 'ads'];
    setTags((current) => current[purpose] === nextStatus ? current : { ...current, [purpose]: nextStatus });
    setCookieState({ analytics: cookiePresent('oc_demo_analytics'), ads: cookiePresent('oc_demo_ads') });
    if (hadResource) addEvent('tag_cleaned', `${purpose} · future fixture execution denied · known cookie deleted`);
  };

  const activateTag = (purpose: Purpose, file: string) => {
    if (document.getElementById(`oc-injected-${purpose}`)) return;
    setTags((current) => ({ ...current, [purpose]: 'loading' }));
    addEvent('tag_allowed', `${purpose} · injecting managed script`);
    const script = document.createElement('script');
    window.__openConsentDemoPermissions ??= { analytics: { allowed: false, generation: 0 }, 'sale-sharing': { allowed: false, generation: 0 } };
    const generation = window.__openConsentDemoPermissions[purpose].generation + 1;
    window.__openConsentDemoPermissions[purpose] = { allowed: true, generation };
    script.id = `oc-injected-${purpose}`;
    const configuredGoogleId = purpose === 'analytics' ? googleAnalyticsId : googleAdsId;
    if (configuredGoogleId) {
      window.dataLayer ??= [];
      window.gtag ??= (...args: unknown[]) => window.dataLayer?.push(args);
      if (!window.__openConsentGoogleInitialized) {
        window.gtag('js', new Date());
        window.gtag('consent', 'default', {
          analytics_storage: 'denied', ad_storage: 'denied',
          ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500,
        });
        window.__openConsentGoogleInitialized = true;
      }
      window.gtag('consent', 'update', purpose === 'analytics'
        ? { analytics_storage: 'granted' }
        : { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
    }
    script.src = configuredGoogleId
      ? `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(configuredGoogleId)}`
      : `${import.meta.env.BASE_URL}vendors/${file}`;
    script.dataset.openconsentPurpose = purpose;
    script.dataset.openconsentGeneration = String(generation);
    script.onload = () => {
      const guard = window.__openConsentDemoPermissions?.[purpose];
      if (!guard?.allowed || guard.generation !== generation) return;
      if (configuredGoogleId) {
        window.gtag?.('config', configuredGoogleId, purpose === 'analytics' ? { anonymize_ip: true } : {});
        addEvent('google_tag_configured', `${purpose} · ${configuredGoogleId} · consent gate active`);
      }
      setCookieState({ analytics: cookiePresent('oc_demo_analytics'), ads: cookiePresent('oc_demo_ads') });
    };
    script.onerror = () => {
      const guard = window.__openConsentDemoPermissions?.[purpose];
      if (!guard?.allowed || guard.generation !== generation) return;
      script.remove();
      window.__openConsentDemoPermissions![purpose] = { allowed: false, generation: generation + 1 };
      setTags((current) => ({ ...current, [purpose]: 'error' }));
      addEvent('tag_load_failed', `${purpose} · remains denied; save choices to retry`);
    };
    document.head.appendChild(script);
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; purpose: Purpose; generation: number }>).detail;
      const guard = window.__openConsentDemoPermissions?.[detail.purpose];
      if (!guard?.allowed || guard.generation !== detail.generation) return;
      setTags((current) => ({ ...current, [detail.purpose]: 'active' }));
      setCookieState({ analytics: cookiePresent('oc_demo_analytics'), ads: cookiePresent('oc_demo_ads') });
      addEvent('managed_tag_loaded', `${detail.id} · cookie written after allow`);
    };
    window.addEventListener('openconsent:vendor-loaded', handler);
    return () => window.removeEventListener('openconsent:vendor-loaded', handler);
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (coreDecision(preferences, 'analytics', gpc).outcome === 'allow') activateTag('analytics', 'analytics-demo.js');
      else cleanupTag('analytics', 'oc_demo_analytics', preferences.analytics === 'unset' ? 'pre-blocked' : 'cleaned');

      if (coreDecision(preferences, 'sale-sharing', gpc).outcome === 'allow') activateTag('sale-sharing', 'ads-demo.js');
      else cleanupTag('sale-sharing', 'oc_demo_ads', preferences.ads === 'unset' ? 'pre-blocked' : 'cleaned');
    });
    return () => { active = false; };
  }, [preferences, gpc]);

  useEffect(() => {
    if (!consentMode) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const firstButton = dialogRef.current?.querySelector<HTMLButtonElement>('button');
    firstButton?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConsentMode(null);
      if (event.key !== 'Tab') return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]') ?? [])];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); previouslyFocused?.focus(); };
  }, [consentMode]);

  const save = (analytics: Choice, ads: Choice, action: string) => {
    const next: Preferences = { ...emptyPreferences, analytics, ads: gpc ? 'denied' : ads, savedAt: new Date().toISOString() };
    if (analytics !== 'granted') cleanupTag('analytics', 'oc_demo_analytics', 'cleaned');
    if (next.ads !== 'granted') cleanupTag('sale-sharing', 'oc_demo_ads', 'cleaned');
    setPreferences(next); setDraft(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { addEvent('storage_unavailable', 'choices apply to this session only'); }
    setConsentMode(null);
    addEvent('preference_saved', `${action} · analytics=${analytics} · sale/share=${next.ads}`);
  };

  const reset = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* The in-memory demo can still reset. */ }
    cleanupTag('analytics', 'oc_demo_analytics', 'pre-blocked'); cleanupTag('sale-sharing', 'oc_demo_ads', 'pre-blocked');
    const next = detectedGpc ? { ...emptyPreferences, ads: 'denied' as Choice } : emptyPreferences;
    setPreferences(next); setDraft(next); setSimulatedGpc(false); setConsentMode('banner');
    setEvents([{ id: eventId.current++, type: 'demo_reset', detail: 'choices cleared · optional tags pre-blocked', at: time() }]);
  };

  const toggleSimulatedGpc = () => {
    const enabled = !simulatedGpc;
    if (enabled) cleanupTag('sale-sharing', 'oc_demo_ads', 'cleaned');
    setSimulatedGpc(enabled);
    addEvent('gpc_simulated', `sale/share override ${enabled ? 'on' : 'off'} · real browser signal is never disabled`);
  };

  const analyticsCookie = cookieState.analytics;
  const adsCookie = cookieState.ads;
  const googleAnalyticsCookie = cookiePrefixPresent('_ga');
  const googleAdsCookie = cookiePresent('_gcl_au');
  const activeRequests = Object.values(tags).filter((status) => status === 'active').length;
  const analyticsDecision = coreDecision(preferences, 'analytics', gpc);
  const receipt = {
    projectId: 'openconsent-site', policyVersion: POLICY_VERSION, noticeVersion: NOTICE_VERSION,
    choices: { analytics: preferences.analytics, saleSharing: gpc ? 'denied-by-gpc' : preferences.ads },
    signals: { gpc }, evidence: 'unsigned-browser-demo', savedAt: preferences.savedAt ?? null,
  };

  return <main>
    <script type="text/plain" data-openconsent-purpose="analytics" data-openconsent-src={`${import.meta.env.BASE_URL}vendors/analytics-demo.js`} />
    <script type="text/plain" data-openconsent-purpose="sale-sharing" data-openconsent-src={`${import.meta.env.BASE_URL}vendors/ads-demo.js`} />

    <header className="topbar">
      <a className="brand" href="#top"><span className="brand-mark"><ShieldCheck size={18} /></span><span>openConsent</span><em>ALPHA</em></a>
      <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="打开导航" aria-expanded={mobileOpen} aria-controls="site-navigation"><Menu /></button>
      <nav id="site-navigation" className={mobileOpen ? 'open' : ''} aria-label="主导航">
        <a href="#quickstart">Quick start</a><a href="#integrations">Google tags</a><a href="#demo">Live demo</a><a href="#audit">AI audit</a><a href={`${repo}/tree/main/docs`}>Docs</a>
      </nav>
      <a className="github-button" href={repo}>View on GitHub <ExternalLink size={14} /></a>
    </header>

    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow">OPEN SOURCE PRIVACY INFRASTRUCTURE</p>
        <h1>Ship consent in one step. Audit privacy before your agent ships.</h1>
        <p className="hero-lede">给开发者一条清晰路径：接入 Google Analytics / Ads 等受管标签，默认阻断可选处理，再用 AI 辅助审计发现隐私缺口。规则、证据和限制全部公开。</p>
        <div className="hero-actions"><a className="primary-cta" href="#quickstart">Start in 60 seconds <ArrowRight size={16} /></a><a className="secondary-cta" href="#demo">See the live Banner</a></div>
        <div className="hero-tags"><span>GDPR + CCPA/CPRA</span><span>GA4 + Google Ads ready</span><span>Apache-2.0</span></div>
      </div>
      <div className="hero-inspector" aria-label="Live consent status">
        <div className="terminal-head"><span><i /> LIVE ENFORCEMENT</span><code>{POLICY_VERSION}</code></div>
        <StatusLine icon={<BarChart3 />} name="Google Analytics 4" detail="optional-analytics · gtag.js" status={tags.analytics} />
        <StatusLine icon={<Megaphone />} name="Google Ads" detail="personalized-ads · conversion tag" status={gpc ? 'cleaned' : tags['sale-sharing']} />
        <StatusLine icon={<Cookie />} name="oc_demo_analytics" detail="actual document.cookie" status={analyticsCookie ? 'active' : 'pre-blocked'} />
        <StatusLine icon={<Signal />} name="Global Privacy Control" detail={gpc ? 'sale/share override active' : 'not observed'} status={gpc ? 'active' : 'pre-blocked'} />
        <div className="terminal-foot"><span>{activeRequests} optional resources active</span><span>{Number(analyticsCookie) + Number(adsCookie)} demo cookies present</span></div>
      </div>
    </section>

    <section className="principles" id="product">
      <ProductCard number="01" title="Declare" text="用公开 manifest 描述数据活动、AI 组件、目的、法律基础与责任边界。" icon={<Braces />} />
      <ProductCard number="02" title="Enforce" text="可选标签默认不注入；只有确定性决策允许后才加载受管资源。" icon={<LockKeyhole />} />
      <ProductCard number="03" title="Prove" text="生成版本化 finding、透明卡与收据协议，让每个判断都可复现。" icon={<FileCheck2 />} />
    </section>

    <section className="developer-section" id="quickstart">
      <div className="section-heading"><div><p className="eyebrow">DEVELOPER FIRST</p><h2>从一行安装开始，60 秒接入。</h2></div><p>把同一个 policy 和 preference snapshot 交给浏览器、API 和 Agent。先接入，再逐步补齐审计证据。</p></div>
      <div className="quickstart-grid">
        <article className="quickstart-card"><span className="step-number">01</span><h3>Install the adapter</h3><code>pnpm add @openconsent/react</code><p>React、Vue、Express 和 Spring Boot 都使用同一套 purpose 语义。</p><a href="#sdks">查看 SDK starter <ArrowRight size={14} /></a></article>
        <article className="quickstart-card"><span className="step-number">02</span><h3>Declare your data flows</h3><code>openconsent init</code><p>把模型、工具、供应商、保留期限和用户权利入口写进可审查 manifest。</p><a href={`${repo}/blob/main/examples/openconsent.json`}>查看 manifest 示例 <ArrowRight size={14} /></a></article>
        <article className="quickstart-card"><span className="step-number">03</span><h3>Gate before loading</h3><code>ConsentGate purpose=&quot;optional-analytics&quot;</code><p>没有有效选择时，Google tag 和其他可选资源不会请求或写入 Cookie。</p><a href="#demo">验证真实阻断 <ArrowRight size={14} /></a></article>
      </div>
    </section>

    <section className="integrations-section" id="integrations">
      <div className="section-heading"><div><p className="eyebrow">REAL VENDOR INTEGRATIONS</p><h2>Google Analytics 和 Google Ads，按同意再加载。</h2></div><p>这是可运行的 gtag.js 接入路径。公开官网默认使用 first-party fixture，避免把访问者数据送到第三方；配置 ID 后即可切换到真实供应商。</p></div>
      <div className="integration-layout">
        <div className="integration-cards">
          <button className={integration === 'analytics' ? 'integration-card selected' : 'integration-card'} onClick={() => setIntegration('analytics')}><span className="integration-icon"><BarChart3 /></span><span><strong>Google Analytics 4</strong><small>{googleAnalyticsId ? `Configured · ${googleAnalyticsId}` : 'Ready for VITE_GA_MEASUREMENT_ID'}</small></span><CheckCircle2 /></button>
          <button className={integration === 'ads' ? 'integration-card selected' : 'integration-card'} onClick={() => setIntegration('ads')}><span className="integration-icon"><Megaphone /></span><span><strong>Google Ads</strong><small>{googleAdsId ? `Configured · ${googleAdsId}` : 'Ready for VITE_GOOGLE_ADS_ID'}</small></span><CheckCircle2 /></button>
          <div className="integration-note"><ShieldCheck size={16} /><span><strong>Consent Mode v2 compatible</strong><small>Default denied · update only after a purpose grant · GPC overrides sale/share.</small></span></div>
        </div>
        <div className="integration-code"><div className="code-label"><span>PRODUCTION PATTERN</span><span className="vendor-pill">{integration === 'analytics' ? 'GA4' : 'GOOGLE ADS'}</span></div><pre>{googleSnippets[integration]}</pre><p>真实 ID 通过环境变量注入，不写入仓库，也不会在拒绝前加载 vendor script。</p></div>
      </div>
    </section>

    <section className="audit-section" id="audit">
      <div className="section-heading"><div><p className="eyebrow">AI-ASSISTED PRIVACY AUDIT</p><h2>让 AI 找缺口，让规则和人做决定。</h2></div><p>把审计变成开发流程的一部分：AI 读取声明和代码上下文，给出可解释建议；确定性规则负责门禁，责任人负责最终判断。</p></div>
      <div className="audit-layout"><div className="audit-copy"><div className="audit-icon"><Bot /></div><h3>审计你的 manifest</h3><p>不上传到第三方。先用本地示例预览审计输出，再把结果放进 CI 和 Pull Request。</p><div className="audit-actions"><button className="primary-cta" onClick={() => setAuditRan(true)}><Play size={14} />{auditRan ? 'Audit complete' : 'Run AI audit preview'}</button><a className="secondary-cta" href={`${repo}/blob/main/docs/PROJECT_PLAN.md`}>查看审计路线图</a></div><div className="audit-trust"><span><LockKeyhole size={13} />Local-first</span><span><Gauge size={13} />Rule checked</span><span><FileCheck2 size={13} />Human review</span></div></div><div className="audit-console"><div className="audit-console-head"><span><span className="live-dot" /> {auditRan ? 'AUDIT COMPLETE' : 'READY TO AUDIT'}</span><code>openconsent.json</code></div>{auditRan ? auditFindings.map((finding) => <div className="finding" key={finding.title}><span className={finding.tone === 'pass' ? 'finding-mark pass' : 'finding-mark review'}>{finding.tone === 'pass' ? <Check /> : <Signal />}</span><span><strong>{finding.title}</strong><small>{finding.detail}</small></span><em>{finding.tone === 'pass' ? 'PASS' : 'REVIEW'}</em></div>) : <div className="audit-empty"><Upload size={22} /><strong>Drop a manifest or run the preview</strong><small>AI suggestions are separated from deterministic checks.</small></div>}</div></div>
    </section>

    <section className="demo-section" id="demo">
      <div className="section-heading"><div><p className="eyebrow">LIVE CONSENT BANNER + BLOCKING</p><h2>主流 CMP 的体验，开发者可验证的执行。</h2></div><p>Banner 默认阻断可选标签；允许某个 purpose 后才注入对应资源。公开演示使用安全 fixture，Google 接入代码和运行时适配器已在上方展示。</p></div>
      <div className="demo-toolbar"><div><span className="live-dot" /> Safe first-party sandbox</div><div className="toolbar-actions"><button onClick={toggleSimulatedGpc} disabled={detectedGpc} title={detectedGpc ? '浏览器已发送真实 GPC，演示开关不能关闭它' : '仅用于演示 GPC 的 sale/share 覆盖'} className={gpc ? 'gpc active' : 'gpc'}><Signal size={14} />{detectedGpc ? '真实 GPC: ON' : `模拟 GPC: ${gpc ? 'ON' : 'OFF'}`}</button><button onClick={reset}><RotateCcw size={14} />重置</button></div></div>
      <div className="demo-grid">
        <article className="console-card"><CardTitle icon={<Network />} title="Tag pipeline" subtitle="actual DOM injection state" /><TagRow name="analytics-demo.js" purpose="analytics" status={tags.analytics} /><TagRow name="ads-demo.js" purpose="sale / sharing" status={gpc ? 'cleaned' : tags['sale-sharing']} /><div className="inert-code"><span>REGISTERED AS INERT</span><code>&lt;script type=&quot;text/plain&quot; data-openconsent-purpose=&quot;analytics&quot;&gt;</code></div></article>
        <article className="console-card"><CardTitle icon={<Cookie />} title="Cookie jar" subtitle="actual document.cookie state" /><CookieRow name="oc_demo_analytics" purpose="fixture · analytics" present={analyticsCookie} /><CookieRow name="oc_demo_ads" purpose="fixture · sale / sharing" present={adsCookie} /><CookieRow name="_ga*" purpose="Google Analytics 4" present={googleAnalyticsCookie} /><CookieRow name="_gcl_au" purpose="Google Ads linker" present={googleAdsCookie} /><p className="card-note">只检查并清理由本演示设置、当前页面可访问的 Cookie；不能读取 HttpOnly 或其他域 Cookie。</p></article>
        <article className="console-card"><CardTitle icon={<Activity />} title="Decision & events" subtitle="@openconsent/core + local evidence" /><div className="decision-summary"><span className={analyticsDecision.outcome === 'allow' ? 'allow' : 'deny'}>{analyticsDecision.outcome.toUpperCase()}</span><div><strong>{analyticsDecision.purposeId}</strong><small>{analyticsDecision.reason}</small></div></div><div className="event-list">{events.slice(0, 5).map((event) => <div key={event.id}><i /><span><strong>{event.type}</strong><small>{event.detail}</small></span><time>{event.at}</time></div>)}</div></article>
      </div>
      <div className="receipt-row"><div><span>UNSIGNED BROWSER PREFERENCE SNAPSHOT</span><p>用于解释协议，不是生产合规证明、签名收据或服务端凭证。</p></div><pre>{JSON.stringify(receipt, null, 2)}</pre></div>
    </section>

    <section className="how-section"><div className="section-heading"><div><p className="eyebrow">ONE DECISION CONTRACT</p><h2>一次声明，贯穿前端、后端和 Agent。</h2></div><p>开发者只维护一套 purpose 和 policy；openConsent 负责在不同运行边界给出同样的确定性决定。</p></div><div className="flow"><FlowStep icon={<ShieldCheck />} title="Ask" text="Banner / Preference Center" /><ChevronRight /><FlowStep icon={<Braces />} title="Decide" text="Deterministic policy" /><ChevronRight /><FlowStep icon={<Network />} title="Enforce" text="React, Vue, Express, Spring" /><ChevronRight /><FlowStep icon={<FileCheck2 />} title="Record" text="Receipt / audit event" /></div></section>

    <section className="sdk-section" id="sdks"><div className="section-heading"><div><p className="eyebrow">INTEGRATION STARTERS</p><h2>同一语义，四种主流框架。</h2></div><p>当前为源码 starter，尚未发布到 npm 或 Maven Central。</p></div><div className="sdk-shell"><div className="framework-tabs">{Object.keys(snippets).map((name) => <button key={name} onClick={() => setFramework(name as keyof typeof snippets)} className={framework === name ? 'selected' : ''}>{name}</button>)}</div><div className="install-line"><span>$</span><code>{framework === 'Spring' ? 'mvn -f packages/spring-boot-starter/pom.xml install' : `pnpm add ./packages/${framework.toLowerCase()}`}</code></div><div className="codebox"><button aria-label={copied ? '已复制 SDK 代码' : '复制 SDK 代码'} onClick={async () => { await navigator.clipboard.writeText(snippets[framework]); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>{copied ? <Check /> : <Clipboard />}</button><span className="sr-only" aria-live="polite">{copied ? 'SDK 代码已复制' : ''}</span><pre>{snippets[framework]}</pre></div></div></section>

    <section className="agent-section"><div><Sparkles /><p className="eyebrow">BUILT FOR AI & AGENTS</p><h2>把隐私审计放进 Agent 的发布链。</h2><p>AI 可以帮你整理数据流、识别供应商和生成修复建议；openConsent 用公开规则、版本化 finding 和人工复核把建议变成可追踪的工程任务。</p><a href={`${repo}/blob/main/docs/ARCHITECTURE.md`}>Read the architecture <ArrowRight size={15} /></a></div><div className="agent-map"><span>code + manifest</span><i>→</i><span>AI findings</span><i>→</i><span className="planned">human review</span><i>→</i><span>CI gate</span></div></section>

    <section className="transparency-section" id="transparency"><div className="section-heading"><div><p className="eyebrow">TRANSPARENT BY DEFAULT</p><h2>能力、规则和限制都公开。</h2></div></div><div className="boundary-grid"><Boundary title="Implemented" tone="green" items={['Manifest + JSON Schema','GDPR / CCPA readiness rules','CLI / CI findings','Transparency card','Runtime decision core']} /><Boundary title="Live on this site" tone="amber" items={['主流 CMP 风格 Banner','Google tag integration pattern','Managed tag pre-blocking','GPC sale/share override','AI audit preview']} /><Boundary title="Planned" tone="grey" items={['Universal scanner','Signed receipt service','IAB TCF / GPP','Multi-tenant operations','Hosted AI audit API']} /></div><p className="boundary-note">公开官网默认使用 first-party fixture；真实 Google ID 仅在你配置并明确允许后加载。openConsent 不是任意 Cookie 防火墙，无法撤销已经发送的数据，也不构成法律意见或合规认证。</p></section>

    <section className="community"><div><p className="eyebrow">BUILD IN PUBLIC</p><h2>Inspect it. Challenge it. Extend it.</h2><p>每个规则、假设和缺口都应该能被开发者、法律人员和用户审查。</p></div><div><a className="primary-cta" href={repo}>Open the repository <ArrowRight /></a><a href={`${repo}/issues`}>Issues & roadmap</a></div></section>
    <footer><a className="brand" href="#top"><span className="brand-mark"><ShieldCheck size={16} /></span><span>openConsent</span></a><div><a href={`${repo}/blob/main/LICENSE`}>Apache-2.0</a><a href={`${repo}/blob/main/SECURITY.md`}>Security</a><a href={`${repo}/blob/main/GOVERNANCE.md`}>Governance</a></div><span>Open compliance infrastructure · Alpha</span></footer>

    <button className="privacy-fab" onClick={() => { setDraft(preferences); setConsentMode('settings'); }}><ShieldCheck size={15} /> Privacy choices</button>
    {consentMode && <ConsentDialog mode={consentMode} draft={draft} setDraft={setDraft} gpc={gpc} dialogRef={dialogRef} onClose={() => setConsentMode(null)} onSettings={() => setConsentMode('settings')} onReject={() => save('denied', 'denied', 'reject_optional')} onAccept={() => save('granted', gpc ? 'denied' : 'granted', 'accept_optional')} onSave={() => save(draft.analytics, draft.ads, 'save_choices')} />}
  </main>;
}

function ConsentDialog({ mode, draft, setDraft, gpc, dialogRef, onClose, onSettings, onReject, onAccept, onSave }: { mode: Exclude<ConsentMode, null>; draft: Preferences; setDraft: (value: Preferences) => void; gpc: boolean; dialogRef: RefObject<HTMLDialogElement | null>; onClose: () => void; onSettings: () => void; onReject: () => void; onAccept: () => void; onSave: () => void }) {
  return <div className="consent-backdrop"><dialog open className={`consent-dialog ${mode}`} aria-modal="true" aria-labelledby="consent-title" ref={dialogRef}><button className="dialog-close" onClick={onClose} aria-label="关闭且不保存"><X /></button><div className="consent-icon"><ShieldCheck /></div><p className="eyebrow">OPENCONSENT LIVE DEMO</p><h2 id="consent-title">Your privacy, your choice.</h2>{mode === 'banner' ? <><p>必要功能无需可选同意。分析与 sale/share 演示标签保持预阻断，直到你明确允许。关闭本窗口不会视为同意。</p><div className="banner-proof"><span><LockKeyhole />2 optional scripts blocked</span><span><Cookie />0 demo cookies before choice</span></div><div className="consent-actions"><button className="equal" onClick={onReject}>拒绝可选</button><button className="equal allow" onClick={onAccept}>接受可选</button><button className="manage" onClick={onSettings}>管理设置 / Do Not Sell or Share</button></div></> : <><p>按目的选择。可选项默认关闭；GPC 会强制覆盖 sale/share 选择。本 sandbox 不包含真实出售或共享。</p><div className="preference-list"><Preference title="Necessary" text="呈现页面与保存本地选择说明" value="granted" locked onChange={() => {}} /><Preference title="Optional analytics" text="加载安全 analytics fixture，并设置 oc_demo_analytics" value={draft.analytics} onChange={(value) => setDraft({ ...draft, analytics: value })} /><Preference title="Do Not Sell or Share (demo)" text={gpc ? 'GPC 已开启，此目的强制拒绝' : '允许时仅加载安全 ads fixture；关闭表示 opt-out'} value={gpc ? 'denied' : draft.ads} locked={gpc} onChange={(value) => setDraft({ ...draft, ads: value })} /></div><div className="consent-actions"><button className="equal" onClick={onReject}>全部拒绝</button><button className="equal allow" onClick={onSave}>保存选择</button></div></>}<small className="dialog-foot">Safe first-party demo · localStorage preference · no real analytics vendor · <a href={`${repo}/blob/main/docs/TRANSPARENCY.md`}>Transparency</a></small></dialog></div>;
}

function Preference({ title, text, value, locked = false, onChange }: { title: string; text: string; value: Choice; locked?: boolean; onChange: (value: Choice) => void }) { const granted = value === 'granted'; return <div className="preference"><div><strong>{title}</strong><span>{text}</span></div><button role="switch" aria-label={`${title}: ${granted ? '允许' : '拒绝'}`} aria-checked={granted} disabled={locked} className={granted ? 'switch on' : 'switch'} onClick={() => onChange(granted ? 'denied' : 'granted')}><i /></button></div>; }
function StatusLine({ icon, name, detail, status }: { icon: ReactNode; name: string; detail: string; status: TagStatus }) { return <div className="status-line"><span className="line-icon">{icon}</span><div><strong>{name}</strong><small>{detail}</small></div><Status status={status} /></div>; }
function Status({ status }: { status: TagStatus }) { return <span className={`status ${status}`}>{status === 'pre-blocked' ? 'BLOCKED' : status.toUpperCase()}</span>; }
function ProductCard({ number, title, text, icon }: { number: string; title: string; text: string; icon: ReactNode }) { return <article><div><span>{number}</span>{icon}</div><h3>{title}</h3><p>{text}</p></article>; }
function CardTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) { return <div className="card-title"><span>{icon}</span><div><h3>{title}</h3><p>{subtitle}</p></div></div>; }
function TagRow({ name, purpose, status }: { name: string; purpose: string; status: TagStatus }) { return <div className="tag-row"><div><Code2 /><span><strong>{name}</strong><small>{purpose}</small></span></div><Status status={status} /></div>; }
function CookieRow({ name, purpose, present }: { name: string; purpose: string; present: boolean }) { return <div className="cookie-row"><div><Cookie /><span><strong>{name}</strong><small>{purpose}</small></span></div><span className={present ? 'cookie-present' : 'cookie-absent'}>{present ? 'PRESENT' : 'NOT SET'}</span></div>; }
function FlowStep({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="flow-step"><span>{icon}</span><strong>{title}</strong><small>{text}</small></div>; }
function Boundary({ title, tone, items }: { title: string; tone: string; items: string[] }) { return <article className={`boundary ${tone}`}><h3>{title}</h3><ul>{items.map((item) => <li key={item}><Check />{item}</li>)}</ul></article>; }
