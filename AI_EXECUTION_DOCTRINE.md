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
  skins/**/*.js
  live/**/*.js
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
  skins*.test.js
  live/*.test.js
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
  closeouts/WAVE7_CLOSEOUT.md
  closeouts/WAVE8_CLOSEOUT.md
  closeouts/WAVE9_CLOSEOUT.md
  closeouts/MERIDIAN_V1_MASTER_CLOSEOUT.md
  closeouts/MERIDIAN_V2A_CLOSEOUT.md
  closeouts/MERIDIAN_V2B_GARP_CLOSEOUT.md
  closeouts/MERIDIAN_V2B_FOREMAN_PLATINUM_LOCAL_CLOSEOUT.md
  closeouts/MERIDIAN_V2B_AUTH5_DEPLOYED_PROOF_CLOSEOUT.md
  closeouts/MERIDIAN_V2B_DEMO_UI_CLARITY_CLOSEOUT.md
  closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md
  specs/ENTITY_ONTOLOGY.md
  specs/MERIDIAN_V1_FINAL_TRUTH.md
  specs/MERIDIAN_V2A_LIVE_CIVIC_NERVOUS_SYSTEM.md
  specs/MERIDIAN_V2B_GARP_AUTHORITY_RUNWAY.md
  specs/MERIDIAN_V2B_FOREMAN_GUIDED_PROOF_COCKPIT.md
  specs/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER.md
  specs/NATS_EVENT_COMMAND_TRANSLATION.md
  specs/WAVE4A_GOVERNANCE_RUNTIME.md
  specs/WAVE4B_MEETING_CAPTURE_PIPELINE.md
  specs/WAVE4_5_CALIBRATION.md
  specs/WAVE5_AUTHORITY_TOPOLOGY.md
  specs/WAVE6_FORENSICCHAIN_CIVIC.md
  specs/WAVE7_CIVIC_SKINS.md
  specs/WAVE8_CORRIDOR_SCENARIO.md
  specs/WAVE9_DASHBOARD.md
  specs/WAVE3_NATS_BRIDGE.md
scripts/
  synthetic-constellation.js
  run-corridor-scenario.js
  run-live-governance.js
  replay-constellation-stream.js
dashboard/
  README.md
  api/authority-requests.js
  package.json
  index.html
  public/audio/foreman/README.md
  public/demo/print-instructions.md
  public/demo/reliability-runbook.md
  public/scenarios/*.json
  src/live/**/*.ts
  src/foremanGuide/**/*.tsx
  src/**/*.ts*
  tests/**/*.ts*
