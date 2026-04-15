# Wave 4A Governance Runtime

## Purpose

This spec records the shipped Wave 4A truth that exists in-repo today. Block A activates the governance transport adapter for synthetic `command_request` evaluation through a bounded runtime landing zone. Block B freezes one static local civic policy pack as the only runtime config source for that bounded evaluator. This spec does not rewrite or supersede the frozen Wave 3 specs.

## Shipped Wave 4A Surface

Wave 4A now adds these files:

- `src/governance/runtime/decisionVocabulary.js`
- `src/governance/runtime/meridian-governance-config.js`
- `src/governance/runtime/evaluateGovernanceRequest.js`
- `src/governance/runtime/index.js`
- `tests/governance.policyPack.test.js`
- `tests/governance.runtime.test.js`
- `tests/fixtures/governance/refusal.commandRequest.json`
- `tests/fixtures/governance/safe-pass.commandRequest.json`
- `docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`
- `docs/closeouts/WAVE4A_BLOCK_A_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_B_CLOSEOUT.md`

Wave 4A Block A also updates:

- `src/bridge/governanceTransportAdapter.js`
- `tests/bridge.governanceTransportAdapter.test.js`
- `MIGRATIONS.md`

Wave 4A Block B updates only:

- `src/governance/runtime/evaluateGovernanceRequest.js`
- `src/governance/runtime/index.js`
- front-door docs that would otherwise become stale

No Block B migration row is required because runtime output and bridge/publication contracts remain unchanged.

## Frozen Contracts

Wave 4A activates behavior without widening these existing contracts:

- `GovernanceEvaluationRequest`
- `GovernancePublication`
- `BridgeEnvelope`
- typed `signal_tree`

Wave 3 specs remain historically frozen and truthful. This Wave 4A spec records the activation and policy-pack delta instead of rewriting Wave 3 in place.

## Decision Vocabulary

Wave 4A may emit only:

- `ALLOW`
- `HOLD`
- `BLOCK`

Wave 4A does not emit:

- `SUPERVISE`
- `REVOKE`

Those decisions remain reserved policy metadata for later work.

## Static Civic Policy Pack

`src/governance/runtime/meridian-governance-config.js` is the only runtime config source for Wave 4A governance evaluation.

The static policy pack freezes:

- version metadata and static-local source markers
- civic domains with explicit rod positions
- actor-agnostic civic constraints
- confidence thresholds for `WATCH`, `GAP`, `HOLD`, and `KILL`
- omission packs for `permit_without_inspection`, `action_without_authority`, and `closure_without_evidence`

The shipped domain set is:

- `permit_authorization`
- `inspection_resolution`
- `utility_corridor_action`
- `decision_closure`
- `public_notice_action`

Approved config posture remains:

- static local import only
- no env-driven branching
- no NATS KV reads
- no dynamic fetch
- no filesystem reads at runtime

## Evaluator Behavior

Wave 4A handles only `kind === "command_request"`.

For malformed or unsupported input, the runtime returns:

- `BLOCK`
- deterministic fail-closed reason strings

Malformed or unsupported cases include:

- missing required top-level request fields
- unsupported `kind`
- unsupported `authority_context` shape
- unsupported `evidence_context` shape

For `kind === "event_observation"`, Wave 4A returns:

- `BLOCK`
- `event_observation_deferred_block_a_command_request_only`

This deferment is explicit. Event-side governance routing remains out of scope in Wave 4A.

For governed refusal, Wave 4A returns:

- `HOLD`
- a deterministic reason string that records missing approvals and/or missing evidence

For safe pass, Wave 4A returns:

- `ALLOW`
- `authority_and_evidence_resolved`

Block B keeps those emitted outcomes unchanged while resolving applicable domains, constraints, and omission packs from the static local policy pack before the final decision is returned.

## Adapter And Publication Posture

`src/bridge/governanceTransportAdapter.js` now delegates evaluation into `src/governance/runtime/`.

Publication posture remains intentionally narrow:

- `HOLD` may continue to use the existing `governancePublisher.publishOutcome()` behavior.
- `ALLOW` returns the evaluation result without forcing the current unconditional publication path.
- fail-closed `BLOCK` returns the evaluation result without widening publisher behavior.
- `src/bridge/governancePublisher.js` remains unchanged in Block A.

## Explicit Non-Claims

Wave 4A Blocks A-B do not ship:

- event-side governance routing
- publisher widening beyond the current truthful `HOLD` path
- actor-level authority topology
- env-driven policy branching
- NATS KV policy reads or dynamic policy fetch
- entity mutation or KV mutation
- civic ForensicChain runtime writes
- promise-status derivation or widened confidence emission
- UI, skins, or dashboard work

Later blocks own any approved expansion in those areas.
