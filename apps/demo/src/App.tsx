import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Code2, Code2 as Github, Cookie, ExternalLink, Globe2, Languages, LockKeyhole, Menu, PackageCheck, Play, Server, Settings2, ShieldCheck, X, Zap } from 'lucide-react';
import OpenConsent from '@openconsent/web';

type Locale = 'en' | 'zh';
type Snapshot = { choices?: Record<string, 'granted' | 'denied' | 'unset'>; signals?: { gpc?: boolean }; policyVersion?: string; revision?: number };
type ConsentClient = { getSnapshot(): Snapshot; subscribe?(listener: (snapshot: Snapshot) => void): () => void; show?(): void; showSettings(): void; reset(): void; destroy(): void };

const repo = 'https://github.com/noir-hedgehog/openConsent';
const docs = `${repo}/tree/main/docs`;
const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID || '';
const adsId = import.meta.env.VITE_GOOGLE_ADS_ID || '';
const policy = {
  projectId: 'openconsent-site', policyVersion: 'site-2026-09-01', noticeVersion: 'website-notice-1', manifestDigest: 'sha256:openconsent-site-demo',
  purposes: [
    { id: 'essential', activityId: 'serve-site', legalBasis: 'legitimate-interest', optional: false, label: { en: 'Required technology', zh: '必要技术' }, description: { en: 'Runs the site and stores your privacy choice.', zh: '用于运行网站并保存你的隐私选择。' } },
    { id: 'optional-analytics', activityId: 'measure-site', legalBasis: 'consent', optional: true },
    { id: 'personalized-ads', activityId: 'personalize-ads', legalBasis: 'consent', optional: true, sale: true, sharing: true },
  ],
};

