# Wave 3 NATS Bridge

## Purpose

This spec records the shipped Wave 3 truth that exists in-repo today. Wave 3 is a bounded NATS bridge substrate and governance transport stub. It is not a full governance runtime.

## Shipped Wave 3 Surface

Wave 3 adds these runtime-adjacent bridge files:

- `src/bridge/subjectCatalog.js`
- `src/bridge/natsTransport.js`
- `src/bridge/eventTranslator.js`
- `src/bridge/commandTranslator.js`
- `src/bridge/eventSubscriber.js`
- `src/bridge/commandSubscriber.js`
- `src/bridge/governancePublisher.js`
- `src/bridge/governanceTransportAdapter.js`

Wave 3 also adds:

- `tests/fixtures/nats/*.json`
- `tests/bridge*.test.js`
- `scripts/synthetic-constellation.js`

## Bridge Posture

- Meridian now ships a transport-only bridge substrate.
- The bridge imports `src/config/constellation.js` read-only for Meridian publication subjects and connection config.
- `package.json` declares one runtime dependency: `nats`.
- `package-lock.json` is committed as the first lockfile for this repo.
- Fake-transport proof ships in-repo; live broker proof does not.

## Bridge-Local Contracts

### BridgeEnvelope

```js
{
  channel: "events" | "telemetry" | "commands",
  subject: string,
  org_id: string,
  entity_id: string,
  entity_type: string | null,
  observed_at: string | null,
  raw_payload: object
}
```

### GovernanceEvaluationRequest

```js
{
  kind: "event_observation" | "command_request",
  org_id: string,
  entity_ref: { entity_id: string, entity_type: string | null },
  authority_context: object | null,
  evidence_context: object | null,
  confidence_context: object | null,
  candidate_signal_patch: object | null,
  raw_subject: string
}
```

Wave 3 preserves opaque command payloads alongside this exact request contract during subscriber handling. The request contract itself does not widen to carry command semantics.

### GovernancePublication

```js
{
  stream: "CONSTELLATION_GOVERNANCE" | "CONSTELLATION_EVIDENCE" | "CONSTELLATION_DISCLOSURES",
  subject: string,
  payload: object
}
```

These are bridge-local transport contracts. They do not widen the persistent Wave 2 entity contract.

## Shipped Behavior

- `subjectCatalog.js` is the single source of truth for Wave 3 upstream subscribe subjects and Meridian publication builders.
- `eventTranslator.js` normalizes upstream event and telemetry inputs into `BridgeEnvelope`.
- `commandTranslator.js` derives `GovernanceEvaluationRequest` from command subjects and keeps payloads opaque.
- `eventSubscriber.js` and `commandSubscriber.js` consume through an injected transport and do not mutate entities or KV state.
- `governancePublisher.js` publishes governance, evidence, and disclosure payloads only through the shipped Meridian subject builders.
- `governanceTransportAdapter.js` is deterministic and fail-closed. It can return `HOLD` or `BLOCK`, and never returns `ALLOW`.

## Explicit Non-Claims

The following are not shipped in Wave 3:

- actor-level authority topology
- entity mutation or `CONSTELLATION_GLOBAL_STATE` mutation
- Meridian-native civic ForensicChain runtime persistence
- live Constellation compatibility proof
- HookRuntime porting beyond the thin fail-closed stub
- policy-pack execution
- OpenFGA, GateKeeper, or Auth0 implementation
