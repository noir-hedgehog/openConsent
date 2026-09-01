import type { Choice, Decision, RuntimePolicy } from '@openconsent/core';

export type Locale = 'en' | 'zh';

export interface BannerOptions {
  position?: 'top' | 'bottom';
  theme?: 'light' | 'dark' | 'auto';
  container?: HTMLElement | string;
  privacyPolicyUrl?: string;
}

export interface GoogleAnalyticsOptions {
  measurementId: string;
  purposeId?: string;
}

export interface GoogleAdsOptions {
  tagId: string;
  purposeId?: string;
}

export interface WebIntegrations {
  ga4?: GoogleAnalyticsOptions;
  googleAds?: GoogleAdsOptions;
}

export interface PreferenceReceipt {
  receiptId: string;
  previousReceiptId: string | null;
  projectId: string;
  policyVersion: string;
  manifestDigest: string;
  noticeVersion: string;
  revision: number;
  choices: Record<string, Choice>;
  signalsObserved: { gpc: boolean };
  action: 'accept_all' | 'reject_optional' | 'save' | 'withdraw' | 'save_preferences' | string;
  source: string;
  issuedAt: string;
  unsigned: true;
  storage: 'browser-localStorage';
}

export interface ConsentSnapshot {
  subjectRef: string;
  revision: number;
  choices: Record<string, Choice>;
  signals: { gpc: boolean };
  policyVersion: string;
  noticeVersion: string;
  updatedAt: string;
  receiptId: string | null;
  hasSavedPreference: boolean;
}

export interface OpenConsentOptions {
  projectId?: string;
  subjectRef?: string;
  locale?: Locale;
  policy: RuntimePolicy;
  banner?: BannerOptions;
  integrations?: WebIntegrations;
  storageKey?: string;
  autoShow?: boolean;
  onPreferenceChange?: (receipt: PreferenceReceipt) => void;
}

export interface OpenConsentClient {
  readonly policy: RuntimePolicy;
  getSnapshot(): ConsentSnapshot;
  subscribe(listener: (snapshot: ConsentSnapshot) => void): () => void;
  evaluate(purposeId: string): Decision;
  show(): void;
  showSettings(): void;
  hide(): void;
  acceptAll(source?: string): PreferenceReceipt;
  rejectOptional(source?: string): PreferenceReceipt;
  setChoice(purposeId: string, choice: Exclude<Choice, 'unset'>, source?: string): PreferenceReceipt;
  savePreferences(choices: Record<string, Exclude<Choice, 'unset'>>, source?: string): PreferenceReceipt;
  reset(): void;
  destroy(): void;
}

export declare function init(options: OpenConsentOptions): OpenConsentClient;
export declare function autoInit(script?: HTMLScriptElement | null): Promise<OpenConsentClient | null> | null;
export declare function getActiveClient(): OpenConsentClient | null;

declare const OpenConsent: {
  init: typeof init;
  autoInit: typeof autoInit;
  getActiveClient: typeof getActiveClient;
  ready?: Promise<OpenConsentClient | null>;
};

export default OpenConsent;
