import { evaluatePurpose } from '@openconsent/core';

export function readGpc(request) {
  return String(request.get?.('Sec-GPC') ?? request.headers?.['sec-gpc'] ?? '') === '1';
}

export function openConsent(options) {
  if (!options?.policy || !options?.getSnapshot) throw new TypeError('policy and getSnapshot are required');
  return async function openConsentMiddleware(request, response, next) {
    try {
      const snapshot = await options.getSnapshot(request);
      const gpc = readGpc(request);
      request.openConsent = {
        gpc,
        snapshot,
        can: (purposeId) => evaluatePurpose(options.policy, snapshot, purposeId, { gpc })
      };
      next();
    } catch (error) { next(error); }
  };
}

export function requirePurpose(purposeId) {
  return function requireOpenConsent(request, response, next) {
    if (!request.openConsent) return response.status(500).json({ error: 'OPENCONSENT_MIDDLEWARE_MISSING' });
    const decision = request.openConsent.can(purposeId);
    if (decision.outcome !== 'allow') return response.status(403).json({ error: 'OPENCONSENT_DENIED', decision });
    response.set?.('OpenConsent-Policy-Version', decision.policyVersion);
    next();
  };
}
