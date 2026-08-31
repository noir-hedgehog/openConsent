package org.openconsent;

import java.util.Map;

public final class OpenConsentEvaluator {
  private final String policyVersion;
  public OpenConsentEvaluator(String policyVersion) { this.policyVersion = policyVersion; }
  public OpenConsentDecision evaluate(String purposeId, String legalBasis, boolean saleOrSharing, boolean gpc, Map<String, String> choices) {
    if (gpc && saleOrSharing) return new OpenConsentDecision("deny", purposeId, "GPC_SALE_SHARE_OPT_OUT", "CCPA-RUNTIME-001", policyVersion);
    if (!"consent".equals(legalBasis)) return new OpenConsentDecision("allow", purposeId, "DECLARED_" + legalBasis.toUpperCase().replace('-', '_') + "_BASIS", "GDPR-RUNTIME-001", policyVersion);
    String choice = choices.getOrDefault(purposeId, "unset");
    return "granted".equals(choice)
      ? new OpenConsentDecision("allow", purposeId, "CONSENT_RECEIPT_MATCHED", "GDPR-RUNTIME-002", policyVersion)
      : new OpenConsentDecision("deny", purposeId, "denied".equals(choice) ? "PREFERENCE_DENIED" : "OPTIONAL_DEFAULT_DENY", "GDPR-RUNTIME-002", policyVersion);
  }
}
