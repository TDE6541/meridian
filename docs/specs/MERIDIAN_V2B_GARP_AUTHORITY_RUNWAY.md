# Meridian V2-B/GARP Authority Runway

Status: V2-B/GARP Authority Runway shipped locally through G5, pending finish-lane validation/checkpoint/push sequence.

## Scope

This spec records the local GARP packet sequence G1-G5 only:

- G1: role-session skin gate.
- G2: authority core.
- G3: authority lifecycle.
- G4: authority cockpit.
- G5: handoff/actions.

This is not the full V2-B Foreman closeout.

Foreman remains gated until the Foreman concept/prototype source is inspected and Tim approves Foreman packet cutting.

## Goal And Architecture

The GARP Authority Runway adds a local V2-B prerequisite lane for authority-aware dashboard review and deterministic local authority-resolution handling.

The lane is split between:

- dashboard-local role-session proof and skin gating;
- root local authority request/evaluation/store logic under `src/live/authority/**`;
- deterministic local token, notification-payload, and lifecycle handling;
- dashboard-local authority cockpit, timeline, notification preview, disclosure preview, and handoff/action surfaces.

GARP does not convert the dashboard into a production app, does not ship live city identity, and does not mount Foreman behavior.

## Packet Lineage

### G1 - Role-Session Skin Gate

G1 added dashboard-local Auth0 Universal Login role-session proof and local role-to-skin policy selection.

Shipped posture:

- public mode remains available when Auth0 env is absent or role claims are unknown;
- dashboard role-session proof is dashboard-local;
- role selection gates local skin access only;
- snapshot mode remains the safe default.

### G2 - Authority Core

G2 added deterministic local authority resolution over explicit absence/evidence inputs.

Shipped posture:

- authority routing uses explicit enum-like absence and missing-evidence fields;
- generated authority requests are deterministic;
- missing or conflicting time input returns HOLD instead of guessing;
- authority request storage remains local and in-process.

### G3 - Authority Lifecycle

G3 added deterministic local action-token, notification-payload, and authority-response handling.

Shipped posture:

- action tokens require explicit secret and time inputs;
- token signing and hashing are deterministic;
- request-info tokens are one-time and keep the request pending;
- notification output is a payload builder only;
- approval/denial/expiration/request-info handling updates local request state and emits local lifecycle records;
- optional authority evidence/live-event helper outputs fail closed when required inputs are unavailable.

### G4 - Authority Cockpit

G4 added dashboard-local authority state, authority timeline, notification preview, and disclosure preview surfaces.

Shipped posture:

- the cockpit reads committed snapshot/live projection inputs only;
- public redaction and judge-demo display modes remain local dashboard views;
- notification preview displays explicit payloads only;
- no root `src/live/**` or `src/skins/**` imports are pulled into the browser.

### G5 - Handoff/Actions

G5 added dashboard-local GARP handoff context and prepared disclosure preview action metadata.

Shipped posture:

- handoff context carries `foreman_ready: false`;
- disclosure preview actions are prepared metadata only;
- no clipboard write, download trigger, print trigger, PDF generation, or browser side effect ships.

## Contract Family

### Verified Literal Contract Strings

The following literal contract strings are present in repo source:

- `meridian.v2.roleSessionProof.v1`
- `meridian.v2.authorityResolutionRequest.v1`
- `meridian.v2.authorityResolutionEvaluation.v1`
- `meridian.v2.authorityRequestStore.v1`
- `meridian.v2.authorityDashboardState.v1`
- `meridian.v2.authorityTimelineView.v1`
- `meridian.v2.disclosurePreviewReport.v1`
- `meridian.v2.garpHandoffContext.v1`
- `meridian.v2.disclosurePreviewActionBundle.v1`

### Local Lifecycle/Action Record Surfaces

G3 lifecycle/token/notification/result behavior ships as stable local GARP lifecycle/action record surfaces rather than additional literal `meridian.v2.*` contract strings.

Visible local shapes include:

- action-token prefix `garp-action-v1`;
- action set `approve`, `deny`, and `request_info`;
- deterministic token hash output;
- notification kind `authority_resolution_request_notification`;
- deterministic notification channel ordering `simulated_device`, `browser_push`, `email`;
- local lifecycle record kind `authority_resolution_lifecycle`;
- denial evidence kind `authority_denial`;
- existing-kind live event helper output `authority.evaluated`.

These surfaces do not ship ForensicChain vocabulary widening and do not create per-action ForensicChain entries such as authority-approved or authority-denied contracts.

## Runtime Boundaries

Z1 records these runtime boundaries:

- no live city integration;
- no production auth claim;
- no OpenFGA behavior shipped;
- no Auth0 tenant connectivity proof;
- no CIBA shipped;
- no notification delivery;
- no browser push registration;
- no email sending;
- no service worker;
- no Foreman behavior;
- no legal/TPIA compliance claim;
- no public portal claim;
- no official disclosure workflow;
- no ForensicChain vocabulary widening;
- no LiveFeedEvent kind widening;
- no root package dependency added;
- dashboard-local Auth0 SDK added in G1 only.

## Dashboard Boundaries

The dashboard posture remains:

- `step.skins.outputs` remains active;
- `step.skins.renders` remains absent;
- snapshot mode preserved;
- Live Mode preserved;
- role-session panel preserved;
- Director Mode / Absence Lens preserved;
- authority cockpit and disclosure preview are dashboard-local views only;
- no dashboard-side governance, authority, forensic, absence, skin, city, or cascade truth computation.

## Disclosure Boundaries

Disclosure preview ships as demo preview only:

- preview only;
- prepared action metadata only;
- no clipboard write;
- no browser download trigger;
- no print trigger;
- no PDF.

Required disclaimer:

```text
Demo disclosure preview only. Not legal advice, not a TPIA determination, and not an official Fort Worth disclosure workflow.
```

## Verification Posture

G5 validation reported:

- dashboard tests: `58/58`;
- repo-wide JS tests: `717/717`;
- G5 checkpoint reported local branch ahead by `5`.

Z1 must rerun finish-lane verification before checkpoint.

## Remaining HOLDs

- Foreman concept/prototype gate remains unresolved.
- Live Auth0 tenant proof is not shipped.
- OpenFGA is not shipped.
- Notification delivery is not shipped.
- Screenshot/visual proof remains carried only where already evidenced; Z1 does not invent visual closure.
