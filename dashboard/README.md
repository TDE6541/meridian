# Meridian Dashboard

Wave 9 keeps the dashboard snapshot-driven for demo use. V2-A adds optional local Live Mode while preserving snapshot mode as the default path. V2-B/GARP adds dashboard-local Auth0 Universal Login role-session proof, an authority cockpit, payload-only notification preview, Foreman handoff context with `foreman_ready: false`, prepared disclosure preview metadata, and browser-native disclosure preview print/save-to-PDF. V2-B Foreman/Auth adds the local/pre-deployment guide/explainer cockpit with deterministic context, offline narration, guided signals, Gold modes, browser-native voice fallback, deterministic avatar state, shared local `/api/authority-requests` endpoint behavior, and AUTH-5 deployed Vercel/Auth0 demo proof at `https://meridian-holdpoint.vercel.app`. V2-C adds the dashboard-local Demo Presentation Layer for Mission presentation, choreography, legibility, and reliability over existing proof. The V2-B Demo UI Clarity pass hardens that dashboard into a Presenter Cockpit default without removing shipped proof tools.

## Scope

- reads committed scenario snapshots from `public/scenarios/*.json`
- renders the local control-room shell with Wave 9 demo hardening
- renders the V2-C Mission presentation skin, Mission Rail, HOLD Wall, Absence Lens presentation overlay, Decision Counter, Demo Audit Wall, Doctrine Card, reliability panel, and SyncPill
- defaults the first screen to a Presenter Cockpit with compact demo anchor, current decision/HOLD focal card, six-stage process rail, compact safety explanation, and grouped proof tools
- stays consumption-only over Wave 8 replay output, including `step.skins.outputs`
- keeps Director Mode and Absence Lens view-only over committed payload truth
- keeps snapshot mode as the default dashboard mode
- supports optional local Live Mode over `DashboardLiveProjectionV1`
- renders the GARP authority cockpit from local authority state inputs
- exposes dashboard-local Auth0 Universal Login role-session proof
- maps Auth0 JWT roles from `https://meridian.city/roles`
- exposes the dashboard-local shared authority endpoint at `/api/authority-requests`
- builds payload-only authority notification previews
- prepares disclosure preview action metadata without browser side effects
- renders the Foreman guide/explainer panel with deterministic offline narration
- supports Foreman guided event binding, spatial awareness, panel highlighting, Gold modes, browser-native voice fallback, and deterministic avatar state
- serves dashboard-local static Foreman audio cues and demo runbook/print instructions from committed public assets
- emits visible HOLD messaging when Live Mode is disconnected, unavailable, or invalid
- preserves logged-out snapshot mode when Auth0 env is missing
- requires no secrets, live broker, or live network dependency for logged-out local snapshot demo after local dependencies are installed

## Non-goals

- no root package changes
- no browser import of `src/skins/**`
- no browser import of root `src/live/**`
- no `step.skins.renders` consumption
- no OpenFGA behavior
- no production identity or authorization infrastructure
- no CIBA
- no notification sending, browser push registration, email sending, or service worker
- no clipboard write, browser download trigger, generated PDF library, server-side report generation, or city-record generation from disclosure preview actions; disclosure preview print/save-to-PDF uses the browser-native print dialog only
- no governance, authority, matching, forensic, absence, skin, city, or cascade truth recomputation
- no production identity or authorization behavior, live broker, live city integration, or live Constellation claim
- no Foreman API, model call, external voice service, Whisper/audio upload/transcription, MediaRecorder/getUserMedia path, browser-exposed model API keys, or autonomous Foreman action
- no legal determination, TPIA compliance, TRAIGA compliance, public-record completeness, public portal behavior, or official disclosure approval claim
- no V2-C root/shared contract widening, protected runtime substrate edits, Auth0/Vercel/env/package/deploy/config/secret/security edits, or manual proof completion claim

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

- verify snapshot mode still works while logged out
- verify Auth0 login with eval accounts
- verify role session visibility after login
- verify the public role cannot approve authority requests
- verify a field inspector role can submit an authority request
- verify a director or operations role can approve and deny an authority request
- verify Foreman explains the authority lifecycle
- verify Foreman Gold modes work
- verify unsupported voice paths keep typed fallback visible

Config boundaries:

