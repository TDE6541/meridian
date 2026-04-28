# Contributing

## Read First

- `README.md`
- `CLAUDE.md`
- `TEAM_CHARTER.md`
- `AI_EXECUTION_DOCTRINE.md`
- `MIGRATIONS.md`

## Working Rules

- Work from repo truth and approved inputs.
- Treat Meridian V1 as complete through Wave 9.
- Treat Wave 9 as the final V1 wave; there is no Wave 10 in V1.
- Treat V2-A as a local/demo-day Meridian V2 extension; V2-B/GARP Authority Runway is a local G1-G5 authority runway; V2-B Foreman/Auth local proof cockpit is local/pre-deployment guide/explainer truth plus AUTH-5 deployed Vercel/Auth0 demo proof only; V2-C is dashboard-local presentation/choreography/reliability truth only.
- Treat eval warm-tabs, phone smoke, mobile/judge device proof, full authority choreography proof, Walk-mode MP4 proof, clean logout proof, deploy hook cleanup proof, and final V2-B closeout as HOLD until Tim supplies proof.
- Keep diffs minimal and within approved scope.
- Surface uncertainty as HOLD.
- Do not add adjacent changes without a new scoped session.
- Verify the result before closeout.

## Contract Discipline

- Treat root canon as load-bearing.
- Update every affected canon surface when substrate truth changes.
- Do not introduce silent drift between repo state and repo documents.
- Treat Wave 3 bridge-local contracts as transport contracts, not persistent entity widening.
- Treat Wave 4B capture artifacts and handoff payloads as bounded local seam outputs, not generalized runtime/publication completion.
- Treat Wave 5 authority outputs as bounded runtime-only projections (`runtimeSubset.civic.authority_resolution` and `runtimeSubset.civic.revocation`), not top-level request/publication/entity widening.
- Treat Wave 6 forensic outputs as bounded local forensic-chain and additive publication-receipt seams, not live broker proof, legal immutability, top-level request/publication widening, or DB-backed persistence.
- Treat Wave 7 civic skins as rendering-only `src/skins/**` surfaces, not dashboard/UI runtime or legal/public-portal behavior.
- Treat Wave 8 corridor scenario outputs as integration-local `src/integration/**` and runner-local proof surfaces, not live broker/auth/audio/legal behavior.
- Treat Wave 9 dashboard work as local-only `dashboard/**` snapshot consumption over committed payloads, not hosted deployment, auth, live broker, live network dependency, new governance computation, or legal/TPIA/TRAIGA compliance behavior.
- Treat V1 closure docs as truth-surface routing only; they do not change shared contracts and do not require a migration row.
- Treat V2-A live work as local/demo-day `src/live/**`, local script, and dashboard-local Live Mode truth. V2-A does not claim production behavior, live Fort Worth city integration, full Accela/GIS automation, live Constellation broker proof, Auth0/OpenFGA integration, live Whisper/audio, legal certification, dashboard-side truth computation, Foreman behavior, or V2-B behavior.
- Treat V2-B/GARP work as local authority-runway truth only: dashboard-local Auth0 Universal Login role-session proof, deterministic authority request/evaluation/store contracts, local lifecycle/action record behavior, dashboard authority cockpit, payload-only notification builder, Foreman handoff context with `foreman_ready: false`, and prepared disclosure preview actions. It is the authority runway, not full Foreman, and does not claim production auth, live OpenFGA behavior, CIBA, delivered notifications, public portal behavior, legal/TPIA sufficiency, official Fort Worth workflow, ForensicChain vocabulary widening, or LiveFeedEvent kind widening.
- Treat V2-B Foreman/Auth work as local/pre-deployment dashboard proof cockpit truth plus AUTH-5 deployed demo proof only: deterministic Foreman context, offline source-bounded narration, authority-aware narration, guided event binding, Gold modes, browser-native voice fallback, deterministic avatar state, dashboard-local Auth0 role-session mapping, shared local `/api/authority-requests` endpoint behavior, stable Vercel demo URL, Auth0 hosted login/callback return, and two eval-role session mappings. It does not claim production/live-city/legal/OpenFGA/CIBA/public-portal/notification-delivery behavior, full authority choreography proof, clean logout proof, deploy hook cleanup proof, model/API calls, external voice service, Whisper/audio upload/transcription, or final V2-B closeout.
- Treat V2-C work as dashboard-local presentation/choreography/reliability only: Mission presentation skin, Mission Rail, Fictional Demo Permit #4471, HOLD Wall, Absence Lens presentation overlay, Decision Counter, Demo Audit Wall, Foreman audio identity, Disclosure Receipt, Doctrine Card, reliability panel/runbook/checklists, SyncPill, approval pulse, and vibration fallback over existing proof. It does not claim shared contract widening, root governance/forensic/authority/live absence/root skins changes, Auth0/Vercel/env/package/deploy/config/secret/security changes, production city behavior, legal/TPIA/TRAIGA sufficiency, official Fort Worth workflow, public portal behavior, live OpenFGA, CIBA, delivered notifications, model/API-backed Foreman, external voice service, Whisper/audio upload/transcription, or manual proof completion.

