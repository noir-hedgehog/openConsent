import type { CSSProperties, ReactNode } from 'react';
import type { Choice, Decision, OpenConsentClient as CoreClient, OpenConsentOptions as CoreOptions, PreferenceReceipt as CoreReceipt, PreferenceSnapshot as CoreSnapshot, SavedChoice } from '@openconsent/core';
import type { ConsentSnapshot as WebSnapshot, OpenConsentClient as WebClient, OpenConsentOptions as WebOptions, PreferenceReceipt as WebReceipt } from '@openconsent/web';

export type OpenConsentSdkClient = CoreClient | WebClient;
export type OpenConsentSdkSnapshot = CoreSnapshot | WebSnapshot;
export type OpenConsentSdkReceipt = CoreReceipt | WebReceipt;
export type OpenConsentProviderOptions = (WebOptions | CoreOptions) & { runtime?: 'web' | 'memory' };

export type OpenConsentContextValue = {
  client: OpenConsentSdkClient;
  snapshot: OpenConsentSdkSnapshot;
  can(purposeId: string): Decision;
  save(purposeId: string, choice: SavedChoice): OpenConsentSdkReceipt;
  savePreferences(choices: Record<string, SavedChoice>): OpenConsentSdkReceipt;
  acceptAll(): OpenConsentSdkReceipt;
  rejectOptional(): OpenConsentSdkReceipt;
  setGpc(enabled: boolean): void;
};
export type OpenConsentProviderProps = { client?: OpenConsentSdkClient; options?: OpenConsentProviderOptions; children?: ReactNode };
export declare function OpenConsentProvider(props: OpenConsentProviderProps): ReactNode;
export declare function useOpenConsent(): OpenConsentContextValue;
export declare function ConsentGate(props: { purpose: string; fallback?: ReactNode; children?: ReactNode }): ReactNode;
export declare function ConsentToggle(props: { purpose: string; label?: ReactNode }): ReactNode;
export type ConsentBannerProps = {
  locale?: 'en' | 'zh' | (string & {});
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPreferenceChange?: (receipt: OpenConsentSdkReceipt) => void;
  className?: string;
  style?: CSSProperties;
  title?: ReactNode;
  description?: ReactNode;
};
export declare function ConsentBanner(props: ConsentBannerProps): ReactNode;
export type { Choice };
