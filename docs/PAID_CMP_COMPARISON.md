# openConsent compared with a paid CMP

Vendor information was reviewed on 2026-08-31 against consentmanager's official product and help pages. Vendor claims were not independently tested, and features, plans, prices, standards, and legal requirements can change.

## Does openConsent provide the same capability?

No. openConsent `0.3.0-beta.1` covers the core integration needed by many small web applications: a Banner, Preference Center, explicit tag pre-blocking, stored versioned choices, withdrawal, GPC, Google Consent Mode, and framework adapters. It is free, open source, self-hosted, and its rules and tests are public.

A paid CMP such as consentmanager also supplies a managed operational service: recurring website scanning, vendor and Cookie discovery, hosted configuration, audit records, reporting, standards integrations, multi-site administration, support, and plan-dependent legal or rights-request tooling. openConsent is not a drop-in replacement for those capabilities.

## Capability matrix

| Capability | Paid CMP example | openConsent 0.3 beta |
| --- | --- | --- |
| Banner and preference center | Hosted, configurable, multilingual service | Open-source English/Chinese UI integrated in the application |
| First-visit optional blocking | Manual and automatic blocking options | Explicitly registered managed scripts fail closed; no universal discovery |
| Saved choices and withdrawal | Managed consent service and audit trail | Versioned browser preferences and unsigned callback receipt; no authoritative hosted store |
| GDPR and CCPA/CPRA | Jurisdiction templates and runtime flows | Purpose model, GPC override, public readiness rules; deployment applicability remains a human decision |
| Google Analytics / Ads | Vendor templates and managed Consent Mode setup | Direct GA4/Ads configuration with denied defaults and grant/withdrawal updates |
| Cookie, pixel, and vendor scanning | Recurring crawler and discovered-domain workflow | Not included |
| IAB TCF and GPP | Available on eligible plans | Not included |
| Mobile and additional platforms | Vendor-dependent SDKs | Plain HTML, React, Vue, Express, and Spring starter |
| Reporting and optimisation | Consent reporting and plan-dependent testing | Local runtime diagnostics and CI checks; no traffic dashboard |
| Rights-request operations | Plan-dependent workflow tools | Checks that a channel is declared; no request workflow |
| Multi-site and enterprise operations | Accounts, roles, support, white label, SLAs | Git-based configuration and open governance |
| Rules and implementation transparency | Proprietary service implementation | Apache-2.0 source, public rules, tests, limitations, and provenance |
| AI audit | Vendor-dependent | No shipped AI audit; deterministic Privacy Readiness Checks only |

## Choose openConsent when

- explicit tag registration is acceptable;
- the team can operate its own configuration and evidence backend;
- source transparency and self-hosting matter;
- the application uses a supported web or server framework;
- the team accepts beta maturity and can test each deployment.

## Choose a paid CMP when

- automatic scanning and vendor discovery are required;
- IAB standards, mobile SDKs, multi-site administration, reporting, or support are procurement requirements;
- the organisation needs a managed evidence service and operational SLA;
- privacy operations cannot own the integration and monitoring work.

Some teams may use openConsent for transparent application-level decisions while retaining a commercial platform for enterprise operations. Avoid running two independent browser banners or tag loaders; define one authoritative preference flow and test the combined request order.

## What must exist before broader parity

1. Public npm release and reproducible Plain HTML/framework fixtures.
2. Self-hosted protected receipt service and retryable withdrawal propagation.
3. Reviewable script, Cookie, pixel, iframe, and vendor discovery.
4. Standards evaluation and conformance where IAB TCF/GPP is required.
5. Operational monitoring, multi-site controls, security review, and documented incident handling.
6. Independent legal review of the supported policy packs and UI defaults.

openConsent should keep self-hosting, public rules, reproducible tests, and open governance as its differentiators instead of imitating a proprietary dashboard feature for feature.

## Official vendor sources

- [consentmanager plan and feature comparison](https://www.consentmanager.net/en/features/)
- [consentmanager product overview](https://www.consentmanager.net/en/)
- [automatic blocking behavior and limitations](https://help.consentmanager.net/books/cmp/page/automatic-blocking-of-codes-and-cookies)
- [consent log and audit trail](https://www.help.consentmanager.net/books/cmp/page/consent-log-protocol-audit-trail)
- [standard integration](https://www.help.consentmanager.net/books/cmp/page/standard-integration)
- [Google Consent Mode v2 integration](https://www.help.consentmanager.net/books/cmp/page/working-with-google-consent-mode-v2-automatic-blocking-code)
- [CCPA message setup](https://www.consentmanager.net/en/help/getting-started/3-create-a-cmp/)

This comparison describes product capability and public vendor claims. It is not legal advice or an assessment that either product is sufficient for a particular deployment.
