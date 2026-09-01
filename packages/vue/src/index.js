import { computed, defineComponent, h, inject, readonly, ref, watch } from 'vue';
import { createOpenConsent } from '@openconsent/core';
import WebConsent from '@openconsent/web';

const key = Symbol.for('openconsent.vue');
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

function createClient(options = {}) {
  const { runtime, client: _client, ...clientOptions } = options;
  if (runtime !== 'memory' && typeof window !== 'undefined' && clientOptions.policy) {
    return WebConsent.init({ ...clientOptions, autoShow: false });
  }
  return createOpenConsent(clientOptions);
}

function isGpcLocked(purpose, snapshot) {
  return Boolean(snapshot.signals?.gpc && (purpose.sale || purpose.sharing));
}

export function createOpenConsentPlugin(options = {}) {
  const client = options.client ?? createClient(options);
  const snapshot = ref(client.getSnapshot());
  client.subscribe((value) => { snapshot.value = value; });
  const api = {
    client,
    snapshot: readonly(snapshot),
    can: (purpose) => client.evaluate(purpose),
    save: (purpose, choice) => client.setChoice(purpose, choice, 'vue'),
    savePreferences: (choices) => client.savePreferences(choices, 'vue'),
    acceptAll: () => client.acceptAll('vue'),
    rejectOptional: () => client.rejectOptional('vue'),
    setGpc: (enabled) => client.setGpc?.(enabled, 'vue')
  };
  return { install(app) { app.provide(key, api); }, api };
}

export function useOpenConsent() {
  const value = inject(key);
  if (!value) throw new Error('Install createOpenConsentPlugin before useOpenConsent');
  return value;
}

export const ConsentBanner = defineComponent({
  name: 'OpenConsentBanner',
  inheritAttrs: false,
  props: {
    locale: { type: String, default: 'en' },
    open: { type: Boolean, default: undefined },
    title: { type: String, default: undefined },
    description: { type: String, default: undefined }
  },
  emits: ['update:open', 'preference-change'],
  setup(props, { emit, attrs }) {
    const { client, snapshot } = useOpenConsent();
    const optionalPurposes = client.policy.purposes.filter((purpose) => purpose.optional && purpose.legalBasis === 'consent');
    const undecided = computed(() => optionalPurposes.some((purpose) => snapshot.value.choices[purpose.id] === 'unset'));
    const internalOpen = ref(undecided.value);
    const customizing = ref(false);
    const drafts = ref({});
    const visible = computed(() => typeof props.open === 'boolean' ? props.open : internalOpen.value);
    const syncDrafts = () => {
      drafts.value = Object.fromEntries(optionalPurposes.map((purpose) => [purpose.id, snapshot.value.choices[purpose.id] === 'granted']));
    };
    watch(snapshot, syncDrafts, { immediate: true, deep: true });
    watch(undecided, (value) => { if (typeof props.open !== 'boolean' && value) internalOpen.value = true; });

    const setVisible = (value) => {
      if (typeof props.open !== 'boolean') internalOpen.value = value;
      emit('update:open', value);
    };
    const complete = (receipt) => {
      emit('preference-change', receipt);
      customizing.value = false;
      setVisible(false);
    };

    return () => {
      if (!visible.value) return null;
      const copy = COPY[props.locale] ?? COPY.en;
      const purposeRows = customizing.value
        ? h('div', { style: styles.purposes }, optionalPurposes.map((purpose) => h('label', { key: purpose.id, style: styles.purpose }, [
            h('input', {
              type: 'checkbox', checked: Boolean(drafts.value[purpose.id]), disabled: isGpcLocked(purpose, snapshot.value),
              onChange: (event) => { drafts.value = { ...drafts.value, [purpose.id]: event.target.checked }; }
            }),
            h('span', copy.purposeLabels[purpose.id] ?? purpose.activityId ?? purpose.id)
          ])))
        : null;
      const actions = customizing.value
        ? [
            h('button', { type: 'button', style: styles.primary, onClick: () => complete(client.savePreferences(Object.fromEntries(optionalPurposes.map((purpose) => [purpose.id, drafts.value[purpose.id] ? 'granted' : 'denied'])), 'vue-banner')) }, copy.save),
            h('button', { type: 'button', style: styles.secondary, onClick: () => { customizing.value = false; } }, copy.back)
          ]
        : [
            h('button', { type: 'button', style: styles.primary, onClick: () => complete(client.acceptAll('vue-banner')) }, copy.accept),
            h('button', { type: 'button', style: styles.secondary, onClick: () => complete(client.rejectOptional('vue-banner')) }, copy.reject),
            h('button', { type: 'button', style: styles.secondary, onClick: () => { customizing.value = true; } }, copy.customize)
          ];
      return h('section', {
        ...attrs,
        style: [styles.banner, attrs.style],
        role: 'region',
        'aria-label': props.title ?? copy.title,
        'data-openconsent-banner': ''
      }, [
        h('h2', { style: styles.heading }, props.title ?? copy.title),
        h('p', { style: styles.description }, props.description ?? copy.description),
        purposeRows,
        h('div', { style: styles.actions }, actions)
      ]);
    };
  }
});
