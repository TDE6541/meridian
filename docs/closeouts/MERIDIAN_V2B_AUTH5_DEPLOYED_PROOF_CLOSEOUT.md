# Meridian V2-B AUTH-5 Deployed Proof Closeout

## Status

AUTH-5 deployed Vercel/Auth0 demo proof closeout for the Meridian V2-B Foreman/Auth cockpit.

- Branch: `main`
- Pre-AUTH-5 local/pre-deployment truth: `399021e docs(foreman): sync v2b local proof cockpit truth`
- AUTH-5 production-build fix: `3cc2072 fix(auth): embed vite auth0 config in production build`
- Stable deployed demo URL: `https://meridian-holdpoint.vercel.app`
- Signoff split: deployed demo proof PASS for the bounded evidence below; final production city system, full authority choreography, mobile/judge smoke, clean logout proof, deploy-hook cleanup proof, and final V2-B closeout remain HOLD.

## Purpose

Record Tim's manual Vercel/Auth0 proof session and sync current repo truth so future agents can distinguish AUTH-5 deployed demo proof from production, live-city, legal, OpenFGA, CIBA, public-portal, notification-delivery, or final V2-B claims.

## Manual Proof Source Note

This closeout is based on Tim's manual Vercel/Auth0 proof report supplied to Codex for AUTH-5. Codex did not edit Vercel settings, Auth0 settings, env values, deploy hooks, or secrets in this finish lane.

## Deployed Proof Summary

- Vercel project was created under the Holdpoint Vercel team.
- Correct Git repository connection was fixed to `TDE6541/meridian` on branch `main`.
- Vercel build settings were configured with root directory `dashboard`, Vite preset, build command `npm run build`, output directory `dist`, and install command `npm install`.
- Vercel production deployment reached `Ready / Latest`.
- Stable production-environment demo URL loads: `https://meridian-holdpoint.vercel.app`.
- Dashboard loads remotely.
- Initial remote posture showed `AUTH0 LOGIN UNAVAILABLE; PUBLIC MODE ACTIVE`.
- After the AUTH-5 patch at `3cc2072`, the dashboard changed to `AUTH0 LOGIN CONFIGURED`.
- Login button routed to the Auth0 hosted login page.
- Auth0 client was recognized and login callback returned to the Meridian dashboard.
- Authenticated eval-role proof rendered for:
  - `permitting_staff` / `permitting`
  - `council_member` / `public`
- Role-based allowed skins rendered:
  - `permitting_staff`: `permitting`, `operations`
  - `council_member`: `council`, `public`
- Deployed dashboard visibly rendered the snapshot dashboard, scenario selector, cascade steps, governance state panel, forensic chain panel, entity relationships panel, disclosure preview, and GARP authority panel with shared endpoint connected.

## AUTH-5 Code Patch Summary

Commit `3cc2072 fix(auth): embed vite auth0 config in production build` changed only:

- `dashboard/src/auth/authConfig.ts`
- `dashboard/tests/auth0-config.test.ts`

The patch corrected frontend Vite Auth0 config access for production builds and added regression coverage. It did not change shared contracts, package files, Vercel/Auth0 settings, secrets, runtime authority behavior, OpenFGA, CIBA, notifications, public portal behavior, legal behavior, model/API behavior, voice service behavior, or root ForensicChain behavior.

## Acceptance Criteria

### PASS

- PASS: Vercel production deployment exists and is `Ready / Latest`.
- PASS: Stable production URL loads: `https://meridian-holdpoint.vercel.app`.
- PASS: Dashboard loads remotely.
- PASS: Auth0 config is embedded into the production build after `3cc2072`.
- PASS: Auth0 hosted login page is reached.
- PASS: Auth0 callback returns to Meridian.
- PASS: At least two authenticated eval role mappings are proven: `permitting_staff` / `permitting` and `council_member` / `public`.
- PASS: `permitting_staff` allowed skins render as `permitting` and `operations`.
- PASS: `council_member` allowed skins render as `council` and `public`.
- PASS: GARP shared endpoint reports connected.
- PASS: Disclosure preview and local/non-legal boundary text render.
- PASS: Snapshot scenario, governance, forensic, entity, cascade, disclosure, and GARP authority panels render on the deployed dashboard.
- PASS: No secrets were committed.
- PASS: No production city, live Fort Worth, legal/TPIA sufficiency, live OpenFGA, CIBA, public portal, delivered notification, external voice service, model/API call, or root ForensicChain write claim is introduced.

