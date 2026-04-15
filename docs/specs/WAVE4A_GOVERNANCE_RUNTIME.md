# Wave 4A Governance Runtime

## Purpose

This spec records the shipped Wave 4A Block A truth that exists in-repo today. Block A activates the governance transport adapter for synthetic `command_request` evaluation through a bounded runtime landing zone. It does not rewrite or supersede the frozen Wave 3 specs.

## Shipped Block A Surface

Wave 4A Block A adds these files:

- `src/governance/runtime/decisionVocabulary.js`
- `src/governance/runtime/evaluateGovernanceRequest.js`
- `src/governance/runtime/index.js`
- `tests/governance.runtime.test.js`
- `tests/fixtures/governance/refusal.commandRequest.json`
- `tests/fixtures/governance/safe-pass.commandRequest.json`
- `docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`
- `docs/closeouts/WAVE4A_BLOCK_A_CLOSEOUT.md`

Wave 4A Block A also updates:

- `src/bridge/governanceTransportAdapter.js`
- `tests/bridge.governanceTransportAdapter.test.js`
- `MIGRATIONS.md`

## Frozen Contracts

Block A activates behavior without widening these existing contracts:

- `GovernanceEvaluationRequest`
- `GovernancePublication`
- `BridgeEnvelope`
- typed `signal_tree`

Wave 3 specs remain historically frozen and truthful. This Wave 4A spec records the activation delta instead of rewriting Wave 3 in place.

## Block A Decision Vocabulary

Block A may emit only:

- `ALLOW`
- `HOLD`
- `BLOCK`

Block A does not emit:

- `SUPERVISE`
- `REVOKE`

Those decisions remain reserved for later work.

## Evaluator Behavior

Block A handles only `kind === "command_request"`.

For malformed or unsupported input, the runtime returns:

- `BLOCK`
- deterministic fail-closed reason strings

Malformed or unsupported cases include:

- missing required top-level request fields
- unsupported `kind`
- unsupported `authority_context` shape
- unsupported `evidence_context` shape

For `kind === "event_observation"`, Block A returns:

- `BLOCK`
- `event_observation_deferred_block_a_command_request_only`

This deferment is explicit. Event-side governance routing remains out of scope in Block A.

For governed refusal, Block A returns:

- `HOLD`
- a deterministic reason string that records missing approvals and/or missing evidence

For safe pass, Block A returns:

- `ALLOW`
- `authority_and_evidence_resolved`

## Adapter And Publication Posture

`src/bridge/governanceTransportAdapter.js` now delegates evaluation into `src/governance/runtime/`.

Publication posture remains intentionally narrow:

- `HOLD` may continue to use the existing `governancePublisher.publishOutcome()` behavior.
- `ALLOW` returns the evaluation result without forcing the current unconditional publication path.
- fail-closed `BLOCK` returns the evaluation result without widening publisher behavior.
- `src/bridge/governancePublisher.js` remains unchanged in Block A.

## Explicit Non-Claims

Wave 4A Block A does not ship:

- event-side governance routing
- publisher widening beyond the current truthful `HOLD` path
- actor-level authority topology
- entity mutation or KV mutation
- civic ForensicChain runtime writes
- policy pack expansion beyond this bounded evaluator
- UI, skins, or dashboard work

Later blocks own any approved expansion in those areas.
