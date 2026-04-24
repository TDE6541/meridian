# Meridian Dashboard

Wave 9 keeps the dashboard local-only and snapshot-driven for demo use on Tim's machine.

## Scope

- reads committed scenario snapshots from `public/scenarios/*.json`
- renders the local control-room shell with Wave 9 demo hardening
- stays consumption-only over Wave 8 replay output, including `step.skins.outputs`
- keeps Director Mode and Absence Lens view-only over committed payload truth
- requires no env vars, secrets, live broker, or live network dependency at demo runtime after local dependencies are installed

## Non-goals

- no root package changes
- no browser import of `src/skins/**`
- no `step.skins.renders` consumption
- no governance, authority, matching, forensic, skin, or cascade recomputation
- no deployment, hosting, auth, or live broker claim
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