### HOLD

- HOLD: Mobile / judge-device smoke proof is not yet proven.
- HOLD: Full authority submit/approve/deny choreography is not fully screenshot-proven.
- HOLD: Clean logout success screenshot proof remains pending because the proof session found an Auth0 logout URL mismatch and manually adjusted by allowing `/callback`.
- HOLD: Deploy hook cleanup proof remains pending; Tim should delete the exposed deploy hook manually and provide proof before cleanup is claimed.
- HOLD: OpenFGA, CIBA, notification-delivery, legal/TPIA sufficiency, public-portal behavior, official Fort Worth workflow, and production city behavior remain unproven and unshipped.

### FAIL

- FAIL: None recorded in the AUTH-5 manual proof input.

## Contract / Migration Status

- No shared contract migration row is required.
- AUTH-5 changed frontend Auth0 config access and one regression test only.
- `MIGRATIONS.md` remains unchanged.
- Existing V2-B/GARP `meridian.v2.roleSessionProof.v1` posture remains the recorded role-session proof contract.
- The AUTH-5 deployed proof does not promote dashboard-local Foreman guide strings into root/shared runtime contracts.

## Test Count / Verification Status

- B7 local/pre-deployment proof floor before AUTH-5: dashboard tests `236/236`; repo-wide JS tests `717/717`.
- AUTH-5 patch verification for `3cc2072`: `npm --prefix dashboard test` PASS, `npm --prefix dashboard run build` PASS, `git diff --check` PASS, and push to `origin/main` PASS.
- AUTH-5 finish-lane documentation verification on 2026-04-28: `npm --prefix dashboard test` PASS, `npm --prefix dashboard run build` PASS, `npm test` PASS (`717/717` repo-wide JS tests), `git diff --check` PASS with CRLF normalization warnings only, and `git status -sb` shows only scoped documentation changes before staging.
- Python verification was not run because this closeout touched documentation/front-door surfaces only and no Python files or pipeline behavior changed.
- This closeout lane is documentation/front-door truth sync only; it does not change runtime behavior or package contents.

## Front-Door Sync Status

Current-truth front doors now route to this AUTH-5 closeout for deployed demo proof status while preserving B7 as the local/pre-deployment proof cockpit closeout.

Front-door truth after AUTH-5:

- V2-B Foreman/Auth local stack remains shipped.
- AUTH-5 deployed proof is recorded.
- Production-environment demo URL: `https://meridian-holdpoint.vercel.app`.
- Auth0-backed deployed login and role-session proof are proven for at least two eval roles.
- Deployment remains a demo/proof cockpit, not production civic infrastructure.
- Remaining HOLDs remain explicit.

## Remaining HOLDs

- Mobile / judge-device smoke proof.
- Full authority submit/approve/deny choreography screenshot proof.
- Clean logout success screenshot proof.
- Deploy hook cleanup proof.
- OpenFGA behavior.
- CIBA behavior.
- Notification delivery.
- Legal/TPIA sufficiency.
- Public portal behavior.
- Official Fort Worth workflow.
- Production city system status.
- Final V2-B closeout.

## Explicit Non-Claims

AUTH-5 does not claim:

- production city infrastructure
- live Fort Worth city integration
- official Fort Worth workflow status
- legal/TPIA sufficiency
- public portal behavior
- OpenFGA behavior
- CIBA behavior
- notification delivery
- live browser push, email sending, or service worker behavior
- model/API calls
- external voice service
- Whisper/audio upload/transcription
- root ForensicChain writes from the dashboard endpoint
- full authority submit/approve/deny choreography proof
- mobile or judge-device proof
- clean logout proof
- deploy hook cleanup
- final V2-B closure

## Next Action

Tim should delete the exposed Vercel deploy hook, then provide proof for deploy-hook cleanup, clean logout success, mobile/judge-device smoke, and full authority submit/approve/deny choreography if those should move from HOLD to PASS in a later closeout.

## Signoff Status

- AUTH-5 deployed demo proof: PASS for the bounded evidence recorded above.
- Production/live-city/legal/OpenFGA/CIBA/public-portal/notification-delivery behavior: HOLD.
- Final V2-B closeout: HOLD.
