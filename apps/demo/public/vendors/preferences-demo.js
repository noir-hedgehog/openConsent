(() => {
  const path = location.pathname.includes('/openConsent/') ? '/openConsent/' : '/';
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `oc_demo_preferences=active; path=${path}; SameSite=Lax${secure}`;
  window.openConsentCleanupPreferences = () => {
    document.cookie = `oc_demo_preferences=; Max-Age=0; path=${path}; SameSite=Lax${secure}`;
  };
  window.dispatchEvent(new CustomEvent('openconsent:vendor-loaded', {
    detail: { id: 'interface-demo', purpose: 'interface-preferences' }
  }));
})();
