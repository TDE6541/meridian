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

Meridian V1 is complete through Wave 9. Wave 9 is the final V1 wave, and there is no Wave 10 in V1. V2-A adds optional local Live Mode over `DashboardLiveProjectionV1`. V2-B/GARP adds dashboard-local Auth0 Universal Login role-session proof, an authority cockpit, payload-only notification preview, disclosure preview metadata, browser-native disclosure preview print/save-to-PDF, and Foreman handoff context with `foreman_ready: false`. V2-B Foreman/Auth adds the local/pre-deployment guide/explainer cockpit with deterministic context, offline narration, guided signals, Gold modes, browser-native voice fallback, deterministic avatar state, and shared local `/api/authority-requests` endpoint behavior. AUTH-5 records deployed Vercel/Auth0 demo proof at `https://meridian-holdpoint.vercel.app` with hosted login/callback return and two eval-role mappings. V2-C adds dashboard-local presentation/choreography/reliability surfaces: Mission presentation skin, Mission Rail, Fictional Demo Permit #4471, HOLD Wall, Absence Lens presentation overlay, Decision Counter, Demo Audit Wall, Foreman audio identity, Disclosure Receipt, Doctrine Card, reliability panel/runbook/checklists, SyncPill, approval pulse, and vibration fallback. The V2-B Demo UI Clarity pass makes Presenter Cockpit the default hierarchy with compact demo anchor, current decision/HOLD focal card, six-stage process rail, grouped proof tools, and dashboard `285/285`. V2-D++ adds dashboard-local demo/proof theater surfaces: Guided Mission, Foreman Autonomous scripted conduct, embodied avatar state, Proof Spotlight, Absence Shadow Map, Authority Handoff Theater, Judge Touchboard, Evidence Navigator, Civic Twin Diorama, Forensic Receipt Ribbon, Mission Run Receipt Panel, Physical Mode, Rehearsal Certification, Failure Injection, and reliability guards. The dashboard remains proof infrastructure, not a deployed production city system.

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
- `dashboard/public/audio/foreman/README.md`
- `dashboard/public/demo/*.md`
- `dashboard/api/authority-requests.js`
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
- Dashboard-local Auth0 Universal Login role-session proof plus AUTH-5 deployed demo login/callback/role-session proof only.
- No production identity or authorization infrastructure.
- OpenFGA deferred.
- Payload-only notification builder; no notification sending.
- Prepared disclosure preview metadata plus browser-native disclosure preview print/save-to-PDF only; no clipboard write, browser download trigger, generated PDF library, server-side report generation, legal/TPIA sufficiency, public portal behavior, or city-record generation.
- No live broker.
- No live Fort Worth city integration.
- No live Constellation broker proof.
- Foreman is dashboard-local guide/explainer behavior with AUTH-5 deployed demo proof only; no model/API calls, external voice service, Whisper/audio upload/transcription, autonomous action, production city behavior, or final V2-B closeout.
- No live network dependency at demo runtime after local dependencies are installed.
- No new governance, authority, forensic, absence, skin, city, or cascade truth computation.
- No legal determination, TPIA compliance, TRAIGA compliance, public-record completeness, public portal behavior, or official disclosure approval claim.
- V2-C is presentation/choreography/reliability only; no root/shared contracts, protected runtime substrates, Auth0/Vercel/env/package/deploy/config/secret/security surfaces, or manual proof statuses changed.
- V2-B Demo UI Clarity is presenter hierarchy only; no shared contracts, dashboard scenarios, package files, auth/config/deploy/env/security surfaces, or root runtime substrates changed.
- V2-D++ is demo/proof theater only; no shared contracts, dashboard scenarios, package files, auth/config/deploy/env/security surfaces, root runtime substrates, root ForensicChain writes, model/API behavior, external service calls, or manual/global proof statuses changed.

## Visual Proof Status

- 1920x1080 visual proof: HOLD; screenshot-level proof remains not verified.
- 1280x720 visual proof: HOLD; screenshot-level proof remains not verified.

## Final V1 Verification Posture

- Dashboard tests: `36` passing / `0` failing across `14` dashboard test files.
- Repo-wide JS tests: `511` passing / `0` failing.
- Remaining visual HOLDs: 1920x1080 and 1280x720 screenshot-level proof remain not screenshot-verified.

## V2-A Live Mode Verification Posture

Packet A8 closeout records the current dashboard typecheck, dashboard tests, dashboard build, and repo-wide JS verification after V2-A Live Mode. Live Mode remains local/optional and does not change snapshot-default truth.

## V2-B Foreman/Auth Dashboard Verification Posture

B7 records dashboard suite `236` passing and repo-wide JS tests `717/717` for the local/pre-deployment Foreman/Auth proof cockpit. The Code Quality + Demo Hardening FAST lane after Optional Packet 4 records dashboard suite `239/239` and repo-wide JS tests `719/719`. AUTH-5 records deployed Vercel/Auth0 demo proof at `https://meridian-holdpoint.vercel.app`: remote dashboard load, Auth0 hosted login/callback return, and two eval-role mappings. Mobile/judge device proof, full authority choreography proof, clean logout proof, deploy hook cleanup proof, OpenFGA/CIBA/notification/legal/public-portal behavior, and final V2-B closeout remain HOLD.

## V2-C Demo Presentation Layer Verification Posture

V2-C records the dashboard-local Demo Presentation Layer in `docs/specs/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER.md` and `docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md`. DEMO-1 through DEMO-10 are implementation-complete.

## V2-D++ Embodied Foreman Civic Proof Theater Verification Posture

V2-D++ records the dashboard-local Embodied Foreman Civic Proof Theater in `docs/specs/MERIDIAN_V2D_EMBODIED_FOREMAN_CIVIC_PROOF_THEATER.md` and `docs/closeouts/MERIDIAN_V2D_EMBODIED_FOREMAN_CIVIC_PROOF_THEATER_CLOSEOUT.md`. D1-D14 are implementation-complete. D15 validated dashboard suite `593/593`, repo-wide JS suite `719/719`, dashboard typecheck green, dashboard build green, and no shared contract migration requirement. Mobile/judge-device proof, phone smoke, Walk-mode MP4 proof, full authority choreography screenshots, clean logout proof, deploy-hook cleanup proof, production/legal/live-city/OpenFGA/CIBA/notification/public-portal/model/API/audio/root-ForensicChain claims, and final V2-B closeout remain HOLD.

## V2-B Demo UI Clarity Verification Posture

`docs/closeouts/MERIDIAN_V2B_DEMO_UI_CLARITY_CLOSEOUT.md` records the Presenter Cockpit hardening pass over the shipped dashboard proof surfaces. The V2-C/UI Clarity floor was dashboard suite `285/285`, repo-wide JS suite `719/719`, dashboard typecheck green, and dashboard build green. Tim-supplied deployed visual proof at `https://meridian-holdpoint.vercel.app` clears screenshot-level proof for the UI clarity pass only. Eval account warm-tabs, phone smoke, mobile/judge-device smoke proof, full authority choreography screenshots, Walk-mode MP4 proof, clean logout proof, deploy-hook cleanup proof, OpenFGA/CIBA/notification/legal/public-portal/official workflow/production city claims, and final V2-B closeout remain HOLD.
