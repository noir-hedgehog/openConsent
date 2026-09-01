import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CheckCircle2, CircleDot, Clock3, Code2, Languages, Scale, ShieldCheck } from 'lucide-react';

type Locale = 'en' | 'zh';
type Status = 'shipped' | 'building' | 'planned' | 'research';

const repo = 'https://github.com/noir-hedgehog/openConsent';

const sourceLinks = [
  ['GDPR — EUR-Lex', 'https://eur-lex.europa.eu/eli/reg/2016/679/oj'],
  ['California Privacy Protection Agency', 'https://cppa.ca.gov/regulations/'],
  ['Global Privacy Control specification', 'https://globalprivacycontrol.org/'],
  ['Google Consent Mode documentation', 'https://developers.google.com/tag-platform/security/guides/consent'],
];

const content = {
  en: {
    back: 'Product website',
    language: '切换到中文',
    badge: 'PUBLIC ROADMAP · 0.4.0-beta.1',
    title: 'A consent layer teams can inspect, ship, and improve.',
    intro: 'This roadmap separates shipped code, active work, planned commitments, and research. A roadmap item is not a shipped capability or a legal promise.',
    principles: [
      ['Build', 'A small self-hosted runtime with accessible choices and explicit tag control.'],
      ['Prove', 'Public tests, policy versions, a Cookie declaration, and reproducible release artifacts.'],
      ['Govern', 'Open rules and review gates without publishing individual preference records.'],
    ],
    nowTitle: 'Current release focus',
    nowBody: '0.4 turns transparency into a product surface: a public capability map, a maintained Cookie and storage catalog, and clearer separation between the SDK and website examples.',
    now: [
      'English and Chinese Banner and Preference Center',
      'Versioned local preferences and stale-policy invalidation',
      'Explicit managed-script blocking and cleanup hooks',
      'GPC override for declared sale/sharing purposes',
      'React, Vue, Express, and Spring integration surfaces',
      'Top-level categories, purposes, vendors, services, and trackers',
      'Public Roadmap and Cookie Declaration pages',
    ],
    matrixTitle: 'Capability and gap matrix',
    matrixBody: 'The evidence column points to what can be inspected today. “Building”, “Planned”, and “Research” rows remain outside shipped product claims.',
    columns: ['Capability', 'Status', 'Evidence today', 'Next release gate'],
    statuses: { shipped: 'Shipped', building: 'Building', planned: 'Planned', research: 'Research' },
    rows: [
      ['Banner and Preference Center', 'shipped', 'Bilingual web runtime and browser E2E', 'Independent accessibility review'],
      ['Explicit tag pre-blocking', 'shipped', 'Managed script protocol and withdrawal tests', 'Broader vendor and race-condition fixtures'],
      ['Versioned browser preferences', 'shipped', 'localStorage schema and stale-version tests', 'Migration policy for stable releases'],
      ['GPC sale/share override', 'shipped', 'Browser and server evaluators', 'Regional rule packs in 0.5'],
      ['Public technology catalog', 'shipped', 'Top-level categories, purposes, vendors, services, and trackers', 'Automated deployment/catalog validation'],
      ['Google Analytics and Ads', 'shipped', 'Official-site example adapter and Consent Mode test', 'Remain website example code, outside the SDK'],
      ['React, Vue, Express, and Spring', 'shipped', 'Components, adapters, and conformance tests', 'Independent framework example applications'],
      ['Self-hosted evidence API and withdrawal retries', 'building', 'Purpose-level browser event and implementation plan', 'Protected API, identity binding, and retry visibility in 0.5'],
      ['Regional rules and multi-site governance', 'planned', 'Single policy and deployment examples', '0.5 rule packs and multi-site configuration'],
      ['Hosted consent log and geolocation', 'planned', 'Not implemented; no openConsent cloud service', 'Evaluate after the self-hosted 0.5 reference path'],
      ['Maintained vendor database and admin console', 'planned', 'Not implemented', 'Open data provenance and governance proposal'],
      ['Automatic tracker discovery', 'planned', 'No shipped scanner', '0.6 unclassified-tracker queue and change monitoring'],
      ['Reviewable AI classification suggestions', 'planned', 'Deterministic Privacy Readiness Checks only', '0.6 evidence-linked proposals with human approval'],
      ['IAB certification, TCF/GPP, mobile, and cross-device', 'research', 'Not implemented or certified', '1.0 research and enterprise review'],
    ] as Array<[string, Status, string, string]>,
    milestonesTitle: 'Release path',
    milestones: [
      ['0.4', 'Catalog', 'Top-level categories, purposes, vendors, services, and trackers; public declaration and clear SDK boundaries.'],
      ['0.5', 'Operations', 'Self-hosted evidence API, retryable withdrawal, regional rule packs, and multi-site governance.'],
      ['0.6', 'Discovery', 'Automatic scanning, unclassified-tracker review, change monitoring, and reviewable AI classification suggestions.'],
      ['1.0', 'Research horizon', 'IAB TCF/GPP, mobile, cross-device consent, and enterprise readiness review remain research until validated.'],
    ],
    sourcesTitle: 'Primary references',
    sourcesBody: 'Rules and examples are maintained against primary sources. Applicability and legal conclusions still require qualified review.',
    boundaryTitle: 'Permanent product boundaries',
    boundaries: [
      'No “100% compliant” score or automatic legal certification.',
      'Consent remains separate from contract, legitimate interests, and agent delegation.',
      'A public catalog describes technologies; it never exposes a visitor receipt or choice.',
      'Self-hosting remains viable and no paid cloud control plane is required.',
    ],
    footer: 'Roadmap updated for 0.4.0-beta.1 · Apache-2.0 · Not legal advice',
  },
  zh: {
    back: '返回产品官网',
    language: 'Switch to English',
    badge: '公开路线图 · 0.4.0-beta.1',
    title: '打造一个可检查、可上线、可持续改进的同意管理层。',
    intro: '这份路线图严格区分已交付代码、正在建设、计划承诺与研究方向。路线图条目不代表已经交付，也不构成法律承诺。',
    principles: [
      ['构建', '提供体积小、可自托管、具备无障碍选择与显式标签控制的运行时。'],
      ['验证', '公开测试、策略版本、Cookie 声明与可复现发布产物。'],
      ['治理', '公开规则与审查门禁，同时不公开任何个人偏好记录。'],
    ],
    nowTitle: '当前版本重点',
    nowBody: '0.4 将透明度做成正式产品界面：公开能力矩阵、持续维护的 Cookie 与存储目录，以及更清晰的 SDK 和官网示例边界。',
    now: [
      '完整中英文 Banner 与偏好中心',
      '版本化本地偏好与旧策略失效',
      '显式受管脚本阻断与清理钩子',
      '对已声明出售/共享用途执行 GPC 覆盖',
      'React、Vue、Express 与 Spring 接入层',
      '顶层 categories、purposes、vendors、services 与 trackers',
      '公开 Roadmap 与 Cookie Declaration 页面',
    ],
    matrixTitle: '能力与差距矩阵',
    matrixBody: '“当前证据”说明今天可以检查什么；“建设中”“计划中”和“研究中”不进入已交付能力宣传。',
    columns: ['能力', '状态', '当前证据', '下一发布门槛'],
    statuses: { shipped: '已交付', building: '建设中', planned: '计划中', research: '研究中' },
    rows: [
      ['Banner 与偏好中心', 'shipped', '双语 Web 运行时与浏览器 E2E', '独立无障碍审查'],
      ['显式标签预阻断', 'shipped', '受管脚本协议与撤回测试', '扩大供应商与竞态测试样例'],
      ['版本化浏览器偏好', 'shipped', 'localStorage Schema 与旧版本测试', '稳定版迁移策略'],
      ['GPC 出售/共享覆盖', 'shipped', '浏览器与服务端评估器', '0.5 区域规则包'],
      ['公开技术目录', 'shipped', '顶层 categories、purposes、vendors、services、trackers', '自动校验部署与目录一致性'],
      ['Google Analytics 与 Ads', 'shipped', '官网示例适配器与 Consent Mode 测试', '保持为官网示例代码，不进入 SDK'],
      ['React、Vue、Express 与 Spring', 'shipped', '组件、适配器与一致性测试', '独立框架示例应用'],
      ['自托管证据 API 与撤回重试', 'building', '用途级浏览器事件与实施方案', '0.5 受保护 API、身份绑定与重试可见性'],
      ['区域规则与多站点治理', 'planned', '当前为单策略与部署示例', '0.5 区域规则包与多站点配置'],
      ['托管 consent log 与 geolocation', 'planned', '未实现；没有 openConsent 云服务', '在 0.5 自托管参考路径后评估'],
      ['持续维护的供应商数据库与管理后台', 'planned', '未实现', '先提出公开数据来源与治理方案'],
      ['自动 tracker 发现', 'planned', '当前没有已交付扫描器', '0.6 未分类 tracker 队列与变更监控'],
      ['可审查 AI 分类建议', 'planned', '当前只有确定性的 Privacy Readiness Checks', '0.6 带证据建议并由人工批准'],
      ['IAB 认证、TCF/GPP、移动端与跨设备', 'research', '尚未实现或获得认证', '1.0 研究与企业级审查'],
    ] as Array<[string, Status, string, string]>,
    milestonesTitle: '版本路径',
    milestones: [
      ['0.4', '目录模型', '顶层 categories、purposes、vendors、services、trackers；公开声明与清晰 SDK 边界。'],
      ['0.5', '运营能力', '自托管证据 API、可重试撤回、区域规则包与多站点治理。'],
      ['0.6', '发现能力', '自动扫描、未分类 tracker 审查、变更监控与可审查 AI 分类建议。'],
      ['1.0', '研究边界', 'IAB TCF/GPP、移动端、跨设备同意与企业级就绪审查，在验证前都属于研究。'],
    ],
    sourcesTitle: '主要依据',
    sourcesBody: '规则和示例以一手来源维护；适用性与法律结论仍需由合格人员审查。',
    boundaryTitle: '长期产品边界',
    boundaries: [
      '不提供“100% 合规”评分或自动法律认证。',
      '同意与合同、合法利益及 Agent 委托保持独立。',
      '公开目录只描述技术，不公开任何访客 receipt 或选择。',
      '持续支持自托管，不强制依赖付费云控制台。',
    ],
    footer: '路线图更新至 0.4.0-beta.1 · Apache-2.0 · 不构成法律意见',
  },
} as const;