## Canon Vs Reference Boundaries

- Canon lives in the root documents that define Meridian repo posture and current substrate truth.
- References may guide wording or direction, but they do not override visible repo truth.
- Upstream material that is not available in this repo may be named, but not summarized as fact.

## HOLD Behavior

- Use HOLD when required truth is missing, conflicting, or blocked.
- Include the evidence that caused the HOLD.
- Do not replace missing facts with confident prose.

## Commit Hygiene

- Keep each change set narrow and legible.
- Avoid mixed-purpose edits.
- Do not commit until the approved session says commit is in scope.
- When touching the Wave 3 bridge, sync the bridge specs, tests, migration log, and closeout in the same session.
- When touching the Wave 4B capture lane, sync the Wave 4B spec/closeout and current-truth front doors in the same session.
- When touching the Wave 4.5 calibration lane, sync `docs/specs/WAVE4_5_CALIBRATION.md`, `docs/closeouts/WAVE4_5_CLOSEOUT.md`, and current-truth front doors in the same session.
- When touching the Wave 5 authority-topology lane, sync `docs/specs/WAVE5_AUTHORITY_TOPOLOGY.md`, `docs/closeouts/WAVE5_CLOSEOUT.md`, `MIGRATIONS.md`, and current-truth front doors in the same session.
- When touching the Wave 6 forensic-chain lane, sync `docs/specs/WAVE6_FORENSICCHAIN_CIVIC.md`, `docs/closeouts/WAVE6_CLOSEOUT.md`, `MIGRATIONS.md`, and current-truth front doors in the same session.
- When touching the Wave 7 civic skins lane, sync `docs/specs/WAVE7_CIVIC_SKINS.md`, `docs/closeouts/WAVE7_CLOSEOUT.md`, `MIGRATIONS.md`, and current-truth front doors in the same session.
- When touching the Wave 9 dashboard lane, sync `docs/specs/WAVE9_DASHBOARD.md`, `docs/closeouts/WAVE9_CLOSEOUT.md`, `dashboard/README.md`, and current-truth front doors in the same session; update `MIGRATIONS.md` only if a real shared contract changes.
- When touching V1 final truth, sync `docs/specs/MERIDIAN_V1_FINAL_TRUTH.md`, `docs/closeouts/MERIDIAN_V1_MASTER_CLOSEOUT.md`, and current-truth front doors without editing runtime, test, package, scenario, or historical Wave 1-9 closeout surfaces.
- When touching the V2-A live lane, sync `docs/specs/MERIDIAN_V2A_LIVE_CIVIC_NERVOUS_SYSTEM.md`, `docs/closeouts/MERIDIAN_V2A_CLOSEOUT.md`, `MIGRATIONS.md`, `dashboard/README.md`, and current-truth front doors in the same session; do not modify runtime/test/dashboard source unless a later approved structural packet opens that scope.
- When touching the V2-B/GARP Authority Runway finish lane, sync `docs/specs/MERIDIAN_V2B_GARP_AUTHORITY_RUNWAY.md`, `docs/closeouts/MERIDIAN_V2B_GARP_CLOSEOUT.md`, `MIGRATIONS.md`, `dashboard/README.md`, and current-truth front doors without editing runtime, dashboard source, tests, package files, V1 final truth, V1 master closeout, or V2-A truth files unless a later approved structural packet opens that scope.
- When touching the V2-B Foreman/Auth finish lanes, sync the relevant closeout (`docs/closeouts/MERIDIAN_V2B_FOREMAN_PLATINUM_LOCAL_CLOSEOUT.md` for local proof or `docs/closeouts/MERIDIAN_V2B_AUTH5_DEPLOYED_PROOF_CLOSEOUT.md` for deployed demo proof), `dashboard/README.md`, and current-truth front doors without editing runtime, dashboard source, tests, package files, V1 final truth, V1 master closeout, or V2-A truth files unless a later approved structural packet opens that scope. Update `MIGRATIONS.md` only if a real shared/root contract changes.
- When touching the V2-C Demo Presentation Layer finish lane, sync `docs/specs/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER.md`, `docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md`, `dashboard/README.md`, and current-truth front doors without editing runtime, dashboard source, tests, package files, auth/config/deploy/env/security surfaces, or historical V1/V2 closeouts. Update `MIGRATIONS.md` only if a real shared/root contract changes.
