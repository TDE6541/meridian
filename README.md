# Meridian

Meridian is a governed city digital twin intelligence repo. The repo contains the Wave 1 foundation, Wave 2 entity ontology extension, Wave 3 transport-only bridge substrate, Wave 4A bounded governance runtime lane, Wave 4B bounded meeting-capture pipeline with a local/frozen handoff seam and frozen Fort Worth proof path, Wave 4.5 calibration truth lock, shipped Wave 5 authority-topology packets (Packet 1 entity/topology declaration, Packet 2 bounded authority evaluation projection, Packet 3 bounded REVOKE + projection-only propagation), shipped Wave 6 forensic-chain packets (Packet 1 bounded civic forensic chain + DI writer + demo JSON persistence, Packet 2 DI publisher + additive adapter publication seam), a Wave 7 civic skins lane (five bounded civic skins, deterministic public disclosure boundary, and five-skin structural integration proof), a Wave 8 corridor scenario integration lane (deterministic bridge replay, deterministic matching, single-state composition, resolution cascade replay, and runner verification over frozen scenario fixtures), and a Wave 9 local dashboard proof under `dashboard/` that consumes committed Wave 8 scenario/cascade payload snapshots. Meridian V1 is complete through Wave 9. Wave 9 is the final V1 wave, and there is no Wave 10 in V1. This repo is still not a production application; the dashboard is a local-only demo package.

## Agent Start Here

1. [AGENTS.md](AGENTS.md)
2. [CLAUDE.md](CLAUDE.md)
3. [REPO_INDEX.md](REPO_INDEX.md)
4. [docs/INDEX.md](docs/INDEX.md)
5. [docs/specs/MERIDIAN_V1_FINAL_TRUTH.md](docs/specs/MERIDIAN_V1_FINAL_TRUTH.md)
6. [docs/closeouts/MERIDIAN_V1_MASTER_CLOSEOUT.md](docs/closeouts/MERIDIAN_V1_MASTER_CLOSEOUT.md)

## Current Status

Meridian V1 is complete through Wave 9. The final V1 implementation baseline commit is `3374d0f4ad7d410cdd37a765db8d473b36f92482` (`docs(dashboard): close wave9 local dashboard lane`). Wave 9 is the final V1 wave. There is no Wave 10 in V1. Future expansion begins as Meridian V2 only under a new approved envelope.

## V1 Final Truth

- V1 master closeout: `docs/closeouts/MERIDIAN_V1_MASTER_CLOSEOUT.md`
- V1 final truth spec: `docs/specs/MERIDIAN_V1_FINAL_TRUTH.md`
- Dashboard verification posture: `36` passing / `0` failing across `14` dashboard test files.
- Repo-wide JS verification posture: `511` passing / `0` failing.
- Remaining visual HOLDs: 1920x1080 and 1280x720 screenshot-level proof remain not screenshot-verified.
- Local dashboard command: `npm --prefix dashboard run dev`
- Local dashboard URL: `http://localhost:5173/`

## What This Is

- A Meridian-native governed execution substrate.
- A Wave 1 and Wave 2 schema/entity surface plus a Wave 3 transport-only bridge under `src/bridge/`.
- A bounded Wave 4A governance runtime lane under `src/governance/runtime/` for synthetic `command_request` evaluation only.
- A bounded Wave 4B meeting-capture lane under `src/pipeline/` with:
  - transcript normalization and hashing
  - OpenAI-only transcription posture
  - timestamp-aware and plain-text civic segmentation
  - three-run extraction ensemble plus merge confidence backbone
  - narrow fallback cue scan
  - translation seam that emits a durable capture artifact and a reduced local/frozen governance handoff payload
  - run-level frozen proof manifest and capture receipt utilities
- A frozen Fort Worth proof lane in `tests/pipeline/fixtures/fort_worth_proof/`, `tests/pipeline/test_end_to_end_proof.py`, and `tests/governance.pipelineHandoffProof.test.js` that keeps the official agenda pair as primary verbatim source and motion-video pair as supplemental context only.
- A Wave 4.5 calibration truth lane under `tests/pipeline/calibration/` with:
  - historical baseline truth and pre-Block-C comparison source artifacts under `tests/pipeline/calibration/baselines/`
  - current calibrated truth artifact family under `tests/pipeline/calibration/final/`
  - wave-level truth docs at `docs/specs/WAVE4_5_CALIBRATION.md` and `docs/closeouts/WAVE4_5_CLOSEOUT.md`
- A Wave 5 authority-topology lane under `src/governance/runtime/` with:
  - static Fort Worth authority-topology declaration pack keyed to stable IDs
  - bounded domain-side and actor-side authority evaluation over explicit `authority_context` input
  - additive `runtimeSubset.civic.authority_resolution` runtime projection
  - bounded REVOKE activation for `authority_revoked_mid_action`, `permit_superseded_by_overlap`, and `cross_jurisdiction_resolved_against_requester`
  - additive `runtimeSubset.civic.revocation` runtime projection
  - projection-only, read-only propagation under optional nested `authority_context.propagation_context`
