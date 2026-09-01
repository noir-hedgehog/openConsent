export const sitePolicy = {
  projectId: 'openconsent-site',
  policyVersion: 'site-2026-09-01.2',
  noticeVersion: 'website-notice-2',
  manifestDigest: 'sha256:openconsent-site-catalog-2026-09-01',
  updatedAt: '2026-09-01',
  privacyPolicyUrl: 'https://github.com/noir-hedgehog/openConsent/blob/main/docs/TRANSPARENCY.md',
  contact: { en: 'GitHub Issues · openConsent Project', zh: 'GitHub Issues · openConsent 项目' },
  categories: [
    {
      id: 'necessary',
      label: { en: 'Necessary', zh: '必要' },
      description: { en: 'Required to operate the site and remember your privacy choices.', zh: '用于运行网站并记住你的隐私选择。' },
      required: true,
      order: 1
    },
    {
      id: 'preferences',
      label: { en: 'Preferences', zh: '偏好' },
      description: { en: 'Remembers optional interface preferences you choose.', zh: '记住你主动选择的可选界面偏好。' },
      required: false,
      order: 2
    },
    {
      id: 'analytics',
      label: { en: 'Analytics', zh: '分析' },
      description: { en: 'Measures how the official website is used so we can improve it.', zh: '衡量官网使用情况，帮助我们改进产品。' },
      required: false,
      order: 3
    },
    {
      id: 'marketing',
      label: { en: 'Marketing', zh: '营销' },
      description: { en: 'Measures advertising and, only when separately allowed, supports personalization.', zh: '衡量广告效果，并仅在单独允许时支持个性化。' },
      required: false,
      order: 4
    }
  ],
  purposes: [
    {
      id: 'site-operation',
      categoryId: 'necessary',
      activityId: 'serve-site',
      label: { en: 'Site operation and consent storage', zh: '网站运行与同意状态保存' },
      description: { en: 'Serves the website and stores the privacy choices required to honor your decision.', zh: '运行网站并保存执行你隐私决定所必需的选择。' },
      legalBasis: 'legitimate-interest',
      optional: false
    },
    {
      id: 'interface-preferences',
      categoryId: 'preferences',
      activityId: 'remember-interface-preferences',
      label: { en: 'Optional interface preferences', zh: '可选界面偏好' },
      description: { en: 'Remembers optional demo settings beyond the privacy choice itself.', zh: '记住隐私选择之外的可选演示设置。' },
      legalBasis: 'consent',
      optional: true
    },
    {
      id: 'site-analytics',
      categoryId: 'analytics',
      activityId: 'measure-site',
      label: { en: 'Website analytics', zh: '网站分析' },
      description: { en: 'Collects usage measurements through Google Analytics 4 after consent.', zh: '仅在同意后通过 Google Analytics 4 收集使用情况衡量数据。' },
      legalBasis: 'consent',
      optional: true
    },
    {
      id: 'ads-measurement',
      categoryId: 'marketing',
      activityId: 'measure-advertising',
      label: { en: 'Advertising measurement', zh: '广告效果衡量' },
      description: { en: 'Measures Google Ads campaign performance after consent.', zh: '仅在同意后衡量 Google Ads 广告活动效果。' },
      legalBasis: 'consent',
      optional: true,
      sale: true,
      sharing: true
    },
    {
      id: 'ads-personalization',
      categoryId: 'marketing',
      activityId: 'personalize-advertising',
      label: { en: 'Advertising personalization', zh: '广告个性化' },
      description: { en: 'Allows Google advertising personalization after a separate purpose choice.', zh: '在单独选择该用途后允许 Google 广告个性化。' },
      legalBasis: 'consent',
      optional: true,
      sale: true,
      sharing: true
    }
  ],
  vendors: [
    {
      id: 'openconsent-project',
      name: 'openConsent Project',
      description: { en: 'Operator of this official website and its first-party consent demo.', zh: '本官网及第一方同意演示的运营方。' },
      privacyPolicyUrl: 'https://github.com/noir-hedgehog/openConsent/blob/main/docs/TRANSPARENCY.md'
    },
    {
      id: 'google',
      name: 'Google LLC',
      description: { en: 'Analytics and advertising technology provider used only after the matching choice.', zh: '仅在对应选择允许后使用的分析与广告技术供应商。' },
      privacyPolicyUrl: 'https://policies.google.com/privacy'
    }
  ],
  services: [
    {
      id: 'openconsent-runtime',
      name: { en: 'openConsent runtime', zh: 'openConsent 运行时' },
      vendorId: 'openconsent-project',
      purposeIds: ['site-operation'],
      description: { en: 'Stores the versioned privacy preference locally.', zh: '在本地保存版本化隐私偏好。' }
    },
    {
      id: 'interface-demo',
      name: { en: 'Interface preference demo', zh: '界面偏好演示' },
      vendorId: 'openconsent-project',
      purposeIds: ['interface-preferences'],
      description: { en: 'A first-party example showing optional preference storage.', zh: '用于演示可选偏好存储的第一方示例。' }
    },
    {
      id: 'google-analytics',
      name: 'Google Analytics 4',
      vendorId: 'google',
      purposeIds: ['site-analytics'],
      description: { en: 'Official website usage measurement.', zh: '官网使用情况衡量。' }
    },
    {
      id: 'google-ads',
      name: 'Google Ads',
      vendorId: 'google',
      purposeIds: ['ads-measurement', 'ads-personalization'],
      description: { en: 'Advertising measurement and optional personalization.', zh: '广告效果衡量与可选个性化。' }
    }
  ],
  trackers: [
    {
      id: 'openconsent-preferences',
      name: 'openconsent:openconsent-site:preferences',
      kind: 'local-storage',
      serviceId: 'openconsent-runtime',
      purposeIds: ['site-operation'],
      domain: 'First-party browser storage',
      duration: 'Until policy change or withdrawal',
      firstParty: true,
      description: { en: 'Stores the selected purposes and policy version.', zh: '保存选择的用途和策略版本。' }
    },
    {
      id: 'interface-demo-cookie',
      name: 'oc_demo_preferences',
      kind: 'cookie',
      serviceId: 'interface-demo',
      purposeIds: ['interface-preferences'],
      domain: 'noir-hedgehog.github.io',
      duration: 'Session',
      firstParty: true,
      description: { en: 'Demonstrates optional first-party preference storage.', zh: '演示可选的第一方偏好存储。' }
    },
    {
      id: 'ga-cookie',
      name: '_ga',
      kind: 'cookie',
      serviceId: 'google-analytics',
      purposeIds: ['site-analytics'],
      domain: 'noir-hedgehog.github.io',
      duration: 'Up to 2 years',
      firstParty: true,
      description: { en: 'Distinguishes browser instances for analytics measurement.', zh: '用于分析衡量中区分浏览器实例。' }
    },
    {
      id: 'ga-property-cookie',
      name: '_ga_*',
      kind: 'cookie',
      serviceId: 'google-analytics',
      purposeIds: ['site-analytics'],
      domain: 'noir-hedgehog.github.io',
      duration: 'Up to 2 years',
      firstParty: true,
      description: { en: 'Stores Google Analytics session state.', zh: '保存 Google Analytics 会话状态。' }
    },
    {
      id: 'google-tag',
      name: 'gtag.js',
      kind: 'script',
      serviceId: 'google-analytics',
      purposeIds: ['site-analytics'],
      domain: 'www.googletagmanager.com',
      duration: 'Request',
      firstParty: false,
      description: { en: 'Loads the Google tag only after analytics consent.', zh: '仅在分析同意后加载 Google 标签。' }
    },
    {
      id: 'gcl-cookie',
      name: '_gcl_au',
      kind: 'cookie',
      serviceId: 'google-ads',
      purposeIds: ['ads-measurement'],
      domain: 'noir-hedgehog.github.io',
      duration: 'Up to 90 days',
      firstParty: true,
      description: { en: 'Stores advertising conversion attribution information.', zh: '保存广告转化归因信息。' }
    },
    {
      id: 'google-ads-tag',
      name: 'Google Ads tag',
      kind: 'script',
      serviceId: 'google-ads',
      purposeIds: ['ads-measurement', 'ads-personalization'],
      domain: 'www.googletagmanager.com',
      duration: 'Request',
      firstParty: false,
      description: { en: 'Initializes Ads configuration without sending a demo conversion.', zh: '初始化 Ads 配置，但不会发送演示转化。' }
    }
  ]
} as const;

export type SitePolicy = typeof sitePolicy;
