package org.openconsent;

public record OpenConsentPurpose(
  String id,
  String categoryId,
  String activityId,
  String label,
  String description,
  String legalBasis,
  boolean optional,
  boolean sale,
  boolean sharing
) {
  public OpenConsentPurpose(String id, String legalBasis, boolean sale, boolean sharing) {
    this(id, id, id, id, "", legalBasis, "consent".equals(legalBasis), sale, sharing);
  }
}
