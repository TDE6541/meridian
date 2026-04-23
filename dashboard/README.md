# Meridian Dashboard

Wave 9 Packet 5 keeps the dashboard local-only and snapshot-driven for demo use on Tim's machine.

## Scope

- reads committed scenario snapshots from `public/scenarios/*.json`
- renders the existing control-room shell with Packet 5 demo hardening
- stays consumption-only over Wave 8 replay output, including `step.skins.outputs`
- requires no env vars, secrets, or live network at demo time

## Non-goals

- no root package changes
- no browser import of `src/skins/**`
- no governance, authority, matching, forensic, or cascade recomputation
- no deployment, hosting, or Vercel claim
- no Packet 6 Director Mode surfaces

## Local Commands

```bash
npm --prefix dashboard install
npm --prefix dashboard test
npm --prefix dashboard run typecheck
npm --prefix dashboard run build
npm --prefix dashboard run dev
```

`npm --prefix dashboard run dev` is the documented local run command for demo use.

## Demo Posture

- Demo playback reads committed local files only.
- No env vars are required.
- No secrets are required.
- No live network is required once dependencies are installed.
- Demo-driving shortcuts:
  - `Left` / `Right` for previous and next step
  - `Space` for play or pause
  - `R` for reset
  - `1` / `2` / `3` for routine, contested, and emergency
  - `P` / `C` / `O` / `D` / `U` for permitting, council, operations, dispatch, and public

Deployment and hosting are deferred to Wave 10, not Wave 9.

## Snapshot Source

The scenario JSON files are generated from the existing Wave 8 runner and then committed for local replay:

```bash
node scripts/run-corridor-scenario.js --scenario=routine --mode=replay --cascade --json
node scripts/run-corridor-scenario.js --scenario=contested --mode=replay --cascade --json
node scripts/run-corridor-scenario.js --scenario=emergency --mode=replay --cascade --json
```

Packet 5 does not require running those commands on demo day.
