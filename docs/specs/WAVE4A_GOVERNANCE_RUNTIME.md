# Wave 4A Governance Runtime

## Purpose

This spec records the shipped Wave 4A truth that exists in-repo today. Block A activates the governance transport adapter for synthetic `command_request` evaluation through a bounded runtime landing zone. Block B freezes one static local civic policy pack as the only runtime config source for that evaluator. Block C integrates the approved runtime subset so the bounded evaluator can now emit real `ALLOW`, `SUPERVISE`, `HOLD`, and `BLOCK` paths without widening frozen bridge, publication, entity, or typed `signal_tree` contracts.

This spec does not rewrite or supersede the frozen Wave 3 specs.

## Shipped Wave 4A Surface

Wave 4A now ships these runtime files:

- `src/governance/runtime/decisionVocabulary.js`
- `src/governance/runtime/meridian-governance-config.js`
- `src/governance/runtime/evaluateGovernanceRequest.js`
- `src/governance/runtime/runtimeSubset.js`
- `src/governance/runtime/index.js`

Wave 4A now ships these direct proof surfaces:

- `tests/governance.policyPack.test.js`
- `tests/governance.runtime.test.js`
- `tests/governance.runtimeSubset.test.js`
- `tests/fixtures/governance/refusal.commandRequest.json`
- `tests/fixtures/governance/safe-pass.commandRequest.json`
- `tests/fixtures/governance/supervised.commandRequest.json`
- `tests/fixtures/governance/hard-stop.commandRequest.json`

Wave 4A closeout and canon surfaces now include:

- `docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`
- `docs/closeouts/WAVE4A_BLOCK_A_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_B_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_C_CLOSEOUT.md`

Wave 4A Block A also updates:

- `src/bridge/governanceTransportAdapter.js`
- `tests/bridge.governanceTransportAdapter.test.js`
- `MIGRATIONS.md`

Wave 4A Block B updates only:

- `src/governance/runtime/evaluateGovernanceRequest.js`
- `src/governance/runtime/index.js`
- front-door docs that would otherwise become stale

Wave 4A Block C updates only:

- `src/governance/runtime/decisionVocabulary.js`
- `src/governance/runtime/meridian-governance-config.js`
- `src/governance/runtime/evaluateGovernanceRequest.js`
- `src/governance/runtime/runtimeSubset.js`
- `src/governance/runtime/index.js`
- `tests/governance.runtime.test.js`
- `tests/governance.policyPack.test.js`
- `tests/governance.runtimeSubset.test.js`
- `tests/bridge.governanceTransportAdapter.test.js`
- `tests/fixtures/governance/supervised.commandRequest.json`
- `tests/fixtures/governance/hard-stop.commandRequest.json`
- `MIGRATIONS.md`
- front-door docs that would otherwise become stale

## Frozen Contracts

Wave 4A activates behavior without widening these existing contracts:

- `GovernanceEvaluationRequest`
- `GovernancePublication`
- `BridgeEnvelope`
- typed `signal_tree`

Wave 3 specs remain historically frozen and truthful. This Wave 4A spec records the activation, policy-pack, and runtime-subset delta instead of rewriting Wave 3 in place.

## Decision Vocabulary

Wave 4A may now emit:

- `ALLOW`
- `SUPERVISE`
- `HOLD`
- `BLOCK`

Wave 4A still does not emit:

- `REVOKE`

`SUPERVISE` is a real Block C runtime outcome. `REVOKE` remains reserved for later approved work.

## Static Civic Policy Pack

`src/governance/runtime/meridian-governance-config.js` remains the only runtime config source for Wave 4A governance evaluation.

The static policy pack freezes:

- version metadata and static-local source markers
- civic domains with explicit rod positions
- actor-agnostic civic constraints
- confidence thresholds for `WATCH`, `GAP`, `HOLD`, and `KILL`
- omission packs for `permit_without_inspection`, `action_without_authority`, and `closure_without_evidence`
- runtime-subset posture precedence, interlock posture, standing-risk blocking states, and internal open-items projection enablement

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
- unsupported runtime-subset synthetic context shape when those optional inputs are present

For `kind === "event_observation"`, Wave 4A returns:

- `BLOCK`
- `event_observation_deferred_block_a_command_request_only`

This deferment is explicit. Event-side governance routing remains out of scope in Wave 4A.

For resolved `FULL_AUTO` posture with no blocking constraints, omissions, or standing-risk escalation, Wave 4A returns:

- `ALLOW`
- `authority_and_evidence_resolved`

For resolved `SUPERVISED` posture with no blocking constraints, omissions, or standing-risk escalation, Wave 4A returns:

- `SUPERVISE`
- `supervised_domain_requires_operator_review`

For missing approvals, missing evidence, deterministic omission findings, or blocking standing-risk escalation, Wave 4A returns:

- `HOLD`
- a deterministic reason string
- a structured hold projection with blocking status, summary, evidence, options, and resolution path

For resolved `HARD_STOP` posture with no earlier HOLD condition, Wave 4A returns:

- `BLOCK`
- `hard_stop_domain_requires_manual_lane`

The Block C runtime subset now performs bounded equivalents of:

- control-rod posture resolution
- static constraint registry evaluation
- safety interlock gating
- structured hold shaping
- deterministic omission coverage evaluation
- non-persistent continuity and standing-risk evaluation
- optional internal Open Items Board projection

Synthetic continuity and standing-risk inputs may be carried inside the existing optional `confidence_context` object. This is a bounded runtime behavior inside the already-frozen request shape, not a new bridge contract.

## Adapter And Publication Posture

`src/bridge/governanceTransportAdapter.js` delegates evaluation into `src/governance/runtime/`.

Publication posture remains intentionally narrow:

- `HOLD` may continue to use the existing `governancePublisher.publishOutcome()` behavior.
- `ALLOW` returns the evaluation result without forcing the current unconditional publication path.
- `SUPERVISE` returns the evaluation result without forcing publisher widening.
- fail-closed `BLOCK` returns the evaluation result without widening publisher behavior.
- `src/bridge/governancePublisher.js` remains unchanged in Wave 4A.

## Explicit Non-Claims

Wave 4A Blocks A-C do not ship:

- event-side governance routing
- publisher widening beyond the current truthful `HOLD` path
- actor-level authority topology
- env-driven policy branching
- NATS KV policy reads or dynamic policy fetch
- entity mutation or KV mutation
- civic ForensicChain runtime writes
- promise-status derivation
- widened confidence emission or civic confidence rendering
- session or operator trust surfaces
- full HookRuntime transplant
- UI, skins, or dashboard work

Later approved blocks own any expansion in those areas.
