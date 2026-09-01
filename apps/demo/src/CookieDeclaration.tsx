import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Cookie, Database, Languages, LockKeyhole, ShieldCheck } from 'lucide-react';
import { sitePolicy } from './site-policy';

type Locale = 'en' | 'zh';
type CatalogRow = {
  technology: string;
  kind: string;
  category: string;
  purpose: string;
  service: string;
  vendor: string;
  trigger: string;
  duration: string;
  status: string;
};

const repo = 'https://github.com/noir-hedgehog/openConsent';

const text = (value: string | { en: string; zh: string }, locale: Locale) => typeof value === 'string' ? value : value[locale];

function catalogRows(locale: Locale): CatalogRow[] {
  const declared: CatalogRow[] = sitePolicy.trackers.map(tracker => {
    const service = sitePolicy.services.find(item => item.id === tracker.serviceId)!;
    const vendor = sitePolicy.vendors.find(item => item.id === service.vendorId)!;
    const purposes = tracker.purposeIds.map(id => sitePolicy.purposes.find(item => item.id === id)!).filter(Boolean);
    const categories = [...new Set(purposes.map(purpose => sitePolicy.categories.find(item => item.id === purpose.categoryId)!).filter(Boolean))];
    const isGoogle = vendor.id === 'google';
    const isRequired = purposes.every(purpose => !purpose.optional);
    const trigger = isGoogle
      ? (locale === 'en' ? `Only when deployment IDs exist and ${purposes.map(item => item.id).join(' / ')} is allowed by the website example adapter.` : `仅在部署配置了 ID，且官网示例适配器允许 ${purposes.map(item => item.id).join(' / ')} 后使用。`)
      : isRequired
        ? (locale === 'en' ? 'Created after a visitor saves, accepts, or rejects privacy choices.' : '访客保存、接受或拒绝隐私选择后创建。')
        : (locale === 'en' ? `Only after ${purposes.map(item => item.id).join(' / ')} is granted.` : `仅在 ${purposes.map(item => item.id).join(' / ')} 获得授权后创建。`);
    return {
      technology: tracker.name,
      kind: tracker.kind.replace(/-/g, ' '),
      category: categories.map(item => text(item.label, locale)).join(' / '),
      purpose: purposes.map(item => text(item.label, locale)).join(' / '),
      service: text(service.name, locale),
      vendor: `${vendor.name} · ${tracker.firstParty ? (locale === 'en' ? 'first party' : '第一方') : (locale === 'en' ? 'third party' : '第三方')}`,
      trigger,
      duration: tracker.duration,
      status: isGoogle ? (locale === 'en' ? 'Conditional · off by default' : '条件性 · 默认关闭') : isRequired ? (locale === 'en' ? 'Required preference record' : '必要偏好记录') : (locale === 'en' ? 'Optional demo technology' : '可选演示技术')
    };
  });
  declared.splice(1, 0, {
    technology: 'openconsent_site_locale',
    kind: 'local storage',
    category: locale === 'en' ? 'Preferences' : '偏好',
    purpose: locale === 'en' ? 'Website language' : '网站语言',
    service: locale === 'en' ? 'Official website shell' : '官网外壳',
    vendor: locale === 'en' ? 'openConsent Project · first party' : 'openConsent Project · 第一方',
    trigger: locale === 'en' ? 'Created when the website loads or the language changes.' : '官网加载或语言切换时创建。',
    duration: locale === 'en' ? 'Until site data is cleared.' : '直到清除站点数据。',
    status: locale === 'en' ? 'Functional' : '功能性存储'
  });
  return declared;
}

