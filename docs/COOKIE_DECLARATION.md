# Official website Cookie and storage declaration

**Scope:** `https://noir-hedgehog.github.io/openConsent/`  
**Catalog version:** `0.4.0-beta.1`  
**Reviewed:** 2026-09-01  
**Public page:** [Cookie Declaration](https://noir-hedgehog.github.io/openConsent/cookie-declaration/)

This catalog describes technologies the official openConsent website may use. It contains no visitor preference receipt, identifier, IP address, or individual choice.

| Tracker | Kind | Category | Purpose | Service | Vendor | Creation condition | Duration | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `openconsent:openconsent-site:preferences` | localStorage | Necessary | Site operation and consent storage | openConsent runtime | openConsent Project; first party | After save, accept, or reject | Until policy change or withdrawal | Required preference record |
| `openconsent_site_locale` | localStorage | Preferences | Website language | Official website shell | openConsent Project; first party | Website load or language change | Until site data is cleared | Functional |
| `oc_demo_preferences` | Cookie | Preferences | Optional interface preferences | Interface preference demo | openConsent Project; first party | Only after `interface-preferences` is granted | Browser session | Optional demo technology |
| `_ga` | Cookie | Analytics | Website analytics | Google Analytics 4 | Google LLC; first party | Google ID configured and `site-analytics` allowed by website adapter | Up to 2 years | Conditional; off by default |
| `_ga_*` | Cookie | Analytics | Website analytics | Google Analytics 4 | Google LLC; first party | Google ID configured and `site-analytics` allowed by website adapter | Up to 2 years | Conditional; off by default |
| `gtag.js` | Script | Analytics | Website analytics | Google Analytics 4 | Google LLC; third party | Google ID configured and `site-analytics` allowed by website adapter | Request | Conditional; off by default |
| `_gcl_au` | Cookie | Marketing | Advertising measurement | Google Ads | Google LLC; first party | Ads ID configured and `ads-measurement` allowed by website adapter | Up to 90 days | Conditional; off by default |
| Google Ads tag | Script | Marketing | Advertising measurement / Advertising personalization | Google Ads | Google LLC; third party | Ads ID configured and matching Ads purpose allowed by website adapter | Request | Conditional; off by default |

The table makes the complete category → purpose → service → vendor → tracker relationship reviewable. Conditional entries document a configurable deployment path; they do not assert that the technology ran for a particular visitor.

## Google boundary

The official website contains example adapter code for Consent Mode and purpose-gated GA4/Ads loading. That adapter belongs to the website and is not included in the `@openconsent/web` SDK contract. Google IDs remain empty in the default public build.

A deployment that enables Google must verify its own:

- account and regional configuration;
- purpose and legal basis;
- notice and vendor disclosures;
- Cookie names and durations;
- withdrawal behavior and network requests.

See [Google Consent Mode](https://developers.google.com/tag-platform/security/guides/consent) and [GA4 Cookie usage](https://developers.google.com/analytics/devguides/collection/ga4/cookie-usage).

## No public receipts

The public catalog describes technology, not people. Purpose-level, manifest-bound preference receipts remain protected application data. Do not add receipt IDs, choices, IP addresses, request headers, device data, or person-linked timestamps to this document or its public page.

## Maintenance

Update this catalog in the same pull request that changes website storage, optional scripts, external vendors, measurement IDs, or retention behavior. A release should fail when the deployed technology catalog and implementation materially differ.

Relevant primary sources:

- [GDPR official text — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [California Privacy Protection Agency regulations](https://cppa.ca.gov/regulations/)
- [Global Privacy Control specification](https://globalprivacycontrol.org/)
- [Google Consent Mode](https://developers.google.com/tag-platform/security/guides/consent)
- [Google Analytics Cookie usage](https://developers.google.com/analytics/devguides/collection/ga4/cookie-usage)

This catalog is an engineering disclosure, not legal advice.
