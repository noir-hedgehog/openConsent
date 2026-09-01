# Product roadmap

openConsent is an open-source CMP SDK for AI and SaaS teams. The roadmap grows from a small, verifiable browser and server contract; it does not present future AI, scanning, or enterprise capabilities as shipped.

## 0.3 beta — usable consent SDK

Target: a developer can add an accessible Banner and explicit optional-tag blocking to a Plain HTML, React, or Vue application in five minutes.

- Publish `@openconsent/web` as ESM and browser IIFE.
- Align Core, React, Vue, and Express packages at `0.3.0-beta.1`.
- Persist versioned preferences and fail closed on stale or invalid state.
- Support GPC for configured sale/sharing purposes.
- Integrate GA4 and Google Ads through denied defaults and grant updates.
- Provide React and Vue Banner components.
- Test first visit, per-purpose choice, withdrawal, version changes, mobile, keyboard, accessibility, and Google command order.
- Publish packages through npm Trusted Publishing with provenance.

Release gate: the documented Plain HTML install works from the public npm artifact; a first visit makes no optional vendor request; every public package passes its build and `npm pack --dry-run` checks.

## 0.4 — operational self-hosting

Target: teams can operate their own consent evidence and configuration service without adopting a proprietary control plane.

- Versioned policy/configuration endpoint and migration contract.
- Reference receipt API with authenticated subject binding, retention controls, and append-only events.
- Retryable withdrawal webhooks and downstream processor adapters.
- Multi-site configuration without making the hosted service mandatory.
- Deployment health checks and reference observability.
- Signed release artifacts, SBOM, security review, and incident process.

Release gate: a self-hosted reference deployment survives retries, stale clients, and partial downstream failures without silently widening consent.

## 0.5 — discovery and standards

Target: reduce integration omissions while keeping discoveries reviewable.

- Optional crawler for scripts, Cookies, pixels, iframes, and outbound hosts.
- Proposed purpose/vendor mappings with source location and confidence.
- Vendor catalog and policy-change impact reports.
- Evaluate IAB TCF and GPP support against governance, licensing, and conformance requirements.
- Add mobile integration only after the shared receipt and withdrawal contract is stable.

Release gate: discoveries are reproducible and remain proposals until a human approves them; unknowns are never auto-classified as compliant.

## Future research

- AI-assisted privacy audits that explain code and configuration findings.
- Agent/tool policy decisions separated from user consent and delegation.
- Privacy-request workflows and public transparency reports.
- Enterprise reporting, reviewer roles, and independently assessed control packs.

These items are research directions. The current **Privacy Readiness Checks** are deterministic CLI/CI checks, not an AI legal reviewer.

## Permanent boundaries

- No “100% compliant” score, legal certification, or automatic applicability decision.
- Consent remains distinct from contract, legitimate interests, and other legal bases.
- Rules, sources, limitations, release history, and conformance tests stay public.
- Personal receipts, privacy requests, prompts, identifiers, credentials, and protected evidence do not become public transparency data.
- Self-hosting remains viable; no required paid cloud control plane.