const copy = {
  en: {
    back: 'Product website', language: '切换到中文', badge: 'PUBLIC DECLARATION · 0.4.0-beta.1',
    title: 'Cookie and browser storage declaration',
    intro: 'This code-owned catalog describes technologies that the official openConsent website may use. It contains no visitor preference receipt, identifier, IP address, or individual choice.',
    updated: 'Scope: noir-hedgehog.github.io/openConsent · Reviewed 2026-09-01',
    summary: [['2', 'First-party local records'], ['1', 'Optional demo Cookie'], ['5', 'Conditional Google entries'], ['0', 'Google tags on by default']],
    catalogTitle: 'Public technology catalog',
    catalogBody: 'Conditional entries describe code paths that can be enabled by deployment configuration. They do not mean that the technology ran for a particular visitor.',
    columns: ['Tracker', 'Kind', 'Category', 'Purpose', 'Service', 'Vendor', 'When created', 'Duration', 'Current status'],
    controlsTitle: 'How the official site controls optional technology',
    controls: [
      ['Default deny', 'Optional managed scripts remain inert until their declared purpose is granted.'],
      ['Withdrawal', 'The demo removes known Cookies and cleanup hooks stop application-owned work. Previously transmitted data cannot be recalled by deleting a script element.'],
      ['GPC', 'A detected Global Privacy Control signal denies purposes declared as sale or sharing.'],
      ['Version changes', 'A policy or notice version change invalidates the saved preference and asks again.'],
    ],
    noReceiptTitle: 'Why this page contains no receipt',
    noReceiptBody: 'A public declaration explains the site’s technologies. A preference receipt describes one visitor’s choices and belongs in protected application storage. openConsent never turns individual receipts into public transparency data.',
    googleTitle: 'Google integration boundary',
    googleBody: 'The official website includes example adapter code showing denied Consent Mode defaults and purpose-gated GA4 or Ads loading. That adapter belongs to this website. It is not included in the @openconsent/web SDK contract, and Google IDs remain empty in the default public build.',
    sourcesTitle: 'Primary references',
    sources: [
      ['GDPR official text', 'https://eur-lex.europa.eu/eli/reg/2016/679/oj'],
      ['California Privacy Protection Agency regulations', 'https://cppa.ca.gov/regulations/'],
      ['Global Privacy Control specification', 'https://globalprivacycontrol.org/'],
      ['Google Consent Mode guide', 'https://developers.google.com/tag-platform/security/guides/consent'],
      ['Google Analytics Cookie usage', 'https://developers.google.com/analytics/devguides/collection/ga4/cookie-usage'],
    ],
    changeTitle: 'Challenge or update this declaration',
    changeBody: 'The catalog is maintained in the same public repository as the website. Open an issue when an entry is missing, stale, or unclear. A deployment owner must publish its own catalog for its own vendors and configuration.',
    issue: 'Open a GitHub issue',
    footer: 'Public catalog for the official openConsent website · Not legal advice',
  },
  zh: {
    back: '返回产品官网', language: 'Switch to English', badge: '公开声明 · 0.4.0-beta.1',
    title: 'Cookie 与浏览器存储声明',
    intro: '这份由代码维护的目录说明 openConsent 官网可能使用的技术。页面不包含任何访客偏好 receipt、标识符、IP 地址或个人选择。',
    updated: '范围：noir-hedgehog.github.io/openConsent · 复核日期 2026-09-01',
    summary: [['2', '第一方本地记录'], ['1', '可选演示 Cookie'], ['5', '条件性 Google 条目'], ['0', '默认启用的 Google 标签']],
    catalogTitle: '公开技术目录',
    catalogBody: '条件性条目说明可以由部署配置启用的代码路径，不代表某项技术曾对某位访客运行。',
    columns: ['Tracker', '类型', '类别', '用途', '服务', '供应商', '创建条件', '保存期限', '当前状态'],
    controlsTitle: '官网如何控制可选技术',
    controls: [
      ['默认拒绝', '可选受管脚本保持不可执行，直到对应 purpose 获得授权。'],
      ['撤回', '演示会删除已知 Cookie，清理钩子会停止应用自身任务。删除脚本元素无法召回此前已发送的数据。'],
      ['GPC', '检测到 Global Privacy Control 时，声明为出售或共享的 purpose 会被拒绝。'],
      ['版本变化', '策略或 notice 版本变化会使旧偏好失效并重新询问。'],
    ],
    noReceiptTitle: '为什么本页不包含 receipt',
    noReceiptBody: '公开声明用于解释网站技术；偏好 receipt 描述某位访客的选择，应保存在受保护的应用存储中。openConsent 不会把个人 receipt 变成公开透明数据。',
    googleTitle: 'Google 集成边界',
    googleBody: '官网包含示例适配器代码，用于演示 Consent Mode 默认 denied，以及按 purpose 加载 GA4 或 Ads。这个适配器属于官网，不在 @openconsent/web SDK 契约内；默认公开构建不会配置 Google ID。',
    sourcesTitle: '主要依据',
    sources: [
      ['GDPR 官方文本', 'https://eur-lex.europa.eu/eli/reg/2016/679/oj'],
      ['California Privacy Protection Agency 法规', 'https://cppa.ca.gov/regulations/'],
      ['Global Privacy Control 规范', 'https://globalprivacycontrol.org/'],
      ['Google Consent Mode 指南', 'https://developers.google.com/tag-platform/security/guides/consent'],
      ['Google Analytics Cookie 说明', 'https://developers.google.com/analytics/devguides/collection/ga4/cookie-usage'],
    ],
    changeTitle: '质疑或更新此声明',
    changeBody: '这份目录与官网代码保存在同一个公开仓库中。如条目缺失、过期或表述不清，请提交 Issue。每个部署者仍需根据自己的供应商与配置发布独立目录。',
    issue: '提交 GitHub Issue',
    footer: 'openConsent 官方网站公开目录 · 不构成法律意见',
  },
} as const;

