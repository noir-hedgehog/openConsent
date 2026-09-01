# @openconsent/web

Browser SDK for openConsent. It renders a consent banner and preference center,
keeps optional processing denied until a user chooses, controls explicitly
registered scripts, and integrates with Google Consent Mode.

```js
import OpenConsent from '@openconsent/web';

const consent = OpenConsent.init({
  projectId: 'my-app',
  locale: 'en',
  policy,
  integrations: {
    ga4: { measurementId: 'G-XXXXXXXXXX' },
    googleAds: { tagId: 'AW-XXXXXXXXX' }
  }
});
```

Or load the IIFE build and a public JSON configuration:

```html
<script
  src="https://noir-hedgehog.github.io/openConsent/openconsent.min.js"
  data-openconsent-config="/openconsent.json">
</script>
```

Only scripts explicitly registered with `type="text/plain"` are managed:

```html
<script
  type="text/plain"
  data-openconsent-purpose="optional-analytics"
  data-openconsent-src="https://example.com/analytics.js"
  data-openconsent-cleanup="stopAnalytics">
</script>
```

External managed scripts must allow a CORS fetch and satisfy the site's CSP.
The SDK fetches them before execution so a withdrawal can abort a pending load.
Removing a previously activated script element cannot undo JavaScript that has
already executed. Integrations should also expose their own cleanup or shutdown
behavior when withdrawal requires it.
