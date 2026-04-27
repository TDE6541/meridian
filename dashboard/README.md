# Meridian Dashboard

Wave 9 keeps the dashboard local-only and snapshot-driven for demo use on Tim's machine. V2-A adds optional local Live Mode while preserving snapshot mode as the default path. V2-B/GARP adds dashboard-local Auth0 Universal Login role-session proof, an authority cockpit, payload-only notification preview, Foreman handoff context with `foreman_ready: false`, and prepared disclosure preview actions.

## Scope

- reads committed scenario snapshots from `public/scenarios/*.json`
- renders the local control-room shell with Wave 9 demo hardening
- stays consumption-only over Wave 8 replay output, including `step.skins.outputs`
- keeps Director Mode and Absence Lens view-only over committed payload truth
- keeps snapshot mode as the default dashboard mode
- supports optional local Live Mode over `DashboardLiveProjectionV1`
- renders the GARP authority cockpit from local authority state inputs
- exposes dashboard-local Auth0 Universal Login role-session proof
- builds payload-only authority notification previews
- prepares disclosure preview action metadata without browser side effects
- emits visible HOLD messaging when Live Mode is disconnected, unavailable, or invalid
- preserves `dashboard/src/foremanGuide/ForemanMountPoint.tsx` as an inert mount only
- requires no env vars, secrets, live broker, or live network dependency at demo runtime after local dependencies are installed

## Non-goals

- no root package changes
- no browser import of `src/skins/**`
- no browser import of root `src/live/**`
- no `step.skins.renders` consumption
- no OpenFGA behavior
- no Auth0 tenant connectivity proof
- no CIBA
- no notification sending, browser push registration, email sending, or service worker
- no clipboard write, browser download trigger, print trigger, or PDF generation from disclosure preview actions
- no governance, authority, matching, forensic, absence, skin, city, or cascade truth recomputation
- no deployment, hosting, production identity or authorization behavior, live broker, live city integration, or live Constellation claim
- no Foreman behavior, Foreman API, model call, voice/avatar, narration, chat panel, or autonomous action
- no legal determination, TPIA compliance, TRAIGA compliance, public-record completeness, public portal behavior, or official disclosure approval claim

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

## Vercel and Auth0 Demo Setup

AUTH-4 prepares deployment configuration only. It does not deploy, prove production hosting, or change the local/demo-day truth boundary.

Vercel project settings for Tim:

- import the GitHub repo into Vercel
- set the project root to `dashboard`
- set the build command to `npm run build`
- set the output directory to `dist`
- set Vercel environment variables:
  - `VITE_AUTH0_DOMAIN`
  - `VITE_AUTH0_CLIENT_ID`
  - `VITE_AUTH0_CALLBACK_URL`

Auth0 Application URI values:

- local callback URL: `http://localhost:5173/callback`
- local logout URL: `http://localhost:5173`
- local web origin: `http://localhost:5173`
- Vercel callback URL: `https://<vercel-url>/callback`
- Vercel logout URL: `https://<vercel-url>`
- Vercel web origin: `https://<vercel-url>`

Demo Day readiness checks after Tim configures Vercel and Auth0:

- verify login with eval accounts
- verify snapshot mode still works while logged out
- verify the public role cannot approve authority requests
- verify an inspector role can submit an authority request
- verify a director or operations role can approve and deny an authority request

Config boundaries:

- no secrets are committed here
- no Vercel deployment is attempted here
- no Auth0 Management API, database, WebSocket, realtime push, notification delivery, OpenFGA, CIBA, public portal, legal compliance, production identity, live-city integration, or Foreman behavior is added here
- model-provider secrets are outside this lane; any future model API mode requires an approved server-side/serverless proxy with server-side environment only

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

## V2-B/GARP Authority Runway Posture

GARP is dashboard-local Authority Runway work only. It keeps snapshot mode and Live Mode intact, preserves `step.skins.outputs`, keeps `step.skins.renders` absent, and does not import root `src/live/**` or `src/skins/**` into the browser.

The disclosure preview remains demo preview only. Prepared disclosure preview actions are metadata only and do not write to the clipboard, trigger browser downloads, trigger print, or generate PDFs.

Required disclosure disclaimer:

```text
Demo disclosure preview only. Not legal advice, not a TPIA determination, and not an official Fort Worth disclosure workflow.
```

Foreman remains gated. The handoff context may display `foreman_ready: false`, but no Foreman behavior ships here.

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
