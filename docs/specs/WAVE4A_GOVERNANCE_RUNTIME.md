# Wave 4A Governance Runtime

## Purpose

This spec records the shipped Wave 4A truth that exists in-repo today. Block A activates the governance transport adapter for synthetic `command_request` evaluation through a bounded runtime landing zone. Block B freezes one static local civic policy pack as the only runtime config source for that evaluator. Block C integrates the approved runtime subset so the bounded evaluator can now emit real `ALLOW`, `SUPERVISE`, `HOLD`, and `BLOCK` paths without widening frozen bridge, publication, entity, or typed `signal_tree` contracts. Block D adds bounded promise-status derivation, civic confidence tiers, and short runtime rationale strings so the output is legible as civic governance state without opening publisher widening, event-side routing, or authority-topology work. Block E adds a read-only on-demand governance sweep facade plus the frozen governed non-event demo proof so Wave 4A can prove the refusal-first non-event without opening scheduler, persistence, publisher, or authority-topology work.

This spec does not rewrite or supersede the frozen Wave 3 specs.

## Shipped Wave 4A Surface

Wave 4A now ships these runtime files:

- `src/governance/runtime/decisionVocabulary.js`
- `src/governance/runtime/meridian-governance-config.js`
- `src/governance/runtime/evaluateGovernanceRequest.js`
- `src/governance/runtime/runtimeSubset.js`
- `src/governance/runtime/runGovernanceSweep.js`
- `src/governance/runtime/index.js`

Wave 4A now ships these direct proof surfaces:

- `tests/governance.policyPack.test.js`
- `tests/governance.demoProof.test.js`
- `tests/governance.promiseConfidence.test.js`
- `tests/governance.runtime.test.js`
- `tests/governance.runtimeSubset.test.js`
- `tests/governance.sweep.test.js`
- `tests/fixtures/governance/refusal.commandRequest.json`
- `tests/fixtures/governance/safe-pass.commandRequest.json`
- `tests/fixtures/governance/supervised.commandRequest.json`
- `tests/fixtures/governance/hard-stop.commandRequest.json`

Wave 4A closeout and canon surfaces now include:

- `docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`
- `docs/closeouts/WAVE4A_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_A_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_B_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_C_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_D_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_E_CLOSEOUT.md`

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

Wave 4A Block D updates only:

- `src/governance/runtime/deriveCivicConfidence.js`
- `src/governance/runtime/derivePromiseStatus.js`
- `src/governance/runtime/decisionVocabulary.js`
- `src/governance/runtime/evaluateGovernanceRequest.js`
- `src/governance/runtime/runtimeSubset.js`
- `src/governance/runtime/index.js`
- `tests/governance.runtime.test.js`
- `tests/governance.promiseConfidence.test.js`
- `MIGRATIONS.md`
- `docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`
- front-door docs that would otherwise become stale

Wave 4A Block E updates only:

- `src/governance/runtime/runGovernanceSweep.js`
- `src/governance/runtime/index.js`
- `tests/governance.sweep.test.js`
- `tests/governance.demoProof.test.js`
- `docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`
- `docs/closeouts/WAVE4A_BLOCK_E_CLOSEOUT.md`
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

## Civic Confidence Vocabulary

Wave 4A Block D now emits a separate bounded civic confidence tier at `runtimeSubset.civic.confidence.tier`:

- `WATCH`
- `GAP`
- `HOLD`
- `KILL`

This tier is not the same field as top-level runtime `decision`. Decision state and civic confidence remain separate axes.

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
- `runtimeSubset.civic.confidence.tier === WATCH`

For resolved `SUPERVISED` posture with no blocking constraints, omissions, or standing-risk escalation, Wave 4A returns:

- `SUPERVISE`
- `supervised_domain_requires_operator_review`
- `runtimeSubset.civic.confidence.tier === GAP`

For missing approvals, missing evidence, deterministic omission findings, or blocking standing-risk escalation, Wave 4A returns:

- `HOLD`
- a deterministic reason string
- a structured hold projection with blocking status, summary, evidence, options, and resolution path
- `runtimeSubset.civic.confidence.tier === HOLD`

For resolved `HARD_STOP` posture with no earlier HOLD condition, Wave 4A returns:

- `BLOCK`
- `hard_stop_domain_requires_manual_lane`
- `runtimeSubset.civic.confidence.tier === KILL`

