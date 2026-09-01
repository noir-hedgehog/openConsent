package org.openconsent;

import java.util.Map;
import java.util.Objects;

public final class OpenConsentEvaluator {
  private final String policyVersion;
  private final Map<String, OpenConsentPurpose> purposes;

  public OpenConsentEvaluator(String policyVersion, Map<String, OpenConsentPurpose> purposes) {
    this.policyVersion = Objects.requireNonNull(policyVersion, "policyVersion");
    this.purposes = Map.copyOf(Objects.requireNonNull(purposes, "purposes"));
  }

  public OpenConsentDecision evaluate(String purposeId, String snapshotPolicyVersion, boolean gpc, Map<String, String> choices) {
    OpenConsentPurpose purpose = purposes.get(purposeId);
    if (purpose == null) return new OpenConsentDecision("requires_review", purposeId, "PURPOSE_UNKNOWN", "CORE-RUNTIME-001", policyVersion);
    if (gpc && (purpose.sale() || purpose.sharing())) return new OpenConsentDecision("deny", purposeId, "GPC_SALE_SHARE_OPT_OUT", "CCPA-RUNTIME-001", policyVersion);
    if (!"consent".equals(purpose.legalBasis())) return new OpenConsentDecision("allow", purposeId, "DECLARED_" + purpose.legalBasis().toUpperCase().replace('-', '_') + "_BASIS", "GDPR-RUNTIME-001", policyVersion);
    if (!policyVersion.equals(snapshotPolicyVersion)) return new OpenConsentDecision("deny", purposeId, "POLICY_VERSION_STALE", "CORE-RUNTIME-002", policyVersion);
    String choice = choices == null ? "unset" : choices.getOrDefault(purposeId, "unset");
    return "granted".equals(choice)
      ? new OpenConsentDecision("allow", purposeId, "CONSENT_RECEIPT_MATCHED", "GDPR-RUNTIME-002", policyVersion)
      : new OpenConsentDecision("deny", purposeId, "denied".equals(choice) ? "PREFERENCE_DENIED" : "OPTIONAL_DEFAULT_DENY", "GDPR-RUNTIME-002", policyVersion);
  }
}
