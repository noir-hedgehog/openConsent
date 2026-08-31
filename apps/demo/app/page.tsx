'use client';

import { useMemo, useState } from 'react';
import { Activity, Braces, Check, Clipboard, Code2, FileKey2, RotateCcw, ShieldCheck, Signal, X } from 'lucide-react';

type Jurisdiction = 'gdpr' | 'ccpa' | 'both';
type Choice = 'granted' | 'denied' | 'unset';
type EventRow = { id: number; type: string; detail: string; time: string };

const snippets = {
  React: `import { OpenConsentProvider, ConsentGate } from '@openconsent/react';\n\n<OpenConsentProvider options={{ policy }}>\n  <ConsentGate purpose="optional-analytics">\n    <Analytics />\n  </ConsentGate>\n</OpenConsentProvider>`,
  Vue: `app.use(createOpenConsentPlugin({ policy }))\n\nconst { can, save } = useOpenConsent()\nawait save('optional-analytics', 'granted')\ncan('optional-analytics')`,
  Express: `app.use(openConsent({ policy, getSnapshot }))\n\napp.post('/analytics',\n  requirePurpose('optional-analytics'),\n  handler\n) // Sec-GPC is evaluated server-side`,
  Spring: `OpenConsentEvaluator evaluator =\n  new OpenConsentEvaluator("runtime-alpha.1");\n\nevaluator.evaluate(\n  "optional-analytics", "consent",\n  false, gpc, choices\n);`
};

const comparison = [
  ['公开规则 / Git 可复核', '完整', '专有实现'],
  ['Manifest、CI 与透明卡', '完整', '非主要能力'],
  ['运行时偏好与 SDK', 'Alpha', '生产级'],
  ['Cookie 扫描与标签阻断', '未实现', '生产级'],
  ['IAB TCF / GPP、Google Consent Mode', '未实现', '已支持'],
  ['AI / Agent 权限治理', '规划中', '非核心方向']
];