```

## Operating Rules

- Work from evidence that exists in the repo or approved session input.
- Treat Meridian V1 as complete through Wave 9.
- Treat Wave 9 as the final V1 wave.
- Do not create or describe Wave 10 as active V1 scope; there is no Wave 10 in V1.
- Treat V2-A as a local/demo-day Meridian V2 extension with truth surfaces in `docs/specs/MERIDIAN_V2A_LIVE_CIVIC_NERVOUS_SYSTEM.md` and `docs/closeouts/MERIDIAN_V2A_CLOSEOUT.md`.
- Treat V2-B/GARP Authority Runway as a local G1-G5 sublane only.
- Treat V2-B Foreman/Auth local proof cockpit as local/pre-deployment guide/explainer truth, with AUTH-5 deployed Vercel/Auth0 demo proof recorded separately.
- Treat mobile/judge device proof, full authority choreography proof, clean logout proof, deploy hook cleanup proof, and final V2-B closeout as HOLD until Tim supplies proof.
- Treat V2-C Demo Presentation Layer as dashboard-local presentation/choreography/reliability truth recorded in `docs/specs/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER.md` and `docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md`; DEMO-1 through DEMO-10 are implementation-complete.
- Treat V2-B Demo UI Clarity as presenter hierarchy truth recorded in `docs/closeouts/MERIDIAN_V2B_DEMO_UI_CLARITY_CLOSEOUT.md`; dashboard `285/285` and repo-wide JS `719/719` are the current floor, and eval warm-tabs, phone smoke, full authority choreography screenshots, Walk-mode MP4 proof, clean logout proof, deploy-hook cleanup proof, screenshot-level visual proof, and final V2-B closeout remain HOLD.
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
- Describe Wave 7 only as rendering-only civic skins surfaces (five bounded skins, deterministic public disclosure boundary, and five-skin structural integration proof), not as dashboard/UI runtime, public portal behavior, legal workflow, LLM-driven redaction, meeting-capture-to-skin routing, forensic-entry-to-skin routing, or governance-truth computation inside skins.
- Describe Wave 8 only as bounded corridor scenario integration surfaces, not as dashboard/UI runtime, deployment/hosting, live broker proof, live Auth0/OpenFGA wiring, live Whisper/audio ingestion, legal sufficiency, TRAIGA compliance, persistent match-result storage, chain replay engine, or multi-corridor routing in one run.
- Describe Wave 9 only as a local dashboard proof over committed snapshots, not as production application behavior, hosted deployment, auth, live broker proof, live network dependency, public portal behavior, new governance computation, legal sufficiency, TPIA compliance, TRAIGA compliance, official disclosure approval, or real city runtime behavior.
- Describe Meridian V1 only as completed local/proof infrastructure, not as a deployed production city system or legal certification.
- Describe V2-A only as local/demo-day live session, gateway/projection, JSON-only HoldPoint adapter, live absence, optional local Live Mode, local seed/corridor, and replay surfaces. Do not describe V2-A as production behavior, live Fort Worth city integration, full Accela/GIS automation, live Constellation broker proof, live Auth0/OpenFGA integration, live Whisper/audio ingestion, legal certification, dashboard-side truth computation, Foreman behavior, or V2-B behavior.
- Describe V2-B/GARP only as local Authority Runway surfaces: dashboard-local Auth0 Universal Login role-session proof, deterministic local authority request/evaluation/store contracts, local lifecycle/action record behavior, dashboard authority cockpit, payload-only notification builder, Foreman handoff context with `foreman_ready: false`, and prepared disclosure preview actions. Do not describe it as full V2-B Foreman closure, Foreman behavior, production auth, live OpenFGA behavior, CIBA, delivered notifications, public portal behavior, legal/TPIA sufficiency, official Fort Worth workflow, ForensicChain vocabulary widening, or LiveFeedEvent kind widening.
- Describe V2-B Foreman/Auth as local/pre-deployment dashboard proof cockpit behavior plus AUTH-5 deployed demo proof only: deterministic guide context, offline source-bounded narration, authority-aware narration, guided event binding, Gold modes, browser-native voice fallback, deterministic avatar state, dashboard-local Auth0 role-session mapping, shared local `/api/authority-requests` endpoint behavior, stable Vercel demo URL, Auth0 hosted login/callback return, and two eval-role session mappings. Do not describe it as production-ready, live-city integrated, legally sufficient, public-portal backed, OpenFGA-backed, CIBA-backed, notification-sending, model/API-backed, externally voice-serviced, Whisper/audio-upload backed, or final V2-B closeout.
- Describe V2-C only as dashboard-local presentation/choreography/reliability over existing proof: Mission presentation skin, Mission Rail, Fictional Demo Permit #4471, HOLD Wall, Absence Lens presentation overlay, Decision Counter, Demo Audit Wall, Foreman audio identity, Disclosure Receipt, Doctrine Card, reliability panel/runbook/checklists, SyncPill, approval pulse, and vibration fallback. Describe V2-B Demo UI Clarity only as presenter hierarchy over existing dashboard proof: Presenter Cockpit default, compact demo anchor, current decision/HOLD focal card, six-stage process rail, grouped proof tools, secondary decision summary, and compact safety card. Do not describe either as runtime behavior, shared contract widening, protected-surface widening, production city behavior, legal/TPIA/TRAIGA sufficiency, official Fort Worth workflow, public portal behavior, live OpenFGA, CIBA, delivered notifications, model/API-backed Foreman, external voice service, Whisper/audio upload/transcription, or manual proof completion.

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
- Do not overstate Wave 7 rendering surfaces as runtime/bridge/pipeline/entity/forensic/config/package widening.
- Do not overstate Wave 9 local dashboard proof as hosted, auth-wired, live-networked, or legally sufficient behavior.
- Do not describe a Wave 10 as part of V1.
- Do not overstate V2-A local/demo-day surfaces as deployed, official, legally certified, live-broker-backed, auth-wired, audio-backed, Foreman-enabled, or V2-B behavior.
- Do not overstate V2-B/GARP local runway surfaces as Foreman-enabled, production, legally sufficient, OpenFGA-backed, CIBA-backed, notification-delivering, or official city workflow behavior.
- Do not overstate V2-B Foreman/Auth proof cockpit surfaces as production, legally sufficient, OpenFGA-backed, CIBA-backed, notification-sending, model-backed, external-voice-backed, or official city workflow behavior; AUTH-5 deployed proof is bounded to demo URL/login/callback/role-session evidence.
- Do not overstate V2-C or V2-B Demo UI Clarity presentation surfaces as new governance, authority, forensic, absence, skin, city, legal, auth, deploy, or production truth.
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
- Wave 7 does not widen top-level governance/bridge/pipeline/forensic/entity/config/package contracts; it adds rendering-only skins-local contracts and proof surfaces under `src/skins/**` and `tests/skins*.test.js`.
- Wave 8 adds integration-local contracts only under `src/integration/**` plus runner-local report output in `scripts/run-corridor-scenario.js`.
- Wave 9 adds dashboard-local package and committed snapshot consumption only; it does not widen root runtime, governance, bridge, pipeline, forensic, skin, entity, config, or package contracts.
- V1 closure docs do not change shared contracts; they route to final V1 truth and carry remaining HOLDs.
- V2-A adds a shared local live contract family recorded in `MIGRATIONS.md` and keeps adapter-local `holdpointArtifactJson.v1` plus dashboard-local TypeScript mirrors out of shared contract source unless a later approved packet promotes them.
- V2-A does not widen V1 contracts, Wave 6 forensic-chain contracts, `BridgeEnvelope`, `GovernancePublication`, NATS, package dependencies, auth/config/security surfaces, or legal/live-system claims.
- V2-B/GARP adds a local authority contract family recorded in `MIGRATIONS.md`; literal contract strings must only be claimed when present in source.
- V2-B/GARP does not widen V1 contracts, V2-A contracts, LiveFeedEvent kinds, ForensicChain vocabulary, root package dependencies, OpenFGA behavior, production auth posture, delivered notifications, public portal behavior, or legal/TPIA claims.
- V2-B Foreman/Auth B1-B6 adds dashboard-local guide/explainer strings only. No B7 migration row is required unless a later approved packet promotes those strings into root/shared runtime contracts.
- V2-C adds dashboard-local presentation, choreography, and reliability surfaces only. V2-B Demo UI Clarity adds dashboard-local presenter hierarchy only. No V2-C or Demo UI Clarity migration row is required unless a later approved packet promotes a shared/root contract or protected surface.
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
