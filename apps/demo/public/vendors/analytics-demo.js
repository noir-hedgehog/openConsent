(() => {
  const generation = Number(document.currentScript.dataset.openconsentGeneration);
  const guard = window.__openConsentDemoPermissions?.analytics;
  if (!guard?.allowed || guard.generation !== generation) return;
  window.__openConsentDemoVendors = window.__openConsentDemoVendors || {};
  window.__openConsentDemoVendors.analytics = { loadedAt: new Date().toISOString() };
  const scriptUrl = new URL(document.currentScript.src);
  const vendorSegment = '/vendors/';
  const segmentIndex = scriptUrl.pathname.indexOf(vendorSegment);
  const cookiePath = segmentIndex >= 0 ? scriptUrl.pathname.slice(0, segmentIndex + 1) : '/';
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `oc_demo_analytics=active; path=${cookiePath}; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent('openconsent:vendor-loaded', { detail: { id: 'analytics-demo', purpose: 'analytics', generation } }));
})();
