# Meridian V2-D++ Embodied Foreman Civic Proof Theater

Status: V2-D++ shipped / D1-D14 implementation complete / D15 validation gate passed / D16 finish-lane current.

## Purpose

V2-D++ is the dashboard-local Embodied Foreman Civic Proof Theater. It makes the shipped Meridian demo/proof surfaces easier to conduct, inspect, challenge, and reset in a room-facing demo posture.

V2-D++ is a demo/proof theater. It does not ship production city infrastructure, live city integration, legal sufficiency, official Fort Worth workflow, public portal behavior, OpenFGA, CIBA, delivered notifications, model/API-backed Foreman behavior, external voice service, Whisper/audio upload/transcription, or root ForensicChain writes.

Foreman in V2-D++ is deterministic and source-bounded. Foreman Autonomous conducts a scripted proof sequence; it does not create governance, authority, absence, forensic, legal, city, deployment, or production truth.

## Current Validated Baseline

D15 validated the V2-D++ floor from the repo at `C:/dev/Meridian/app` on `main` with local `HEAD` and `origin/main` aligned at `1a2d0fc5c80b63482c499e79ce1da27e5120372a`.

Validated floor:

- Dashboard tests: `593/593`.
- Repo-wide JS tests: `719/719`.
- Dashboard typecheck: PASS.
- Dashboard build: PASS.
- `git diff --check`: PASS.
- D1-D14 lineage: PASS.
- Protected surfaces: PASS.
- D16 readiness: PASS.

## Shipped D1-D14 Packet Summary

| Packet | Status | Shipped truth |
|---|---|---|
| D1 | PASS | Mission playback substrate for Guided Mission and Foreman Autonomous modes. |
| D2 | PASS | Foreman Autonomous policy and mission cues. |
| D3 | PASS | Foreman Autonomous conductor for deterministic scripted proof sequencing. |
| D4 | PASS | Mission physical projection state and proof target visibility. |
| D5 | PASS | Embodied Foreman Avatar Bay. |
| D6 | PASS | Proof Spotlight over proof targets. |
| D7 | PASS | Absence Shadow Map over expected missing evidence. |
| D8 | PASS | Authority Handoff Theater for local deterministic authority transfer visualization. |
| D9 | PASS | Judge Touchboard with bounded preauthored challenge cards. |
| D10 | PASS | Civic Twin Diorama rendering fictional Permit #4471 from committed demo/snapshot posture. |
| D11 | PASS | Forensic Receipt Ribbon for demo mission receipt tickets only. |
| D12 | PASS | Mission Run Receipt Panel with browser-native print only. |
| D13 | PASS | Mission Control Physical Mode as stage-facing layout only. |
| D14 | PASS | Rehearsal Certification, Failure Injection, and reliability guards for no-audio, reduced-motion, reset, second-run, failure/fallback, forbidden claims, and full-theater mounting. |

## Dashboard-Local Contract Posture

V2-D++ adds dashboard-local demo/proof contracts only. These are not promoted as shared root contracts and do not require a `MIGRATIONS.md` row:

- `meridian.v2d.missionPlaybackPlan.v1`
- `meridian.v2d.foremanAutonomousPolicy.v1`
- `meridian.v2d.foremanMissionCue.v1`
- `meridian.v2d.foremanAutonomousConductor.v1`
- `meridian.v2d.missionPhysicalProjection.v1`
- `meridian.v2d.proofSpotlightTargets.v1`
- `meridian.v2d.absenceShadowSlots.v1`
- `meridian.v2d.authorityHandoffBeats.v1`
- `meridian.v2d.civicTwinDiorama.v1`
- `meridian.v2d.foremanEmbodiedState.v1`
- `meridian.v2d.proofSpotlightView.v1`
- `meridian.v2d.authorityHandoffView.v1`
- `meridian.v2d.judgeTouchboardDeck.v1`
- `meridian.v2d.missionEvidenceNavigator.v1`
- `meridian.v2d.civicTwinDioramaView.v1`
- `meridian.v2d.missionReceiptTicket.v1`
- `meridian.v2d.missionRunReceipt.v1`
- `meridian.v2d.missionPhysicalModeView.v1`
- `meridian.v2d.missionRehearsalCertification.v1`
- `meridian.v2d.missionFailureInjection.v1`
- `meridian.v2d.missionReliabilityGuards.v1`

## Feature Inventory

