package org.openconsent;

import static org.junit.jupiter.api.Assertions.assertEquals;
import java.util.Map;
import org.junit.jupiter.api.Test;

class OpenConsentEvaluatorTest {
  private final OpenConsentEvaluator evaluator = new OpenConsentEvaluator("policy-2", Map.of(
    "analytics", new OpenConsentPurpose("analytics", "consent", false, false),
    "ads", new OpenConsentPurpose("ads", "consent", true, true),
    "service", new OpenConsentPurpose("service", "contract", false, false)
  ));

  @Test void failsClosedForMissingStaleAndUnknownPurposes() {
    assertEquals("OPTIONAL_DEFAULT_DENY", evaluator.evaluate("analytics", "policy-2", false, Map.of()).reason());
    assertEquals("POLICY_VERSION_STALE", evaluator.evaluate("analytics", "policy-1", false, Map.of("analytics", "granted")).reason());
    assertEquals("requires_review", evaluator.evaluate("unknown", "policy-2", false, Map.of()).outcome());
  }

  @Test void appliesConsentAndServerObservedGpc() {
    assertEquals("allow", evaluator.evaluate("analytics", "policy-2", false, Map.of("analytics", "granted")).outcome());
    assertEquals("GPC_SALE_SHARE_OPT_OUT", evaluator.evaluate("ads", "policy-2", true, Map.of("ads", "granted")).reason());
    assertEquals("allow", evaluator.evaluate("service", null, false, Map.of()).outcome());
  }
}
