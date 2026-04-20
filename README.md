# Meridian

Meridian is a governed city digital twin intelligence repo. `main` now contains the Wave 1 foundation, Wave 2 entity ontology extension, Wave 3 transport-only bridge substrate, Wave 4A bounded governance runtime lane, Wave 4B bounded meeting-capture pipeline with a local/frozen handoff seam and frozen Fort Worth proof path, Wave 4.5 calibration truth lock, shipped Wave 5 authority-topology packets (Packet 1 entity/topology declaration, Packet 2 bounded authority evaluation projection, Packet 3 bounded REVOKE + projection-only propagation), and shipped Wave 6 forensic-chain packets (Packet 1 bounded civic forensic chain + DI writer + demo JSON persistence, Packet 2 DI publisher + additive adapter publication seam). This repo is still not a runnable application.

## Agent Start Here

1. [AGENTS.md](AGENTS.md)
2. [CLAUDE.md](CLAUDE.md)
3. [REPO_INDEX.md](REPO_INDEX.md)
4. [docs/INDEX.md](docs/INDEX.md)

## Current Status

Wave 5 Packets 1-3 and Wave 6 Packets 1-2 are committed on `main` and aligned with `origin/main`.

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
- A single external runtime dependency surface in `package.json`: `nats`.

## What This Is Not

- Not a runnable application.
- Not live broker proof or production Constellation compatibility proof.
- Not general event-side governance routing or generalized publisher widening.
- Not live/networked authority services, DB-backed forensic persistence, or legal/tamper-proof immutability guarantees.
- Not live broker proof for forensic publication; Wave 6 publication behavior remains synthetic/local seam proof.
- Not skins/dashboard UI runtime surfaces.
- Not a claim that Wave 4B handoff seam is full runtime/governance fabric completion.

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
  pipeline/*.py
tests/
  bridge*.test.js
  bridge.chainPublisher.test.js
  governance*.test.js
  governance.forensic*.test.js
  governance.chainWriter.test.js
  governance.chainPersistence.test.js
  governance.pipelineHandoffProof.test.js
  governance.authority*.test.js
  governance.revoke.test.js
  pipeline/**/*.py
docs/
  INDEX.md
  ENGINE_INDEX.md
  WHERE_TO_CHANGE_X.md
  closeouts/*.md
  specs/*.md
```

## Deferred After Wave 6

- Runtime-owned subject/entity binding and broader publication wiring beyond the frozen handoff seam.
- Generalized event routing and authority-topology widening beyond the bounded lanes.
- Forensic-chain widening beyond top-level governance/authority evidence entries, including meeting/permit/inspection/obligation capture types.
- DB-backed forensic persistence, cryptographic hash-linking, and legal immutability posture.
- UI/dashboard surfaces.

## Upstream References

- Plugin repo: github.com/TDE6541/blue-collar-governance-plugin
- Ontology reference: `docs/specs/ENTITY_ONTOLOGY.md`