- no secrets are committed here
- no Vercel or Auth0 setting change is attempted by repo docs
- no Auth0 Management API, database, WebSocket, realtime push, delivered notifications, OpenFGA, CIBA, public portal, legal/TPIA sufficiency, production identity, live-city integration, model/API calls, external voice service, or autonomous Foreman action is added here
- model-provider secrets are outside this lane; any future model API mode requires an approved server-side/serverless proxy with server-side environment only

## AUTH-5 Deployed Demo Proof

AUTH-5 records Tim's manual deployed Vercel/Auth0 proof in:

- `../docs/closeouts/MERIDIAN_V2B_AUTH5_DEPLOYED_PROOF_CLOSEOUT.md`

Bounded deployed proof:

- stable production-environment demo URL: `https://meridian-holdpoint.vercel.app`
- Vercel production deployment status: `Ready / Latest`
- remote dashboard load
- Auth0 hosted login page reached
- Auth0 callback returned to Meridian
- authenticated eval-role proof for `permitting_staff` / `permitting` and `council_member` / `public`
- allowed skins rendered for `permitting_staff`: `permitting`, `operations`
- allowed skins rendered for `council_member`: `council`, `public`
- GARP shared endpoint connected

Remaining AUTH-5 HOLDs:

- mobile / judge-device smoke proof
- full authority submit/approve/deny choreography screenshot proof
- clean logout success screenshot proof
- deploy hook cleanup proof
- OpenFGA, CIBA, notification-delivery, legal/TPIA sufficiency, public-portal behavior, official Fort Worth workflow, production city behavior, and final V2-B closeout

## Code Quality + Demo Hardening FAST Lane

The required Code Quality + Demo Hardening FAST lane is recorded in:

- `../docs/closeouts/MERIDIAN_V2B_CODE_QUALITY_DEMO_HARDENING_CLOSEOUT.md`

Packet 1 added the CI verification workflow and dashboard mobile/accessibility polish. Packet 2 hardened forensic-chain public boundary behavior, cleaned the redaction boundary, and corrected governance-shadow truth wording without dashboard source edits. Optional Packet 4 adds the browser-native disclosure preview print/save-to-PDF affordance. Current floor after Optional Packet 4 is dashboard `239/239` and repo-wide JS `719/719`.

This lane does not close mobile/judge proof, full authority choreography proof, clean logout proof, deploy-hook cleanup proof, OpenFGA/CIBA/notification/legal/public-portal behavior, production city behavior, or final V2-B closeout.

## V2-B Demo UI Clarity / Presenter View

The Presenter View hardening pass is recorded in:

- `../docs/closeouts/MERIDIAN_V2B_DEMO_UI_CLARITY_CLOSEOUT.md`

Shipped dashboard-local hierarchy:

- Presenter Cockpit is the default first-screen hierarchy.
- Fictional Demo Permit #4471 is a compact synthetic demo anchor with no private address and no city record claim.
- Current decision / current HOLD is the primary focal card.
- Capture, Authority, Governance, Absence, Chain, and Public render as a six-stage process rail.
- Engineer Mode, Director Mode, Absence Lens, Audit Wall, and HOLD Wall are grouped behind Proof Tools by default.
- Decision counts are secondary Outcome Summary / Decision Summary proof.
- "Why this is safe" keeps HOLD > GUESS doctrine compact.

Current floor after this pass:

- dashboard tests `285/285`
- repo-wide JS tests `719/719`
- dashboard typecheck green
- dashboard build green

This pass does not widen root/shared contracts, does not add a `MIGRATIONS.md` row, and does not modify dashboard scenarios, package files, Auth0, Vercel, env, deploy, config, secret, security, or root runtime surfaces.

## V2-C Demo Presentation Layer Posture

V2-C is recorded in:

- `../docs/specs/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER.md`
- `../docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md`
- `../docs/closeouts/MERIDIAN_V2C_OPTIONAL_DEMO_PACKETS_CLOSEOUT.md`

Shipped dashboard-local surfaces:

- Mission presentation skin and Mission Rail
- Fictional Demo Permit #4471
- HOLD Wall and Absence Lens presentation overlay
- Decision Counter and Demo Audit Wall
- Foreman audio identity
- Disclosure Receipt and Doctrine Card
- reliability panel, reliability runbook, and checklists
- SyncPill, approval pulse, and vibration fallback

