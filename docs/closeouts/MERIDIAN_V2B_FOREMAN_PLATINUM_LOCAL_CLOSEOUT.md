# Meridian V2-B Foreman Platinum Local Closeout

## Status

Local/pre-deployment closeout for the V2-B Foreman/Auth dashboard stack.

- Branch: `main`
- Remote posture: remote-backed on `origin/main`
- Pre-B7 baseline: `a7aab14 feat(foreman): add voice and avatar state`
- Signoff split: local V2-B Foreman/Auth stack PASS; final deployed/demo proof HOLD.

This closeout records shipped local/pre-deployment truth only. It does not claim deployed Vercel proof, live Auth0 callback/login proof, production auth posture, live city integration, public portal behavior, legal/TPIA sufficiency, official Fort Worth workflow status, OpenFGA behavior, CIBA, sent notifications, model/API calls, external voice service behavior, or root ForensicChain writes from the dashboard endpoint.

## Packet Summary

### B1 Through B6

- B1 shipped deterministic dashboard-local Foreman guide context through `meridian.v2.foremanGuideContext.v1`, structured HOLDs, and preserved source refs.
- B2 shipped the offline Foreman panel and deterministic source-bounded responses through `meridian.v2.foremanGuideResponse.v1`.
- B3 shipped authority-aware role/session, GARP handoff, disclosure/public-boundary, and authority challenge narration while holding legal/TPIA, OpenFGA, CIBA, and delivered-notification questions.
- B4 shipped guided event binding through `meridian.v2.foremanGuideSignal.v1`, proactive narration, pause/resume controls, registry-bounded spatial awareness, and visual-only panel highlighting.
- B5 shipped `meridian.v2.foremanGuideMode.v1` with Walk, Absence, Challenge, Public, and Judge modes.
- B6 shipped browser-native speech output, optional browser-native speech input, typed fallback, and deterministic avatar state with no external voice service, no Whisper/audio upload/transcription, no MediaRecorder/getUserMedia path, and no model/API calls.

### AUTH-1 Through AUTH-4

- AUTH-1 shipped dashboard-local Auth0 JWT role-session mapping from `https://meridian.city/roles` into `meridian.v2.roleSessionProof.v1`, with unauthenticated and missing-env fallback to public snapshot mode.
- AUTH-2 shipped the shared in-memory local endpoint `/api/authority-requests` with create/list/resolve/reset behavior and event-compatible payloads: `AUTHORITY_RESOLUTION_REQUESTED`, `AUTHORITY_APPROVED`, and `AUTHORITY_DENIED`.
- AUTH-3 shipped the shared authority client, polling/manual refresh state, submit/approve/deny/endpoint HOLD fallback, and shared authority display/event mapping into the existing authority timeline UI.
- AUTH-4 shipped dashboard-local Vercel config and setup documentation only, with no deployment proof.

### Proof Harness Sync

- Dashboard tests are discovered by the normal dashboard test command.
- Current B7 verification floor records dashboard suite `236` passing and repo-wide JS suite `717/717` passing.

## Changes Made In B7

- Added `docs/specs/MERIDIAN_V2B_FOREMAN_GUIDED_PROOF_COCKPIT.md`.
- Added `docs/closeouts/MERIDIAN_V2B_FOREMAN_PLATINUM_LOCAL_CLOSEOUT.md`.
- Synced approved front-door/current-truth docs to route future agents to the B7 spec and closeout.
- Updated `dashboard/README.md` with local run commands, Vercel/Auth0 setup posture, `/api/authority-requests`, demo smoke checklist, voice fallback posture, and remaining deployment proof HOLDs.
- Recorded migration posture: no B7 `MIGRATIONS.md` row required because the B1-B6 Foreman guide strings are dashboard-local proof cockpit strings and do not widen root/shared runtime contracts; existing `meridian.v2.roleSessionProof.v1` is already covered by the V2-B/GARP row.

## Acceptance Criteria

- PASS: Spec exists and names shipped truth only.
- PASS: Local/pre-deployment closeout exists.
- PASS: Front-door docs route to the B7 spec and closeout.
- PASS: Dashboard README reflects current local/demo-day and deployment-prep truth.
- PASS: GARP remains described as the authority runway, not full Foreman.
- PASS: Foreman remains described as the guide/explainer layer.
- PASS: Deployment/live Auth0 proof remains HOLD.
- PASS: No final production/deployment/legal/public-portal claim is introduced.
- PASS: No browser-exposed model API key is documented.
- PASS: Historical closeouts, V1 master closeout, and V2-A closeout are not rewritten.
- PASS: No runtime, dashboard source, dashboard test, package, Vercel config, secret, or env behavior changes are made by B7.
- PASS: Migration posture is explicit and justified.
- HOLD: Final deployed/demo proof remains pending Tim manual Vercel/Auth0 setup and AUTH-5 proof.

## Contract And Migration Status

- `meridian.v2.foremanGuideContext.v1`, `meridian.v2.foremanGuideResponse.v1`, `meridian.v2.foremanGuideSignal.v1`, and `meridian.v2.foremanGuideMode.v1` are dashboard-local Foreman guide/explainer proof cockpit strings.
- `meridian.v2.roleSessionProof.v1` remains the existing V2-B/GARP role-session proof string.
- `/api/authority-requests` remains dashboard-local shared in-memory endpoint behavior.
- No B7 root/shared runtime contract change ships.
- No B7 `MIGRATIONS.md` row is required.

## Test Count Summary

- Dashboard suite: `236` passing.
- Repo-wide JS suite: `717/717` passing.

## Remaining HOLDs

- Live deployed Vercel URL proof.
- Auth0 deployed callback/login proof.
- Mobile/judge device proof.
- Deployment smoke proof.
- AUTH-5 deployment proof/finish lane.
- Final V2-B closeout after deployed URL and Auth0 callback proof.

## Front-Door Sync Status

Current-truth front doors now point to:

- `docs/specs/MERIDIAN_V2B_FOREMAN_GUIDED_PROOF_COCKPIT.md`
- `docs/closeouts/MERIDIAN_V2B_FOREMAN_PLATINUM_LOCAL_CLOSEOUT.md`

## Lane Routing Confirmation

- V1 remains closed through Wave 9; there is no Wave 10 in V1.
- V2-A remains local/demo-day live civic nervous system truth only.
- V2-B/GARP remains the authority runway.
- V2-B Foreman/Auth local proof cockpit is the guide/explainer layer and local/pre-deployment demo cockpit.
- Deployment and live Auth0 callback proof remain outside B7 and route to AUTH-5.

## Next Action

Tim manual Vercel/Auth0 setup, followed by AUTH-5 deployment proof/finish lane after deployed URL and Auth0 callback/login proof are available.

## Signoff Status

- Local V2-B Foreman/Auth stack: PASS.
- Final deployed/demo proof: HOLD.
