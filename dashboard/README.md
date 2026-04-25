# Meridian Dashboard

Wave 9 keeps the dashboard local-only and snapshot-driven for demo use on Tim's machine. V2-A adds optional local Live Mode while preserving snapshot mode as the default path.

## Scope

- reads committed scenario snapshots from `public/scenarios/*.json`
- renders the local control-room shell with Wave 9 demo hardening
- stays consumption-only over Wave 8 replay output, including `step.skins.outputs`
- keeps Director Mode and Absence Lens view-only over committed payload truth
- keeps snapshot mode as the default dashboard mode
- supports optional local Live Mode over `DashboardLiveProjectionV1`
- emits visible HOLD messaging when Live Mode is disconnected, unavailable, or invalid
- preserves `dashboard/src/foremanGuide/ForemanMountPoint.tsx` as an inert mount only
- requires no env vars, secrets, live broker, or live network dependency at demo runtime after local dependencies are installed

## Non-goals

- no root package changes
- no browser import of `src/skins/**`
- no browser import of root `src/live/**`
- no `step.skins.renders` consumption
- no governance, authority, matching, forensic, absence, skin, city, or cascade truth recomputation
- no deployment, hosting, auth, live broker, live city integration, or live Constellation claim
- no Foreman behavior, Foreman API, model call, voice/avatar, narration, chat panel, or autonomous action
- no legal sufficiency, TPIA compliance, TRAIGA compliance, public-record completeness, or official disclosure approval claim

## Local Commands

```bash
npm --prefix dashboard install
npm --prefix dashboard test
npm --prefix dashboard run typecheck
npm --prefix dashboard run build
npm --prefix dashboard run dev
```

`npm --prefix dashboard run dev` is the documented local run command for demo use.

Expected local URL:

```text
http://localhost:5173/
```

## Demo Posture

- Demo playback reads committed local files only.
- Snapshot mode remains default.
- Live Mode is optional/local and fail-closed.
- No env vars are required.
- No secrets are required.
- No live network is required by the demo runtime after local dependencies are installed.
- Demo-driving shortcuts:
  - `Left` / `Right` for previous and next step
  - `Space` for play or pause
  - `R` for reset
  - `1` / `2` / `3` for routine, contested, and emergency
  - `P` / `C` / `O` / `D` / `U` for permitting, council, operations, dispatch, and public

Deployment and hosting are not shipped in Wave 9.

## V2-A Live Mode Posture

Live Mode consumes a service-side `DashboardLiveProjectionV1` when enabled. It does not compute governance, authority, forensic, absence, skin, city, or cascade truth in the browser.

The event rail supports V2-A live event kinds including `cityData.seed.loaded`, `corridor.generated`, and `constellation.replay.received`, and falls back to generic rendering for future event kinds.

The Foreman mount point is a reserved inert seam. It displays only supplied context seed facts and does not mount guide behavior.

## Snapshot Source

The scenario JSON files are generated from the existing Wave 8 runner and then committed for local replay:

```bash
node scripts/run-corridor-scenario.js --scenario=routine --mode=replay --cascade --json
node scripts/run-corridor-scenario.js --scenario=contested --mode=replay --cascade --json
node scripts/run-corridor-scenario.js --scenario=emergency --mode=replay --cascade --json
```

Wave 9 demo day does not require running those commands.

## Visual Proof Status

- 1920x1080 visual proof remains HOLD unless Packet 7 records new evidence.
- 1280x720 visual proof remains HOLD unless Packet 7 records new evidence.
