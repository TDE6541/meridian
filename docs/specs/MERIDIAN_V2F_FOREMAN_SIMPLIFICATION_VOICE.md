# Meridian V2-F Foreman Simplification + Voice

Status: V2-F shipped / F1-F2 implementation complete / F3 proof-finish current.

## Purpose

V2-F records the dashboard-local Foreman simplification and voice work that makes the Meridian proof path legible as:

One voice. One card. One button. Six acts. Review Mode reveals the cockpit.

The governing demo thesis is:

The city did not act because Meridian found the missing authority/evidence boundary. The Foreman explained the hold. The chain proves it.

V2-F is presentation and browser-native voice wiring only. It is not feature expansion, runtime expansion, contract expansion, or production civic infrastructure.

## Scope

V2-F scope is dashboard-local mission walkthrough simplification and voice/fallback behavior only:

- active mission mode simplifies to one Foreman line, one focal card, and one Next/Finish button
- Mission Rail remains visible during active mission mode
- compact Foreman state remains visible during active mission mode
- full cockpit and proof wall return in completion-derived Review Mode
- narration uses the existing B6 browser-native voice support through a dashboard-local mission narration adapter
- typed fallback remains visible when speech is unavailable or errors
- Act 4 Absence uses a 3000ms silence before narration or typed fallback begins

F3 records shipped truth only. It does not add new dashboard behavior, dashboard data contracts, root runtime contracts, packages, auth/deploy/env changes, or shared migrations.

## Shipped Behavior

| Packet | Status | Shipped truth |
|---|---|---|
| F1/F2 | PASS | Simplified guided mission walkthrough narration and active mission presentation so the judge-facing path uses one Foreman line, one focal card, and one Next/Finish button across six acts. |
| F3 | PASS/HOLD | Local verification and local browser proof passed. Deployed proof and screenshot proof remain HOLD in this environment. |

## Six-Act Sequence

V2-F preserves the existing mission playback order:

1. Capture
2. Authority
3. Governance
4. Absence
5. Chain
6. Public

The mission state still comes from the existing dashboard-local playback path. V2-F does not add a new state machine.

## Voice / Fallback Behavior

- Voice output uses the existing dashboard-local browser-native speech path from the B6 Foreman voice support.
- The mission narration adapter pins one line per act.
- Speech unavailable/error paths use typed fallback instead of blocking the demo.
- Act 4 Absence intentionally renders the HOLD focal card immediately, holds silence for 3000ms, and only then starts narration or typed fallback.
- Next Act waits until narration/fallback completion.
- No external voice service is used.
- No model/API calls are made.
- No Whisper/audio upload/transcription is used.
- No MediaRecorder/getUserMedia path is added.

## Explicit Non-Goals

V2-F does not ship:

- new root runtime behavior
- new governance behavior
- new authority behavior
- new absence detection
- new state machine
- new contracts
- new packages or dependencies
- Auth0 or Vercel config changes
- external voice service
- model/API-backed Foreman
- Whisper/audio upload/transcription
- MediaRecorder/getUserMedia
- root ForensicChain writes
- production city behavior
- legal, TPIA, or TRAIGA sufficiency
- official Fort Worth workflow
- live city integration
- live GIS/Accela automation
- live OpenFGA
- CIBA
- delivered notifications
- public portal behavior

## Proof Posture

F3 local proof used:

```text
http://127.0.0.1:5173/
```

Local browser proof observed:

- default state loaded
- Begin Mission entered active mission
- Capture, Authority, Governance, Absence, Chain, and Public advanced in order
- Act 1 included Mission Rail, compact Foreman state, one Foreman line, one focal card, and one Next Act button
- Act 4 rendered the HOLD focal card immediately
- Act 4 stayed silent at approximately 1500ms
- Act 4 narration/fallback line appeared after the 3000ms silence window
- Act 6 Finish / Review entered Review Mode
- Review Mode restored the full cockpit/proof wall
- forbidden active-mission debug/source strings were not visible

Deployed proof remains HOLD for F3 because `https://meridian-holdpoint.vercel.app/` redirected to Vercel login in this environment and did not expose the Meridian mission shell.

Screenshot proof remains HOLD for F3 because no approved committed screenshot/proof storage location was present for this lane, and F3 did not invent one.

## Contract / Migration Status

Shared contracts changed: NO.

Dashboard source changed by F3: NO.

`MIGRATIONS.md` touched by F3: NO.

Migration required: NO.

V2-F records dashboard-local presentation and browser-native voice/fallback truth only. It does not widen root/shared runtime contracts, V1 contracts, V2-A contracts, V2-B/GARP contracts, V2-C/V2-D++/V2-E dashboard-local contracts, LiveFeedEvent kinds, ForensicChain vocabulary, package dependencies, auth/config/deploy/env surfaces, or protected runtime surfaces.

## Carried HOLDs

- Deployed proof remains HOLD until the stable URL exposes the Meridian mission shell to the proof environment or Tim supplies manual deployed evidence.
- Screenshot proof remains HOLD until an approved proof/screenshot storage convention is supplied or a later lane approves screenshot artifact storage.
- Broader V2-C/V2-D++/V2-E manual/global proof HOLDs remain unchanged.
- Production, legal, live-city, OpenFGA, CIBA, notification, public-portal, model/API, audio-upload, and root-ForensicChain claims remain unshipped.