- A Wave 6 forensic-chain lane under `src/governance/forensic/` plus additive adapter seam in `src/bridge/governanceTransportAdapter.js` with:
  - bounded civic forensic entry vocabulary (`GOVERNANCE_DECISION`, `AUTHORITY_EVALUATION`) and explicit deferred type rejection for meeting/permit/inspection/obligation forensic entries
  - DI-only `GovernanceChainWriter` and `ChainPersistence` with demo JSON persistence under `.meridian/forensic-chain/`
  - DI-only `ChainPublisher` that reuses the existing `constellation.evidence.*` subject family and appends forensic receipts through existing `publications` only
- A Wave 7 civic skins rendering lane under `src/skins/` with:
  - five bounded skins (`civic.permitting`, `civic.council`, `civic.operations`, `civic.dispatch`, `civic.public`)
  - deterministic public disclosure boundary in `src/skins/redaction.js`
  - five-skin structural integration proof at `tests/skins.integration.test.js`
  - framework public guard retained for framework consumers (`renderDefaultSkin` continues to reserve public rendering)
- A Wave 8 corridor scenario integration lane under `src/integration/` plus `scripts/run-corridor-scenario.js` with:
  - additive integration-layer contracts (`wave8.pipelineBridgeOutput.v1`, `wave8.matchResult.v1`, `wave8.scenarioResult.v1`, `wave8.cascadeResult.v1`)
  - deterministic replay mode and structured live missing-env HOLD posture
  - single-state composition plus multi-step cascade over frozen fixture sets (`routine`, `contested`, `emergency`)
  - runner report contract (`wave8.packet5.runnerReport.v1`) local to the runner script
  - integration proof at `tests/integration/*.test.js` and frozen scenario fixtures under `tests/fixtures/scenarios/**`
- A Wave 9 local dashboard proof under `dashboard/` with:
  - committed Wave 8 runner payload snapshots under `dashboard/public/scenarios/*.json`
  - local Vite/React/TypeScript control-room shell
  - actual skin payload consumption from `step.skins.outputs`
  - forensic, relationship, and cascade choreography views over committed snapshots
  - Director Mode / Absence Lens as view-only overlays over source-bounded payload truth
  - local demo command `npm --prefix dashboard run dev` at `http://localhost:5173/`
- A single external runtime dependency surface in `package.json`: `nats`.

## What This Is Not

- Not a production application.
- Not a Wave 10 plan; no Wave 10 exists in V1.
- Not a hosted dashboard; Wave 9 is a local-only dashboard proof.
- Not live broker proof or production Constellation compatibility proof.
- Not general event-side governance routing or generalized publisher widening.
- Not live/networked authority services, DB-backed forensic persistence, or legal/tamper-proof immutability guarantees.
- Not live broker proof for forensic publication; Wave 6 publication behavior remains synthetic/local seam proof.
- Not a public portal.
- Not auth-integrated.
- Not a legal compliance workflow.
- Not LLM-driven redaction.
- Not meeting-capture-to-skin routing.
- Not forensic-entry-to-skin routing.
- Not governance-truth computation inside skins.
- Not a claim that Wave 4B handoff seam is full runtime/governance fabric completion.
- Not multi-corridor routing in one scenario run.
- Not a persistent match-result store.
- Not a chain replay engine.
- Not live Auth0/OpenFGA wiring.
- Not live Whisper/audio ingestion.
- Not real TPIA legal sufficiency or TRAIGA 2.0 compliance claims.
- Not new governance computation inside the dashboard.

## Repo Structure

```text
src/
  bridge/*.js
  config/constellation.js
  entities/*.js
  governance/
    forensic/*.js
    runtime/*.js
    shadows.js
  integration/*.js
  pipeline/*.py
  skins/**/*.js
tests/
  bridge*.test.js
  bridge.chainPublisher.test.js
  integration/*.test.js
  governance*.test.js
  governance.forensic*.test.js
  governance.chainWriter.test.js
  governance.chainPersistence.test.js
  governance.pipelineHandoffProof.test.js
  governance.authority*.test.js
  governance.revoke.test.js
  skins*.test.js
  fixtures/scenarios/**/*
  pipeline/**/*.py
scripts/
  run-corridor-scenario.js
dashboard/
  public/scenarios/*.json
  src/**/*.ts*
  tests/**/*.ts*
  README.md
docs/
  INDEX.md
  ENGINE_INDEX.md
  WHERE_TO_CHANGE_X.md
  closeouts/*.md
  specs/*.md
```

## V2 Boundary / Deferred Beyond V1

Future work starts as Meridian V2 only after a new approved envelope. This list is not a V2 plan.

- Runtime-owned subject/entity binding and broader publication wiring beyond the frozen handoff seam.
- Generalized event routing and authority-topology widening beyond the bounded lanes.
- Forensic-chain widening beyond top-level governance/authority evidence entries, including meeting/permit/inspection/obligation capture types.
- DB-backed forensic persistence, cryptographic hash-linking, and legal immutability posture.
- Meeting-capture-to-skin and forensic-entry-to-skin routing.
- Governance-truth computation inside skins.
- Dashboard deployment/hosting/auth/live integration beyond the local Wave 9 proof.
- Multi-corridor routing in one scenario run.
- Persistent match-result storage.
- Chain replay engine.

## Upstream References

- Plugin repo: github.com/TDE6541/blue-collar-governance-plugin
- Ontology reference: `docs/specs/ENTITY_ONTOLOGY.md`
