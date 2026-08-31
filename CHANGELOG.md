# Changelog

All notable changes to openConsent are documented here. The project follows semantic versioning after the first tagged alpha.

## [Unreleased]

### Added

- AI-created and runtime-AI project manifest with strict JSON Schema validation.
- Selectable GDPR and CCPA/CPRA engineering-readiness rule packs.
- Explicit applicability, legal role, personal-data scope, processing activity, notice, rights, GPC, sale/sharing, transfer, consent-withdrawal and automated-decision declarations.
- CLI commands for checks, explanations, public transparency cards, unsigned assessment records and record verification.
- Strict release gate for unresolved human review using `--fail-on review`.
- Digest binding for the manifest, schema, engine, dependency lock, rule packs and findings.
- Public/protected information model, governance, contribution and security documentation.
- GitHub Actions workflow and adversarial tests for false passes, role confusion, disclosure leakage and assessment tampering.

### Limitations

- Rule packs have not received independent legal review.
- v0.1 checks declarations and evidence identity; it does not prove operating effectiveness or legal compliance.
- Runtime consent/preference enforcement, rights-request orchestration, scanners, signed receipts and agent policy decisions remain roadmap items.

[Unreleased]: https://github.com/noir-hedgehog/openConsent
