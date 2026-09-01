import { validateCatalog } from '../../packages/core/src/index.js';

const finding = (ruleId, title, status, message, path = '$') => ({
  ruleId, title, status, severity: status === 'fail' ? 'high' : 'info', path, message
});

export function assessWebCmp(input) {
  const policy = input?.policy ?? input;
  const findings = [];
  let catalog;
  try {
    catalog = validateCatalog(policy, 'en');
    findings.push(finding('CMP-001', 'Disclosure catalog is structurally valid', 'pass', 'Every catalog reference resolves.'));
  } catch (error) {
    findings.push(finding('CMP-001', 'Disclosure catalog is structurally valid', 'fail', error.message));
  }

  if (catalog?.legacy) {
    findings.push(finding('CMP-002', 'Categories and disclosures are declared', 'fail', 'The purpose-only compatibility mode cannot provide category, vendor, service, and tracker disclosure.', '$.categories'));
  } else if ((catalog?.categories.length ?? 0) === 0 || (catalog?.services.length ?? 0) === 0 || (catalog?.trackers.length ?? 0) === 0) {
    findings.push(finding('CMP-002', 'Categories and disclosures are declared', 'fail', 'A web CMP profile requires categories, services, and trackers.', '$.categories'));
  } else {
    findings.push(finding('CMP-002', 'Categories and disclosures are declared', 'pass', `${catalog.categories.length} categories, ${catalog.services.length} services, and ${catalog.trackers.length} trackers are disclosed.`));
  }

  const vendorsMissingPolicy = catalog?.vendors.filter(vendor => !vendor.privacyPolicyUrl) ?? [];
  findings.push(vendorsMissingPolicy.length
    ? finding('CMP-003', 'Vendor privacy policies are linked', 'fail', `Missing privacy policy URL for: ${vendorsMissingPolicy.map(vendor => vendor.id).join(', ')}.`, '$.vendors')
    : finding('CMP-003', 'Vendor privacy policies are linked', 'pass', 'Every declared vendor links to a privacy policy.'));

  const incompleteTrackers = catalog?.trackers.filter(tracker => !tracker.domain || !tracker.duration || typeof tracker.firstParty !== 'boolean') ?? [];
  findings.push(incompleteTrackers.length
    ? finding('CMP-004', 'Tracker details are complete', 'fail', `Missing domain, duration, or first-party status for: ${incompleteTrackers.map(tracker => tracker.id).join(', ')}.`, '$.trackers')
    : finding('CMP-004', 'Tracker details are complete', 'pass', 'Every tracker discloses domain, duration, type, and party relationship.'));

  const requiredCount = catalog?.categories.filter(category => category.required).length ?? 0;
  findings.push(requiredCount === 0
    ? finding('CMP-005', 'A required category is declared', 'fail', 'Declare at least one required category for essential processing.', '$.categories')
    : finding('CMP-005', 'A required category is declared', 'pass', `${requiredCount} required category is locked on.`));

  const summary = {
    blocking: findings.filter(item => item.status === 'fail').length,
    needs_review: findings.filter(item => item.status === 'needs_review').length,
    pass: findings.filter(item => item.status === 'pass').length,
    not_applicable: findings.filter(item => item.status === 'not_applicable').length
  };
  return { profile: 'web-cmp', validManifest: summary.blocking === 0, findings, summary };
}
