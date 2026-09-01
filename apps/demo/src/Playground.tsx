import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Cookie, RefreshCw, Settings2, ShieldCheck, Terminal } from 'lucide-react';
import OpenConsent from '@openconsent/web';
import type { ConsentSnapshot, OpenConsentClient, PreferenceReceipt } from '@openconsent/web';
import { sitePolicy } from './site-policy';

const policy = { ...sitePolicy, projectId: 'openconsent-playground', policyVersion: 'playground-2', noticeVersion: 'playground-notice-2', manifestDigest: 'sha256:playground-catalog' };
const purposeIds = policy.purposes.map(purpose => purpose.id);

export default function Playground() {
  const client = useRef<OpenConsentClient | null>(null);
  const [snapshot, setSnapshot] = useState<ConsentSnapshot | null>(null);
  const [receipt, setReceipt] = useState<PreferenceReceipt | null>(null);
  const [events, setEvents] = useState<Array<{ at: string; action: string; choices: string }>>([]);
  const [decisions, setDecisions] = useState<Array<[string, { outcome: string; reason: string }]>>([]);
  useEffect(() => {
    const current = OpenConsent.init({ policy: policy as never, locale: 'en', banner: { position: 'bottom', theme: 'auto' }, onPreferenceChange(next) { setReceipt(next); setEvents(rows => [{ at: new Date().toLocaleTimeString(), action: next.action, choices: JSON.stringify(next.choices) }, ...rows].slice(0, 8)); } });
    const update = (next: ConsentSnapshot) => { setSnapshot(next); setDecisions(purposeIds.map(id => { const result = current.evaluate(id); return [id, { outcome: result.outcome, reason: result.reason }]; })); };
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
      <article><div className="card-head"><Cookie/>Managed browser state</div><div className="browser-list"><div><span>preferences-demo.js</span><b>{snapshot?.choices['interface-preferences'] === 'granted' ? 'eligible' : 'blocked'}</b></div><div><span>Google Analytics example</span><b>{snapshot?.choices['site-analytics'] === 'granted' ? 'purpose allowed' : 'blocked'}</b></div><div><span>Google Ads example</span><b>{snapshot?.choices['ads-measurement'] === 'granted' && !snapshot?.signals.gpc ? 'purpose allowed' : 'blocked'}</b></div><div><span>oc_demo_preferences</span><b>{document.cookie.includes('oc_demo_preferences=') ? 'present' : 'absent'}</b></div></div></article>
      <article><div className="card-head"><ShieldCheck/>Latest unsigned receipt</div><pre>{receipt ? JSON.stringify(receipt, null, 2) : 'No saved preference in this session.'}</pre></article>
    </section>
    <section className="events"><div className="card-head">Preference events</div>{events.length ? events.map((event,index) => <div key={`${event.at}-${index}`}><time>{event.at}</time><strong>{event.action}</strong><code>{event.choices}</code></div>) : <p>Save a choice to create the first event.</p>}</section>
    <p className="pg-note">This inspector uses the same disclosure catalog as the official site. Google loading belongs to the product website example adapter, not to the SDK or this playground.</p>
  </main>;
}
