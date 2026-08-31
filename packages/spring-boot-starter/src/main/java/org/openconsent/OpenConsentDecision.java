package org.openconsent;

public record OpenConsentDecision(String outcome, String purposeId, String reason, String ruleId, String policyVersion) {
  public boolean allowed() { return "allow".equals(outcome); }
}
