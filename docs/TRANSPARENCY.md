# Transparency model

Public transparency means outsiders can inspect product capabilities, rules, technology declarations, evidence levels, provenance, and known limits. It never means exposing the people whose data the system protects.

## Public product surfaces

- [Product website](https://noir-hedgehog.github.io/openConsent/): current value, integration paths, and product boundaries.
- [Roadmap](https://noir-hedgehog.github.io/openConsent/roadmap/): shipped, building, planned, and research capabilities with evidence and release gates.
- [Cookie Declaration](https://noir-hedgehog.github.io/openConsent/cookie-declaration/): code-owned catalog of first-party storage, optional demo Cookies, and conditional vendor technologies used by the official site.
- [Playground](https://noir-hedgehog.github.io/openConsent/playground/): technical runtime diagnostics for a local browser session.

## Public Cookie declaration

A deployment catalog should make the complete category → purpose → service → vendor → tracker relationship reviewable and identify:

1. category and declared purpose, including whether the purpose is optional;
2. service and vendor provider;
3. Cookie, localStorage, sessionStorage, pixel, script, iframe, or comparable tracker technology;
4. exact creation or activation condition;
5. retention or expiry;
6. withdrawal and cleanup behavior;
7. policy/notice version and last review date;
8. authoritative vendor source where duration or behavior is vendor-controlled.

Conditional entries describe code paths that deployment configuration may enable. They do not assert that a technology ran for a particular visitor.

The official site's Google Analytics and Google Ads adapter is example application code, not behavior bundled into `@openconsent/web`. Any deployment that enables Google IDs must publish its own Google technologies, purposes, durations, and account-specific configuration.

## Never publish a preference receipt

A preference receipt is purpose-level and manifest-bound evidence about one visitor's choices. Even when pseudonymous or unsigned, it is not public catalog data.

Keep receipts, identifiers, IP addresses, device data, request headers, timestamps tied to a person, and withdrawal events in protected application storage. Public pages may describe the receipt schema and aggregate behavior, but must not render a visitor's actual receipt.

The diagnostic Playground may display state created in the visitor's own browser session. That state must remain local to that session and must not be indexed, aggregated, or presented as a public record.

## Publish

- Source code, build and test instructions, release history, package contents, provenance, and SBOM information.
- Capability status, release gates, known gaps, and dated comparison criteria.
- Policy-pack versions, primary sources, review dates, check semantics, tests, and reviewer roles.
- Technology catalogs for official deployments.
- Public project transparency cards containing reviewed purposes, category labels, recipient classes, retention, user controls, and contact routes.
- Assessment metadata that contains no personal record: manifest hash, rule-pack versions, tool version, result counts, and unresolved public findings.
- Governance, conflicts of interest, security/reporting channels, and material incidents after safe disclosure.

## Protect

- Preference receipts and privacy requests tied or linkable to a person.
- Raw prompts, free-text user content, IP addresses, device identifiers, credentials, and precise security telemetry.
- Contracts, DPIAs, legal advice, and vulnerability evidence requiring controlled access.
- Agent delegation tokens and internal policy context that could enable abuse.

A hash supports integrity checking. It does not prove the source was true and does not make personal data anonymous.

## Claim evidence

Every public claim should state:

1. stable claim or control identifier;
2. product/version scope;
3. policy/rule version;
4. evidence level: `declared`, `observed`, `tested`, `attested`, or `independently_assessed`;
5. reviewer and review date where appropriate;
6. unresolved limitations and reassessment condition.

Roadmap status is not evidence by itself. “Shipped” requires an inspectable implementation and named test boundary. “Building”, “Planned”, and “Research” remain outside shipped product claims and identify their next evidence gate.

## Change and challenge process

- Rule and catalog changes use pull requests with primary sources, behavioral tests, and migration notes where relevant.
- Breaking or stricter changes state which prior preferences or assessments become stale.
- Anyone may challenge a rule, Roadmap status, or catalog entry through a public issue without revealing personal data.
- Security and privacy reports use the private channel in `SECURITY.md`.
- Maintainers publish reasoning for accepting or rejecting a material public challenge.

## Anti-dark-pattern commitments

- Closing or ignoring a UI never means consent.
- Rejecting optional processing is as easy and prominent as accepting it.
- Optional purposes are off by default.
- Withdrawal changes behavior and downstream state; it is not only a visual toggle.
- Explanations avoid pressure, obstruction, or fabricated urgency.
- Product metrics do not optimise for the highest opt-in rate.

## Primary sources

- [GDPR official text — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [California Privacy Protection Agency regulations](https://cppa.ca.gov/regulations/)
- [Global Privacy Control specification](https://globalprivacycontrol.org/)
- [Google Consent Mode documentation](https://developers.google.com/tag-platform/security/guides/consent)
- [Google Analytics Cookie usage](https://developers.google.com/analytics/devguides/collection/ga4/cookie-usage)

These sources guide the transparency model. They do not establish that one implementation is sufficient for a particular deployment.