const copy = {
  en: {
    nav: ['Product', 'Demo', 'Integrations', 'SDKs', 'Checks', 'FAQ'], install: 'Install openConsent', demo: 'Try the live demo', github: 'View on GitHub',
    eyebrow: 'FREE · OPEN SOURCE · SELF HOSTED', title: 'Open-source consent management for modern web apps.',
    subtitle: 'Add a configurable cookie banner, pre-block optional tags, connect Google Consent Mode, and honor GDPR and CCPA/CPRA choices from one SDK.',
    trust: ['Free forever', 'Self-hosted', 'Apache-2.0', 'GDPR + CCPA/CPRA ready'],
    outcomeTitle: 'The consent layer your product can actually ship.', outcomeBody: 'A small, inspectable runtime that keeps optional processing off until the user decides—across plain HTML, React, Vue, and your backend.',
    outcomes: [['A real consent experience', 'Accessible banner and preference center with English and Chinese built in.'], ['Tags stay off by default', 'Explicitly registered analytics and advertising scripts do not run before permission.'], ['One state across your stack', 'Use the same purposes in the browser, React, Vue, Express, and Spring.']],
    quickEyebrow: 'PLAIN HTML', quickTitle: 'Start with one script tag.', quickBody: 'Point the SDK to a small policy file. No hosted dashboard, account, or runtime service is required.', copyCode: 'Copy', copied: 'Copied', config: 'View config example',
    demoEyebrow: 'LIVE RUNTIME', demoTitle: 'This page is the demo.', demoBody: 'The banner you saw is rendered by @openconsent/web. Safe local example tags let you verify network and cookie behavior without sending data to Google.',
    settings: 'Open privacy choices', reset: 'Reset demo', optionalAnalytics: 'Optional analytics', personalizedAds: 'Personalized ads / sale-share', blocked: 'BLOCKED', allowed: 'ALLOWED', overridden: 'GPC OVERRIDE', cookieAbsent: 'No optional cookie', cookiePresent: 'Cookie detected',
    gpc: 'Global Privacy Control', gpcBody: 'When detected, sale/share remains denied even if an older choice allowed ads.', inspect: 'Inspect the technical playground',
    googleEyebrow: 'GOOGLE INTEGRATIONS', googleTitle: 'Consent Mode before Google tags.', googleBody: 'openConsent writes denied defaults first, loads a configured Google tag only after the matching purpose is granted, and sends denied updates on withdrawal.',
    ga: 'Google Analytics 4', gaBody: 'Maps optional-analytics to analytics_storage.', ads: 'Google Ads', adsBody: 'Maps personalized-ads to ad_storage, ad_user_data, and ad_personalization.', ids: 'Measurement IDs are configuration, never secrets. Leave them empty for a fully first-party demo.',
    sdkEyebrow: 'ONE PURPOSE MODEL', sdkTitle: 'Use the same decision everywhere.', sdkBody: 'Framework components render choices. Server adapters read the saved preference and the Sec-GPC request signal before protected work runs.',
    checksEyebrow: 'PRIVACY READINESS CHECKS', checksTitle: 'Deterministic checks your CI can enforce.', checksBody: 'The current CLI validates declared purposes, notices, retention, rights routes, vendor records, and high-risk gaps. It returns machine-readable JSON and a failing exit code—without pretending to be legal advice or an AI auditor.', checksPass: '0 blocking · 3 manual review · 8 pass · 5 not applicable', checksCta: 'See the rules and schema',
    transparentTitle: 'Keep the rules—and the tradeoffs—visible.', transparentBody: 'Self-host the runtime, inspect every rule, and keep your policy version with the code that depends on it. openConsent does not send consent data to us.', transparent: ['No cloud dependency', 'Versioned policy and notice', 'No openConsent tracking service', 'Public rules and changelog'],
    faqTitle: 'Clear product boundaries.', faqs: [['Does this make my site legally compliant?', 'No library can certify compliance. openConsent supplies enforceable controls and evidence; your purposes, notices, vendors, and legal basis still require review.'], ['Does it automatically find and block every cookie?', 'The first release guarantees pre-blocking for scripts you explicitly register. Automatic discovery and tag-manager coverage are not claimed.'], ['Is this the same as an enterprise CMP?', 'It covers the developer runtime: banner, preferences, managed tags, Consent Mode, GPC, receipts, and server decisions. It does not yet include IAB TCF, a hosted admin console, cross-device identity, or legal certification.'], ['Where does AI fit?', 'The shipped CLI performs transparent rule-based readiness checks. AI-assisted repository scanning remains a roadmap item until it can produce reviewable evidence.']],
    communityTitle: 'Ship a consent layer you can inspect.', communityBody: 'Use it free, self-host it, and help shape the public rules for modern AI and SaaS products.', docs: 'Read the docs', footer: 'Open-source consent infrastructure for AI and SaaS teams.', privacy: 'Privacy choices', legal: 'Not legal advice.',
  },
  zh: {
    nav: ['产品', '演示', '集成', 'SDK', '检查', 'FAQ'], install: '安装 openConsent', demo: '体验在线演示', github: '在 GitHub 查看',
    eyebrow: '永久免费 · 开源 · 自托管', title: '面向现代 Web 应用的开源同意管理。', subtitle: '用一个 SDK 接入可配置 Cookie Banner、可选标签预阻断、Google Consent Mode，以及 GDPR 和 CCPA/CPRA 用户选择。',
    trust: ['永久免费', '自托管', 'Apache-2.0', '面向 GDPR + CCPA/CPRA'], outcomeTitle: '一个真正能随产品上线的同意层。', outcomeBody: '体积小、规则透明；在用户决定前关闭可选处理，并贯通 HTML、React、Vue 和后端。',
    outcomes: [['真实的同意体验', '自带可访问的 Banner 与偏好中心，完整支持中英文。'], ['默认不运行可选标签', '显式注册的分析和广告脚本在授权前不会执行。'], ['前后端使用同一状态', '浏览器、React、Vue、Express 和 Spring 共用同一 purpose。']],
    quickEyebrow: '原生 HTML', quickTitle: '从一行 script 开始。', quickBody: '让 SDK 读取一个小型策略文件，无需托管控制台、账户或云端运行服务。', copyCode: '复制', copied: '已复制', config: '查看配置示例',
    demoEyebrow: '真实运行时', demoTitle: '这个页面本身就是演示。', demoBody: '你看到的 Banner 由 @openconsent/web 渲染。本地示例标签让你在不向 Google 发送数据的情况下验证网络与 Cookie 行为。',
    settings: '打开隐私选择', reset: '重置演示', optionalAnalytics: '可选分析', personalizedAds: '个性化广告 / 出售共享', blocked: '已阻断', allowed: '已允许', overridden: 'GPC 强制拒绝', cookieAbsent: '没有可选 Cookie', cookiePresent: '检测到 Cookie',
    gpc: 'Global Privacy Control', gpcBody: '检测到 GPC 时，即使旧选择允许广告，出售/共享仍会被拒绝。', inspect: '查看技术 Playground',
    googleEyebrow: 'GOOGLE 集成', googleTitle: '先设置 Consent Mode，再加载 Google 标签。', googleBody: 'openConsent 先写入 denied 默认值，只在对应 purpose 获得授权后加载标签，并在撤回时发送 denied 更新。',
    ga: 'Google Analytics 4', gaBody: '将 optional-analytics 映射到 analytics_storage。', ads: 'Google Ads', adsBody: '将 personalized-ads 映射到 ad_storage、ad_user_data 和 ad_personalization。', ids: 'Measurement ID 属于公开配置，不是密钥；留空即可保持完全第一方演示。',
    sdkEyebrow: '统一 PURPOSE 模型', sdkTitle: '在所有技术栈里使用同一个决定。', sdkBody: '框架组件负责呈现选择；服务端适配器在受保护处理发生前读取保存的偏好与 Sec-GPC 信号。',
    checksEyebrow: 'PRIVACY READINESS CHECKS', checksTitle: 'CI 可以强制执行的确定性检查。', checksBody: '当前 CLI 会检查已声明的 purpose、notice、保留期、权利入口、供应商记录和高风险缺口，输出机器可读 JSON 和失败退出码，不冒充法律意见或 AI 审计。', checksPass: '0 个阻断 · 3 项人工复核 · 8 项通过 · 5 项不适用', checksCta: '查看规则和 Schema',
    transparentTitle: '让规则和边界都保持公开。', transparentBody: '自行托管运行时，检查每条规则，并让策略版本跟随依赖它的代码。openConsent 不会接收你的同意数据。', transparent: ['无云端依赖', '策略与 notice 版本化', '没有 openConsent 跟踪服务', '公开规则和 Changelog'],
    faqTitle: '清晰的产品边界。', faqs: [['它能让网站自动合法合规吗？', '不能。openConsent 提供可执行控制与证据；你的 purpose、notice、供应商和法律基础仍需专业审查。'], ['它会自动发现并阻断所有 Cookie 吗？', '首版保证阻断你显式注册的脚本，不宣称自动发现所有 Cookie 或覆盖所有 Tag Manager 配置。'], ['它等同于企业级付费 CMP 吗？', '它覆盖开发者运行时：Banner、偏好、标签、Consent Mode、GPC、receipt 和服务端决策。当前不含 IAB TCF、托管管理后台、跨设备身份或法律认证。'], ['AI 在哪里？', '已交付的 CLI 是透明的规则检查。AI 辅助仓库扫描仍在路线图中，达到可审查证据标准后才会成为正式能力。']],
    communityTitle: '上线一个你能完全检查的同意层。', communityBody: '免费使用、自行托管，并参与完善适合现代 AI 与 SaaS 产品的公开规则。', docs: '阅读文档', footer: '面向 AI 与 SaaS 团队的开源同意基础设施。', privacy: '隐私选择', legal: '不构成法律意见。',
  },
} as const;

