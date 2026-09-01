import type { CategoryState, Choice, ConsentCatalog, Decision, RuntimePolicy } from '@openconsent/core';
export type { CategoryState } from '@openconsent/core';
export type CategoryChoice = 'granted' | 'denied';
export type DisclosureCatalog = ConsentCatalog;
export type DisclosureCategory = ConsentCatalog['categories'][number];
export type DisclosureVendor = ConsentCatalog['vendors'][number];
export type DisclosureService = ConsentCatalog['services'][number];
export type DisclosureTracker = ConsentCatalog['trackers'][number];
export type Locale = 'en' | 'zh';
export interface BannerOptions { position?: 'top' | 'bottom'; theme?: 'light' | 'dark' | 'auto'; container?: HTMLElement | string; privacyPolicyUrl?: string; privacyTrigger?: boolean }
export interface PreferenceReceipt { receiptId: string; previousReceiptId: string | null; projectId: string; policyVersion: string; manifestDigest: string; noticeVersion: string; revision: number; choices: Record<string, Choice>; signalsObserved: { gpc: boolean }; action: 'accept_all' | 'reject_optional' | 'save' | 'withdraw' | 'save_preferences' | string; source: string; issuedAt: string; unsigned: true; storage: 'browser-localStorage' }
export interface ConsentSnapshot { subjectRef: string; revision: number; choices: Record<string, Choice>; categoryStates: Record<string, CategoryState>; signals: { gpc: boolean }; policyVersion: string; noticeVersion: string; updatedAt: string; receiptId: string | null; hasSavedPreference: boolean }
export interface OpenConsentOptions { projectId?: string; subjectRef?: string; locale?: Locale; policy: RuntimePolicy; banner?: BannerOptions; storageKey?: string; autoShow?: boolean; onPreferenceChange?: (receipt: PreferenceReceipt) => void }
export interface OpenConsentClient {
  readonly policy: RuntimePolicy;
  getCatalog(): DisclosureCatalog;
  getSnapshot(): ConsentSnapshot;
  subscribe(listener: (snapshot: ConsentSnapshot) => void): () => void;
  evaluate(purposeId: string): Decision;
  show(): void; showSettings(): void; hide(): void;
  acceptAll(source?: string): PreferenceReceipt; rejectOptional(source?: string): PreferenceReceipt;
  setChoice(purposeId: string, choice: CategoryChoice, source?: string): PreferenceReceipt;
  savePreferences(choices: Record<string, CategoryChoice>, source?: string): PreferenceReceipt;
  setCategory(categoryId: string, choice: CategoryChoice, source?: string): PreferenceReceipt;
  saveCategoryPreferences(choices: Record<string, CategoryChoice>, source?: string): PreferenceReceipt;
  reset(): void; destroy(): void;
}
export declare function init(options: OpenConsentOptions): OpenConsentClient;
export declare function autoInit(script?: HTMLScriptElement | null): Promise<OpenConsentClient | null> | null;
export declare function getActiveClient(): OpenConsentClient | null;
declare const OpenConsent: { init: typeof init; autoInit: typeof autoInit; getActiveClient: typeof getActiveClient; ready?: Promise<OpenConsentClient | null> };
export default OpenConsent;
