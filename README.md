# Meridian

Meridian is a governed city digital twin intelligence repo. Local `main` now contains the Wave 1 foundation, Wave 2 entity ontology extension, Wave 3 transport-only bridge substrate, Wave 4A bounded governance runtime lane, and Wave 4B bounded meeting-capture pipeline with a local/frozen handoff seam and frozen Fort Worth proof path. This repo is still not a runnable application.

## Agent Start Here

1. [CLAUDE.md](CLAUDE.md)
2. [REPO_INDEX.md](REPO_INDEX.md)
3. [docs/INDEX.md](docs/INDEX.md)

## Current Status

Wave 4B Block E shipped locally on `main`: frozen Fort Worth proof path and run-level capture receipt layered onto the Wave 4B capture pipeline.

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
- A single external runtime dependency surface in `package.json`: `nats`.

## What This Is Not

- Not a runnable application.
- Not live broker proof or production Constellation compatibility proof.
- Not general event-side governance routing or generalized publisher widening.
- Not authority-topology semantics, civic-chain writes, or civic ForensicChain runtime persistence.
- Not skins/dashboard UI runtime surfaces.
- Not a claim that Wave 4B handoff seam is full runtime/governance fabric completion.

## Repo Structure

```text
src/
  bridge/*.js
  config/constellation.js
  entities/*.js
  governance/
    runtime/*.js
    shadows.js
  pipeline/*.py
tests/
  bridge*.test.js
  governance*.test.js
  governance.pipelineHandoffProof.test.js
  pipeline/**/*.py
docs/
  INDEX.md
  ENGINE_INDEX.md
  WHERE_TO_CHANGE_X.md
  closeouts/*.md
  specs/*.md
```

## Deferred After Wave 4B

- Runtime-owned subject/entity binding and broader publication wiring beyond the frozen handoff seam.
- Generalized event routing and authority-topology semantics.
- Civic-chain and ForensicChain runtime writes.
- UI/dashboard surfaces.

## Upstream References

- Plugin repo: github.com/TDE6541/blue-collar-governance-plugin
- Ontology reference: MERIDIAN_ONTOLOGY_MASTER_CONVERGENCE.md