export default function CookieDeclaration() {
  const [locale, setLocale] = useState<Locale>(() => localStorage.getItem('openconsent_site_locale') === 'zh' ? 'zh' : 'en');
  const t = copy[locale];
  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    localStorage.setItem('openconsent_site_locale', locale);
  }, [locale]);

  return <div className="declaration-page">
    <header className="declaration-nav">
      <a href={import.meta.env.BASE_URL}><ArrowLeft />{t.back}</a>
      <a className="declaration-brand" href={import.meta.env.BASE_URL}><ShieldCheck />openConsent</a>
      <button onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')} aria-label={t.language}><Languages />{locale === 'en' ? '中文' : 'EN'}</button>
    </header>
    <main>
      <section className="declaration-hero">
        <div className="declaration-badge">{t.badge}</div>
        <h1>{t.title}</h1><p>{t.intro}</p><small>{t.updated}</small>
        <div className="summary-grid">{t.summary.map(([value, label]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}</div>
      </section>

      <section className="declaration-section">
        <div className="section-copy"><Cookie /><div><h2>{t.catalogTitle}</h2><p>{t.catalogBody}</p></div></div>
        <div className="catalog-wrap"><table><thead><tr>{t.columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>
          {catalogRows(locale).map(row => <tr key={row.technology}><th><code>{row.technology}</code></th><td><strong>{row.kind}</strong></td><td>{row.category}</td><td>{row.purpose}</td><td>{row.service}</td><td>{row.vendor}</td><td>{row.trigger}</td><td>{row.duration}</td><td><span>{row.status}</span></td></tr>)}
        </tbody></table></div>
      </section>

      <section className="declaration-section controls-section">
        <div><h2>{t.controlsTitle}</h2><div className="control-grid">{t.controls.map(([title, body]) => <article key={title}><CheckCircle2 /><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></div>
        <aside><LockKeyhole /><h2>{t.noReceiptTitle}</h2><p>{t.noReceiptBody}</p></aside>
      </section>

      <section className="declaration-section google-boundary">
        <div><Database /><h2>{t.googleTitle}</h2><p>{t.googleBody}</p></div>
        <div><h2>{t.sourcesTitle}</h2>{t.sources.map(([label, href]) => <a key={href} href={href} target="_blank" rel="noreferrer">{label}<ArrowUpRight /></a>)}</div>
      </section>

      <section className="declaration-section challenge">
        <ShieldCheck /><div><h2>{t.changeTitle}</h2><p>{t.changeBody}</p></div>
        <a href={`${repo}/issues/new`} target="_blank" rel="noreferrer">{t.issue}<ArrowUpRight /></a>
      </section>
    </main>
    <footer><span>{t.footer}</span><a href={repo} target="_blank" rel="noreferrer">GitHub <ArrowUpRight /></a></footer>
  </div>;
}
