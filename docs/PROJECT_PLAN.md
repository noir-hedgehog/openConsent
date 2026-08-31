# Project plan

## Product decision

openConsent will be an **open policy, consent, and evidence layer for software**, starting with software created by AI/agents and software that uses AI/agents at runtime. These are separate facts:

- `creation.origin` records how a project was made. AI-generated code does not automatically make the resulting product an AI system.
- `runtime.aiComponents` records models and agents that operate in production and may create new data flows or decisions.

The entry point is a Git-reviewable manifest plus CLI and CI. A hosted dashboard, consent UI, SDK enforcement hooks, and privacy-request automation can be added after the underlying contract is stable.

## Target users and jobs

| User | Job | First useful outcome |
|---|---|---|
| Indie builder / AI coding user | Find compliance gaps before launch | A guided manifest and actionable CI report |
| Engineering team | Keep implementation and public claims aligned | Versioned checks on every change |
| Privacy or legal reviewer | Review facts without reverse-engineering the app | Data-flow inventory, source-linked controls, evidence index |
| End user / customer | Understand how data and AI are used | Short public transparency card and change history |
| Agent platform | Decide whether a model/tool action is permitted | Later: deterministic `allow / deny / review` decision API |

## Non-negotiable principles

1. **No false certification.** Report `pass`, `fail`, `needs_review`, and `not_applicable`; never a single “100% compliant” score. `pass` only covers declared manifest requirements.
2. **Consent is one legal basis.** GDPR contract, legal obligation, vital interests, public task, and legitimate interests must not be disguised as consent. CCPA sale/sharing opt-out must not be presented as GDPR-style opt-in.
3. **Human accountability.** AI may discover or propose facts. It cannot approve its own proposal, create user consent, or silently expand a permission.
4. **Public rules, protected people.** Publish rules, sources, versions, methods, limitations, and aggregate outcomes. Protect personal receipts, raw prompts, IP addresses, credentials, and security-sensitive evidence.
5. **Revocation propagates.** A future runtime grant is incomplete until withdrawal/opt-out stops new processing and creates an auditable event.
6. **Claims follow evidence.** Missing evidence is visible; a manifest assertion is not proof of operating effectiveness.

## MVP (0.1 — current foundation)

### Included

- Strict JSON project manifest/schema, explicit applicability/role decisions, and a reviewed no-personal-data path.
- Selectable `gdpr` and `ccpa` rule packs.
- Deterministic CLI checks with stable control IDs and non-zero CI exit.
- Public transparency-card generator.
- Unsigned assessment record binding SHA-256 digests for the manifest, schema, engine, dependency lock, rule packs and findings; `verify` recomputes them.
- Example manifest, tests, documentation, and CI workflow.

### Explicitly excluded

- A legal opinion, official certification, or signed human attestation.
- Automated determination of whether a law applies.
- Runtime scanning that proves the manifest is complete.
- A hosted, multi-tenant CMP/banner service or a data-subject request portal. A basic, transparent banner demo is included in the official website.
- Storage of identifiable consent receipts.
- Cryptographic signer identity, transparency log, and runtime enforcement.

## Roadmap and acceptance gates

### 0.2 — useful repository scanner (2–4 weeks)

- Add scanners for common model SDKs, analytics, storage, cookies, and outbound hosts.
- Emit **proposed** manifest patches with file/line provenance and confidence.
- Add an evidence index with owner, review date, expiry, and protected/public classification.
- Add SARIF output and GitHub pull-request annotations.
- Add configuration migrations and compatibility tests.

**Gate:** on three public reference applications, reviewers can reproduce every finding; unknowns remain unknown rather than being auto-filled.

### 0.3 — consent and US privacy controls (4–8 weeks)

- Headless preference/consent SDK separated from UI components.
- Consent receipts recording subject pseudonym, notice/policy version, purposes, action, timestamp, and provenance.
- Withdrawal propagation and processor hooks.
- CCPA/CPRA sale/share opt-out, limit-use preference, and Global Privacy Control support.
- Accessibility and equal-choice UI test suite; no pre-selected optional purposes.

**Gate:** automated tests prove reject/close does not grant consent, GPC overrides sale/share defaults, and withdrawal stops new optional processing.

### 0.4 — policy decision point for agents (8–12 weeks)

- `evaluate(action, subject, context)` API returning `allow`, `deny`, or `requires_review` with control IDs.
- Separate `ConsentGrant` and `DelegationGrant`; neither can substitute for the other.
- Model/tool gateway adapters, least-privilege scopes, budgets, expiry, and replay protection.
- Tamper-evident signed decisions and revocation events.

**Gate:** default-deny enforcement survives retries and stale grants; an agent cannot approve or widen its own grant.

### 1.0 — stable, reviewed core

- Independent legal review of GDPR/ePrivacy and CCPA/CPRA rule packs.
- Maintainer and external-reviewer sign-off for rule changes.
- Conformance suite, signed releases, SBOM, security audit, and documented incident process.
- At least two production pilots and a public limitations report.

**Gate:** rule behaviour, evidence lineage, privacy safeguards, and public claims are reproducible from a tagged release.

## First backlog

| Priority | Work item | Owner profile | Deliverable |
|---|---|---|---|
| P0 | Validate scope and terminology with EU and California counsel | Privacy lead | Reviewed control mapping and disclaimer |
| P0 | Interview five AI-assisted builders and two privacy reviewers | Product | Ranked workflow problems and pilot criteria |
| P0 | Define schema compatibility policy | Core maintainer | ADR and migration contract |
| P0 | Add SARIF output | CLI engineer | GitHub code-scanning compatible report |
| P0 | Build scanner provenance format | Security/AI engineer | Proposal object with source and confidence |
| P1 | Prototype public transparency-card renderer | Frontend | Accessible static page from JSON |
| P1 | Design receipt and revocation threat model | Security/privacy | Data minimisation and retention decision |
| P1 | Create conformance fixtures | QA | Positive, negative, and jurisdiction edge cases |
| P2 | Research naming and package namespaces | Project lead | Trademark/domain/package collision memo |

## Metrics for the pilot

- Median time to first valid manifest.
- Share of findings with a precise fix and source.
- Reviewer agreement on `pass/fail/needs_review` outcomes.
- False assurance rate: checks that pass while a known declared fact contradicts the control.
- Percentage of public-card claims linked to a reviewed manifest field.
- Withdrawal/opt-out propagation success once the runtime SDK exists.

Adoption and pass rate are diagnostic metrics, not compliance success metrics.

## Decisions still requiring maintainers

- Primary launch market and language order after the GDPR/CCPA foundation.
- Licence strategy for future hosted components; the current core is Apache-2.0.
- Whether `openConsent` remains the public brand. Similar names exist in privacy standards and products, so name clearance is required before a package/domain launch.
- Governance seats and the independent legal/security reviewers for 1.0.
