# Wave 9 Dashboard

## Purpose

Wave 9 lands a bounded local dashboard proof for Meridian. It makes the Wave 8 corridor scenario runner output legible through an isolated `dashboard/` package that reads committed payload snapshots.

Wave 9 is local dashboard only. It is not a runnable production app. It is not deployed.

## Shipped scope

Wave 9 ships:

- an isolated Vite/React/TypeScript package under `dashboard/`
- committed scenario/cascade payload snapshots under `dashboard/public/scenarios/*.json`
- local control-room scenario selection, timeline, playback, state, skin, forensic, relationship, choreography, and status surfaces
- local demo hardening for projector-style viewport use
- Director Mode and Absence Lens as view-only overlays over committed snapshot truth
- dashboard-local tests, typecheck, and build scripts

## Files / package boundary

Wave 9 is bounded to:

- `dashboard/package.json`
- `dashboard/package-lock.json`
- `dashboard/index.html`
- `dashboard/src/**`
- `dashboard/tests/**`
- `dashboard/public/scenarios/*.json`
- `dashboard/README.md`
- Wave 9 docs truth surfaces in `docs/specs/`, `docs/closeouts/`, and current front-door indexes

Wave 9 does not edit or ship new behavior under `src/**`, `scripts/**`, root `tests/**`, root `package.json`, or root `package-lock.json`.

## Packet lineage

Local Packet 1-6 lineage:

- Packet 1: `99fed69` / `feat(dashboard): add wave9 packet1 scenario data seam`
- Packet 2R: `ab4a4d5` / `feat(dashboard): complete wave9 packet2 shell verification`
- Packet 3: `089b3f3` / `feat(dashboard): add wave9 packet3 actual skin switcher`
- Packet 4: `dd77346` / `feat(dashboard): add wave9 packet4 forensic relationship choreography`
- Packet 5: `16f6867` / `feat(dashboard): add wave9 packet5 demo hardening`
- Packet 6: `0b15c32` / `feat(dashboard): add wave9 packet6 director mode absence lens`

## Local demo runbook

Canonical local demo command:

```bash
npm --prefix dashboard run dev
```

Canonical local URL:

```text
http://localhost:5173/
```

Demo posture:

- snapshots are served locally from `dashboard/public/scenarios/*.json`
- no env vars are required
- no secrets are required
- no live broker is required
- no live network dependency is required for the demo runtime after local dependencies are installed

## Data source contract

Wave 9 consumes committed Wave 8 runner payload snapshots. The dashboard does not import Wave 7 skins from `src/skins/**` in the browser and does not recompute governance, authority, matching, forensic, skin, or cascade truth.

Canonical data seams:

- scenario payload family: `wave8.packet5.runnerReport.v1`
- scenario steps: `result.steps[]`
- transition evidence: `result.transitionEvidence.steps[]`
- canonical skin payload field: `step.skins.outputs`
- stale forbidden skin payload field: `step.skins.renders`

`step.skins.outputs` is the canonical skin payload field. `step.skins.renders` is not used.

Public redaction is payload-driven only. Forensic snapshots are cumulative at each step. The dashboard may derive current-step highlight and delta views from the committed snapshots, but it must not invent cumulative chain truth.

## Dashboard surfaces shipped

Wave 9 ships dashboard-local views for:

- scenario selector over routine, contested, and emergency payload snapshots
- timeline and playback controls
- governance state display
- actual skin switcher over `step.skins.outputs`
- public redaction and payload absences
- forensic chain visibility over cumulative per-step snapshots
- entity relationship visibility
- cascade choreography visibility
- local demo header and status bar
- keyboard shortcuts for local demo driving
- responsive layout hardening for projector-oriented local use

## Director Mode / Absence Lens truth

Director Mode and Absence Lens are view-only, source-bounded overlays. They surface unresolved authority, ambiguous match, held decision, blocked action, public redaction, missing evidence, forensic accumulation, and skin divergence signals already present in committed payloads.

They do not change scenario state, recompute governance decisions, write forensic entries, infer missing legal/public-record facts, or claim official disclosure approval.

## What Wave 9 does not ship

Wave 9 does not ship:

- a production application
- hosted deployment
- auth
- live broker integration
- live Auth0/OpenFGA integration
- live Whisper/audio ingestion
- live city runtime behavior
- new governance computation
- new matching computation
- new cascade computation
- browser imports from `src/skins/**`
- root package dependency changes
- Wave 1-8 substrate edits
- legal sufficiency, TPIA compliance, TRAIGA compliance, public-record completeness, official disclosure approval, or production readiness claims

## Visual proof status

1920x1080 visual proof remains HOLD unless independently verified in the Packet 7 finish lane.

1280x720 visual proof remains HOLD unless independently verified in the Packet 7 finish lane.

## Test / build posture

Known Packet 6 verification truth:

- `npm --prefix dashboard run typecheck`: PASS
- `npm --prefix dashboard test`: PASS
- observed dashboard test count: 36 passing / 0 failing across 14 dashboard test files
- `npm --prefix dashboard run build`: PASS
- `git diff --check`: PASS with possible LF/CRLF advisory warnings only on Windows

Packet 7 finish-lane closeout records the rerun status. If rerun evidence differs, the Packet 7 closeout is the controlling local verification record.

## Contract and migration posture

Wave 9 adds a local dashboard package and committed local payload snapshots. It does not change shared runtime, governance, bridge, pipeline, forensic, skin, entity, config, root package, or script contracts.

No `MIGRATIONS.md` row is required unless a future approved change alters a real shared contract.

## Remaining HOLDs

- HOLD: 1920x1080 visual proof is not independently verified unless Packet 7 records new evidence.
- HOLD: 1280x720 visual proof is not independently verified unless Packet 7 records new evidence.
- HOLD: Wave 9 remains local-only and not pushed.
- HOLD: remote/origin truth remains unverified for Wave 9.
