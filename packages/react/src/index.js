import React, { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
import { createOpenConsent } from '@openconsent/core';

const Context = createContext(null);

export function OpenConsentProvider({ client, options, children }) {
  const engine = useMemo(() => client ?? createOpenConsent(options), [client]);
  const [snapshot, setSnapshot] = useState(engine.getSnapshot());
  useEffect(() => engine.subscribe(setSnapshot), [engine]);
  const value = useMemo(() => ({ client: engine, snapshot, can: (purpose) => engine.evaluate(purpose), save: (purpose, choice) => engine.setChoice(purpose, choice, 'react'), rejectOptional: () => engine.rejectOptional('react'), setGpc: (enabled) => engine.setGpc(enabled, 'react-demo') }), [engine, snapshot]);
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
  const { snapshot, save } = useOpenConsent();
  const checked = snapshot.choices[purpose] === 'granted';
  return createElement('label', null, createElement('input', { type: 'checkbox', checked, onChange: (event) => save(purpose, event.target.checked ? 'granted' : 'denied') }), ` ${label}`);
}
