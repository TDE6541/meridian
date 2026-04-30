# Meridian V2-F Foreman Simplification + Voice Closeout

## Status

PASS locally / deployed proof HOLD / screenshot proof HOLD.

## Purpose

Record V2-F Foreman Simplification + Voice:

One voice. One card. One button. Six acts. Review Mode reveals the cockpit.

The city did not act because Meridian found the missing authority/evidence boundary. The Foreman explained the hold. The chain proves it.

This closeout records dashboard-local presentation and browser-native voice/fallback truth only.

## Changes Made

- Created `docs/specs/MERIDIAN_V2F_FOREMAN_SIMPLIFICATION_VOICE.md`.
- Created this closeout for V2-F shipped simplification and voice truth.
- Synced current-truth front doors and dashboard README so future agents can route to V2-F without widening runtime scope.
- Updated the maintained master closeout compilation additively.
- Left `MIGRATIONS.md` unchanged because no shared/root contract changed.

No P0 patch was applied in F3. Local browser proof did not reveal a demo blocker.

## Acceptance Criteria

| Item | Status | Evidence |
|---|---|---|
| Local verification | PASS | Dashboard typecheck, dashboard tests, dashboard build, repo-wide JS, and `git diff --check` passed in F3. |
| Browser proof | PASS | Chrome headless CDP proof passed at `http://127.0.0.1:5173/`. |
| Deployed proof | HOLD | `https://meridian-holdpoint.vercel.app/` redirected to `vercel.com/login?...` in this environment, so the Meridian mission shell was not observable. |
| Screenshot proof | HOLD | No approved screenshot/proof storage location existed for this lane; F3 did not invent a storage convention. |
| Docs/front-door sync | PASS | V2-F routing added to approved current-truth surfaces. |
| No contract/migration widening | PASS | F3 touched docs/front-door files only and did not edit `MIGRATIONS.md`, package/config/auth/deploy/env files, root runtime, dashboard source, tests, scenarios, or authority endpoint files. |

## Verification Commands / Results

- `npm --prefix dashboard run typecheck`: PASS.
- `npm --prefix dashboard test`: PASS, `605/605`.
- `npm --prefix dashboard run build`: PASS; Vite reported the existing large-chunk advisory only.
- `npm test`: PASS, `719/719`.
- `git diff --check`: PASS.

## Browser Proof Result

Local URL used:

```text
http://127.0.0.1:5173/
```

Tooling:

```text
Chrome headless CDP
```

| Browser proof item | Status |
|---|---|
| Default state loads | PASS |
| Begin Mission enters active mission | PASS |
| Act 1 Capture | PASS |
| Act 2 Authority | PASS |
| Act 3 Governance | PASS |
| Act 4 Absence | PASS |
| Act 5 Chain | PASS |
| Act 6 Public | PASS |
| Finish / Review enters Review Mode | PASS |
| Review Mode restores full cockpit/proof wall | PASS |
| Forbidden active-mission strings | PASS, none observed |

Observed active act order:

```text
capture -> authority -> governance -> absence -> chain -> public
```

Act 1 proof observed Mission Rail, compact Foreman state, one Foreman line, one focal card, and one enabled `Next Act` button.

Act 4 proof observed the HOLD focal card immediately, an empty Foreman line at approximately 1500ms, the absence line after the 3000ms silence window, and Next Act unlock after narration/fallback completion.

Forbidden active-mission strings checked:

```text
Presenter Cockpit
R1
R1 (1/4)
EXISTING SCENARIO SNAPSHOT STATE
EXISTING MISSION PLAYBACK STATE
AWAITING MISSION PLAYBACK
AWAITING EXISTING STATE
PROOF AVAILABLE NEXT
AUDIENCE FRAMES
REDUCED MOTION SAFE
proof-target-capture-source-card
dashboard/src/demo/fictionalPermitAnchor.ts
current_focal_card
mission-run-1
VOICE / FALLBACK: Not started
BOUNDED LINE
ATTENTION TARGET
source refs
internal file refs
visible component IDs
```

None were observed in the active-mission surface.

## Deployed Proof Result

Status: HOLD.

Attempted URL:

