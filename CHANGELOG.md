# Changelog

## 0.3.0-alpha.1 - 2026-08-31

- Replace the temporary ChatGPT Sites runtime with a repository-owned Vite site deployed through GitHub Pages.
- Make the deployed site the project homepage and add a first-visit, equal-choice consent Banner.
- Add real pre-blocking for two explicitly managed local scripts, visible demo Cookie creation, withdrawal cleanup, and GPC sale/share override.
- Preserve the GitHub Pages project path on demo Cookies so they do not affect sibling Pages projects.
- Distinguish initial denial from withdrawal and preserve initially observed GPC during runtime reset.

## 0.2.0-alpha.1 - 2026-08-31

- Add an interactive GDPR/CCPA runtime lab with GPC, preference, decision, receipt, and propagation simulations.
- Add source integration starters for core, React, Vue, Express, and Spring Boot 3.
- Add initial cross-language conformance fixtures and runtime tests.
- Publish a dated paid-CMP comparison and explicit production boundary.

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
- Production consent operations, rights-request orchestration, scanners, signed receipts and agent policy decisions remain roadmap items. The website only enforces its explicitly managed demo tags.

[Unreleased]: https://github.com/noir-hedgehog/openConsent
