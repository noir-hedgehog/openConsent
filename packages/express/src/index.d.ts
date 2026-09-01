import type { Decision, PreferenceSnapshot, RuntimePolicy } from '@openconsent/core';

export type OpenConsentRequest = {
  get?(name: string): unknown;
  headers?: Record<string, string | string[] | undefined>;
  openConsent?: OpenConsentRequestContext;
  [property: string]: unknown;
};
export type OpenConsentResponse = {
  status(code: number): OpenConsentResponse;
  json(body: unknown): unknown;
  set?(name: string, value: string): unknown;
};
export type OpenConsentNext = (error?: unknown) => void;
export type OpenConsentRequestContext = {
  gpc: boolean;
  snapshot: PreferenceSnapshot;
  can(purposeId: string): Decision;
};
export type OpenConsentMiddleware = (request: OpenConsentRequest, response: OpenConsentResponse, next: OpenConsentNext) => void | Promise<void>;
export type OpenConsentMiddlewareOptions = {
  policy: RuntimePolicy;
  getSnapshot(request: OpenConsentRequest): PreferenceSnapshot | null | undefined | Promise<PreferenceSnapshot | null | undefined>;
};

export declare function readGpc(request: OpenConsentRequest): boolean;
export declare function openConsent(options: OpenConsentMiddlewareOptions): OpenConsentMiddleware;
export declare function requirePurpose(purposeId: string): OpenConsentMiddleware;

declare global {
  namespace Express {
    interface Request {
      openConsent?: OpenConsentRequestContext;
    }
  }
}
