# openConsent vs. a paid CMP

Verified on 2026-08-31 against consentmanager's official product and help pages. Vendor claims were not independently tested. Features, plan limits, and prices can change.

## Answer

openConsent v0.1 does **not** provide the same capability as consentmanager and is not a direct replacement today.

openConsent is currently an open compliance engineering layer: versioned manifests, readable rule packs, deterministic CLI/CI checks, transparency cards, and reproducible unsigned assessments. consentmanager is a production runtime CMP SaaS that serves consent interfaces to visitors, controls tags, stores audit records, scans websites, integrates with advertising standards, and provides operational reporting.

The runtime SDKs and website demo establish a shared decision protocol and integration surface. They remain integration starters. The site now demonstrates explicit managed-tag pre-blocking, Cookie creation after permission, withdrawal cleanup, and GPC override. It does not provide a hosted evidence service, signed receipts, identity binding, automatic blocking, vendor discovery, or a legal guarantee.

## Capability matrix

| Capability | consentmanager | openConsent today |
| --- | --- | --- |
| GDPR and CCPA/CPRA | Runtime messages, jurisdiction configuration, opt-in and opt-out flows | Selectable declaration checks and review gates |
| Consent banner and preference center | Hosted, configurable, multilingual interface | Mainstream-style first-visit website demo with equal reject/accept and per-purpose choices; no tenant configuration or localisation service |
| Consent withdrawal and audit proof | Encrypted consent protocol / audit trail | Unsigned in-memory demo receipt; no production store |
| Cookie, pixel, and vendor scanning | Recurring crawler and discovered-domain workflow | Not implemented |
| Script, iframe, and cookie control | Manual and automatic blocking | Demonstrated for explicitly registered local scripts and known demo Cookies; no automatic discovery or third-party coverage |
| GPC and privacy signals | Runtime privacy-signal support | Core/Express/Spring alpha evaluators; no account/device reconciliation |
| IAB TCF and IAB GPP | Supported on eligible plans | Not implemented |
| Google Analytics / Ads integration | Managed vendor templates and Consent Mode support | Real `gtag.js` loading path gated by purpose, configurable through deployment IDs; public demo uses first-party fixtures and does not send visitor data |
| Google Consent Mode v2 | Supported on current paid plans | Integration pattern documented; production defaults, account configuration, and verification remain deployment responsibilities |
| Mobile and platform SDKs | Mobile and additional platform integrations | React, Vue, Express, Spring Boot source starters only |
| Reporting and optimization | Consent reporting and plan-dependent A/B optimization | Assessment counts; no traffic analytics |
| Rights requests and legal documents | Plan-dependent tools and policy generator | Checks that a declared rights channel exists |
| Enterprise operations | Multi-site plans, accounts, white label, support options | Git-based open governance |
| Rule transparency and reproducibility | Proprietary service implementation | Public schema, rule packs, source, and digests |
| AI and agent governance | Not its primary focus | Explicit product direction; enforcement is not implemented yet |

## Current vendor plan snapshot

The official comparison page listed Starter at €23/month for one website/app and 100,000 included page views, Essential at €59/month for up to three websites/apps and one million page views, and Enterprise at custom pricing. The same page described plan-dependent IAB TCF/GPP, crawler limits, data-subject-rights tooling, and enterprise features. Use the vendor page for procurement decisions because these terms are time-sensitive.

## Build path to production parity

1. **0.2/0.3 alpha:** shared decisions, GPC parsing, React/Vue/Express/Spring starters, a transparent interactive demo, and explicit managed-tag pre-blocking.
2. **0.3:** authoritative receipt service, withdrawal events, downstream propagation, version invalidation, accessibility and security tests.
3. **0.4:** tag and Cookie discovery, production pre-blocking adapters, Google Consent Mode, vendor catalog, and deployment monitoring.
4. **0.5+:** IAB TCF/GPP, analytics, multi-tenant governance, key rotation, incident controls, and production legal/security review.

openConsent should keep public rules, self-hosting, reproducible evidence, and AI/agent permission decisions as its differentiators instead of copying a closed CMP screen-for-screen.

## Official sources

- [consentmanager plan and feature comparison](https://www.consentmanager.net/en/features/)
- [consentmanager product overview](https://www.consentmanager.net/en/)
- [automatic blocking behavior and limitations](https://help.consentmanager.net/books/cmp/page/automatic-blocking-of-codes-and-cookies)
- [consent log and audit trail](https://www.help.consentmanager.net/books/cmp/page/consent-log-protocol-audit-trail)
- [standard integration](https://www.help.consentmanager.net/books/cmp/page/standard-integration)
- [Google Consent Mode v2 integration](https://www.help.consentmanager.net/books/cmp/page/working-with-google-consent-mode-v2-automatic-blocking-code)
- [CCPA message setup](https://www.consentmanager.net/en/help/getting-started/3-create-a-cmp/)

This comparison describes product capability and public vendor claims. It is not legal advice or an evaluation that either product is sufficient for a particular deployment.
