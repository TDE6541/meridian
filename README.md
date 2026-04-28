# Meridian

Meridian is a governed city digital twin intelligence repo. The repo contains the Wave 1 foundation, Wave 2 entity ontology extension, Wave 3 transport-only bridge substrate, Wave 4A bounded governance runtime lane, Wave 4B bounded meeting-capture pipeline with a local/frozen handoff seam and frozen Fort Worth proof path, Wave 4.5 calibration truth lock, shipped Wave 5 authority-topology packets (Packet 1 entity/topology declaration, Packet 2 bounded authority evaluation projection, Packet 3 bounded REVOKE + projection-only propagation), shipped Wave 6 forensic-chain packets (Packet 1 bounded civic forensic chain + DI writer + demo JSON persistence, Packet 2 DI publisher + additive adapter publication seam), a Wave 7 civic skins lane (five bounded civic skins, deterministic public disclosure boundary, and five-skin structural integration proof), a Wave 8 corridor scenario integration lane (deterministic bridge replay, deterministic matching, single-state composition, resolution cascade replay, and runner verification over frozen scenario fixtures), a Wave 9 local dashboard proof under `dashboard/` that consumes committed Wave 8 scenario/cascade payload snapshots, a V2-A local/demo-day live civic nervous system extension, a V2-B/GARP Authority Runway local sublane, and a V2-B Foreman/Auth local proof cockpit. Meridian V1 is complete through Wave 9. Wave 9 is the final V1 wave, and there is no Wave 10 in V1. This repo is still not a production application; the dashboard is a local-only demo package with snapshot default, optional local Live Mode, dashboard-local Auth0 Universal Login role-session proof, local shared authority endpoint behavior, offline Foreman guide/explainer behavior, browser-native voice fallback, deterministic avatar state, OpenFGA deferred, payload-only notification preview, and prepared disclosure preview actions.

## Agent Start Here

1. [AGENTS.md](AGENTS.md)
2. [CLAUDE.md](CLAUDE.md)
3. [REPO_INDEX.md](REPO_INDEX.md)
4. [docs/INDEX.md](docs/INDEX.md)
5. [docs/specs/MERIDIAN_V1_FINAL_TRUTH.md](docs/specs/MERIDIAN_V1_FINAL_TRUTH.md)
6. [docs/closeouts/MERIDIAN_V1_MASTER_CLOSEOUT.md](docs/closeouts/MERIDIAN_V1_MASTER_CLOSEOUT.md)
7. [docs/specs/MERIDIAN_V2A_LIVE_CIVIC_NERVOUS_SYSTEM.md](docs/specs/MERIDIAN_V2A_LIVE_CIVIC_NERVOUS_SYSTEM.md)
8. [docs/closeouts/MERIDIAN_V2A_CLOSEOUT.md](docs/closeouts/MERIDIAN_V2A_CLOSEOUT.md)
9. [docs/specs/MERIDIAN_V2B_GARP_AUTHORITY_RUNWAY.md](docs/specs/MERIDIAN_V2B_GARP_AUTHORITY_RUNWAY.md)
10. [docs/closeouts/MERIDIAN_V2B_GARP_CLOSEOUT.md](docs/closeouts/MERIDIAN_V2B_GARP_CLOSEOUT.md)
11. [docs/specs/MERIDIAN_V2B_FOREMAN_GUIDED_PROOF_COCKPIT.md](docs/specs/MERIDIAN_V2B_FOREMAN_GUIDED_PROOF_COCKPIT.md)
12. [docs/closeouts/MERIDIAN_V2B_FOREMAN_PLATINUM_LOCAL_CLOSEOUT.md](docs/closeouts/MERIDIAN_V2B_FOREMAN_PLATINUM_LOCAL_CLOSEOUT.md)

## Current Status

Meridian V1 is complete through Wave 9. The final V1 implementation baseline commit is `3374d0f4ad7d410cdd37a765db8d473b36f92482` (`docs(dashboard): close wave9 local dashboard lane`). Wave 9 is the final V1 wave. There is no Wave 10 in V1.