The Block C runtime subset now performs bounded equivalents of:

- control-rod posture resolution
- static constraint registry evaluation
- safety interlock gating
- structured hold shaping
- deterministic omission coverage evaluation
- non-persistent continuity and standing-risk evaluation
- optional internal Open Items Board projection

Synthetic continuity and standing-risk inputs may be carried inside the existing optional `confidence_context` object. This is a bounded runtime behavior inside the already-frozen request shape, not a new bridge contract.

## Block D Civic Output

Wave 4A Block D adds a bounded civic projection under `runtimeSubset.civic`.

`runtimeSubset.civic.promise_status` uses the existing shipped typed field family:

- `conditions_total`
- `conditions_satisfied`
- `oldest_open_condition_at`

This is a bounded transient runtime projection, not an entity mutation and not a `signal_tree` widening.

Promise-status derivation counts these runtime facts as civic conditions:

- required approvals
- required evidence counts
- active omission findings
- continuity-derived standing-risk entries that remain unresolved

When bounded runtime facts do not carry a real timestamp, `oldest_open_condition_at` remains `null`. Block D does not invent temporal provenance.

`runtimeSubset.civic.confidence` adds:

- `tier`
- `posture`
- `rationale`

Tier posture is intentionally bounded:

- `WATCH`: non-blocking, low-risk advisory posture
- `GAP`: meaningful review-relevant signal that is not fatal by itself
- `HOLD`: blocking absence or unresolved required condition
- `KILL`: malformed, unsupported, or hard-stop fail-closed posture

`runtimeSubset.civic.rationale.decision` now carries a short deterministic string for operator or developer debugging. This is not a full explanation surface or refusal-product UX.

## Block E Sweep And Demo Proof

Wave 4A Block E adds `runGovernanceSweep(options)` as a read-only, explicit invocation facade over the existing evaluator.

The facade accepts only explicit synthetic inputs:

- a non-empty `scenarios` array
- per-scenario `scenarioId`
- per-scenario synthetic `request`
- optional per-scenario `expectedDecision`
- optional per-scenario `governedNonEventProof`
- optional `evaluatedAt` for deterministic test output

The facade returns bounded per-scenario summaries that are sufficient for proof without widening bridge or publication contracts:

- `scenarioId`
- `decision`
- `reason`
- `rationale`
- `promiseStatus`
- `confidenceTier`
- `omissionSummary`
- `standingRiskSummary`
- `governedNonEventProofPassed` when the proof marker is set

The facade remains read-only and on-demand only:

- no timer
- no scheduler
- no cron
- no worker
- no daemon
- no filesystem scanning
- no NATS reads
- no civic ForensicChain writes
- no publisher calls

`tests/governance.demoProof.test.js` freezes `tests/fixtures/governance/refusal.commandRequest.json` as the canonical governed non-event proof. The required outcome remains `HOLD`; Block E does not reframe the demo as a happy-path mutation.

`tests/governance.sweep.test.js` proves the facade can be invoked with explicit synthetic input, keeps the refusal scenario primary, and exercises bounded supporting control cases without widening runtime scope.

## Adapter And Publication Posture

`src/bridge/governanceTransportAdapter.js` delegates evaluation into `src/governance/runtime/`.

Publication posture remains intentionally narrow:

- `HOLD` may continue to use the existing `governancePublisher.publishOutcome()` behavior.
- `ALLOW` returns the evaluation result without forcing the current unconditional publication path.
- `SUPERVISE` returns the evaluation result without forcing publisher widening.
- fail-closed `BLOCK` returns the evaluation result without widening publisher behavior.
- `src/bridge/governancePublisher.js` remains unchanged in Wave 4A.
- `runGovernanceSweep()` composes the same local runtime read-only and does not publish, persist, or route events.

## Explicit Non-Claims

Wave 4A Blocks A-E do not ship:

- event-side governance routing
- periodic worker, scheduler, timer, or daemon sweep behavior
- publisher widening beyond the current truthful `HOLD` path
- actor-level authority topology
- env-driven policy branching
- NATS KV policy reads or dynamic policy fetch
- entity mutation or KV mutation
- civic ForensicChain runtime writes
- session or operator trust surfaces
- authority-topology semantics
- explanation-product refusal UX
- full HookRuntime transplant
- UI, skins, or dashboard work

Later approved blocks own any expansion in those areas.
