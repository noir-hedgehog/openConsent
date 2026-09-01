import React, { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
import { createOpenConsent } from '@openconsent/core';
import WebConsent from '@openconsent/web';
import { getCategoryRows, getDisclosureCatalog, saveCategories, setCategory as setCategoryChoice } from './catalog.js';

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
    required: 'Always active', mixed: 'Some purposes differ'
  },
  zh: {
    title: '你的隐私选择',
    description: '我们仅在你同意后使用可选 Cookie。你可以随时更改选择。',
    accept: '全部接受', reject: '拒绝可选项', customize: '自定义', save: '保存选择', back: '返回',
    required: '始终启用', mixed: '部分用途选择不同'
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
  purpose: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '.75rem', border: '1px solid #e4e7ec', borderRadius: '.6rem' },
  purposeCopy: { display: 'grid', gap: '.15rem' },
  purposeDescription: { color: '#4b5563', fontSize: '.85rem' },
  status: { color: '#4b5563', fontSize: '.8rem', fontWeight: 650 }
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
    getCatalog: () => getDisclosureCatalog(engine),
    setCategory: (categoryId, choice) => setCategoryChoice(engine, engine.getSnapshot(), categoryId, choice, 'react'),
    saveCategoryPreferences: (choices) => saveCategories(engine, engine.getSnapshot(), choices, 'react'),
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
  return createElement('label', null,
    createElement('input', { type: 'checkbox', checked, disabled: isGpcLocked(definition ?? {}, snapshot), onChange: (event) => save(purpose, event.target.checked ? 'granted' : 'denied') }),
    createElement('span', null, ' ', label));
}

export function ConsentBanner({ locale = 'en', open, onOpenChange, onPreferenceChange, className, style, title, description }) {
  const { client, snapshot } = useOpenConsent();
  const copy = COPY[locale] ?? COPY.en;
  const categories = useMemo(() => getCategoryRows(client, snapshot, locale), [client, snapshot, locale]);
  const undecided = typeof snapshot.hasSavedPreference === 'boolean'
    ? !snapshot.hasSavedPreference
    : categories.some((category) => !category.required && category.state === 'unset');
  const [internalOpen, setInternalOpen] = useState(undecided);
  const [customizing, setCustomizing] = useState(false);
  const [drafts, setDrafts] = useState(() => Object.fromEntries(categories.map((category) => [category.id, category.state === 'mixed' ? null : category.state === 'granted' || category.state === 'required'])));
  const visible = typeof open === 'boolean' ? open : internalOpen;

  useEffect(() => {
    if (typeof open !== 'boolean' && undecided) setInternalOpen(true);
  }, [open, undecided]);
  useEffect(() => {
    setDrafts(Object.fromEntries(categories.map((category) => [category.id, category.state === 'mixed' ? null : category.state === 'granted' || category.state === 'required'])));
  }, [categories]);

  const setVisible = (next) => {
    if (typeof open !== 'boolean') setInternalOpen(next);
    onOpenChange?.(next);
  };
  const complete = (receipt) => {
    onPreferenceChange?.(receipt);
    setCustomizing(false);
    setVisible(false);
  };
  const saveDrafts = () => {
    const choices = Object.fromEntries(categories
      .filter((category) => !category.required && drafts[category.id] !== null)
      .map((category) => [category.id, drafts[category.id] ? 'granted' : 'denied']));
    if (Object.keys(choices).length === 0) {
      setCustomizing(false);
      setVisible(false);
      return;
    }
    complete(saveCategories(client, snapshot, choices, 'react-banner'));
  };
  if (!visible) return null;

  const purposeRows = customizing
    ? createElement('div', { style: styles.purposes }, categories.map((category) => createElement('label', { key: category.id, style: styles.purpose },
      createElement('span', { style: styles.purposeCopy },
        createElement('strong', null, category.label),
        category.description ? createElement('span', { style: styles.purposeDescription }, category.description) : null,
        category.state === 'mixed' ? createElement('span', { style: styles.status }, copy.mixed) : null,
        category.required ? createElement('span', { style: styles.status }, copy.required) : null),
      createElement('input', {
        type: 'checkbox', checked: drafts[category.id] === true, disabled: category.required,
        ref: (node) => { if (node) node.indeterminate = drafts[category.id] === null; },
        'aria-checked': drafts[category.id] === null ? 'mixed' : drafts[category.id] === true,
        onChange: (event) => setDrafts((current) => ({ ...current, [category.id]: event.target.checked }))
      })
    )))
    : null;

  const actions = customizing
    ? [
        createElement('button', { key: 'save', type: 'button', style: styles.primary, onClick: saveDrafts }, copy.save),
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