export default function Home() {
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('both');
  const [analytics, setAnalytics] = useState<Choice>('unset');
  const [ads, setAds] = useState<Choice>('unset');
  const [gpc, setGpc] = useState(false);
  const [tab, setTab] = useState<'demo' | 'sdk' | 'compare'>('demo');
  const [framework, setFramework] = useState<keyof typeof snippets>('React');
  const [events, setEvents] = useState<EventRow[]>([
    { id: 1, type: 'runtime_initialized', detail: 'runtime-alpha.1 · browser only', time: 'now' }
  ]);
  const [copied, setCopied] = useState(false);
  const analyticsDecision = analytics === 'granted' ? 'ALLOW' : 'DENY';
  const adsDecision = gpc ? 'DENY' : ads === 'granted' ? 'ALLOW' : 'DENY';
  const latestReceipt = events.find((event) => event.type.includes('preference'));
  const decision = useMemo(() => ({
    outcome: (jurisdiction === 'ccpa' || jurisdiction === 'both') ? adsDecision : analyticsDecision,
    purposeId: (jurisdiction === 'ccpa' || jurisdiction === 'both') ? 'personalized-ads' : 'optional-analytics',
    reason: gpc && (jurisdiction === 'ccpa' || jurisdiction === 'both') ? 'GPC_SALE_SHARE_OPT_OUT' : ((jurisdiction === 'ccpa' || jurisdiction === 'both') ? adsDecision : analyticsDecision) === 'ALLOW' ? 'CONSENT_RECEIPT_MATCHED' : 'OPTIONAL_DEFAULT_DENY',
    ruleId: gpc ? 'CCPA-RUNTIME-001' : 'GDPR-RUNTIME-002',
    policyVersion: 'runtime-alpha.1',
    receiptId: latestReceipt ? `rcpt_demo_${latestReceipt.id}` : null
  }), [adsDecision, analyticsDecision, gpc, jurisdiction, latestReceipt]);

  function append(type: string, detail: string) {
    setEvents((current) => [{ id: Date.now(), type, detail, time: new Date().toLocaleTimeString('zh-CN', { hour12: false }) }, ...current].slice(0, 8));
  }
  function choose(kind: 'analytics' | 'ads', value: Choice) {
    if (kind === 'analytics') setAnalytics(value); else setAds(value);
    append(value === 'granted' ? 'preference_granted' : 'preference_withdrawn', `${kind} → ${value}`);
    setTimeout(() => append('decision_evaluated', `${kind} → ${value === 'granted' && !(kind === 'ads' && gpc) ? 'ALLOW' : 'DENY'}`), 0);
  }
  function toggleGpc() {
    const next = !gpc; setGpc(next);
    append('gpc_observed', next ? 'Sec-GPC: 1（模拟）' : 'GPC signal cleared');
    if (next) setTimeout(() => append('downstream_blocked', 'sale / sharing → DENY'), 0);
  }
  function reset() {
    setAnalytics('unset'); setAds('unset'); setGpc(false);
    setEvents([{ id: Date.now(), type: 'runtime_reset', detail: '全部可选处理恢复为默认拒绝', time: 'now' }]);
  }
  async function copyCode() {
    await navigator.clipboard.writeText(snippets[framework]);
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  }

  return <main>
    <header className="topbar">
      <a className="brand" href="#top" aria-label="openConsent demo 首页"><span className="brand-mark"><ShieldCheck size={18} /></span><span>openConsent</span><em>LAB</em></a>
      <nav aria-label="主导航"><button className={tab === 'demo' ? 'active' : ''} onClick={() => setTab('demo')}>体验演示</button><button className={tab === 'sdk' ? 'active' : ''} onClick={() => setTab('sdk')}>SDK 接入</button><button className={tab === 'compare' ? 'active' : ''} onClick={() => setTab('compare')}>能力边界</button></nav>
      <a className="github-link" href="https://github.com/noir-hedgehog/openConsent" target="_blank" rel="noreferrer"><Code2 size={16} /> GitHub</a>
    </header>
    <section className="intro" id="top"><div><p className="eyebrow">OPEN COMPLIANCE RUNTIME · ALPHA</p><h1>在代码里看见同意如何生效。</h1><p>切换法规、GPC 与用户选择，实时查看决策、收据和下游传播。所有数据只保存在本页内存。</p></div><div className="status-stack"><span><span className="dot cyan" />Demo</span><span><span className="dot amber" />Browser-only</span><span><span className="dot coral" />Unsigned</span></div></section>

    {tab === 'demo' && <>
      <section className="toolbar" aria-label="演示环境"><div><span className="toolbar-label">法规范围</span><div className="segmented">{(['gdpr','ccpa','both'] as Jurisdiction[]).map((item) => <button key={item} className={jurisdiction === item ? 'selected' : ''} onClick={() => { setJurisdiction(item); append('jurisdiction_changed', item.toUpperCase()); }}>{item === 'both' ? 'GDPR + CCPA' : item.toUpperCase()}</button>)}</div></div><div className="toolbar-actions"><span className="policy-chip"><FileKey2 size={14} /> runtime-alpha.1</span><button className="secondary" onClick={reset}><RotateCcw size={15} />重置场景</button></div></section>
      <section className="workbench">
        <article className="panel controls-panel"><PanelTitle step="01" title="请求与用户选择" subtitle="控制本次浏览器会话" />
          {(jurisdiction === 'gdpr' || jurisdiction === 'both') && <div className="control-group"><div className="control-title"><span>GDPR</span><small>OPT-IN</small></div><div className="locked-row"><div><strong>AI 辅助客服</strong><span>履行用户请求 · 合同基础</span></div><span className="locked">说明项</span></div><ChoiceRow title="可选产品分析" caption="默认关闭 · 可随时撤回" value={analytics} onChange={(value) => choose('analytics', value)} /></div>}
          {(jurisdiction === 'ccpa' || jurisdiction === 'both') && <div className="control-group"><div className="control-title"><span>CCPA / CPRA</span><small>OPT-OUT</small></div><ChoiceRow title="出售或跨场景共享" caption={gpc ? 'GPC 已强制退出，无法覆盖' : 'Do Not Sell or Share'} value={gpc ? 'denied' : ads} disabled={gpc} onChange={(value) => choose('ads', value)} /><button className={`gpc-row ${gpc ? 'on' : ''}`} onClick={toggleGpc} role="switch" aria-checked={gpc}><span><Signal size={17} /><span><strong>模拟 Global Privacy Control</strong><small>{gpc ? 'Sec-GPC: 1 已观察' : '浏览器未发送，点击模拟'}</small></span></span><span className="switch"><i /></span></button></div>}
          <p className="microcopy">关闭面板或不操作不会生成同意。演示不能替代法律审查。</p>
        </article>
        <article className="panel decision-panel"><PanelTitle step="02" title="实时决策" subtitle="确定性规则，不调用模型" /><div className={`decision-orb ${decision.outcome.toLowerCase()}`}><span>{decision.outcome === 'ALLOW' ? <Check /> : <X />}</span><strong>{decision.outcome}</strong><small>{decision.purposeId}</small></div><dl className="decision-meta"><div><dt>原因</dt><dd>{decision.reason}</dd></div><div><dt>规则</dt><dd>{decision.ruleId}</dd></div><div><dt>证据等级</dt><dd>demo-runtime</dd></div><div><dt>Manifest</dt><dd>demo:8f6b1f3a</dd></div></dl><div className="assessment-strip"><span><i className="pass" />8 pass</span><span><i className="review" />3 review</span><span><i />0 blocking</span></div></article>
        <article className="panel evidence-panel"><PanelTitle step="03" title="证据流" subtitle="收据与最近事件" /><div className="receipt"><span>UNSIGNED DEMO RECEIPT</span><strong>{decision.receiptId ?? '尚未生成'}</strong><small>rev {latestReceipt ? 1 : 0} · browser-memory-only</small></div><div className="timeline">{events.map((event) => <div className="event" key={event.id}><span className="event-icon"><Activity size={14} /></span><div><strong>{event.type}</strong><p>{event.detail}</p></div><time>{event.time}</time></div>)}</div></article>
      </section>
      <section className="pipeline" aria-label="决策传播"><span>Browser SDK</span><i>→</i><span>Express / Spring</span><i>→</i><span className={decision.outcome === 'DENY' ? 'blocked' : 'allowed'}>{decision.outcome === 'DENY' ? 'Analytics blocked' : 'Purpose allowed'}</span></section>
    </>}

    {tab === 'sdk' && <section className="sdk-layout"><article className="panel sdk-main"><PanelTitle step={<Code2 size={16}/>} title="同一协议，四种接入方式" subtitle="0.2.0-alpha.1 integration starters" /><div className="framework-tabs">{Object.keys(snippets).map((name) => <button key={name} className={framework === name ? 'selected' : ''} onClick={() => setFramework(name as keyof typeof snippets)}>{name}</button>)}</div><div className="install"><span>$</span><code>{framework === 'Spring' ? 'mvn -f packages/spring-boot-starter/pom.xml install' : `pnpm add ./packages/${framework.toLowerCase()}`}</code></div><div className="codebox"><button onClick={copyCode} aria-label="复制代码">{copied ? <Check size={16}/> : <Clipboard size={16}/>}</button><pre>{snippets[framework]}</pre></div></article><aside className="panel contract"><PanelTitle step={<Braces size={16}/>} title="统一决策契约" subtitle="前后端使用相同 reason code" /><pre>{JSON.stringify(decision, null, 2)}</pre><div className="contract-note"><ShieldCheck size={18}/><p><strong>服务端为权威来源</strong><br/>前端布尔值或 Cookie 不能单独作为有效同意证据。</p></div></aside></section>}

    {tab === 'compare' && <section className="compare-layout"><article className="panel compare-card"><PanelTitle step="≠" title="现在还不能替代付费 CMP" subtitle="openConsent v0.1 与 consentmanager 的能力边界" /><p className="compare-lede">当前优势是开放规则、Git 可复现证据与 AI/Agent 治理方向；生产运行时能力仍在建设中。</p><div className="comparison-table"><div className="comparison-head"><span>能力</span><span>openConsent</span><span>consentmanager</span></div>{comparison.map((row) => <div key={row[0]}><span>{row[0]}</span><span>{row[1]}</span><span>{row[2]}</span></div>)}</div></article><aside className="panel boundary"><h3>公开边界</h3><ul><li><Check size={16}/>已实现：manifest、规则检查、透明卡、assessment</li><li><Activity size={16}/>本演示：浏览器偏好、收据和传播模拟</li><li><X size={16}/>未实现：生产存储、签名、真实标签阻断、IAB/Google 协议</li></ul><a href="https://github.com/noir-hedgehog/openConsent/blob/main/docs/PAID_CMP_COMPARISON.md" target="_blank" rel="noreferrer">查看完整差距审计 →</a></aside></section>}
    <footer><span>Apache-2.0 · transparent rules · reproducible evidence</span><span>非法律意见或合规认证</span></footer>
  </main>;
}

function PanelTitle({ step, title, subtitle }: { step: React.ReactNode; title: string; subtitle: string }) { return <div className="panel-heading"><span className="step">{step}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div>; }
function ChoiceRow({ title, caption, value, disabled = false, onChange }: { title: string; caption: string; value: Choice; disabled?: boolean; onChange: (value: Choice) => void }) { return <div className={`choice-row ${disabled ? 'disabled' : ''}`}><div><strong>{title}</strong><span>{caption}</span></div><div className="choice-actions"><button disabled={disabled} className={value === 'denied' ? 'deny selected' : 'deny'} onClick={() => onChange('denied')}>拒绝</button><button disabled={disabled} className={value === 'granted' ? 'grant selected' : 'grant'} onClick={() => onChange('granted')}>允许</button></div></div>; }
