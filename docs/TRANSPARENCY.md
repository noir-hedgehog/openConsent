# Transparency model

Public transparency means outsiders can inspect the rules, claims, provenance, and known limits. It does not mean exposing the people whose data the system protects.

## Publish

- Source code, build/test instructions, release history, dependency/SBOM information.
- Policy-pack versions, official sources, effective/review dates, check semantics, tests, and reviewer roles.
- Public project transparency cards: identity, purposes, category labels, recipient classes, retention, AI use, user controls, and contact routes.
- Assessment metadata: manifest hash, rule-pack versions, tool version, result counts, and unresolved public findings.
- Governance, conflicts of interest, security/reporting channels, known limitations, and material incidents after safe disclosure.
- Aggregate, privacy-preserving statistics about choices, withdrawals, requests, and decision outcomes when useful.

## Protect

- Identifiable consent receipts and privacy requests.
- Raw prompts, free-text user content, IP addresses, device identifiers, credentials, and precise security telemetry.
- Contracts, DPIAs, legal advice, and vulnerability evidence that require controlled access.
- Agent delegation tokens and internal policy context that could enable abuse.

Publish evidence metadata or a scoped attestation when raw evidence cannot be public. A hash supports later integrity verification but does not prove truth or remove personal-data status.

## Every public claim needs

1. a stable claim/control identifier;
2. scope and applicable project/version;
3. policy/rule version;
4. evidence level (`declared`, `observed`, `tested`, `attested`, `independently_assessed`);
5. reviewer and review date where appropriate;
6. unresolved limitations and expiry/reassessment condition.

## Change and challenge process

- Rule changes use pull requests with linked primary sources, behavioural tests, and a migration note.
- Breaking or stricter changes state which prior assessments become stale.
- Anyone can open a public issue to challenge a rule or public claim without revealing personal data.
- Security and privacy reports use the private channel in `SECURITY.md`.
- Maintainers publish the reasoning for accepting or rejecting a material challenge.
- No sponsor or hosted customer can privately override the public rule pack.

## Anti-dark-pattern commitments

- Closing or ignoring a UI never means consent.
- Rejecting optional processing is as easy and prominent as accepting it.
- Optional purposes are off by default.
- A withdrawal/opt-out is recorded and propagated, not merely reflected in UI state.
- Explanations describe consequences without pressure, obstruction, or fabricated urgency.
- Metrics do not optimise for the highest opt-in rate.

The current CLI can generate the data foundation for a public card. A later renderer must meet accessibility standards and show unresolved/manual-review items alongside positive claims.
