# Meridian Dashboard

Packet 1 creates an isolated `dashboard/` package that consumes precomputed Wave 8 replay+cascade runner output as static JSON.

## Scope

- reads frozen runner output from `public/scenarios/*.json`
- validates the dashboard-local load-bearing shape
- renders a minimal proof surface that the three approved scenarios load
- keeps the full runner payloads intact, including `skins`

## Non-goals

- no root package changes
- no browser import of `src/skins/**`
- no governance, authority, matching, forensic, or cascade recomputation
- no Packet 2 shell/state work

## Commands

```bash
npm --prefix dashboard install
npm --prefix dashboard test
npm --prefix dashboard run typecheck
npm --prefix dashboard run build
```

## Snapshot source

The scenario JSON files are generated directly from the existing Wave 8 runner:

```bash
node scripts/run-corridor-scenario.js --scenario=routine --mode=replay --cascade --json
node scripts/run-corridor-scenario.js --scenario=contested --mode=replay --cascade --json
node scripts/run-corridor-scenario.js --scenario=emergency --mode=replay --cascade --json
```

Those outputs are written into:

- `public/scenarios/routine.json`
- `public/scenarios/contested.json`
- `public/scenarios/emergency.json`
