# Runtime SDKs (0.2 alpha)

The first adapters share deterministic decision semantics across browser and server frameworks. They are source-available integration starters, not published registry packages or a hosted consent service yet.

## Security and evidence boundary

- Optional processing defaults to `deny` when no valid preference exists.
- Server-observed `Sec-GPC: 1` overrides a historical grant for CCPA sale/sharing purposes.
- A contract or other declared legal basis is not presented as consent.
- Browser state and a client-supplied boolean are not authoritative consent evidence.
- Production deployments need protected immutable receipt storage, identity/subject resolution, version invalidation, signing/key management, retention, access controls, and retryable downstream propagation.
- `ConsentGate` prevents a React child from mounting. It cannot stop an earlier inline tag, preload, CDN request, server event, or other out-of-band processing.

## Shared core

```js
import { createOpenConsent } from '@openconsent/core';

const client = createOpenConsent({ policy });
client.evaluate('optional-analytics'); // deny by default
client.setChoice('optional-analytics', 'granted');
client.evaluate('optional-analytics'); // allow
client.setGpc(true);
client.evaluate('personalized-ads'); // deny
```

## React

```jsx
import { OpenConsentProvider, ConsentGate, ConsentToggle } from '@openconsent/react';

<OpenConsentProvider options={{ policy }}>
  <ConsentToggle purpose="optional-analytics" label="Optional analytics" />
  <ConsentGate purpose="optional-analytics"><Analytics /></ConsentGate>
</OpenConsentProvider>
```

## Vue

```js
import { createOpenConsentPlugin, useOpenConsent } from '@openconsent/vue';

app.use(createOpenConsentPlugin({ policy }));
const { can, save, rejectOptional, setGpc } = useOpenConsent();
```

## Express

```js
import { openConsent, requirePurpose } from '@openconsent/express';

app.use(openConsent({
  policy,
  getSnapshot: async (req) => receiptStore.read(subjectFor(req))
}));
app.post('/analytics', requirePurpose('optional-analytics'), handler);
```

The middleware reads `Sec-GPC` from the request and exposes `req.openConsent.can(purposeId)`. The application must implement authentication, subject mapping, and the authoritative receipt store.

## Spring Boot 3

The Java 17 starter includes `OpenConsentFilter`, `OpenConsentEvaluator`, and `OpenConsentDecision`. The filter records server-observed GPC as a request attribute. Wire the evaluator to your authenticated subject and receipt repository before using a decision as an authorization guard.

```java
OpenConsentDecision decision = evaluator.evaluate(
  "optional-analytics", "consent", false, gpc, choices
);
if (!decision.allowed()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
```

Java compilation is not part of the current CI because the project runner does not include a JDK. The module targets Java 17, Spring Boot 3, and Jakarta Servlet; add Maven/JDK CI before publishing it to a registry.

## Conformance

`packages/protocol/conformance.json` is the initial cross-language fixture. Root tests cover default denial, withdrawal, GPC override, Express server parsing, and fail-closed middleware behavior.
