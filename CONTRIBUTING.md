# Contributing

Contributions are welcome, especially reproducible control tests, primary-source corrections, accessibility improvements, and privacy-preserving developer tools.

For policy changes, include:

1. the affected control ID and behaviour;
2. a primary official source and date reviewed;
3. applicability limits and exceptions;
4. positive, negative, and unknown/manual-review tests;
5. migration impact on prior assessments;
6. whether legal or security review is required.

AI-assisted contributions must identify the parts that were AI-assisted and remain the contributor's responsibility. Never commit personal data, prompts from real users, consent receipts, secrets, or confidential evidence.

Run before opening a pull request:

```bash
node --test
node ./src/cli.mjs check ./examples/openconsent.json
```
