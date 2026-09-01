# openConsent

**Open-source consent management for modern web apps.**

openConsent gives AI and SaaS teams a configurable Cookie Banner, a preference center, explicit tag pre-blocking, Google Consent Mode, and the same consent decisions across browser and server frameworks. It is free forever, self-hosted, and licensed under Apache-2.0.

[Official website](https://noir-hedgehog.github.io/openConsent/) · [Live demo](https://noir-hedgehog.github.io/openConsent/#demo) · [SDK guide](docs/SDK.md) · [Playground guide](docs/PLAYGROUND.md)

> openConsent helps teams implement and test consent controls. It is not legal advice, certification, or a guarantee of GDPR, ePrivacy, CCPA, or CPRA compliance. Your organisation remains responsible for legal applicability, configuration, notices, vendors, and operating evidence.

## What you get

- An accessible Banner and Preference Center with equal accept and reject choices.
- Optional processing denied until the user grants the matching purpose.
- Explicitly registered scripts activated by purpose and stopped from making new requests after withdrawal.
- Versioned preferences in `localStorage`; policy or notice changes ask the user again.
- Global Privacy Control enforcement for configured sale/sharing purposes.
- Google Analytics 4 and Google Ads integration with Consent Mode defaults and updates.
- Plain HTML, React, Vue, Express, and Spring Boot integration paths.
- Deterministic CLI/CI **Privacy Readiness Checks** with public rule packs.

## Five-minute Plain HTML setup

Create `openconsent.json` in your public assets:

```json
{
  "projectId": "my-app",
  "locale": "en",
  "policy": {
    "projectId": "my-app",
    "policyVersion": "2026-09-01",
    "noticeVersion": "2026-09-01",
    "manifestDigest": "sha256:replace-with-your-policy-digest",
    "purposes": [
      {
        "id": "required",
        "activityId": "site-operation",
        "legalBasis": "contract",
        "optional": false
      },
      {
        "id": "optional-analytics",
        "activityId": "product-analytics",
        "legalBasis": "consent",
        "optional": true
      },
      {
        "id": "personalized-ads",
        "activityId": "ad-personalization",
        "legalBasis": "consent",
        "optional": true,
        "sale": true,
        "sharing": true
      }
    ]
  },
  "banner": {
    "position": "bottom",
    "theme": "auto"
  }
}
```

Load the browser build before any optional tags:

```html
<script
  src="https://noir-hedgehog.github.io/openConsent/openconsent.min.js"
  data-openconsent-config="/openconsent.json">
</script>
```

Register optional scripts as inert markup. openConsent activates them only after the matching purpose is allowed:

```html
<script
  type="text/plain"
  data-openconsent-purpose="optional-analytics"
  data-openconsent-src="https://example.com/analytics.js"
  data-openconsent-cleanup="stopAnalytics">
</script>
```

External managed scripts must allow a CORS fetch. The optional cleanup hook should stop timers, listeners, and client state that removing an executed script element cannot undo. Use the dedicated Google integration for GA4 and Google Ads.

For application-controlled setup:

```js
OpenConsent.init({
  projectId: 'my-app',
  locale: 'en',
  policy,
  banner: { position: 'bottom', theme: 'auto' },
  integrations: {
    ga4: { measurementId: 'G-XXXXXXX' },
    googleAds: { tagId: 'AW-XXXXXXX' }
  },
  onPreferenceChange(receipt) {
    // Send the unsigned preference receipt to your own protected backend if needed.
  }
});
```

The official website hosts this same browser build today. After the first tagged npm release, the equivalent jsDelivr URL will be `https://cdn.jsdelivr.net/npm/@openconsent/web@0.3.0-beta.1/dist/openconsent.min.js`.

The beta packages are prepared for the public `@openconsent` npm scope. Until the first tagged npm release is published, install from this repository or use the official hosted browser build above; do not assume that a package name alone means it is available on the registry.

## Framework integrations

```bash
pnpm add @openconsent/web
pnpm add @openconsent/react react
pnpm add @openconsent/vue vue
pnpm add @openconsent/express express
```

React provides `OpenConsentProvider`, `ConsentBanner`, `ConsentGate`, and consent hooks. Vue provides equivalent components and a composable. Express and the Spring Boot starter evaluate server-observed choices and `Sec-GPC`; your backend remains responsible for authenticated subjects and durable receipt storage.

See [the SDK guide](docs/SDK.md) for complete examples, package boundaries, and the Google integration order.

## Privacy Readiness Checks

The CLI checks a version-controlled project manifest against transparent GDPR and CCPA/CPRA engineering rules. It reports missing declarations and human-review gates; it does not return a legal-compliance score.

```bash
pnpm install --frozen-lockfile
node ./src/cli.mjs check ./examples/openconsent.json
node ./src/cli.mjs check ./examples/openconsent.json --fail-on review
node ./src/cli.mjs check ./examples/openconsent.json --json
```

`check` exits with code `1` for blocking declaration or schema findings. `--fail-on review` also blocks unresolved human reviews, which makes it suitable for a release gate.

## Run the official website locally

Node.js 22.12 or newer and pnpm are required for the website toolchain.

```bash
pnpm install --frozen-lockfile
pnpm --dir apps/demo dev
```

The public website is built from [`apps/demo`](apps/demo) and deployed through GitHub Actions to GitHub Pages. It does not use GPT Sites. The demo keeps Google identifiers unset by default, so a normal visit does not contact Google.

## Support matrix

| Surface | Package/module | Beta scope |
| --- | --- | --- |
| Plain HTML / browser | `@openconsent/web` | Banner, preference center, stored choices, managed scripts, GPC, Google Consent Mode |
| React | `@openconsent/react` | Provider, Banner, gates, hooks |
| Vue 3 | `@openconsent/vue` | Plugin, Banner, gates, composable |
| Express | `@openconsent/express` | Request decisions and `Sec-GPC` parsing |
| Spring Boot 3 / Java 17 | `packages/spring-boot-starter` | Server evaluator and request filter; not yet published to Maven Central |
| CLI / CI | repository `src/cli.mjs` | Deterministic GDPR and CCPA/CPRA readiness checks |

All JavaScript packages target version `0.3.0-beta.1`. Registry publication requires the maintainer-owned npm scope and Trusted Publisher setup described in [the release guide](docs/SDK.md#publishing-and-provenance).

## Current limitations

- Tag blocking covers scripts explicitly registered with `data-openconsent-purpose`; openConsent does not automatically discover every Cookie, pixel, iframe, server event, or vendor.
- Withdrawal prevents new managed requests and removes known integration state where supported. A third party may already have received data before withdrawal if it was previously allowed.
- Browser preferences and unsigned receipts are not authoritative audit evidence. Production evidence requires protected server storage, identity binding, access control, retention, and operational monitoring.
- IAB TCF/GPP, automated website scanning, vendor catalogs, mobile SDKs, rights-request workflows, and enterprise reporting are not included in this beta.

See [openConsent compared with a paid CMP](docs/PAID_CMP_COMPARISON.md) for a capability-by-capability boundary.

## Documentation

- [SDK integration and production boundary](docs/SDK.md)
- [Playground and diagnostic evidence](docs/PLAYGROUND.md)
- [Product roadmap](docs/ROADMAP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [GDPR and CCPA/CPRA control matrix](docs/COMPLIANCE_MATRIX.md)
- [Transparency model](docs/TRANSPARENCY.md)
- [Foundation audit](docs/FOUNDATION_AUDIT.md)

## Contributing

Rules, source code, tests, limitations, and release history are public. Open an issue for a bug, integration request, or rule challenge. Security and privacy reports should follow [`SECURITY.md`](SECURITY.md).

## Licence

Apache-2.0. Policy-source citations remain subject to their source terms. No source code from ConsentStack/CMP is included.