Demo support artifacts:

- `../docs/demo/DEMO_DAY_COMMANDER_PACKET.md`
- `../docs/demo/DEMO_DAY_PROOF_CAPTURE_BOARD.md`
- `public/demo/reliability-runbook.md`
- `public/demo/print-instructions.md`
- `public/demo/adversarial-qa-sealed-envelopes.md`
- `public/demo/lens-matched-judge-cards.md`
- `public/demo/doctrine-poster-stage-setup.md`
- `public/demo/overclaim-trap-rehearsal-card.md`
- `public/audio/foreman/README.md`

Current V2-C floor:

- dashboard tests `285/285`
- repo-wide JS tests `719/719`
- dashboard typecheck green
- dashboard build green

V2-C does not widen root/shared contracts, does not add a `MIGRATIONS.md` row, and does not modify root governance/forensic/authority/live absence/root skins, dashboard scenarios, package, Auth0, Vercel, env, deploy, config, secret, or security surfaces.

Optional DEMO-11 through DEMO-14 artifacts are static print/operator support only. They do not add runtime behavior, live Q&A, speech detection, autonomous overclaim detection, fake QR, production proof, legal sufficiency, official Fort Worth workflow, or shared contract widening.

Remaining V2-C HOLDs:

- eval account warm-tabs
- phone smoke
- full authority choreography screenshots
- Walk-mode MP4 proof
- clean logout proof
- deploy-hook cleanup proof
- final V2-B closeout

## Demo Posture

- Demo playback reads committed local files only.
- Snapshot mode remains default.
- V2-C Mission presentation is the review-facing dashboard layer over existing proof.
- Live Mode is optional/local and fail-closed.
- No env vars are required for logged-out snapshot mode.
- Auth0 login proof requires the documented `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, and `VITE_AUTH0_CALLBACK_URL` values.
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

The disclosure preview remains demo preview only. Prepared disclosure preview metadata stays metadata only and does not write to the clipboard, trigger browser downloads, use a generated PDF library, or generate reports server-side. The visible `Print / Save report` action opens the browser-native print dialog so a judge/operator can save as PDF from the browser while the existing redaction boundary remains the source of visible content.

Required disclosure disclaimer:

```text
Demo disclosure preview only. Not legal advice, not a TPIA determination, and not an official Fort Worth disclosure workflow.
```

GARP is the authority runway, not full Foreman. The handoff context may display `foreman_ready: false`; the later B1-B6 cockpit supplies dashboard-local guide/explainer behavior only.

## V2-B Foreman/Auth Local Proof Cockpit Posture

The Foreman/Auth cockpit remains a proof cockpit, not production civic infrastructure. Current truth is recorded in:

- `../docs/specs/MERIDIAN_V2B_FOREMAN_GUIDED_PROOF_COCKPIT.md`
- `../docs/closeouts/MERIDIAN_V2B_FOREMAN_PLATINUM_LOCAL_CLOSEOUT.md`
- `../docs/closeouts/MERIDIAN_V2B_AUTH5_DEPLOYED_PROOF_CLOSEOUT.md`

Shipped local behavior:

- `meridian.v2.foremanGuideContext.v1`
- `meridian.v2.foremanGuideResponse.v1`
- `meridian.v2.foremanGuideSignal.v1`
- `meridian.v2.foremanGuideMode.v1`
- existing `meridian.v2.roleSessionProof.v1`
- Auth0 role namespace `https://meridian.city/roles`
- shared local endpoint `/api/authority-requests`
- event-compatible payloads `AUTHORITY_RESOLUTION_REQUESTED`, `AUTHORITY_APPROVED`, and `AUTHORITY_DENIED`
- Foreman panel, offline narration, authority narration, guided event binding, spatial awareness, visual-only panel highlighting, Gold modes, browser-native voice output/input fallback, typed fallback, and deterministic avatar state

AUTH-5 deployed demo proof:

- deployed URL: `https://meridian-holdpoint.vercel.app`
- Auth0 hosted login and callback return
- eval-role proof for `permitting_staff` and `council_member`

Remaining proof HOLDs:

- mobile/judge device proof
- full authority submit/approve/deny choreography proof
- clean logout proof
- deploy hook cleanup proof
- OpenFGA/CIBA/notification/legal/public-portal behavior
- final V2-B closeout

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