Meridian V2-A is the local/demo-day extension now recorded by `docs/specs/MERIDIAN_V2A_LIVE_CIVIC_NERVOUS_SYSTEM.md` and `docs/closeouts/MERIDIAN_V2A_CLOSEOUT.md`. V2-A ships local live session records, local governance projection, JSON-only HoldPoint ingest, live-computed absence findings, optional dashboard Live Mode, local demo seed/corridor generation, and Constellation-compatible replay. V2-A does not ship production behavior, live city integration, legal certification, live broker proof, Auth0/OpenFGA integration, live Whisper/audio, or Foreman behavior.

Meridian V2-B/GARP Authority Runway is the local G1-G5 runway recorded by `docs/specs/MERIDIAN_V2B_GARP_AUTHORITY_RUNWAY.md` and `docs/closeouts/MERIDIAN_V2B_GARP_CLOSEOUT.md`. It ships dashboard-local Auth0 Universal Login role-session proof, deterministic authority resolution request/evaluation/store contracts, local authority lifecycle/action record behavior, the GARP authority cockpit, Foreman handoff context with `foreman_ready: false`, and prepared disclosure preview actions. It is the authority runway, not full Foreman, and does not ship OpenFGA behavior, prove Auth0 tenant connectivity, ship CIBA, deliver notifications, create a public portal, or claim legal/TPIA sufficiency or official Fort Worth workflow status.

Meridian V2-B Foreman/Auth local proof cockpit is recorded by `docs/specs/MERIDIAN_V2B_FOREMAN_GUIDED_PROOF_COCKPIT.md` and `docs/closeouts/MERIDIAN_V2B_FOREMAN_PLATINUM_LOCAL_CLOSEOUT.md`. It ships the dashboard-local guide/explainer layer through Foreman B1-B6 plus AUTH-1 through AUTH-4: deterministic Foreman context, offline source-bounded narration, authority-aware narration, guided event binding, Gold modes, browser-native speech output/input fallback, deterministic avatar state, dashboard-local Auth0 role-session mapping, and the shared local `/api/authority-requests` endpoint. Deployment proof, live Auth0 callback/login proof, mobile/judge device proof, and final V2-B closeout remain HOLD.

## V1 Final Truth

- V1 master closeout: `docs/closeouts/MERIDIAN_V1_MASTER_CLOSEOUT.md`
- V1 final truth spec: `docs/specs/MERIDIAN_V1_FINAL_TRUTH.md`
- Dashboard verification posture: `36` passing / `0` failing across `14` dashboard test files.
- Repo-wide JS verification posture: `511` passing / `0` failing.
- Remaining visual HOLDs: 1920x1080 and 1280x720 screenshot-level proof remain not screenshot-verified.
- Local dashboard command: `npm --prefix dashboard run dev`
- Local dashboard URL: `http://localhost:5173/`

## V2-A Local Demo-Day Extension

- V2-A spec: `docs/specs/MERIDIAN_V2A_LIVE_CIVIC_NERVOUS_SYSTEM.md`
- V2-A closeout: `docs/closeouts/MERIDIAN_V2A_CLOSEOUT.md`
- Shared V2-A local live contract family: `meridian.v2.liveSession.v1`, `meridian.v2.liveSessionRecord.v1`, `meridian.v2.liveFeedEvent.v1`, `meridian.v2.entityDelta.v1`, `meridian.v2.liveGovernanceEvaluation.v1`, `meridian.v2.dashboardLiveProjection.v1`, `meridian.v2.liveAbsenceFinding.v1`, `meridian.v2.citySeedManifest.v1`, and `meridian.v2.constellationReplay.v1`.
- Generated local live session state: `.meridian/live-sessions/` (ignored).
- Dashboard posture: snapshot mode remains default; Live Mode is optional/local and emits HOLD messaging when disconnected or invalid.
- Foreman posture: `foreman_hints`, `foreman_context_seed`, and the dashboard mount are preserved as inert seams only.
- V2-B gate: remains HOLD until Foreman concept source, Bronze prototype source, and V2-A green closeout evidence are supplied and inspected.

## V2-B/GARP Authority Runway

