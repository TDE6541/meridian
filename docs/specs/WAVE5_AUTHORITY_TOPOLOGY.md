# Wave 5 Authority Topology

## Purpose

Wave 5 Packet 1 adds a bounded static Fort Worth authority-topology declaration pack. Wave 5 Packet 2 keeps that pack static-local, then adds bounded runtime authority evaluation over explicit `authority_context` input only. Wave 5 Packet 3 composes that runtime truth into final authority decisions, activates bounded `REVOKE` semantics for three approved paths only, and adds projection-only propagation over explicit runtime inputs only. The wave still does not open publisher widening, event routing, persistence, or entity mutation.

## Packet 4 Historical Context + Current Repo State

- Packet 4 (historical) synced this spec to the then-local Wave 5 Packet 1-3 truth.
- Packet 4 is truth-surface synchronization only and does not change runtime or test behavior.
- Current repo state: Wave 5 Packets 1-3 are committed on `main` and aligned with `origin/main`.

## Shipped Packet 1 Truth

### Block A - additive entity widening

`authority_grant` and `organization` now accept additive shape fields that support static authority-topology declaration:

- `authority_grant`: role, jurisdiction, scope, temporal lineage, supersession lineage, delegation lineage, and a bounded status allowlist
- `organization`: org type, parent linkage, stable portfolio reference, authorized domains, and optional office-holder snapshot display metadata

These widenings remain validator-local and shape-only. Existing factory defaults remain at the legacy structural floor for compatibility with the shared structural suite.

No graph-aware entity validation or runtime-backed entity mutation ships in Packet 1.

### Block B - static Fort Worth topology pack

`src/governance/runtime/fortWorthAuthorityTopology.js` now ships one frozen local module with:

- stable Fort Worth org IDs keyed to:
  - `fw_city_manager`
  - `fw_acm_public_space_planning`
  - `fw_acm_environment_aviation_property`
  - `fw_acm_development_infrastructure`
  - `fw_acm_public_safety`
  - `fw_acm_enterprise_services`
- office-holder snapshot metadata for those org IDs only as display metadata
- full department mapping under the five ACM portfolios
- full role catalog for the current wave scope
- full role x domain matrix across the existing five civic domains:
  - `permit_authorization`
  - `inspection_resolution`
  - `utility_corridor_action`
  - `decision_closure`
  - `public_notice_action`
- cross-jurisdiction declaration for `city` and `franchise`
- static civic permit declaration semantics for:
  - `city_manager_final`
  - `portfolio_review`

### Config alignment

`src/governance/runtime/meridian-governance-config.js` now carries an additive `authorityTopology` section that references the static Fort Worth pack and records domain / org / role alignment. This does not change the existing Wave 4A evaluator behavior.

## Shipped Packet 2 Truth

### Block C - domain-side authority evaluation

`src/governance/runtime/resolveAuthorityDomain.js` now evaluates explicit `authority_context.domain_context` input against the Packet 1 Fort Worth topology pack and the existing runtime domain match:

- recognized vs unrecognized role IDs
- role x domain authorization using the frozen Fort Worth role-domain matrix
- org portfolio alignment as `match`, `mismatch`, `cross_portfolio_review`, or `not_applicable`
- deterministic permit state-transition validation for:
  - `portfolio_review`
  - `city_manager_final`
- bounded authority-grant scope checks when `scope_of_authority` is present
- bounded Wave 5 omissions only:
  - `authority_expired_mid_action`
  - `authority_jurisdiction_mismatch`

Domain-side evaluation emits only `ALLOW`, `SUPERVISE`, `HOLD`, or `BLOCK`. Packet 2 does not activate `REVOKE`.

### Block C' - actor-side authority evaluation

`src/governance/runtime/resolveAuthorityActor.js` now evaluates explicit `authority_context.actor_context` tuple input with deterministic local Meridian semantics:

- supported relations only:
  - `member_of`
  - `reports_to`
  - `grants_to`
  - `inspects`
  - `authorizes`
  - `supersedes`
- explicit relation precedence ordering
- delegation-chain traversal with a bounded chain-depth cap
- cycle detection for delegation chains
- bounded decision-trace output
- enforcement-lane / refusal-rationale style output without hosted auth services

