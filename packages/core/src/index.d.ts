export type Choice = 'granted' | 'denied' | 'unset';
export type SavedChoice = Exclude<Choice, 'unset'>;
export type Decision = {
  outcome: 'allow' | 'deny' | 'requires_review';
  purposeId: string;
  reason: string;
  ruleId: string;
  policyVersion: string;
  receiptId?: string | null;
  evaluatedAt: string;
};
export type Purpose = {
  id: string;
  activityId: string;
  legalBasis: string;
  optional: boolean;
  sale?: boolean;
  sharing?: boolean;
};
export type RuntimePolicy = {
  projectId: string;
  policyVersion: string;
  noticeVersion: string;
  manifestDigest: string;
  purposes: Purpose[];
};
export type PreferenceSnapshot = {
  subjectRef: string;
  revision: number;
  choices: Record<string, Choice>;
  signals: { gpc: boolean; [signal: string]: unknown };
  policyVersion: string;
  updatedAt: string;
  receiptId: string | null;
};
export type PreferenceReceipt = {
  receiptId: string;
  previousReceiptId: string | null;
  projectId: string;
  policyVersion: string;
  manifestDigest: string;
  noticeVersion: string;
  revision: number;
  choices: Record<string, Choice>;
  signalsObserved: PreferenceSnapshot['signals'];
  action: 'save' | 'withdraw' | 'deny' | 'accept_all' | 'reject_optional';
  source: string;
  issuedAt: string;
  unsigned: true;
  storage: 'browser-memory-only';
};
export type RuntimeEvent = { eventId: string; type: string; at: string; [detail: string]: unknown };
export type OpenConsentOptions = {
  policy?: RuntimePolicy;
  subjectRef?: string;
  gpc?: boolean;
  initialChoices?: Record<string, Choice>;
  now?: () => string;
};
export type EvaluationOptions = { gpc?: boolean; now?: () => string };
export type OpenConsentClient = {
  readonly policy: RuntimePolicy;
  getSnapshot(): PreferenceSnapshot;
  getEvents(): RuntimeEvent[];
  subscribe(listener: (snapshot: PreferenceSnapshot) => void): () => void;
  setChoice(purposeId: string, choice: SavedChoice, source?: string): PreferenceReceipt;
  savePreferences(choices: Record<string, SavedChoice>, source?: string): PreferenceReceipt;
  acceptAll(source?: string): PreferenceReceipt;
  rejectOptional(source?: string): PreferenceReceipt;
  setGpc(enabled: boolean, source?: string): void;
  evaluate(purposeId: string, options?: EvaluationOptions): Decision;
  reset(): void;
};
export declare const DEFAULT_POLICY: RuntimePolicy;
export declare function evaluatePurpose(policy: RuntimePolicy, snapshot: PreferenceSnapshot, purposeId: string, options?: EvaluationOptions): Decision;
export declare function createOpenConsent(options?: OpenConsentOptions): OpenConsentClient;
