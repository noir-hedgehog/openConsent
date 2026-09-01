import type { App, DefineComponent, DeepReadonly, Ref } from 'vue';
import type { CategoryState as CoreCategoryState, ConsentCatalog, Decision, OpenConsentClient as CoreClient, OpenConsentOptions as CoreOptions, PreferenceReceipt as CoreReceipt, PreferenceSnapshot as CoreSnapshot, SavedChoice } from '@openconsent/core';
import type { ConsentSnapshot as WebSnapshot, OpenConsentClient as WebClient, OpenConsentOptions as WebOptions, PreferenceReceipt as WebReceipt } from '@openconsent/web';

export type OpenConsentSdkClient = CoreClient | WebClient;
export type OpenConsentSdkSnapshot = CoreSnapshot | WebSnapshot;
export type OpenConsentSdkReceipt = CoreReceipt | WebReceipt;
export type OpenConsentPluginOptions = (WebOptions | CoreOptions) & { runtime?: 'web' | 'memory'; client?: OpenConsentSdkClient };
export type DisclosureCatalog = ConsentCatalog;
export type CategoryState = CoreCategoryState;
export type CategoryChoice = SavedChoice;

export type OpenConsentVueApi = {
  client: OpenConsentSdkClient;
  snapshot: DeepReadonly<Ref<OpenConsentSdkSnapshot>>;
  can(purposeId: string): Decision;
  save(purposeId: string, choice: SavedChoice): OpenConsentSdkReceipt;
  savePreferences(choices: Record<string, SavedChoice>): OpenConsentSdkReceipt;
  getCatalog(): DisclosureCatalog;
  setCategory(categoryId: string, choice: CategoryChoice): OpenConsentSdkReceipt;
  saveCategoryPreferences(choices: Record<string, CategoryChoice>): OpenConsentSdkReceipt;
  acceptAll(): OpenConsentSdkReceipt;
  rejectOptional(): OpenConsentSdkReceipt;
  setGpc(enabled: boolean): void;
};
export type OpenConsentPlugin = { install(app: App): void; api: OpenConsentVueApi };
export declare function createOpenConsentPlugin(options?: OpenConsentPluginOptions): OpenConsentPlugin;
export declare function useOpenConsent(): OpenConsentVueApi;
export type ConsentBannerProps = { locale?: 'en' | 'zh' | (string & {}); open?: boolean; title?: string; description?: string };
export declare const ConsentBanner: DefineComponent<ConsentBannerProps>;
