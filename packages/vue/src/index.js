import { inject, readonly, ref } from 'vue';
import { createOpenConsent } from '@openconsent/core';

const key = Symbol.for('openconsent.vue');
export function createOpenConsentPlugin(options = {}) {
  const client = options.client ?? createOpenConsent(options);
  const snapshot = ref(client.getSnapshot());
  client.subscribe((value) => { snapshot.value = value; });
  const api = { client, snapshot: readonly(snapshot), can: (purpose) => client.evaluate(purpose), save: (purpose, choice) => client.setChoice(purpose, choice, 'vue'), rejectOptional: () => client.rejectOptional('vue'), setGpc: (enabled) => client.setGpc(enabled, 'vue-demo') };
  return { install(app) { app.provide(key, api); }, api };
}
export function useOpenConsent() {
  const value = inject(key);
  if (!value) throw new Error('Install createOpenConsentPlugin before useOpenConsent');
  return value;
}
