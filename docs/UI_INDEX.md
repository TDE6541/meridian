# UI Index

## Purpose

This file tracks Meridian UI surfaces that exist in-repo.

## Current Repo Truth

Wave 9 ships a local-only dashboard proof under `dashboard/`. It consumes committed Wave 8 scenario/cascade payload snapshots from `dashboard/public/scenarios/*.json`, remains snapshot-default, and runs locally with:

```bash
npm --prefix dashboard run dev
```

Expected local URL:

```text
http://localhost:5173/
```

Meridian V1 is complete through Wave 9. Wave 9 is the final V1 wave, and there is no Wave 10 in V1. V2-A adds optional local Live Mode over `DashboardLiveProjectionV1`. V2-B/GARP adds dashboard-local Auth0 Universal Login role-session proof, an authority cockpit, payload-only notification preview, disclosure preview, prepared disclosure preview actions, and Foreman handoff context with `foreman_ready: false`. The dashboard remains local/proof infrastructure, not a deployed production city system. Full V2-B Foreman remains gated.

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
- `dashboard/src/auth/**`
- `dashboard/src/roleSession/**`
- `dashboard/src/authority/**`
- `dashboard/src/live/**`
- `dashboard/src/foremanGuide/**`
- `dashboard/public/scenarios/*.json`
- `dashboard/tests/*.ts`
- `dashboard/tests/*.tsx`

## Boundaries

- Local dashboard only.
- Snapshot consumption only.
- Snapshot mode remains default.
- Live Mode is optional/local and emits HOLD messaging when disconnected, unavailable, or invalid.
- Canonical skin payload field: `step.skins.outputs`.
- `step.skins.renders` is not used.
- No browser import from `src/skins/**`.
- No browser import from root `src/live/**`.
- No Wave 1-8 substrate edits.
- No root package changes.
- Dashboard-local Auth0 Universal Login role-session proof only.
- No Auth0 tenant connectivity proof.
- OpenFGA deferred.
- Payload-only notification builder; no notification sending.
- Prepared disclosure preview actions only; no clipboard write, browser download trigger, print trigger, or PDF.
- No live broker.
- No live Fort Worth city integration.
- No live Constellation broker proof.
- No Foreman behavior; `dashboard/src/foremanGuide/ForemanMountPoint.tsx` is an inert mount only.
- No live network dependency at demo runtime after local dependencies are installed.
- No new governance, authority, forensic, absence, skin, city, or cascade truth computation.
- No legal determination, TPIA compliance, TRAIGA compliance, public-record completeness, public portal behavior, or official disclosure approval claim.

## Visual Proof Status

- 1920x1080 visual proof: HOLD; screenshot-level proof remains not verified.
- 1280x720 visual proof: HOLD; screenshot-level proof remains not verified.

## Final V1 Verification Posture

- Dashboard tests: `36` passing / `0` failing across `14` dashboard test files.
- Repo-wide JS tests: `511` passing / `0` failing.
- Remaining visual HOLDs: 1920x1080 and 1280x720 screenshot-level proof remain not screenshot-verified.

## V2-A Live Mode Verification Posture

Packet A8 closeout records the current dashboard typecheck, dashboard tests, dashboard build, and repo-wide JS verification after V2-A Live Mode. Live Mode remains local/optional and does not change snapshot-default truth.

## V2-B/GARP Dashboard Verification Posture

G5 validation recorded dashboard tests `58/58` and repo-wide JS tests `717/717`. Z1 does not change dashboard behavior; it records the dashboard-local GARP Authority Runway posture only.