const scriptSnippet = `<script\n  src="https://noir-hedgehog.github.io/openConsent/openconsent.min.js"\n  data-openconsent-config="/openconsent.json">\n</script>`;
const sdkSnippets = {
  React: `import { OpenConsentProvider, ConsentBanner } from '@openconsent/react';\n\n<OpenConsentProvider options={{ policy }}>\n  <App />\n  <ConsentBanner locale="en" />\n</OpenConsentProvider>`,
  Vue: `app.use(createOpenConsentPlugin({ policy }))\n\n<ConsentBanner locale="en" />\n// useOpenConsent() anywhere`,
  Express: `app.use(openConsent({ policy, getSnapshot }))\napp.post('/analytics',\n  requirePurpose('optional-analytics'), handler)`,
  Spring: `OpenConsentDecision result = evaluator.evaluate(\n  "optional-analytics", receipt.policyVersion(), gpc, choices\n);`,
};

function statusFor(snapshot: Snapshot, purpose: string) { if (purpose === 'personalized-ads' && snapshot.signals?.gpc) return 'overridden'; return snapshot.choices?.[purpose] === 'granted' ? 'allowed' : 'blocked'; }

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => localStorage.getItem('openconsent_site_locale') === 'zh' ? 'zh' : 'en');
  const [mobile, setMobile] = useState(false); const [copied, setCopied] = useState(false); const [sdk, setSdk] = useState<keyof typeof sdkSnippets>('React');
  const [snapshot, setSnapshot] = useState<Snapshot>({ choices: { 'optional-analytics': 'unset', 'personalized-ads': 'unset' } });
  const [, setCookieRevision] = useState(0);
  const clientRef = useRef<ConsentClient | null>(null); const t = copy[locale];
  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'; localStorage.setItem('openconsent_site_locale', locale); clientRef.current?.destroy();
    const client = OpenConsent.init({ projectId: 'openconsent-site', locale, policy, banner: { position: 'bottom', theme: 'auto' }, integrations: { ...(gaId ? { ga4: { measurementId: gaId } } : {}), ...(adsId ? { googleAds: { tagId: adsId } } : {}) }, onPreferenceChange: () => setSnapshot(client.getSnapshot()) }) as ConsentClient;
    clientRef.current = client; queueMicrotask(() => setSnapshot(client.getSnapshot())); const unsubscribe = client.subscribe?.(setSnapshot); return () => { unsubscribe?.(); client.destroy(); };
  }, [locale]);
  useEffect(() => {
    const refreshCookies = () => setCookieRevision(value => value + 1);
    window.addEventListener('openconsent:vendor-loaded', refreshCookies);
    return () => window.removeEventListener('openconsent:vendor-loaded', refreshCookies);
  }, []);
  const liveRows = useMemo(() => [
    { purpose: 'optional-analytics', label: t.optionalAnalytics, cookiePrefixes: ['oc_demo_analytics', '_ga'] },
    { purpose: 'personalized-ads', label: t.personalizedAds, cookiePrefixes: ['oc_demo_ads', '_gcl_'] }
  ], [t]);
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMobile(false); };
  const copyInstall = async () => { await navigator.clipboard.writeText(scriptSnippet); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const resetDemo = () => { clientRef.current?.reset(); clientRef.current?.show?.(); setSnapshot(clientRef.current?.getSnapshot() ?? {}); };
  return <div className="site-shell">
    <header className="nav-wrap"><nav className="nav" aria-label="Main navigation"><a className="brand" href="#top"><span className="brand-mark"><ShieldCheck size={18}/></span><span>openConsent</span></a><div className={`nav-links ${mobile ? 'open' : ''}`}>{['product','demo','integrations','sdks','checks','faq'].map((id, index) => <button key={id} onClick={() => scrollTo(id)}>{t.nav[index]}</button>)}</div><div className="nav-actions"><button className="language" onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')} aria-label="Switch language"><Languages size={16}/>{locale === 'en' ? '中文' : 'EN'}</button><a className="nav-github" href={repo} target="_blank" rel="noreferrer"><Github size={17}/><span>GitHub</span></a><button className="menu" onClick={() => setMobile(!mobile)} aria-label="Toggle navigation">{mobile ? <X/> : <Menu/>}</button></div></nav></header>
    <main id="top">
      <section className="hero section-grid"><div className="hero-copy"><div className="eyebrow"><span className="pulse"/>{t.eyebrow}</div><h1>{t.title}</h1><p className="hero-subtitle">{t.subtitle}</p><div className="hero-actions"><button className="primary" onClick={() => scrollTo('quickstart')}>{t.install}<ArrowRight size={18}/></button><button className="secondary" onClick={() => { scrollTo('demo'); clientRef.current?.show?.(); }}><Play size={17}/>{t.demo}</button></div><div className="trust-row">{t.trust.map(item => <span key={item}><Check size={14}/>{item}</span>)}</div></div><div className="hero-product-card"><div className="window-bar"><span/><span/><span/><small>your-app.example</small></div><div className="mini-app"><div className="mini-nav"/><div className="mini-content"><div className="mini-kicker"/><div className="mini-title"/><div className="mini-line"/><div className="mini-line short"/></div><div className="mini-banner"><div className="mini-shield"><ShieldCheck/></div><div><strong>We respect your privacy</strong><p>Optional tags stay off until you choose.</p></div><div className="mini-buttons"><span>Reject optional</span><b>Accept optional</b></div></div></div><div className="floating-proof proof-one"><LockKeyhole size={16}/><span>0 optional requests</span></div><div className="floating-proof proof-two"><Cookie size={16}/><span>Consent Mode: denied</span></div></div></section>
      <section id="product" className="section product-section"><div className="section-intro"><h2>{t.outcomeTitle}</h2><p>{t.outcomeBody}</p></div><div className="feature-grid">{t.outcomes.map(([title, body], i) => { const Icon = [ShieldCheck, Zap, Globe2][i]; return <article key={title}><div className="icon-box"><Icon/></div><h3>{title}</h3><p>{body}</p></article>; })}</div></section>
      <section id="quickstart" className="section split-section"><div><div className="eyebrow">{t.quickEyebrow}</div><h2>{t.quickTitle}</h2><p>{t.quickBody}</p><a className="text-link" href={`${repo}/blob/main/examples/openconsent.web.json`} target="_blank" rel="noreferrer">{t.config}<ArrowRight size={16}/></a></div><div className="code-card"><div className="code-head"><span>index.html</span><button onClick={copyInstall}>{copied ? <Check/> : <Code2/>}{copied ? t.copied : t.copyCode}</button></div><pre><code>{scriptSnippet}</code></pre></div></section>
      <section id="demo" className="section demo-section"><div className="demo-copy"><div className="eyebrow">{t.demoEyebrow}</div><h2>{t.demoTitle}</h2><p>{t.demoBody}</p><div className="demo-actions"><button className="primary small" onClick={() => clientRef.current?.showSettings()}><Settings2 size={17}/>{t.settings}</button><button className="secondary small" onClick={resetDemo}>{t.reset}</button></div><a className="text-link" href={`${import.meta.env.BASE_URL}playground/`}>{t.inspect}<ArrowRight size={16}/></a></div><div className="runtime-card"><div className="runtime-head"><div><span className="live-dot"/>LIVE CONSENT STATE</div><small>policy {snapshot.policyVersion ?? policy.policyVersion}</small></div>{liveRows.map(row => { const state = statusFor(snapshot,row.purpose); const cookies = document.cookie.split(';').map(c => c.trim()); const hasCookie = row.cookiePrefixes.some(prefix => cookies.some(cookie => cookie.startsWith(prefix))); return <div className="runtime-row" key={row.purpose}><div className="purpose-icon"><Cookie/></div><div className="runtime-name"><strong>{row.label}</strong><small>{row.purpose}</small></div><div className="runtime-cookie">{hasCookie ? t.cookiePresent : t.cookieAbsent}</div><span className={`status ${state}`}>{state === 'allowed' ? t.allowed : state === 'overridden' ? t.overridden : t.blocked}</span></div>})}<div className="gpc-row"><div><strong>{t.gpc}</strong><p>{t.gpcBody}</p></div><span className={snapshot.signals?.gpc ? 'signal on' : 'signal'}>{snapshot.signals?.gpc ? 'ON' : 'OFF'}</span></div></div></section>
      <section id="integrations" className="section google-section"><div className="center-intro"><div className="eyebrow">{t.googleEyebrow}</div><h2>{t.googleTitle}</h2><p>{t.googleBody}</p></div><div className="google-grid"><article><div className="google-logo">G<span>A</span></div><h3>{t.ga}</h3><p>{t.gaBody}</p><code>analytics_storage</code><span className="config-state">{gaId ? `Configured · ${gaId}` : 'Optional configuration'}</span></article><article><div className="google-logo ads">G<span>Ads</span></div><h3>{t.ads}</h3><p>{t.adsBody}</p><code>ad_storage · ad_user_data</code><span className="config-state">{adsId ? `Configured · ${adsId}` : 'Optional configuration'}</span></article></div><p className="integrations-note"><LockKeyhole size={16}/>{t.ids}</p></section>
      <section id="sdks" className="section sdk-section"><div className="section-intro"><div className="eyebrow">{t.sdkEyebrow}</div><h2>{t.sdkTitle}</h2><p>{t.sdkBody}</p></div><div className="sdk-workbench"><div className="sdk-tabs">{Object.keys(sdkSnippets).map(name => <button className={sdk === name ? 'active' : ''} onClick={() => setSdk(name as keyof typeof sdkSnippets)} key={name}>{name}</button>)}</div><div className="sdk-code"><pre><code>{sdkSnippets[sdk]}</code></pre></div><div className="sdk-flow"><div><span>01</span><b>Policy</b><small>versioned purposes</small></div><ArrowRight/><div><span>02</span><b>Decision</b><small>consent + GPC</small></div><ArrowRight/><div><span>03</span><b>Gate</b><small>browser or server</small></div></div></div></section>
      <section id="checks" className="section checks-section"><div className="checks-terminal"><div className="terminal-head"><span/><span/><span/><small>openconsent check</small></div><pre><code><span className="prompt">$</span> node ./src/cli.mjs check ./examples/openconsent.json{`\n\n`}<span className="pass">PASS CCPA-001</span> Notice at collection{`\n`}<span className="warn">REVIEW CCPA-002</span> Consumer-rights request methods{`\n`}<span className="pass">PASS CORE-002</span> Public privacy notice{`\n`}<span className="warn">REVIEW GDPR-002</span> Withdrawal for consent-based activities{`\n\n`}<b>{t.checksPass}</b></code></pre></div><div className="checks-copy"><div className="eyebrow">{t.checksEyebrow}</div><h2>{t.checksTitle}</h2><p>{t.checksBody}</p><a className="text-link" href={`${repo}/tree/main/rules`} target="_blank" rel="noreferrer">{t.checksCta}<ArrowRight size={16}/></a></div></section>
      <section className="section transparent-section"><div><div className="icon-box"><Server/></div><h2>{t.transparentTitle}</h2><p>{t.transparentBody}</p></div><div className="transparency-list">{t.transparent.map(item => <div key={item}><Check/><span>{item}</span></div>)}</div></section>
      <section id="faq" className="section faq-section"><div className="section-intro"><h2>{t.faqTitle}</h2></div><div className="faq-list">{t.faqs.map(([question,answer]) => <details key={question}><summary>{question}<ChevronDown/></summary><p>{answer}</p></details>)}</div></section>
      <section className="section community"><div><PackageCheck/><h2>{t.communityTitle}</h2><p>{t.communityBody}</p><div className="hero-actions"><a className="primary" href={repo} target="_blank" rel="noreferrer"><Github/>{t.github}<ExternalLink size={15}/></a><a className="secondary" href={docs} target="_blank" rel="noreferrer">{t.docs}</a></div></div></section>
    </main>
    <footer><div><a className="brand" href="#top"><span className="brand-mark"><ShieldCheck size={18}/></span><span>openConsent</span></a><p>{t.footer}</p></div><div className="footer-links"><button onClick={() => clientRef.current?.showSettings()}>{t.privacy}</button><a href={docs}>{t.docs}</a><a href={repo}>GitHub</a></div><small>© 2026 openConsent · Apache-2.0 · {t.legal}</small></footer>
  </div>;
}
