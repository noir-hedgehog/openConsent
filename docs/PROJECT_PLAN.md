# Product plan

## Product decision

openConsent is a **free, open-source consent management SDK for modern web applications**. It helps AI and SaaS teams add a Cookie Banner, Preference Center, explicit optional-tag blocking, Google Consent Mode, and consistent browser/server decisions without adopting a paid hosted CMP.

The immediate product is the consent runtime. The existing deterministic CLI/CI capability is named **Privacy Readiness Checks** and supports the product; it is not presented as an AI audit or legal certification. AI-assisted scanning and agent policy enforcement remain future research in [the roadmap](ROADMAP.md).

## Primary users and jobs

| User | Job | First useful result |
| --- | --- | --- |
| Frontend developer | Add a mainstream consent experience without a proprietary dashboard | One script renders the Banner and blocks registered optional tags |
| React or Vue team | Use consent state inside application components | Provider/plugin, Banner, gates, and hooks/composable |
| Backend developer | Apply the same purpose decisions to server endpoints | Express or Spring request evaluation with server-observed GPC |
| Privacy or legal reviewer | Inspect what the implementation claims and where manual review remains | Public purpose policy, readiness findings, tests, and limitations |
| Self-hosting team | Keep configuration and evidence under its own control | Apache-2.0 packages and an optional reference backend path |

## Product principles

1. **Optional means off by default.** Missing, invalid, unknown, or stale preference state denies optional processing.
2. **Withdrawal changes behavior.** Managed tags do not make new requests after their purpose is withdrawn; downstream systems need explicit propagation.
3. **No false certification.** A working Banner or passing readiness check does not prove legal compliance.
4. **Equal, accessible choices.** Reject is as prominent and easy as accept; optional purposes are not preselected.
5. **Public rules, protected people.** Source, rules, tests, release history, and limitations are public. Personal receipts and private evidence are protected.
6. **Self-hosting stays viable.** The core product does not require a paid cloud control plane.
7. **Claims follow tests.** Marketing states only behavior covered by the implementation and release checks.

## 0.3 beta scope

Included:

- `@openconsent/web` with ESM and browser IIFE builds.
- Banner and Preference Center in English and Chinese.
- Versioned `localStorage` preferences and policy/notice invalidation.
- Explicit managed-script activation by purpose.
- GPC enforcement for configured sale/sharing purposes.
- GA4 and Google Ads integration with Consent Mode defaults and updates.
- React and Vue components plus shared core decisions.
- Express and Spring server integration starters.
- Deterministic GDPR and CCPA/CPRA Privacy Readiness Checks.
- Official GitHub Pages website, live demo, diagnostic Playground, and public limitations.

Excluded:

- Automatic discovery or blocking of every Cookie, pixel, iframe, server event, or vendor.
- Legal advice, certification, automatic applicability decisions, or a “100% compliant” score.
- IAB TCF/GPP, mobile SDKs, vendor catalogs, rights-request automation, enterprise reporting, or a hosted multi-tenant control plane.
- Authoritative receipt storage, subject identity, cryptographic attestation, and guaranteed downstream deletion.
- AI legal review or automatic approval of scanner findings.

## Acceptance gates

- A developer can understand “free open-source CMP SDK” from the homepage in five seconds.
- The documented Plain HTML install works from the tagged public artifact.
- A first visit makes no optional third-party request.
- Accept, reject, purpose-only save, settings reopen, reload restoration, and withdrawal pass browser tests.
- Policy or notice changes invalidate old preferences and fail closed.
- GPC overrides configured sale/sharing grants.
- Google Consent Mode command order is tested.
- English, Chinese, mobile, keyboard, focus, and accessible names pass the release checks.
- Every JavaScript package builds and passes `npm pack --dry-run`.
- Rules, limitations, and package provenance are public.

## Release ownership

Maintainers control npm scope creation, Trusted Publisher configuration, release tags, legal review, and the decision to call a beta stable. See [the SDK publishing guide](SDK.md#publishing-and-provenance) and [the roadmap](ROADMAP.md).
