# Public product roadmap

The [bilingual public Roadmap](https://noir-hedgehog.github.io/openConsent/roadmap/) is the user-facing source for capability status. This document records the same scope and evidence gates for maintainers.

openConsent uses four status labels:

- **Shipped:** implemented, documented, and covered by the named test boundary.
- **Building:** active implementation work that is not a shipped product claim.
- **Planned:** accepted product direction without a shipped implementation.
- **Research:** an investigation that may change or be rejected.

## 0.4.0-beta.1 — public catalog

Shipped scope:

- English and Chinese Banner and Preference Center.
- Versioned local preferences and stale policy/notice invalidation.
- Explicit managed-script pre-blocking, withdrawal aborts, and cleanup hooks.
- Browser and server GPC evaluation for declared sale/sharing purposes.
- React, Vue, Express, and Spring integration surfaces.
- A top-level policy catalog: `categories`, `purposes`, `vendors`, `services`, and `trackers`.
- Public Roadmap and Cookie Declaration pages.
- Purpose-level, manifest-bound preference callbacks for protected application storage.

The catalog contract keeps all five collections directly under `policy`. Categories do not duplicate purpose IDs. Services do not carry a category ID. Trackers declare `kind`, `purposeIds`, and `firstParty`.

Google Analytics and Google Ads remain **official-website example adapter code**. They are not included in the `@openconsent/web` public contract. The example is tested for denied defaults and purpose-gated loading, while each deployment owns its Google configuration and Cookie declaration.

0.4 release evidence requires:

- every documented artifact URL resolves;
- the Plain HTML tarball executes in an independent browser fixture;
- first visit makes no optional third-party request;
- accept, reject, granular save, reload, stale policy, withdrawal, GPC, keyboard, and mobile flows pass;
- the public technology catalog matches the official site's first-party and conditional technologies;
- no individual preference receipt appears on a public page.

## Capability and gap matrix

| Capability | Status | Evidence today | Next gate |
| --- | --- | --- | --- |
| Banner and Preference Center | Shipped | Bilingual web runtime and browser E2E | Independent accessibility review |
| Explicit tag pre-blocking | Shipped | Managed-script and withdrawal tests | Broader vendor and race fixtures |
| Versioned browser preferences | Shipped | Storage schema and stale-version tests | Stable migration policy |
| GPC sale/share override | Shipped | Browser and server evaluators | 0.5 regional rule packs |
| Public technology catalog | Shipped | Top-level catalog and official-site declaration | Automated deployment/catalog validation |
| GA4 and Google Ads | Shipped website example | Application adapter and command-order test | Remain outside the reusable SDK contract |
| React, Vue, Express, and Spring | Shipped | Components, adapters, and conformance tests | Independent framework example applications |
| Self-hosted evidence API and withdrawal retries | Building | Purpose-level browser event and implementation plan | 0.5 protected API, identity binding, and retry visibility |
| Regional rules and multi-site governance | Planned | Single-policy deployment examples | 0.5 rule packs and multi-site configuration |
| Hosted consent log and geolocation | Planned | Not implemented; no openConsent cloud service | Evaluate after the self-hosted 0.5 reference path |
| Maintained vendor database and admin console | Planned | Not implemented | Open data provenance and governance proposal |
| Automatic tracker discovery | Planned | No shipped scanner | 0.6 unclassified-tracker review and change monitoring |
| Reviewable AI classification suggestions | Planned | Deterministic Privacy Readiness Checks only | 0.6 evidence-linked proposals with human approval |
| IAB certification, TCF/GPP, mobile, and cross-device consent | Research | Not implemented or certified | 1.0 research and enterprise readiness review |

## 0.5 — self-hosted operations

- Self-hosted evidence API with authenticated or pseudonymous subject binding.
- Append-only choice and withdrawal events with retention and access controls.
- Retryable downstream withdrawal propagation and visible failures.
- Regional rule packs with explicit applicability review.
- Multi-site configuration and governance.

Gate: retries, stale clients, regional policy selection, and partial downstream failures never silently widen a withdrawn purpose.

## 0.6 — reviewable discovery

- Automatic scanning for scripts, Cookies, pixels, iframes, and outbound hosts.
- An explicit queue for unclassified trackers.
- Catalog and implementation change monitoring.
- Reviewable AI classification suggestions with source location, evidence, and confidence.

Gate: discoveries and AI suggestions remain proposals until a human approves them. Unknown trackers are never auto-classified as compliant.

## 1.0 — research and enterprise review

The following remain research until standards, licensing, interoperability, privacy, and conformance work supports a product decision:

- IAB TCF and GPP;
- mobile SDKs;
- cross-device consent reconciliation;
- enterprise security, accessibility, privacy, and legal readiness review.

Research status is not a promise that every item will ship in 1.0. A stable release still requires a compatibility policy, signed releases, reproducible evidence, and production validation.

## Permanent boundaries

- No “100% compliant” score, legal certification, or automatic applicability decision.
- Consent remains distinct from contract, legitimate interests, and agent delegation.
- Rules, sources, limitations, release history, and conformance tests stay public.
- A public technology catalog never exposes a person's receipt, identifier, IP address, or choice.
- Self-hosting remains viable; no required paid cloud control plane.

## Primary references

- [GDPR official text — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [California Privacy Protection Agency regulations](https://cppa.ca.gov/regulations/)
- [Global Privacy Control specification](https://globalprivacycontrol.org/)
- [Google Consent Mode documentation](https://developers.google.com/tag-platform/security/guides/consent)

These sources inform engineering requirements. They do not replace jurisdiction-specific legal review.
