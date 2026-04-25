# Meridian V2-A Live Civic Nervous System

Status: V2-A local/demo-day extension truth surface.

## Purpose

Meridian V2-A records the local live civic nervous system extension that followed the completed V1 arc. V2-A is a local/demo-day extension scope. It does not reopen V1, does not create a Wave 10, and does not ship production app behavior.

V2-A keeps the live spine bounded to local session records, local governance projection, JSON-only HoldPoint artifact ingest, live-computed absence findings, optional dashboard Live Mode, local demo seed/corridor generation, and Constellation-compatible replay. It does not ship live city integration, live broker proof, live Auth0/OpenFGA, live Whisper/audio, legal compliance certification, or Foreman behavior.

## V1 Boundary / No Wave 10

- Meridian V1 remains complete through Wave 9.
- Wave 9 remains the final V1 wave.
- There is no Wave 10 in V1.
- V2-A is a Meridian V2 local/demo-day extension and does not rewrite V1 final truth.
- V2-A does not rewrite historical Wave 1-9 specs or closeouts.

## Shipped File Map By Packet

### A1 — Live Contracts And Local Session Persistence

- `src/live/contracts.js`
- `src/live/liveFeedEvent.js`
- `src/live/liveHashChain.js`
- `src/live/liveSessionStore.js`
- `tests/live/liveContracts.test.js`
- `tests/live/liveFeedEvent.test.js`
- `tests/live/liveSessionStore.test.js`

### A2 — Live Governance Gateway And Dashboard Projection

- `src/live/liveEntityDelta.js`
- `src/live/liveGovernanceGateway.js`
- `src/live/liveDashboardProjection.js`
- `src/live/liveEventBus.js`
- `scripts/run-live-governance.js`
- A2 proof under `tests/live/**`

### A3 — HoldPoint JSON Artifact Adapter

- `src/live/adapters/holdpointArtifactAdapter.js`
- `src/live/adapters/captureToEntityDelta.js`
- `src/live/adapters/holdpointArtifactIngest.js`
- `tests/fixtures/live-capture/holdpoint/**`
- A3 proof under `tests/live/**`

### A4 — Live Absence Engine

- `src/live/absence/liveAbsenceProfiles.js`
- `src/live/absence/liveAbsenceRules.js`
- `src/live/absence/liveAbsenceEvaluator.js`
- A4 projection update in `src/live/liveDashboardProjection.js`
- A4 proof under `tests/live/**`

### A5 — Dashboard Live Mode

- `dashboard/src/live/liveTypes.ts`
- `dashboard/src/live/liveClient.ts`
- `dashboard/src/live/useLiveProjection.ts`
- `dashboard/src/components/LiveEventRail.tsx`
- `dashboard/src/components/LiveCapturePanel.tsx`
- `dashboard/src/foremanGuide/ForemanMountPoint.tsx`
- A5 dashboard wiring and proof under `dashboard/src/**` and `dashboard/tests/**`

### A6 — Fort Worth Seed Pack And Corridor Generator

- `src/live/cityData/fortWorthSeedManifest.js`
- `src/live/cityData/fortWorthSeedPack.js`
- `src/live/corridorGenerator.js`
- A6 local seed fixtures and proof under `tests/**`

### A7 — Constellation-Compatible Replay

- `src/live/adapters/constellationReplayAdapter.js`
- `scripts/replay-constellation-stream.js`
- replay JSONL fixtures and proof under `tests/**`

## Shipped Contract Family

V2-A records this shared local live contract family:

- `meridian.v2.liveSession.v1`
- `meridian.v2.liveSessionRecord.v1`
- `meridian.v2.liveFeedEvent.v1`
- `meridian.v2.entityDelta.v1`
- `meridian.v2.liveGovernanceEvaluation.v1`
- `meridian.v2.dashboardLiveProjection.v1`
- `meridian.v2.liveAbsenceFinding.v1`
- `meridian.v2.citySeedManifest.v1`
- `meridian.v2.constellationReplay.v1`

`holdpointArtifactJson.v1` is adapter-local to A3 unless a later approved packet promotes it. Dashboard TypeScript mirrors in `dashboard/src/live/**` are dashboard-local mirrors, not shared contract source.

V2-A does not widen V1 contracts, Wave 6 forensic-chain contracts, `BridgeEnvelope`, `GovernancePublication`, or NATS subject/stream behavior.

## Local Live Session Store Posture

- A1 ships hash-linked local live session records.
- The live session record family uses `meridian.v2.liveSession.v1` and `meridian.v2.liveSessionRecord.v1`.
- The first record uses `GENESIS` as the previous hash, and records are hash-linked with canonical JSON hashing.
- Generated state is written under `.meridian/live-sessions/`.
- `.meridian/` remains ignored by `.gitignore`.
- This is a local persistence posture, not a second forensic chain and not legal/tamper-proof immutability.

## Gateway / Projection Posture

- A2 ships `meridian.v2.entityDelta.v1`, `meridian.v2.liveGovernanceEvaluation.v1`, and `meridian.v2.dashboardLiveProjection.v1`.
- The gateway is local and in-process over existing governance and authority seams.
- Dashboard projection is service-side and event-driven.
- `skins.outputs` is projected as a field for dashboard consumption.
- `foreman_context_seed` is present as an inert context seam.
- The dashboard does not compute governance, authority, forensic, absence, skin, or city truth.
- A2 does not widen NATS, `BridgeEnvelope`, or `GovernancePublication`.