- GARP spec: `docs/specs/MERIDIAN_V2B_GARP_AUTHORITY_RUNWAY.md`
- GARP closeout: `docs/closeouts/MERIDIAN_V2B_GARP_CLOSEOUT.md`
- Literal contract strings: `meridian.v2.roleSessionProof.v1`, `meridian.v2.authorityResolutionRequest.v1`, `meridian.v2.authorityResolutionEvaluation.v1`, `meridian.v2.authorityRequestStore.v1`, `meridian.v2.authorityDashboardState.v1`, `meridian.v2.authorityTimelineView.v1`, `meridian.v2.disclosurePreviewReport.v1`, `meridian.v2.garpHandoffContext.v1`, and `meridian.v2.disclosurePreviewActionBundle.v1`.
- G3 lifecycle/token/notification/result behavior is a local GARP lifecycle/action record family where the repo does not contain additional literal `meridian.v2.*` contract strings.
- Dashboard posture: snapshot mode and Live Mode remain preserved; `step.skins.outputs` remains active; `step.skins.renders` remains absent; Director Mode and Absence Lens remain view-only overlays.
- Foreman posture: GARP is the authority runway, not full Foreman; the later B1-B6 cockpit supplies the dashboard-local guide/explainer layer.

## V2-B Foreman/Auth Local Proof Cockpit

- Foreman cockpit spec: `docs/specs/MERIDIAN_V2B_FOREMAN_GUIDED_PROOF_COCKPIT.md`
- Foreman local closeout: `docs/closeouts/MERIDIAN_V2B_FOREMAN_PLATINUM_LOCAL_CLOSEOUT.md`
- Dashboard-local Foreman strings: `meridian.v2.foremanGuideContext.v1`, `meridian.v2.foremanGuideResponse.v1`, `meridian.v2.foremanGuideSignal.v1`, and `meridian.v2.foremanGuideMode.v1`.
- Existing role-session string: `meridian.v2.roleSessionProof.v1`.
- Auth0 role namespace: `https://meridian.city/roles`.
- Shared local endpoint: `/api/authority-requests`.
- Event-compatible authority payloads: `AUTHORITY_RESOLUTION_REQUESTED`, `AUTHORITY_APPROVED`, and `AUTHORITY_DENIED`.
- Dashboard posture: Foreman is a guide/explainer layer over current dashboard-local context; it does not create governance, authority, legal, city, or deployment truth.
- Voice posture: browser-native speech output/input is optional and keeps typed fallback; there is no external voice service, Whisper/audio upload/transcription, MediaRecorder/getUserMedia path, model/API call, or browser-exposed model API key.
- Verification floor: dashboard suite `236` passing; repo-wide JS suite `717/717` passing.
- Migration posture: no B7 `MIGRATIONS.md` row required because the B1-B6 Foreman guide strings are dashboard-local and do not widen root/shared runtime contracts; `meridian.v2.roleSessionProof.v1` is already covered by the V2-B/GARP row.
- Remaining HOLDs: deployed Vercel URL proof, Auth0 deployed callback/login proof, mobile/judge device proof, deployment smoke proof, AUTH-5, and final V2-B closeout.

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
- A V2-A local/demo-day live civic nervous system extension under `src/live/**`, `scripts/run-live-governance.js`, `scripts/replay-constellation-stream.js`, and dashboard-local Live Mode surfaces with:
  - local hash-linked live session persistence under `.meridian/live-sessions/`
  - local live governance evaluation and dashboard projection
  - JSON-only HoldPoint artifact ingest
  - live-computed absence findings distinct from the Wave 9 snapshot Absence Lens
  - source-manifested local demo Fort Worth seed data and parameterized corridor generation
  - Constellation-compatible replay with structured HOLD for missing live broker proof
  - inert Foreman seams only
- A V2-B/GARP Authority Runway local sublane with:
  - dashboard-local Auth0 Universal Login role-session proof and public fallback
  - deterministic local authority request/evaluation/store behavior
  - local action-token, payload-only notification builder, and authority lifecycle handling
  - dashboard-local authority cockpit and timeline
  - Foreman handoff context with `foreman_ready: false`
  - prepared disclosure preview actions only
