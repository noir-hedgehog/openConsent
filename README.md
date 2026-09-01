# openConsent

**Open-source consent management for modern web apps.**

openConsent gives AI and SaaS teams an accessible Cookie Banner, Preference Center, explicit tag pre-blocking, versioned browser choices, GPC handling, and one purpose model across browser and server adapters. It is free forever, self-hosted, and Apache-2.0.

[Official website](https://noir-hedgehog.github.io/openConsent/) · [Live demo](https://noir-hedgehog.github.io/openConsent/#demo) · [Public roadmap](https://noir-hedgehog.github.io/openConsent/roadmap/) · [Cookie declaration](https://noir-hedgehog.github.io/openConsent/cookie-declaration/) · [SDK guide](docs/SDK.md)

> openConsent helps teams implement and test consent controls. It is not legal advice, certification, or a guarantee of GDPR, ePrivacy, CCPA, or CPRA compliance. Your organisation remains responsible for applicability, notices, purposes, vendors, legal bases, and operating evidence.

## What is available in 0.4.0-beta.1

- English and Chinese Banner and Preference Center with equal accept and reject choices.
- Optional processing denied until the matching purpose is granted.
- Explicitly registered scripts activated by purpose, with abort and cleanup behavior for withdrawal races.
- Versioned preferences in `localStorage`; policy or notice changes invalidate stale choices.
- GPC enforcement for purposes declared as sale or sharing.
- Plain HTML, React, Vue, Express, and Spring Boot integration surfaces.
- Public Roadmap and Cookie Declaration pages without visitor receipts or individual choices.
- Deterministic CLI/CI **Privacy Readiness Checks** with public rule packs.

Google Analytics 4 and Google Ads are demonstrated by adapter code owned by the official website. Google loading is **not part of the `@openconsent/web` SDK contract**.

## Five-minute Plain HTML setup

Copy [`examples/openconsent.web.json`](examples/openconsent.web.json) into your public assets, update the project and policy versions, and load the browser build before optional tags:

```html
<script
  src="https://noir-hedgehog.github.io/openConsent/openconsent.min.js"
  data-openconsent-config="/openconsent.json">
</script>
```

Register optional scripts as inert markup:

```html
<script
  type="text/plain"
  data-openconsent-purpose="optional-analytics"
  data-openconsent-src="https://example.com/analytics.js"
  data-openconsent-cleanup="stopAnalytics">
</script>
```

The runtime checks the purpose immediately before execution. External scripts must permit the required CORS fetch and satisfy the site's Content Security Policy. The cleanup hook should stop timers, listeners, and application state that removing an executed script element cannot undo.

For application-controlled setup:

```js
OpenConsent.init({
  projectId: 'my-app',
  locale: 'en',
  policy,
  banner: {
    position: 'bottom',
    theme: 'auto',
    privacyPolicyUrl: '/privacy'
  },
  onPreferenceChange(receipt) {
    // Validate and protect this purpose-level, manifest-bound event on your backend.
  }
});
```

The official website hosts the current browser build. After the first npm release, the versioned package URL will be:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@openconsent/web@0.4.0-beta.1/dist/openconsent.min.js"
  data-openconsent-config="/openconsent.json">
</script>
```

Until that registry release exists, use the official hosted build or repository tarballs. Do not treat an unpublished package name as an available install.

## Framework integrations

```bash
pnpm add @openconsent/web@0.4.0-beta.1
pnpm add @openconsent/react@0.4.0-beta.1 react
pnpm add @openconsent/vue@0.4.0-beta.1 vue
pnpm add @openconsent/express@0.4.0-beta.1 express
```

React provides `OpenConsentProvider`, `ConsentBanner`, `ConsentGate`, and hooks. Vue provides equivalent components and a composable. Express and Spring evaluate application-supplied server snapshots and `Sec-GPC`; the application remains responsible for authentication, subject mapping, protected storage, and downstream propagation.

See [the SDK guide](docs/SDK.md) for complete examples and package boundaries.

## Google website example

The official website contains an application-owned Google adapter:

1. establish denied Consent Mode defaults before a Google tag;
2. subscribe to openConsent purpose changes;
3. load GA4 or Google Ads only after the matching purpose is allowed;
4. send denied updates on withdrawal;
5. leave Google IDs empty in the default public build.

This example follows [Google's Consent Mode documentation](https://developers.google.com/tag-platform/security/guides/consent). It is not bundled into `@openconsent/web`. Each deployment must review its own Google account, regions, notices, purposes, Cookie durations, and legal requirements.

## Privacy Readiness Checks

The CLI checks a version-controlled project manifest against transparent GDPR and CCPA/CPRA engineering rules. It reports missing declarations and human-review gates; it does not return a legal-compliance score or AI legal opinion.

```bash
pnpm install --frozen-lockfile
node ./src/cli.mjs check ./examples/openconsent.json
node ./src/cli.mjs check ./examples/openconsent.json --fail-on review
node ./src/cli.mjs check ./examples/openconsent.json --json
node ./src/cli.mjs check ./examples/openconsent.web.json --profile web-cmp
```

`check` exits with code `1` for blocking declaration or schema findings. `--fail-on review` also blocks unresolved human reviews. The `web-cmp` profile requires the 0.4 category and disclosure Catalog instead of accepting purpose-only compatibility mode.

## Public transparency

- The [Roadmap](https://noir-hedgehog.github.io/openConsent/roadmap/) labels capabilities as shipped, building, planned, or research and links them to evidence and release gates.
- The [Cookie Declaration](https://noir-hedgehog.github.io/openConsent/cookie-declaration/) lists first-party storage, optional demo Cookies, and conditional vendor technologies for the official site.
- The public catalog never publishes a visitor's preference receipt, identifier, IP address, or individual choice.
- Rules, sources, limitations, tests, and release history remain reviewable in this repository.

## Run the official website locally

Node.js 22.12 or newer and pnpm are required.

```bash
pnpm install --frozen-lockfile
pnpm --dir apps/demo dev
```

The website is built from [`apps/demo`](apps/demo) and deployed through GitHub Actions to GitHub Pages. It does not use GPT Sites.

## Support matrix

| Surface | Package/module | 0.4 beta scope |
| --- | --- | --- |
| Plain HTML / browser | `@openconsent/web` | Banner, preference center, stored choices, managed scripts, GPC, preference callbacks |
| React | `@openconsent/react` | Browser-runtime provider, Banner, gates, hooks |
| Vue 3 | `@openconsent/vue` | Browser-runtime plugin, Banner, gates, composable |
| Express | `@openconsent/express` | Request decisions and `Sec-GPC` parsing |
| Spring Boot 3 / Java 17 | `packages/spring-boot-starter` | Server evaluator and request filter; not on Maven Central |
| Google tags | official website example | Example adapter code; not an `@openconsent/web` capability |
| CLI / CI | repository `src/cli.mjs` | Deterministic GDPR and CCPA/CPRA readiness checks |

All JavaScript packages target `0.4.0-beta.1`. Registry publication still requires the maintainer-owned npm scope and Trusted Publisher setup.

## Current limitations

- Blocking covers scripts explicitly registered with `data-openconsent-purpose`; openConsent does not automatically discover every Cookie, pixel, iframe, server event, or vendor.
- Withdrawal can stop application-owned work and future managed requests. It cannot recall data already transmitted during a previous grant.
- Browser receipts are untrusted input and are not authoritative audit evidence.
- IAB TCF/GPP, automated discovery, mobile SDKs, rights-request workflows, enterprise reporting, and AI privacy audits are not shipped capabilities.

See [the paid CMP comparison](docs/PAID_CMP_COMPARISON.md) and [public roadmap](docs/ROADMAP.md) for the complete gap statement.

## Documentation

- [SDK integration and production boundary](docs/SDK.md)
- [Product roadmap](docs/ROADMAP.md)
- [Official Cookie and storage declaration](docs/COOKIE_DECLARATION.md)
- [Transparency model](docs/TRANSPARENCY.md)
- [Playground and diagnostic evidence](docs/PLAYGROUND.md)
- [Architecture](docs/ARCHITECTURE.md)
- [GDPR and CCPA/CPRA control matrix](docs/COMPLIANCE_MATRIX.md)
- [Paid CMP comparison](docs/PAID_CMP_COMPARISON.md)

## Contributing

Open an issue for a bug, integration request, catalog correction, or rule challenge. Security and privacy reports should follow [`SECURITY.md`](SECURITY.md).

## Licence

Apache-2.0. Policy-source citations remain subject to their source terms. No source code from ConsentStack/CMP is included.
