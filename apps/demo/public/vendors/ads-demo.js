(() => {
  const path = location.pathname.includes('/playground/') ? location.pathname.split('/playground/')[0] + '/' : location.pathname.replace(/[^/]*$/, '');
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `oc_demo_ads=active; path=${path || '/'}; SameSite=Lax${secure}`;
  window.openConsentCleanupAds = () => {
    document.cookie = `oc_demo_ads=; Max-Age=0; path=${path || '/'}; SameSite=Lax${secure}`;
  };
  window.dispatchEvent(new CustomEvent('openconsent:vendor-loaded', { detail: { id: 'ads-demo', purpose: 'personalized-ads' } }));
})();