const statusIcon = (status: Status) => status === 'shipped' ? <CheckCircle2 /> : status === 'building' ? <CircleDot /> : <Clock3 />;

export default function Roadmap() {
  const [locale, setLocale] = useState<Locale>(() => localStorage.getItem('openconsent_site_locale') === 'zh' ? 'zh' : 'en');
  const t = content[locale];
  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    localStorage.setItem('openconsent_site_locale', locale);
  }, [locale]);

  return <div className="roadmap-page">
    <header className="roadmap-nav">
      <a href={import.meta.env.BASE_URL}><ArrowLeft />{t.back}</a>
      <a className="roadmap-brand" href={import.meta.env.BASE_URL}><ShieldCheck />openConsent</a>
      <button onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')} aria-label={t.language}><Languages />{locale === 'en' ? '中文' : 'EN'}</button>
    </header>
    <main>
      <section className="roadmap-hero">
        <div className="roadmap-badge">{t.badge}</div>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
        <div className="principle-grid">{t.principles.map(([title, body], index) => {
          const Icon = [Code2, ShieldCheck, Scale][index];
          return <article key={title}><Icon /><h2>{title}</h2><p>{body}</p></article>;
        })}</div>
      </section>

      <section className="current-release">
        <div><span>NOW</span><h2>{t.nowTitle}</h2><p>{t.nowBody}</p></div>
        <ul>{t.now.map(item => <li key={item}><CheckCircle2 />{item}</li>)}</ul>
      </section>

      <section className="roadmap-section">
        <div className="section-copy"><h2>{t.matrixTitle}</h2><p>{t.matrixBody}</p></div>
        <div className="matrix-wrap"><table><thead><tr>{t.columns.map(column => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>{t.rows.map(([capability, status, evidence, gate]) => <tr key={capability}>
            <th>{capability}</th><td><span className={`status status-${status}`}>{statusIcon(status)}{t.statuses[status]}</span></td><td>{evidence}</td><td>{gate}</td>
          </tr>)}</tbody></table></div>
      </section>

      <section className="roadmap-section">
        <div className="section-copy"><h2>{t.milestonesTitle}</h2></div>
        <div className="milestones">{t.milestones.map(([version, title, body]) => <article key={version}><span>{version}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      </section>

      <section className="roadmap-section source-section">
        <div><h2>{t.sourcesTitle}</h2><p>{t.sourcesBody}</p><div className="source-links">{sourceLinks.map(([label, href]) => <a key={href} href={href} target="_blank" rel="noreferrer">{label}<ArrowUpRight /></a>)}</div></div>
        <div className="boundaries"><h2>{t.boundaryTitle}</h2>{t.boundaries.map(item => <p key={item}><ShieldCheck />{item}</p>)}</div>
      </section>
    </main>
    <footer><a href={repo} target="_blank" rel="noreferrer">GitHub <ArrowUpRight /></a><span>{t.footer}</span></footer>
  </div>;
}
