export type Choice = 'granted' | 'denied' | 'unset';
export type Decision = { outcome: 'allow' | 'deny' | 'requires_review'; purposeId: string; reason: string; ruleId: string; policyVersion: string; receiptId?: string | null; evaluatedAt: string };
export type Purpose = { id: string; activityId: string; legalBasis: string; optional: boolean; sale?: boolean; sharing?: boolean };
export type RuntimePolicy = { projectId: string; policyVersion: string; noticeVersion: string; manifestDigest: string; purposes: Purpose[] };
export declare const DEFAULT_POLICY: RuntimePolicy;
export declare function evaluatePurpose(policy: RuntimePolicy, snapshot: any, purposeId: string, options?: any): Decision;
export declare function createOpenConsent(options?: any): any;
