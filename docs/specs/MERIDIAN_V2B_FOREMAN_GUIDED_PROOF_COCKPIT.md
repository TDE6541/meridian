# Meridian V2-B Foreman Guided Proof Cockpit

## Status

Local/pre-deployment truth-sync spec for the remote-backed V2-B Foreman/Auth dashboard stack on `main`.

This spec records shipped local/demo-day behavior only. It does not record deployed Vercel proof, live Auth0 callback/login proof, production auth posture, live city integration, public portal behavior, legal/TPIA sufficiency, official Fort Worth workflow status, OpenFGA behavior, CIBA, sent notifications, model/API calls, external voice service behavior, or root ForensicChain writes from the dashboard endpoint.

## Scope And Purpose

The Foreman guided proof cockpit is a dashboard-local guide/explainer layer over existing Meridian proof surfaces. It helps Tim manually demo current local truth, role-session posture, authority lifecycle state, GARP handoff/disclosure boundaries, guided panel signals, Gold modes, and browser-native voice/avatar affordances before a later deployment proof lane.

The stack remains pre-deployment:

- local snapshot mode remains available and safe when logged out;
- Auth0 role-session proof is dashboard-local and falls back to public snapshot mode when env or claims are missing;
- shared authority request state is local in-memory endpoint behavior;
- Foreman narration is deterministic, source-bounded, and offline;
- browser speech output/input uses browser-native APIs only and preserves typed fallback;
- deployment proof, live Auth0 callback proof, device proof, and final V2-B closeout remain HOLD.

## V2-B Relationship

GARP is the authority runway. It shipped local authority request/evaluation/store contracts, role-session proof, authority cockpit, lifecycle/action record handling, payload-only notification preview, handoff context, and disclosure preview actions through G1-G5 plus Z1.

Foreman is the guide/explainer layer. It reads current dashboard-local context, source refs, role-session proof, authority cockpit state, GARP handoff/disclosure boundary data, guided event signals, and Gold mode prompts. It does not create authority truth, legal truth, city truth, or deployment truth.

## Shipped Packet Lineage

### Foreman B1

- deterministic dashboard-local Foreman context substrate;
- `meridian.v2.foremanGuideContext.v1`;
- structured HOLDs for unknowns;
- source refs preserved.

### AUTH-1

- Auth0 JWT role-session mapping;
- JWT roles read from `https://meridian.city/roles`;
- mapping into existing `meridian.v2.roleSessionProof.v1`;
- unauthenticated and missing-env fallback to public snapshot mode;
- no Auth0 Management API;
- no OpenFGA or CIBA.

### Foreman B2

- offline Foreman panel;
- `meridian.v2.foremanGuideResponse.v1`;
- deterministic offline narration;
- source-bounded answers and HOLD behavior;
- no model/API/network/secret behavior.

### Test Harness Sync

- dashboard tests are discovered by the normal dashboard test command.

### AUTH-2

- dashboard-local shared in-memory authority endpoint at `/api/authority-requests`;
- create/list/resolve/reset behavior;
- event-compatible payloads: `AUTHORITY_RESOLUTION_REQUESTED`, `AUTHORITY_APPROVED`, `AUTHORITY_DENIED`;
- no root ForensicChain write claim;
- no delivered notifications;
- no database.

### AUTH-3

- shared authority client and polling/manual refresh state;
- submit/approve/deny/endpoint HOLD fallback wired into the dashboard authority cockpit;
- shared authority display/event mapping into the existing authority timeline UI.

### Foreman B3

- authority-aware Foreman narration;
- role/session narration;
- GARP handoff explanation;
- disclosure/public-boundary explanation;
- authority challenge responses;
- legal/TPIA, OpenFGA, CIBA, and delivered-notification questions remain HOLD.

### AUTH-4

- dashboard-local Vercel config;
- dashboard-local Vercel/Auth0 setup docs;
- Auth0 env documentation;
- no deployment proof.

### Foreman B4