```text
https://meridian-holdpoint.vercel.app/
```

Observed result:

```text
https://vercel.com/login?next=...
```

The deployed proof environment reached Vercel login instead of the Meridian mission shell. Because the actual deployed dashboard was not observable, F3 does not claim deployed PASS, latest F1+F2 build visibility, six-act deployed behavior, deployed voice/fallback behavior, deployed Review Mode, or deployed forbidden-string clearance.

Manual deployed proof checklist remains:

1. Open `https://meridian-holdpoint.vercel.app/` in an environment that can reach the Meridian dashboard, not Vercel login.
2. Confirm the latest F1+F2 build is visible: one voice, one card, one button, six acts, Review Mode reveals the cockpit.
3. Click Begin Mission.
4. Advance Capture, Authority, Governance, Absence, Chain, and Public.
5. Confirm Act 4 shows the HOLD card immediately, stays silent for approximately 3000ms, then starts voice or typed fallback.
6. Confirm Next Act waits and unlocks after narration/fallback.
7. Click Finish / Review and confirm the full cockpit/proof wall returns.
8. Confirm forbidden active-mission debug/source/internal strings are not visible.

## Screenshot Proof Result

Status: HOLD.

F3 did not create screenshot files because no approved proof/screenshot storage location existed in the repo for this lane. Required manual screenshot checklist remains:

1. Default state.
2. Act 1 Capture.
3. Act 4 Absence.
4. Act 6 Public.
5. Review Mode.

## Contract / Migration Status

Shared contract changed: NO.

Migration row required: NO.

Dashboard source/test/scenario changed by F3: NO.

Root runtime/governance/authority/ForensicChain/data-contract behavior changed by F3: NO.

`MIGRATIONS.md` touched: NO.

## Test Count Delta

- Dashboard before F3: `605/605`.
- Dashboard after F3: `605/605`.
- Repo-wide JS before F3: `719/719`.
- Repo-wide JS after F3: `719/719`.
- F3 docs/front-door delta: no test-count change.

## Remaining HOLDs

- Deployed proof: HOLD because the requested deployed URL redirected to Vercel login in this proof environment.
- Screenshot proof: HOLD because no approved screenshot/proof storage location existed for F3.
- Eval account warm-tabs, phone smoke, mobile/judge-device proof, full authority choreography screenshots, Walk-mode MP4 proof, clean logout proof, deploy-hook cleanup proof, final V2-B closeout, DEMO-14 live use, and broader manual/global proof items remain HOLD.
- Production city behavior, official Fort Worth workflow, legal/TPIA/TRAIGA sufficiency, live OpenFGA, CIBA, delivered notifications, public portal behavior, model/API-backed Foreman, external voice service, Whisper/audio upload/transcription, MediaRecorder/getUserMedia, live GIS/Accela automation, live city integration, and root ForensicChain writes remain unshipped.

## Front-Door Sync Status

PASS: V2-F routing was added to:

- `README.md`
- `REPO_INDEX.md`
- `AGENTS.md`
- `CLAUDE.md`
- `AI_EXECUTION_DOCTRINE.md`
- `CONTRIBUTING.md`
- `docs/INDEX.md`
- `docs/UI_INDEX.md`
- `docs/WHERE_TO_CHANGE_X.md`
- `docs/closeouts/README.md`
- `dashboard/README.md`
- `docs/closeouts/MERIDIAN_MASTER_CLOSEOUT_COMPILATION.md`

## Publication Evidence

- F3 starting HEAD / F1+F2 baseline: `441533bd54040b70b9b38dd8319aadc7913fde70`.
- F3 started from `main` aligned with `origin/main`.
- Final commit SHA, push status, `HEAD == origin/main`, and working-tree status are recorded in the F3 session closeout after Git creates the content-derived finish commit.

## Lane Routing Confirmation

PASS: F3 is a proof/finish lane only. Runtime, dashboard source, dashboard tests, root `src/**`, package/config/auth/env/deploy/security, dashboard scenario, dashboard authority endpoint, and migration files remained out of scope.

## Final Signoff

V2-F is complete locally as dashboard-local Foreman simplification and voice/fallback proof.
