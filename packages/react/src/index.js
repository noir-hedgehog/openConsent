import React, { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
import { createOpenConsent } from '@openconsent/core';
import WebConsent from '@openconsent/web';

const Context = createContext(null);

function createClient(options = {}) {
  const { runtime, ...clientOptions } = options;
  if (runtime !== 'memory' && typeof window !== 'undefined' && clientOptions.policy) {
    return WebConsent.init({ ...clientOptions, autoShow: false });
  }
  return createOpenConsent(clientOptions);
}

function isGpcLocked(purpose, snapshot) {
  return Boolean(snapshot.signals?.gpc && (purpose.sale || purpose.sharing));
}

const COPY = {
  en: {
    title: 'Your privacy choices',
    description: 'We use optional cookies only with your permission. You can change your choice at any time.',
    accept: 'Accept all', reject: 'Reject optional', customize: 'Customize', save: 'Save choices', back: 'Back',
    purposeLabels: { 'optional-analytics': 'Analytics', 'personalized-ads': 'Personalized advertising' }
  },
  zh: {
    title: '你的隐私选择',
    description: '我们仅在你同意后使用可选 Cookie。你可以随时更改选择。',
    accept: '全部接受', reject: '拒绝可选项', customize: '自定义', save: '保存选择', back: '返回',
    purposeLabels: { 'optional-analytics': '数据分析', 'personalized-ads': '个性化广告' }
  }
};

const styles = {
  banner: {
    position: 'fixed', left: '1rem', right: '1rem', bottom: '1rem', zIndex: 2147483646,
    maxWidth: '72rem', margin: '0 auto', padding: '1.25rem', border: '1px solid #d9dce3',
    borderRadius: '1rem', background: '#fff', color: '#17191f', boxShadow: '0 18px 60px rgba(15, 23, 42, .18)',
    font: '400 0.95rem/1.5 system-ui, sans-serif'
  },
  heading: { margin: '0 0 .35rem', fontSize: '1.125rem', lineHeight: 1.3 },
  description: { margin: 0, maxWidth: '54rem', color: '#4b5563' },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '.625rem', marginTop: '1rem' },
  primary: { border: 0, borderRadius: '.6rem', padding: '.7rem 1rem', background: '#17191f', color: '#fff', cursor: 'pointer', font: 'inherit', fontWeight: 650 },
  secondary: { border: '1px solid #c9ced8', borderRadius: '.6rem', padding: '.7rem 1rem', background: '#fff', color: '#17191f', cursor: 'pointer', font: 'inherit', fontWeight: 600 },
  purposes: { display: 'grid', gap: '.6rem', marginTop: '1rem' },
  purpose: { display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.75rem', border: '1px solid #e4e7ec', borderRadius: '.6rem' }
};

export function OpenConsentProvider({ client, options, children }) {
  const engine = useMemo(() => client ?? createClient(options), [client, options]);
  const [snapshot, setSnapshot] = useState(engine.getSnapshot());
  useEffect(() => {
    queueMicrotask(() => setSnapshot(engine.getSnapshot()));
    return engine.subscribe(setSnapshot);
  }, [engine]);
  const value = useMemo(() => ({
    client: engine,
    snapshot,
    can: (purpose) => engine.evaluate(purpose),
    save: (purpose, choice) => engine.setChoice(purpose, choice, 'react'),
    savePreferences: (choices) => engine.savePreferences(choices, 'react'),
    acceptAll: () => engine.acceptAll('react'),
    rejectOptional: () => engine.rejectOptional('react'),
    setGpc: (enabled) => engine.setGpc?.(enabled, 'react')
  }), [engine, snapshot]);
  return createElement(Context.Provider, { value }, children);
}

export function useOpenConsent() {
  const value = useContext(Context);
  if (!value) throw new Error('useOpenConsent must be used inside OpenConsentProvider');
  return value;
}

export function ConsentGate({ purpose, fallback = null, children }) {
  const { can } = useOpenConsent();
  return can(purpose).outcome === 'allow' ? children : fallback;
}

export function ConsentToggle({ purpose, label = purpose }) {
  const { client, snapshot, save } = useOpenConsent();
  const checked = snapshot.choices[purpose] === 'granted';
  const definition = client.policy.purposes.find((item) => item.id === purpose);
  return createElement('label', null, createElement('input', { type: 'checkbox', checked, disabled: isGpcLocked(definition ?? {}, snapshot), onChange: (event) => save(purpose, event.target.checked ? 'granted' : 'denied') }), ` ${label}`);
}

export function ConsentBanner({ locale = 'en', open, onOpenChange, onPreferenceChange, className, style, title, description }) {
  const { client, snapshot } = useOpenConsent();
  const copy = COPY[locale] ?? COPY.en;
  const optionalPurposes = useMemo(() => client.policy.purposes.filter((purpose) => purpose.optional && purpose.legalBasis === 'consent'), [client]);
  const undecided = optionalPurposes.some((purpose) => snapshot.choices[purpose.id] === 'unset');
  const [internalOpen, setInternalOpen] = useState(undecided);
  const [customizing, setCustomizing] = useState(false);
  const [drafts, setDrafts] = useState(() => Object.fromEntries(optionalPurposes.map((purpose) => [purpose.id, snapshot.choices[purpose.id] === 'granted'])));
  const visible = typeof open === 'boolean' ? open : internalOpen;

  useEffect(() => {
    if (typeof open !== 'boolean' && undecided) setInternalOpen(true);
  }, [open, undecided]);
  useEffect(() => {
    setDrafts(Object.fromEntries(optionalPurposes.map((purpose) => [purpose.id, snapshot.choices[purpose.id] === 'granted'])));
  }, [optionalPurposes, snapshot]);

  const setVisible = (next) => {
    if (typeof open !== 'boolean') setInternalOpen(next);
    onOpenChange?.(next);
  };
  const complete = (receipt) => {
    onPreferenceChange?.(receipt);
    setCustomizing(false);
    setVisible(false);
  };
  if (!visible) return null;

  const purposeRows = customizing
    ? createElement('div', { style: styles.purposes }, optionalPurposes.map((purpose) => createElement('label', { key: purpose.id, style: styles.purpose },
      createElement('input', {
        type: 'checkbox', checked: Boolean(drafts[purpose.id]), disabled: isGpcLocked(purpose, snapshot),
        onChange: (event) => setDrafts((current) => ({ ...current, [purpose.id]: event.target.checked }))
      }),
      createElement('span', null, copy.purposeLabels[purpose.id] ?? purpose.activityId ?? purpose.id)
    )))
    : null;

  const actions = customizing
    ? [
        createElement('button', { key: 'save', type: 'button', style: styles.primary, onClick: () => complete(client.savePreferences(Object.fromEntries(optionalPurposes.map((purpose) => [purpose.id, drafts[purpose.id] ? 'granted' : 'denied'])), 'react-banner')) }, copy.save),
        createElement('button', { key: 'back', type: 'button', style: styles.secondary, onClick: () => setCustomizing(false) }, copy.back)
      ]
    : [
        createElement('button', { key: 'accept', type: 'button', style: styles.primary, onClick: () => complete(client.acceptAll('react-banner')) }, copy.accept),
        createElement('button', { key: 'reject', type: 'button', style: styles.secondary, onClick: () => complete(client.rejectOptional('react-banner')) }, copy.reject),
        createElement('button', { key: 'customize', type: 'button', style: styles.secondary, onClick: () => setCustomizing(true) }, copy.customize)
      ];

  return createElement('section', {
    className,
    style: { ...styles.banner, ...style },
    role: 'region',
    'aria-label': typeof title === 'string' ? title : copy.title,
    'data-openconsent-banner': ''
  },
  createElement('h2', { style: styles.heading }, title ?? copy.title),
  createElement('p', { style: styles.description }, description ?? copy.description),
  purposeRows,
  createElement('div', { style: styles.actions }, actions));
}
