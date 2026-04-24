# UI Index

## Purpose

This file tracks Meridian UI surfaces that exist in-repo.

## Current Repo Truth

Wave 9 ships a local-only dashboard proof under `dashboard/`. It consumes committed Wave 8 scenario/cascade payload snapshots from `dashboard/public/scenarios/*.json` and runs locally with:

```bash
npm --prefix dashboard run dev
```

Expected local URL:

```text
http://localhost:5173/
```

## UI Surfaces

- `dashboard/index.html`
- `dashboard/src/main.tsx`
- `dashboard/src/App.tsx`
- `dashboard/src/components/**`
- `dashboard/src/adapters/**`
- `dashboard/src/director/**`
- `dashboard/src/state/**`
- `dashboard/src/demo/**`
- `dashboard/src/types/**`
- `dashboard/public/scenarios/*.json`
- `dashboard/tests/*.ts`
- `dashboard/tests/*.tsx`

## Boundaries

- Local dashboard only.
- Snapshot consumption only.
- Canonical skin payload field: `step.skins.outputs`.
- `step.skins.renders` is not used.
- No browser import from `src/skins/**`.
- No Wave 1-8 substrate edits.
- No root package changes.
- No auth.
- No live broker.
- No live network dependency at demo runtime after local dependencies are installed.
- No new governance computation.
- No legal sufficiency, TPIA compliance, TRAIGA compliance, public-record completeness, or official disclosure approval claim.

## Visual Proof Status

- 1920x1080 visual proof: HOLD unless Packet 7 records new evidence.
- 1280x720 visual proof: HOLD unless Packet 7 records new evidence.
