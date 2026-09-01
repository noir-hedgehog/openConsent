import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Cookie, RefreshCw, Settings2, ShieldCheck, Terminal } from 'lucide-react';
import OpenConsent from '@openconsent/web';
import type { ConsentSnapshot, OpenConsentClient, PreferenceReceipt } from '@openconsent/web';

const policy = {
  projectId: 'openconsent-playground', policyVersion: 'playground-1', noticeVersion: 'playground-notice-1', manifestDigest: 'sha256:playground',
  purposes: [
    { id: 'essential', activityId: 'serve-playground', legalBasis: 'legitimate-interest', optional: false, label: { en: 'Required technology', zh: '必要技术' }, description: { en: 'Runs the playground and stores your privacy choice.', zh: '用于运行 Playground 并保存你的隐私选择。' } },
    { id: 'optional-analytics', activityId: 'product-analytics', legalBasis: 'consent', optional: true },
    { id: 'personalized-ads', activityId: 'advertising', legalBasis: 'consent', optional: true, sale: true, sharing: true },
  ],
};

export default function Playground() {
  const client = useRef<OpenConsentClient | null>(null);
  const [snapshot, setSnapshot] = useState<ConsentSnapshot | null>(null);
  const [receipt, setReceipt] = useState<PreferenceReceipt | null>(null);
  const [events, setEvents] = useState<Array<{ at: string; action: string; choices: string }>>([]);
  const [decisions, setDecisions] = useState<Array<[string, { outcome: string; reason: string }]>>([]);
  useEffect(() => {
    const current = OpenConsent.init({ policy, locale: 'en', banner: { position: 'bottom', theme: 'auto' }, onPreferenceChange(next) { setReceipt(next); setEvents(rows => [{ at: new Date().toLocaleTimeString(), action: next.action, choices: JSON.stringify(next.choices) }, ...rows].slice(0, 8)); } });
    const update = (next: ConsentSnapshot) => { setSnapshot(next); setDecisions(['essential','optional-analytics','personalized-ads'].map(id => { const result = current.evaluate(id); return [id, { outcome: result.outcome, reason: result.reason }]; })); };
    client.current = current; queueMicrotask(() => update(current.getSnapshot())); const unsubscribe = current.subscribe(update);
    return () => { unsubscribe(); current.destroy(); };
  }, []);
  const reset = () => { client.current?.reset(); setReceipt(null); setEvents([]); };
  return <main className="playground-shell">
    <header><a href={import.meta.env.BASE_URL}><ArrowLeft/>Product website</a><div className="pg-brand"><ShieldCheck/>openConsent <span>PLAYGROUND</span></div><button onClick={() => client.current?.showSettings()}><Settings2/>Privacy choices</button></header>
    <section className="pg-hero"><div><span>TECHNICAL INSPECTOR</span><h1>See every consent decision.</h1><p>This page exposes the runtime state, decision reasons, local preference receipt, and managed tag results. The product website keeps these internals out of the buying journey.</p></div><div className="pg-actions"><button onClick={() => client.current?.showSettings()}><Settings2/>Change choices</button><button onClick={reset}><RefreshCw/>Reset state</button></div></section>
    <section className="pg-grid">
      <article><div className="card-head"><Terminal/>Runtime snapshot</div><pre>{JSON.stringify(snapshot, null, 2)}</pre></article>
      <article><div className="card-head"><CheckCircle2/>Current decisions</div><div className="decision-list">{decisions.map(([id, decision]) => <div key={id}><div><strong>{id}</strong><small>{decision?.reason ?? 'RUNTIME_STARTING'}</small></div><span className={decision?.outcome}>{decision?.outcome ?? '…'}</span></div>)}</div></article>
      <article><div className="card-head"><Cookie/>Managed browser state</div><div className="browser-list"><div><span>analytics-demo.js</span><b>{snapshot?.choices['optional-analytics'] === 'granted' ? 'eligible' : 'blocked'}</b></div><div><span>ads-demo.js</span><b>{snapshot?.choices['personalized-ads'] === 'granted' && !snapshot?.signals.gpc ? 'eligible' : 'blocked'}</b></div><div><span>oc_demo_analytics</span><b>{document.cookie.includes('oc_demo_analytics=') ? 'present' : 'absent'}</b></div><div><span>oc_demo_ads</span><b>{document.cookie.includes('oc_demo_ads=') ? 'present' : 'absent'}</b></div></div></article>
      <article><div className="card-head"><ShieldCheck/>Latest unsigned receipt</div><pre>{receipt ? JSON.stringify(receipt, null, 2) : 'No saved preference in this session.'}</pre></article>
    </section>
    <section className="events"><div className="card-head">Preference events</div>{events.length ? events.map((event,index) => <div key={`${event.at}-${index}`}><time>{event.at}</time><strong>{event.action}</strong><code>{event.choices}</code></div>) : <p>Save a choice to create the first event.</p>}</section>
    <p className="pg-note">This playground uses first-party fixture scripts. It does not contact Google unless you provide Google IDs in the product configuration.</p>
  </main>;
}