- `meridian.v2.foremanGuideSignal.v1`;
- guided event binding;
- proactive source-bounded narration;
- pause/resume controls;
- registry-bounded spatial awareness;
- visual-only panel highlighting.

### Foreman B5

- `meridian.v2.foremanGuideMode.v1`;
- Walk, Absence, Challenge, Public, and Judge modes;
- context-bounded demo guidance;
- no production, live-city, legal/TPIA, OpenFGA, CIBA, or delivered-notification overclaims.

### Foreman B6

- browser-native speech synthesis support;
- optional browser-native speech recognition support;
- typed fallback preserved;
- deterministic avatar state;
- no external voice service;
- no Whisper/audio upload/transcription;
- no MediaRecorder or getUserMedia path;
- no model/API calls.

## Dashboard-Local Contract Strings

- `meridian.v2.foremanGuideContext.v1`
- `meridian.v2.foremanGuideResponse.v1`
- `meridian.v2.foremanGuideSignal.v1`
- `meridian.v2.foremanGuideMode.v1`
- existing `meridian.v2.roleSessionProof.v1`

These strings are dashboard-local proof cockpit strings except for the existing GARP role-session proof string already recorded with the V2-B/GARP Authority Runway. They do not widen root runtime contracts.

## Auth0 Role Namespace

Auth0 role claims are read from:

```text
https://meridian.city/roles
```

Missing env, missing claims, unknown roles, or unauthenticated state fall back to public snapshot mode with advisory/HOLD-style messaging rather than blocking local snapshot access.

## Local Shared Authority Endpoint

The dashboard-local authority endpoint is:

```text
/api/authority-requests
```

It supports create, list, resolve, and reset behavior over shared in-memory local state. Its event-compatible payload types are:

- `AUTHORITY_RESOLUTION_REQUESTED`
- `AUTHORITY_APPROVED`
- `AUTHORITY_DENIED`

The endpoint does not claim root ForensicChain writes, persistent database storage, delivered notifications, OpenFGA enforcement, CIBA, public portal behavior, official city workflow behavior, or legal/TPIA determination behavior.

## Dashboard Behaviors

- Foreman panel over current dashboard-local context.
- Offline deterministic narration.
- Authority narration over shared authority state and event-compatible payloads.
- Role/session narration from `meridian.v2.roleSessionProof.v1`.
- GARP handoff and disclosure/public-boundary explanation.
- Guided event binding through `meridian.v2.foremanGuideSignal.v1`.
- Registry-bounded spatial awareness.
- Visual-only panel highlighting.
- Gold modes: Walk, Absence, Challenge, Public, and Judge.
- Browser-native voice output when supported.
- Browser-native voice input when supported.
- Typed fallback when voice is unavailable or fails.
- Deterministic avatar state.

## Test Floor

Current local floor expected for this B7 truth-sync lane:

- dashboard suite: `236` passing;
- repo-wide JS suite: `717/717` passing.

## Explicit Non-Goals

- no production deployment claim;
- no live city integration;
- no official Fort Worth workflow claim;
- no legal/TPIA determination or sufficiency claim;
- no public portal claim;
- no OpenFGA or CIBA behavior;
- no delivered notifications;
- no model/API calls;
- no browser-exposed model API keys;
- no external voice service;
- no Whisper/audio upload/transcription;
- no root ForensicChain write claim from the dashboard endpoint.

## Remaining HOLDs

- live deployed Vercel URL proof;
- Auth0 deployed callback/login proof;
- mobile/judge device proof;
- deployment smoke proof;
- AUTH-5 deployment proof/finish lane;
- final V2-B closeout after deployed URL and Auth0 callback proof.

## Migration Posture

No new `MIGRATIONS.md` row is required for B7. The new Foreman B1-B6 strings are dashboard-local guide/explainer proof cockpit strings under `dashboard/**`; they do not widen root/shared runtime contracts. The existing `meridian.v2.roleSessionProof.v1` string is already covered by the V2-B/GARP migration row.