- A V2-B Foreman/Auth local proof cockpit under `dashboard/` with:
  - deterministic Foreman guide context and offline source-bounded narration
  - authority-aware narration over GARP role/session, handoff, disclosure, and shared authority state
  - guided event binding, registry-bounded spatial awareness, and visual-only panel highlighting
  - Walk, Absence, Challenge, Public, and Judge modes
  - browser-native speech output/input fallback and deterministic avatar state
  - dashboard-local deploy-prep docs for Tim's later manual Vercel/Auth0 proof lane
- A single external runtime dependency surface in `package.json`: `nats`.

## What This Is Not

- Not a production application.
- Not a Wave 10 plan; no Wave 10 exists in V1.
- Not a hosted dashboard; Wave 9 and the B7 Foreman/Auth cockpit are local/pre-deployment dashboard proof surfaces.
- Not live broker proof or production Constellation compatibility proof.
- Not general event-side governance routing or generalized publisher widening.
- Not live/networked authority services, DB-backed forensic persistence, or legal/tamper-proof immutability guarantees.
- Not live broker proof for forensic publication; Wave 6 publication behavior remains synthetic/local seam proof.
- Not a public portal.
- Not production-auth integrated.
- Not a legal workflow.
- Not LLM-driven redaction.
- Not meeting-capture-to-skin routing.
- Not forensic-entry-to-skin routing.
- Not governance-truth computation inside skins.
- Not a claim that Wave 4B handoff seam is full runtime/governance fabric completion.
- Not multi-corridor routing in one scenario run.
- Not a persistent match-result store.
- Not a chain replay engine.
- Not live Auth0/OpenFGA wiring.
- Not live OpenFGA behavior; OpenFGA remains deferred.
- Not Auth0 tenant connectivity proof.
- Not CIBA.
- Not delivered notifications, live browser push, live email sending, or service worker behavior.
- Not clipboard write, browser download trigger, print trigger, or PDF generation from disclosure preview actions.
- Not live Whisper/audio ingestion.
- Not real TPIA legal sufficiency or TRAIGA 2.0 compliance claims.
- Not new governance computation inside the dashboard.
- Not live Fort Worth city integration.
- Not full Accela/GIS automation.
- Not live Constellation broker proof.
- Not model-backed Foreman behavior, Foreman API, model call, external voice service, Whisper/audio upload/transcription, or autonomous Foreman action.
- Not final V2-B deployed/demo closeout.

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
  live/**/*.js
tests/
  bridge*.test.js
  bridge.chainPublisher.test.js
  integration/*.test.js
  live/*.test.js
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
  run-live-governance.js
  replay-constellation-stream.js
dashboard/
  public/scenarios/*.json
  src/auth/**/*.ts*
  src/roleSession/**/*.ts
  src/authority/**/*.ts
  src/live/**/*.ts
  src/foremanGuide/**/*.tsx
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

## V2 Boundary / Deferred Beyond V2-A

V2-A is the bounded local/demo-day V2 extension recorded in this repo. V2-B/GARP Authority Runway is the local authority runway. V2-B Foreman/Auth local proof cockpit is the dashboard-local guide/explainer layer and remains pre-deployment. Final deployed/demo proof remains gated on Tim manual Vercel/Auth0 setup and AUTH-5 deployed URL/callback proof.

- Runtime-owned subject/entity binding and broader publication wiring beyond the frozen handoff seam.
- Generalized event routing and authority-topology widening beyond the bounded lanes.
- Forensic-chain widening beyond top-level governance/authority evidence entries, including meeting/permit/inspection/obligation capture types.
- DB-backed forensic persistence, cryptographic hash-linking, and legal immutability posture.
- Meeting-capture-to-skin and forensic-entry-to-skin routing.
- Governance-truth computation inside skins.
- Dashboard deployment/hosting/live integration beyond the local/pre-deployment proof cockpit.
- OpenFGA behavior, Auth0 deployed callback/login proof, CIBA, delivered notifications, public portal behavior, legal/TPIA sufficiency, and official disclosure workflow remain unshipped.
- Multi-corridor routing in one scenario run.
- Persistent match-result storage.
- Chain replay engine.
- Foreman behavior beyond the shipped dashboard-local guide/explainer cockpit remains gated on a later approved envelope and proof.

## Upstream References

- Plugin repo: github.com/TDE6541/blue-collar-governance-plugin
- Ontology reference: `docs/specs/ENTITY_ONTOLOGY.md`