- Guided Mission is a real, tested operator-paced path.
- Foreman Autonomous is a real, tested deterministic path that conducts the scripted proof sequence.
- Embodied Foreman Avatar Bay renders deterministic embodied state.
- Proof Spotlight makes proof targets visible.
- Absence Shadow Map makes expected missing evidence visible.
- Authority Handoff Theater visualizes local deterministic authority transfer.
- Judge Touchboard enables bounded preauthored challenge cards.
- Evidence Navigator routes challenge/proof card context without open-ended Q&A.
- Civic Twin Diorama renders fictional Permit #4471 from committed demo/snapshot state only.
- Forensic Receipt Ribbon records demo mission receipt tickets only.
- Mission Run Receipt Panel uses browser-native print only.
- Mission Control Physical Mode is a stage-facing layout mode only.
- Rehearsal Certification and Failure Injection are dashboard-local readiness checks.
- Reliability guards protect no-audio, reduced-motion, reset, second-run, failure/fallback, forbidden claims, and full-theater mounting.

## Test Posture

- D0 baseline: dashboard `285/285`, repo-wide JS `719/719`.
- D1-D3 checkpoint: dashboard `361/361`.
- D4 checkpoint: dashboard `387/387`.
- D5 checkpoint: dashboard `414/414`.
- D6 checkpoint: dashboard `428/428`.
- D7 checkpoint: dashboard `458/458`.
- D8 checkpoint: dashboard `482/482`.
- D9 checkpoint: dashboard `505/505`.
- D10 checkpoint: dashboard `519/519`.
- D11 checkpoint: dashboard `539/539`.
- D12 checkpoint: dashboard `548/548`.
- D13 checkpoint: dashboard `571/571`.
- D14/D15 floor: dashboard `593/593`.
- Repo-wide JS floor remains `719/719`.
- V2-D++ dashboard test delta from D0 to D15: `+308`.
- Repo-wide JS delta: `0`.

## Protected Surfaces

D15 validated protected surface preservation. D16 finish-lane docs preserve the same boundary:

- No dashboard source edits in D16.
- No dashboard test edits in D16.
- No root `src/**` edits in D16.
- No `src/governance/**`, `src/governance/forensic/**`, `src/live/**`, `src/live/authority/**`, `src/live/absence/**`, or `src/skins/**` edits in D16.
- No `dashboard/public/scenarios/**` edits in D16.
- No `dashboard/api/authority-requests.js` edits in D16.
- No package, lock, Vite, Vercel, Auth0, env, deploy, config, secret, or security edits in D16.
- No `MIGRATIONS.md` edit in D16.

## Explicit Non-Goals

V2-D++ does not ship:

- Production city infrastructure.
- Production city status.
- Official Fort Worth workflow.
- Legal, TPIA, or TRAIGA sufficiency.
- Public portal behavior.
- Live OpenFGA.
- CIBA.
- Delivered notifications.
- Model/API-backed Foreman behavior.
- Browser-exposed model API keys.
- Open-ended Q&A or freeform judge input.
- External voice service.
- Whisper/audio upload/transcription.
- Root ForensicChain writes from dashboard receipts.
- Legal audit trail behavior.
- Live GIS, Accela, or official city record behavior.
- Mobile/judge-device proof.

## Carried HOLDs

- Mobile / judge-device proof.
- Full authority choreography screenshot proof.
- Clean logout proof.
- Deploy-hook cleanup proof.
- Final V2-B closeout.
- Walk-mode MP4 proof.
- Phone smoke.
- Production city status.
- Official Fort Worth workflow.
- Legal/TPIA/TRAIGA sufficiency.
- Public portal behavior.
- Live OpenFGA.
- CIBA.
- Delivered notifications.
- Model/API-backed Foreman.
- External voice service.
- Whisper/audio upload/transcription.
- Root ForensicChain writes.

Rehearsal Certification does not prove mobile/judge-device smoke. Manual/global HOLDs remain unresolved.

## Operation / Run Posture

- Snapshot mode remains the default safe path.
- V2-D++ theater operation is dashboard-local.
- Foreman Autonomous can conduct the scripted proof sequence but cannot create truth.
- Mission Run Receipt uses browser-native print only.
- Receipt Ribbon is demo mission receipt only and is not a legal audit trail.
- Civic Twin Diorama is fictional Permit #4471 / committed demo-snapshot state only.
- Civic Twin Diorama is not live GIS, Accela, or an official city record.
- Failure Injection is a dashboard-local readiness check, not proof of production resilience.
- Rehearsal Certification is dashboard-local readiness posture only and does not close manual proof HOLDs.

## No-Migration Rationale

Shared contracts changed: NO.

Dashboard-local contracts added: YES.

`MIGRATIONS.md` touched: NO.

Migration required: NO.

The V2-D++ contract family is dashboard-local demo/proof theater posture only. It does not widen root/shared runtime contracts, V1 contracts, V2-A contracts, V2-B/GARP contracts, LiveFeedEvent kinds, ForensicChain vocabulary, package dependencies, auth/config/deploy/env surfaces, or protected runtime surfaces.

## Next-Step Posture

Recommended next action: CR review final V2-D++ closeout.

Do not close carried manual/global HOLDs without separate proof. Do not widen Foreman beyond deterministic dashboard-local theater behavior without a later Tim-approved packet.
