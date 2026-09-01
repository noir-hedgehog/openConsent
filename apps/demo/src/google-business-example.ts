type Choice = 'granted' | 'denied' | 'unset';

type ConsentClient = {
  getSnapshot(): { choices?: Record<string, Choice> };
  subscribe(listener: () => void): () => void;
  evaluate(purposeId: string): { outcome: string };
};

export type GoogleBusinessStatus = {
  configured: boolean;
  analyticsConfigured: boolean;
  adsConfigured: boolean;
  analyticsAllowed: boolean;
  adsMeasurementAllowed: boolean;
  adsPersonalizationAllowed: boolean;
  loaderState: 'not-configured' | 'blocked' | 'loaded';
  commands: string[];
};

type GoogleCommand = IArguments | unknown[];

declare global {
  interface Window {
    dataLayer?: GoogleCommand[];
    gtag?: (...args: unknown[]) => void;
  }
}

const cookiePrefixes = ['_ga', '_gid', '_gat', '_gcl_', '_gac_'];

function clearKnownGoogleCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim();
    if (!name || !cookiePrefixes.some(prefix => name.startsWith(prefix))) continue;
    const domains = ['', location.hostname, `.${location.hostname}`];
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? `; domain=${domain}` : ''}`;
    }
  }
}

export function createGoogleBusinessExample(
  client: ConsentClient,
  options: { measurementId?: string; adsTagId?: string; onChange?: (status: GoogleBusinessStatus) => void }
) {
  const measurementId = options.measurementId?.trim() || '';
  const adsTagId = options.adsTagId?.trim() || '';
  const commands: string[] = [];
  let loader: HTMLScriptElement | null = null;
  let configuredLoader: HTMLScriptElement | null = null;
  let last = { analytics: false, measurement: false, personalization: false };

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) { window.dataLayer?.push(args); };
  const command = (...args: unknown[]) => {
    window.gtag?.(...args);
    commands.push(args.slice(0, 2).join(' · '));
    if (commands.length > 8) commands.shift();
  };

  command('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });
  command('set', 'ads_data_redaction', true);

  const allowed = (purposeId: string) => client.evaluate(purposeId).outcome === 'allow';
  const emit = (analytics: boolean, measurement: boolean, personalization: boolean) => options.onChange?.({
    configured: Boolean(measurementId || adsTagId),
    analyticsConfigured: Boolean(measurementId),
    adsConfigured: Boolean(adsTagId),
    analyticsAllowed: analytics,
    adsMeasurementAllowed: measurement,
    adsPersonalizationAllowed: personalization,
    loaderState: !measurementId && !adsTagId ? 'not-configured' : loader ? 'loaded' : 'blocked',
    commands: [...commands]
  });

  function reconcile() {
    const analytics = Boolean(measurementId && allowed('site-analytics'));
    const measurement = Boolean(adsTagId && allowed('ads-measurement'));
    const personalization = Boolean(adsTagId && allowed('ads-personalization'));
    const changed = analytics !== last.analytics || measurement !== last.measurement || personalization !== last.personalization;

    if (changed) {
      command('consent', 'update', {
        analytics_storage: analytics ? 'granted' : 'denied',
        ad_storage: measurement ? 'granted' : 'denied',
        ad_user_data: measurement ? 'granted' : 'denied',
        ad_personalization: personalization ? 'granted' : 'denied'
      });
    }

    if (!analytics && !measurement) {
      loader?.remove();
      loader = null;
      configuredLoader = null;
      clearKnownGoogleCookies();
      last = { analytics, measurement, personalization };
      emit(analytics, measurement, personalization);
      return;
    }

    if (!loader) {
      loader = document.createElement('script');
      loader.async = true;
      loader.dataset.openconsentBusinessExample = 'google';
      loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analytics ? measurementId : adsTagId)}`;
      document.head.append(loader);
    }

    if (configuredLoader !== loader) {
      command('js', new Date());
      if (analytics) command('config', measurementId, { anonymize_ip: true });
      if (measurement) command('config', adsTagId, { allow_ad_personalization_signals: personalization });
      configuredLoader = loader;
    } else {
      if (analytics && !last.analytics) command('config', measurementId, { anonymize_ip: true });
      if (measurement && (!last.measurement || personalization !== last.personalization)) {
        command('config', adsTagId, { allow_ad_personalization_signals: personalization });
      }
    }

    last = { analytics, measurement, personalization };
    emit(analytics, measurement, personalization);
  }

  const unsubscribe = client.subscribe(reconcile);
  reconcile();

  return {
    destroy() {
      unsubscribe();
      command('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
      loader?.remove();
      clearKnownGoogleCookies();
    }
  };
}
