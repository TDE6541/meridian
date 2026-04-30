# Meridian V2-G Live Foreman Voice Transport

Status: implementation current; live ElevenLabs proof remains HOLD unless server-side env is configured and observed.

Purpose: add dashboard-local live voice transport for Foreman text that already exists.

V2-G does not create a new Foreman Q&A system. Existing Ask Foreman and Challenge Foreman source-bounded answers remain the answer source. Existing V2-F mission act lines remain the scripted narration source.

## Scope

- Add one dashboard-local serverless endpoint at `dashboard/api/foreman-voice.js`.
- Add one dashboard-local browser client helper under `dashboard/src/foremanGuide/liveVoiceTransport.ts`.
- Route V2-F mission act narration text through the live voice transport before falling back to the existing browser-native/typed path.
- Route existing Ask Foreman and Challenge Foreman response text through the same live voice transport.
- Keep typed mission/Q&A text visible and authoritative.
- Keep audio failure fallback-safe for mission progression and Q&A rendering.

## Server-Side Voice Boundary

`dashboard/api/foreman-voice.js` is the only ElevenLabs integration point.

The endpoint:

- accepts `POST` only;
- accepts JSON with an existing non-empty `text` string;
- clamps text before calling the provider;
- reads `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` from server-side environment only;
- calls ElevenLabs text-to-speech server-side;
- returns audio bytes to the browser on success;
- returns structured non-200 fallback responses when env is missing, input is invalid, fetch is unavailable, or the provider call fails;
- does not persist text or audio;
- does not write files;
- does not add packages.

Browser code never reads the ElevenLabs key, never calls the ElevenLabs domain directly, and only calls same-origin `/api/foreman-voice`.

## Mission Narration Behavior

For each mission act:

1. The existing V2-F act line is selected.
2. Act 4 still shows the HOLD card immediately and waits `3000ms` before requesting voice or fallback narration.
3. The live voice transport is attempted.
4. If live voice succeeds, audio plays and the act unlocks afterward.
5. If live voice is unavailable or fails, the existing browser-native speech/fallback path runs.
6. Typed fallback remains visible and the next act unlocks without deadlock.

Narration cancellation covers active audio, pending requests, timers, reset, restart, Review Mode, and unmount. Duplicate voice requests are prevented with the existing mission run/act/line key gate.

## Foreman Q&A Behavior

Ask Foreman and Challenge Foreman behavior remains source-bounded and unchanged.

After an existing Foreman response message is produced, V2-G sends that already-produced response text to `/api/foreman-voice`. Audio plays when available. If voice fails, the typed answer remains visible and the panel may show a subtle unavailable state.

V2-G does not generate a second answer for voice, call a model, alter source-bounding logic, or make audio success required for Q&A.

## Explicit Non-Goals

- no new Q&A behavior;
- no new answer-generation prompts;
- no LLM/model/API-backed answer generation;
- no browser-exposed ElevenLabs key;
- no direct browser call to ElevenLabs;
- no mic input;
- no MediaRecorder;
- no getUserMedia;
- no Whisper, speech-to-text, audio upload, or transcription path;
- no new persistent state;
- no new packages;
- no root `src/**` changes;
- no root/shared contract widening;
- no production city, legal/TPIA/TRAIGA, OpenFGA, CIBA, public portal, notification, official Fort Worth workflow, or live city integration claim.

## Contract And Migration Posture

Shared/root contract changed: NO.

`MIGRATIONS.md` row required: NO.

V2-G is dashboard-local voice transport only.