## JSON-Only HoldPoint Adapter Posture

- A3 ships adapter-local `holdpointArtifactJson.v1`.
- A3 accepts JSON artifacts only.
- CSV or tabular text input is rejected with structured HOLD-ready validation issues.
- A3 does not parse `mdt.csv` or `hold_echo.csv`.
- A3 does not ship live audio, Whisper, transcript extraction, or direct HoldPoint API integration.
- Row/file-specific source refs are preserved through artifact, meeting, row, evidence, and canonical refs.
- Deltas route through the A2 gateway.

## Live Absence Posture

- A4 ships `meridian.v2.liveAbsenceFinding.v1`.
- Absence findings are live-computed with `origin: "live_computed"`.
- Six deterministic civic absence rules are shipped in the default A4 profile.
- Missing required inputs emit HOLD records instead of fabricated findings.
- The dashboard projection surfaces persisted absence records only.
- The Wave 9 snapshot Absence Lens remains distinct from V2-A live-computed absence.

## Dashboard Live Mode Posture

- Snapshot mode remains the default dashboard path.
- Live Mode is optional and local.
- Live Mode consumes `DashboardLiveProjectionV1`.
- Disconnected or invalid Live Mode responses emit visible HOLD messaging.
- Future event kinds render generically in the rail.
- Browser code does not import root `src/live/**` or `src/skins/**`.
- The dashboard does not perform truth computation.
- The Foreman mount point is inert only.

## Fort Worth Seed / Generator Posture

- A6 ships `meridian.v2.citySeedManifest.v1`.
- A6 uses source-manifested local demo seed data.
- The Fort Worth seed manifest marks `not_live_city_integration`, `not_official_city_record`, `no_accela_automation`, and `no_gis_automation`.
- The corridor generator emits `cityData.seed.loaded` and `corridor.generated` events through the local gateway.
- A6 does not ship live Fort Worth city integration.
- A6 does not ship Accela/GIS automation.
- A6 does not fabricate real permit, GIS, parcel, or Accela values.

## Constellation Replay Posture

- A7 ships `meridian.v2.constellationReplay.v1`.
- A7 accepts replay/local-demo Constellation-compatible messages.
- A7 emits `constellation.replay.received` events.
- Live mode returns structured HOLD when broker env/proof is missing.
- A7 does not ship live broker proof.
- A7 does not ship live Constellation integration.
- A7 does not widen `BridgeEnvelope`, `GovernancePublication`, or NATS.

## Foreman Seam Posture

V2-A preserves only inert Foreman seams:

- `foreman_hints` in live events
- `foreman_context_seed` in dashboard projection
- inert dashboard Foreman mount point

V2-A does not ship a Foreman API, Foreman model call, voice/avatar, narration, chat panel, or autonomous Foreman action.

## Verification Posture

Packet A8 closeout records the final verification evidence for:

- `node --test tests/live/*.test.js`
- `npm --prefix dashboard run typecheck`
- `npm --prefix dashboard test`
- `npm --prefix dashboard run build`
- `npm test`
- `git diff --check`
- `.meridian/live-sessions/` ignore posture
- negative scans for historical closeout drift, package drift, runtime/test/dashboard-source drift, Wave 10 naming, and production/legal/live-system overclaims

## Explicit Non-Goals

V2-A does not ship:

- production app behavior
- deployed city system behavior
- live Fort Worth city integration
- full Accela/GIS automation
- live Constellation broker proof
- Auth0/OpenFGA live integration
- live Whisper/audio ingestion
- legal compliance certification, TPIA compliance, TRAIGA compliance, legal sufficiency, or official disclosure approval
- dashboard-side governance, authority, forensic, absence, skin, or city truth computation
- Foreman behavior
- V2-B behavior

## V2-B Gate Readiness

V2-A side can be considered ready only if Packet A8 verification passes. V2-B prompt cutting remains gated on V2-A green closeout.

V2-B B0 remains blocked until Foreman concept source and Bronze prototype source are supplied and inspected.

V2-A preserved seams that V2-B may inspect later:

- `foreman_hints` in live events
- `foreman_context_seed` in dashboard projection
- inert dashboard Foreman mount point
- source refs and entity refs in A3-A7 events
- snapshot fallback preserved in the dashboard

V2-A did not ship:

- Foreman API
- Foreman model call
- voice/avatar
- narration
- chat panel
- autonomous Foreman action

```json
{
  "block_type": "HOLD_STATE",
  "version": "2.0",
  "hold_active": true,
  "reason": "V2-B Foreman concept source and Bronze prototype source have not been supplied and inspected.",
  "proof_needed": [
    "WAVE11_FOREMAN_CONCEPT.md or renamed Foreman concept source",
    "Bronze prototype source/artifact",
    "V2-A green closeout"
  ],
  "options_next_step": [
    "Resolve at V2-A/V2-B gate before B0 prompt cutting"
  ],
  "resolution_event": "raised",
  "resolved_at": null
}
```