The actor-side evaluator is deterministic over explicit input only. No Auth0 SDK, OpenFGA client, network call, persistent graph store, or hosted model dependency lands in this packet.

### Runtime integration

`src/governance/runtime/evaluateGovernanceRequest.js` now orchestrates both halves additively:

- no top-level `GovernanceEvaluationRequest` widening shipped
- no `signal_tree` widening shipped
- no `GovernancePublication` widening shipped
- `runtimeSubset.civic.authority_resolution` is now the bounded runtime-only projection for Packet 2 authority evaluation
- the actor-side decision trace remains bounded inside that runtime-only projection
- legacy Wave 4A requests without explicit `domain_context` / `actor_context` continue on the prior path

Packet 2 still leaves final cross-half decision composition beyond `ALLOW` / `SUPERVISE` / `HOLD` / `BLOCK` and all `REVOKE` semantics to later work.

## Shipped Packet 3 Truth

### Block D - final authority composition and bounded REVOKE

Packet 3 now composes Packet 2 domain-side and actor-side authority truth with bounded local grant provenance and temporal checks:

- `decisionVocabulary.js` now activates `REVOKE` as a real runtime decision value
- final authority composition stays in `src/governance/runtime/` only and does not widen `GovernanceEvaluationRequest`, `GovernancePublication`, or `signal_tree`
- grant provenance remains bounded to explicit runtime input only with:
  - required local provenance references for active / revoked / superseded grant use
  - deterministic phantom-authority detection when domain-side authority is claimed without a supplied grant
  - deterministic invalid-provenance detection when bounded lineage input is malformed or missing
  - a hard lineage depth cap with no unbounded recursion and no repo-global scan
- Packet 3 activates only these three `REVOKE` paths:
  - `authority_revoked_mid_action`
  - `permit_superseded_by_overlap`
  - `cross_jurisdiction_resolved_against_requester`
- the deferred negative-authority override lane remains unshipped

`runtimeSubset.civic.authority_resolution` remains the bounded projection of the Packet 2 domain/actor halves, while `runtimeSubset.civic.revocation` is the additive Packet 3 runtime-only projection for final revocation/provenance posture.

### Block B' - projection-only authority propagation

Packet 3 adds a projection-only propagation helper over explicit runtime inputs only:

- projection stays read-only and never mutates entities
- projection accepts only explicit action-request / decision-input runtime payloads supplied at evaluation time
- revocation, supersession, expiration, and cross-jurisdiction effects are projected by reusing the bounded runtime authority logic rather than opening storage-backed discovery
- optional propagation input stays nested under existing `authority_context` runtime input as `propagation_context`; no top-level request-shape widening ships
- projection output remains bounded inside runtime-only posture as `runtimeSubset.civic.revocation.propagation`

Packet 3 does not add background scanning, scheduler/worker behavior, persistence, publisher widening, downstream lifecycle cascade, or new event substrate.

## Contract posture

- Stable IDs drive module lookups; office-holder names do not drive topology logic.
- The topology pack is static-local only.
- The topology pack does not read from the network, environment, KV, or filesystem at runtime.
- The topology pack still does not expand beyond the five civic domains already shipped in the Wave 4A runtime pack.
- Wave 5 authority evaluation stays bounded to explicit `authority_context` input, a transient `runtimeSubset.civic.authority_resolution` projection, and an additive transient `runtimeSubset.civic.revocation` projection.
- Packet 3 propagation stays bounded to explicit runtime input supplied under `authority_context.propagation_context`; no top-level request-shape widening, publication widening, or persistence surface ships.

## Explicit non-shipped surfaces

Wave 5 Packets 1-3 do not ship:

- live authority resolution
- dual-control authority semantics
- emergency override
- negative-authority declarations
- negative-authority override REVOKE semantics
- top-level request-shape widening
- governance publication widening
- signal_tree widening
- event-side routing
- publisher widening
- civic-chain / ForensicChain writes
- UI or dashboard surfaces
- office-holder-name keyed logic
- Auth0 / OpenFGA runtime integration
- persistent graph storage
- background propagation scanning or storage-backed dependency discovery
