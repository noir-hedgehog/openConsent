(() => {
  const path = location.pathname.includes('/playground/') ? location.pathname.split('/playground/')[0] + '/' : location.pathname.replace(/[^/]*$/, '');
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `oc_demo_analytics=active; path=${path || '/'}; SameSite=Lax${secure}`;
  window.openConsentCleanupAnalytics = () => {
    document.cookie = `oc_demo_analytics=; Max-Age=0; path=${path || '/'}; SameSite=Lax${secure}`;
  };
  window.dispatchEvent(new CustomEvent('openconsent:vendor-loaded', { detail: { id: 'analytics-demo', purpose: 'optional-analytics' } }));
})();
