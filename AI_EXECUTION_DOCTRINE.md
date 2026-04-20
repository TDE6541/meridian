# Meridian AI Execution Doctrine

## Document Hierarchy

1. Approved session input
2. `CLAUDE.md`
3. `TEAM_CHARTER.md`
4. `AI_EXECUTION_DOCTRINE.md`
5. `README.md`
6. `CONTRIBUTING.md`
7. `MIGRATIONS.md`

## Repo Map

```text
LICENSE
README.md
REPO_INDEX.md
AGENTS.md
CLAUDE.md
TEAM_CHARTER.md
AI_EXECUTION_DOCTRINE.md
CONTRIBUTING.md
MIGRATIONS.md
package.json
package-lock.json
.gitignore
src/
  bridge/*.js
  config/constellation.js
  entities/*.js
  governance/forensic/*.js
  governance/runtime/*.js
  governance/shadows.js
  pipeline/*.py
tests/
  bridge.chainPublisher.test.js
  bridge*.test.js
  config.test.js
  deny-patterns.test.js
  entities.test.js
  governance.chainPersistence.test.js
  governance.chainWriter.test.js
  governance.demoProof.test.js
  governance.forensicChain.test.js
  governance.forensicIntegration.test.js
  governance.pipelineHandoffProof.test.js
  governance.policyPack.test.js
  governance.promiseConfidence.test.js
  governance.authorityTopology.test.js
  governance.authorityDomain.test.js
  governance.authorityActor.test.js
  governance.revoke.test.js
  governance.authorityPropagation.test.js
  governance.runtime.test.js
  governance.runtimeSubset.test.js
  governance.sweep.test.js
  pipeline/*.py
  pipeline/calibration/*.py
  pipeline/calibration/**/*.json
  pipeline/fixtures/*
  fixtures/governance/*.json
  fixtures/nats/*.json
docs/
  INDEX.md
  ENGINE_INDEX.md
  UI_INDEX.md
  WHERE_TO_CHANGE_X.md
  closeouts/README.md
  closeouts/WAVE1_CLOSEOUT.md
  closeouts/WAVE2_CLOSEOUT.md
  closeouts/WAVE3_CLOSEOUT.md
  closeouts/WAVE4A_CLOSEOUT.md
  closeouts/WAVE4A_BLOCK_A_CLOSEOUT.md
  closeouts/WAVE4A_BLOCK_B_CLOSEOUT.md
  closeouts/WAVE4A_BLOCK_C_CLOSEOUT.md
  closeouts/WAVE4A_BLOCK_D_CLOSEOUT.md
  closeouts/WAVE4A_BLOCK_E_CLOSEOUT.md
  closeouts/WAVE4B_CLOSEOUT.md
  closeouts/WAVE4_5_CLOSEOUT.md
  closeouts/WAVE5_CLOSEOUT.md
  closeouts/WAVE6_CLOSEOUT.md
  specs/ENTITY_ONTOLOGY.md
  specs/NATS_EVENT_COMMAND_TRANSLATION.md
  specs/WAVE4A_GOVERNANCE_RUNTIME.md
  specs/WAVE4B_MEETING_CAPTURE_PIPELINE.md
  specs/WAVE4_5_CALIBRATION.md
  specs/WAVE5_AUTHORITY_TOPOLOGY.md
  specs/WAVE6_FORENSICCHAIN_CIVIC.md
  specs/WAVE3_NATS_BRIDGE.md
scripts/
  synthetic-constellation.js
```

## Operating Rules

- Work from evidence that exists in the repo or approved session input.
- Keep scope locked to the approved block.
- Preserve canon alignment across root documents.
- Treat upstream references as references unless their contents are available in this repo.
- Surface uncertainty as HOLD.
- Describe Wave 3 only as a transport-only bridge and fail-closed governance stub.
- Describe Wave 4A Blocks A-E only as bounded `command_request` runtime activation, the static local policy pack, runtime subset integration, Block D civic interpretation output, and Block E read-only on-demand sweep/demo proof, not as periodic worker logic, event-side routing, publisher widening, or full governance runtime completion.
- Describe Wave 4B Blocks A-E only as bounded meeting-capture pipeline, translation seam, frozen proof path, and run-level receipt utilities, not as generalized runtime/event routing/publication widening completion.
- Describe Wave 4.5 only as calibration truth lock surfaces (frozen corpus, historical baseline truth/pre-Block-C comparison artifacts, final replay artifact family, and wave-level spec/closeout), not as structure reopening or runtime widening.
- Describe Wave 5 only as bounded local authority-topology surfaces (additive entity validator widening, static Fort Worth topology declaration, bounded domain/actor evaluation, bounded REVOKE activation, additive runtimeSubset projections, and projection-only read-only propagation), not as hosted authority integration, persistent graph topology service, event-side routing, publisher widening, scheduler behavior, or civic-chain writes.
- Describe Wave 6 only as bounded local forensic-chain surfaces (narrow civic entry vocabulary, DI-only writer/publisher seams, demo JSON persistence, and additive post-evaluation synthetic evidence publication over existing subject families), not as live broker proof, legal/tamper-proof immutability, meeting/permit/inspection/obligation forensic recording, DB persistence, or per-helper chain fan-out.

## Planning Gate

- Confirm the repo perimeter before editing.
- Name the exact files and directories to touch.
- State the verification path before execution.
- Stop for approval when the session requires a gated plan.

## Execution Rules

- Change only the approved surfaces.
- Keep prose plain and direct.
- Do not invent runtime behavior, ontology detail, or dependency detail.
- Do not add adjacent improvements.
- Do not widen Wave 3 into actor-level authority or mutation behavior.
- Do not widen Wave 4B into generalized authority-topology semantics, event routing, publisher widening, or civic-chain runtime writes.
- Do not overstate local/uncommitted Wave 5 substrate as merged/pushed ship state.
- Do not overstate local/uncommitted Wave 6 substrate as merged/pushed ship state.
- Stop if repo truth conflicts with the approved task.

## Verification Rules

- Inspect the resulting repo tree.
- Confirm root canon matches actual filesystem truth.
- Confirm blocked surfaces remain untouched.
- Confirm required placeholders exist only where approved.
- Confirm no extra files entered the repo.
- Confirm the two reference files remain unstaged.

## Contract And Migration Rules

- Root canon is a contract surface and must stay synchronized.
- Bridge-local contracts do not widen the persistent Wave 2 entity contract.
- Wave 4A Blocks A-E do not widen `GovernanceEvaluationRequest`, `GovernancePublication`, or `signal_tree`.
- Wave 4B does not widen JS runtime or bridge contract shapes; it adds bounded Python capture/handoff artifacts only.
- Wave 4.5 does not widen runtime contracts; it locks calibration evidence/reporting truth only.
- Wave 5 does not widen top-level `GovernanceEvaluationRequest`, `GovernancePublication`, or typed `signal_tree`; it adds bounded runtime-only authority/revocation projections and optional nested propagation input.
- Wave 6 does not widen top-level `GovernanceEvaluationRequest`, `GovernancePublication`, bridge envelope families, or evaluator/runtime helper contracts; it adds bounded forensic-chain substrate and additive publication receipts through existing `publications`.
- Migration records are append-only after real changes require them.
- If a future task changes structure, update every affected canon surface in the same session.

## HOLD Format

```text
HOLD
- Trigger:
- Evidence:
- Why blocked:
- Needed to unblock:
```

## Closeout Format

```text
Changes made
Acceptance criteria status
Remaining HOLDs
Contract / migration status
Blast radius
Exact files touched
Signoff status
```
