# Meridian V2-G Live Foreman Voice Transport Closeout

Status: implementation current; live ElevenLabs audio proof remains HOLD unless server-side env is configured and observed.

## What Shipped

V2-G adds dashboard-local live voice transport for already-produced Foreman text.

- `dashboard/api/foreman-voice.js` provides one serverless ElevenLabs text-to-speech endpoint.
- `dashboard/src/foremanGuide/liveVoiceTransport.ts` provides the same-origin browser helper for requesting and playing returned audio.
- V2-F mission act narration routes existing act lines through the live voice transport first, then falls back to the existing browser-native/typed path.
- Ask Foreman and Challenge Foreman route existing response text through the same live voice transport after the typed answer is produced.
- Typed text remains visible and authoritative.
- Audio failure does not block mission progression or Q&A rendering.

## Safety Boundary

- ElevenLabs is called server-side only.
- `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` are read only from server-side environment.
- Browser code does not read the ElevenLabs key.
- Browser code does not call the ElevenLabs domain directly.
- The endpoint does not persist text or audio and does not write files.
- No package, config, auth, deploy, secret, env file, root runtime, root shared contract, or root `src/**` surface was widened.

## What Did Not Ship

- no new Foreman Q&A behavior;
- no second answer-generation path for voice;
- no LLM/model/API-backed answer generation;
- no mic input;
- no MediaRecorder;
- no getUserMedia;
- no Whisper, speech-to-text, audio upload, or transcription path;
- no production city behavior;
- no official Fort Worth workflow claim;
- no legal/TPIA/TRAIGA sufficiency claim;
- no OpenFGA, CIBA, public portal, delivered notification, live city integration, or root ForensicChain claim.

## Verification Posture

Preflight baseline:

- Dashboard before V2-G: `605/605`.
- Repo-wide JS before V2-G: `719/719`.
- Dashboard after V2-G: `627/627`.
- Repo-wide JS after V2-G: `719/719`.

Implementation verification:

- Endpoint tests cover non-POST rejection, malformed/empty text rejection, missing-env fallback, no API-key exposure, server-side mocked provider fetch, audio return on success, and provider-error fallback.
- Mission narration tests cover live voice requests from existing act lines, Act 4 `3000ms` silence before voice/fallback, unlock after success, unlock after failure, cancellation, and duplicate-request prevention.
- Foreman Q&A tests cover existing Ask Foreman and Challenge Foreman response text routing to the voice client and typed-answer visibility when voice fails.
- Forbidden behavior guards cover no browser-side `ELEVENLABS_API_KEY`, no browser direct `api.elevenlabs.io`, no browser `xi-api-key`, and no new `MediaRecorder`, `getUserMedia`, Whisper/audio transcription path, or model/API answer path.

Final command results:

- `npm --prefix dashboard run typecheck`: PASS.
- `npm --prefix dashboard test`: PASS, `627/627`.
- `npm --prefix dashboard run build`: PASS, with the existing Vite large-chunk warning only.
- `npm test`: PASS, `719/719`.
- `git diff --check`: PASS.

## Browser / Manual Proof

Live ElevenLabs audio proof is HOLD: `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` were not configured in the local proof environment.

Fallback proof is PASS through automated coverage. Local dashboard HTTP smoke passed at `http://127.0.0.1:5173/`; interactive browser click-through proof remains HOLD because no in-app browser automation was available in this session.

## Contract / Migration Status

Shared contract changed: NO.

Migration row required: NO.

`MIGRATIONS.md` touched: NO.

## Remaining HOLDs

- Live ElevenLabs audio proof: HOLD unless server-side env is configured and observed.
- Deployed proof: HOLD unless the deployed environment is observed with the server-side env configured.
- Screenshot proof: HOLD unless an approved proof/screenshot storage location is provided.
- Existing eval warm-tabs, phone smoke, mobile/judge-device proof, full authority choreography screenshot proof, Walk-mode MP4 proof, clean logout proof, deploy-hook cleanup proof, final V2-B closeout, production/legal/live-city/OpenFGA/CIBA/public-portal/notification/model/API-answer/root-ForensicChain claims remain HOLD.

## Front-Door Sync

V2-G routing is synchronized through:

- `README.md`
- `REPO_INDEX.md`
- `AGENTS.md`
- `CLAUDE.md`
- `AI_EXECUTION_DOCTRINE.md`
- `CONTRIBUTING.md`
- `docs/MERIDIAN_CURRENT_STATE_LEDGER.md`
- `docs/INDEX.md`
- `docs/UI_INDEX.md`
- `docs/WHERE_TO_CHANGE_X.md`
- `docs/closeouts/README.md`
- `dashboard/README.md`
- `docs/closeouts/MERIDIAN_MASTER_CLOSEOUT_COMPILATION.md`

## Final Signoff

V2-G is dashboard-local live voice transport only. The typed Foreman text remains the truth, voice is transport, and failure stays fallback-safe.
