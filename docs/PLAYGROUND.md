# Playground

The official website keeps the product story and live Banner demo simple. The separate Playground is for developers who need to inspect the runtime protocol in detail.

## What the Playground shows

- current policy and notice versions;
- browser-observed GPC status;
- purpose decisions before and after a choice;
- managed-script activation and withdrawal;
- Cookie and request state for first-party test fixtures;
- Google Consent Mode command ordering when test IDs are configured;
- the latest unsigned preference receipt;
- diagnostic events useful for integration debugging.

The Playground is engineering evidence, not a compliance dashboard. A green state proves only the behavior exercised in that browser session.

## Safe public behavior

The deployed Playground uses local first-party fixtures unless a maintainer explicitly configures Google identifiers for the Pages build. A normal visit must not contact Google or another optional vendor before a matching grant.

Do not put personal data, production identifiers, real receipts, raw prompts, credentials, or private evidence into the public Playground. Its event log is visible to the visitor.

## Local run

```bash
pnpm install --frozen-lockfile
pnpm --dir apps/demo install --frozen-lockfile
pnpm --dir apps/demo dev
```

Open the local Playground URL shown by the application. Use a fresh browser profile or clear openConsent storage between versioning tests.

## Manual regression

1. Clear site data and reload.
2. Confirm that no optional third-party request is sent.
3. Reject optional processing and verify that managed tags remain inert.
4. Grant only analytics and verify that advertising remains blocked.
5. Reopen settings, withdraw analytics, and confirm that no new analytics request is made.
6. Reload and confirm that valid preferences are restored.
7. Change the policy or notice version and confirm that old preferences fail closed and the Banner returns.
8. Enable GPC and confirm that configured sale/sharing purposes are denied.
9. Test English and Chinese, mobile width, keyboard-only navigation, focus return, and accessible control names.

## Google integration check

For a private test build, provide `VITE_GA_MEASUREMENT_ID` and/or `VITE_GOOGLE_ADS_ID`. Confirm in the network panel that:

- no Google script request occurs before the matching grant;
- Consent Mode defaults are established before the first Google configuration command;
- purpose-specific updates contain only the storage fields expected for that integration;
- withdrawal produces a denied update and does not create new managed requests.

The identifiers and Google account configuration do not establish legal compliance. Review the deployment's jurisdictions, purposes, notices, and vendor settings separately.
