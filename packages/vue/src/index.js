import { computed, defineComponent, h, inject, readonly, ref, watch } from 'vue';
import { createOpenConsent } from '@openconsent/core';
import WebConsent from '@openconsent/web';
import { getCategoryRows, getDisclosureCatalog, saveCategories, setCategory as setCategoryChoice } from './catalog.js';

const key = Symbol.for('openconsent.vue');
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

function createClient(options = {}) {
  const { runtime, client: _client, ...clientOptions } = options;
  if (runtime !== 'memory' && typeof window !== 'undefined' && clientOptions.policy) {
    return WebConsent.init({ ...clientOptions, autoShow: false });
  }
  return createOpenConsent(clientOptions);
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
    getCatalog: () => getDisclosureCatalog(client),
    setCategory: (categoryId, choice) => setCategoryChoice(client, client.getSnapshot(), categoryId, choice, 'vue'),
    saveCategoryPreferences: (choices) => saveCategories(client, client.getSnapshot(), choices, 'vue'),
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
    const categories = computed(() => getCategoryRows(client, snapshot.value, props.locale));
    const undecided = computed(() => typeof snapshot.value.hasSavedPreference === 'boolean'
      ? !snapshot.value.hasSavedPreference
      : categories.value.some((category) => !category.required && category.state === 'unset'));
    const internalOpen = ref(undecided.value);
    const customizing = ref(false);
    const drafts = ref({});
    const visible = computed(() => typeof props.open === 'boolean' ? props.open : internalOpen.value);
    const syncDrafts = () => {
      drafts.value = Object.fromEntries(categories.value.map((category) => [category.id, category.state === 'mixed' ? null : category.state === 'granted' || category.state === 'required']));
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
        ? h('div', { style: styles.purposes }, categories.value.map((category) => h('label', { key: category.id, style: styles.purpose }, [
            h('span', { style: styles.purposeCopy }, [
              h('strong', category.label),
              category.description ? h('span', { style: styles.purposeDescription }, category.description) : null,
              category.state === 'mixed' ? h('span', { style: styles.status }, copy.mixed) : null,
              category.required ? h('span', { style: styles.status }, copy.required) : null
            ]),
            h('input', {
              type: 'checkbox', checked: drafts.value[category.id] === true, disabled: category.required,
              ref: (node) => { if (node) node.indeterminate = drafts.value[category.id] === null; },
              'aria-checked': drafts.value[category.id] === null ? 'mixed' : drafts.value[category.id] === true,
              onChange: (event) => { drafts.value = { ...drafts.value, [category.id]: event.target.checked }; }
            })
          ])))
        : null;
      const actions = customizing.value
        ? [
            h('button', { type: 'button', style: styles.primary, onClick: () => {
              const choices = Object.fromEntries(categories.value
                .filter((category) => !category.required && drafts.value[category.id] !== null)
                .map((category) => [category.id, drafts.value[category.id] ? 'granted' : 'denied']));
              if (Object.keys(choices).length === 0) { customizing.value = false; setVisible(false); return; }
              complete(saveCategories(client, snapshot.value, choices, 'vue-banner'));
            } }, copy.save),
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
