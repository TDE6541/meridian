# Migrations

Status: Active.

## Purpose

Track real migration events when a later approved change requires them.

## Migration Log

| Date | Change | Reason | Approval | Notes |
| ---- | ------ | ------ | -------- | ----- |
| 2026-04-14 | typed signal_tree widening; lifecycle-bound status validation; stateless null-only status enforcement; utility_asset promotion; evidence_artifact addition | Wave 2 bounded entity ontology extension | Approved Wave 2 integrated CC truth cut | Out-of-repo callers relying on arbitrary free-text status will now fail validation. |
| 2026-04-14 | first `nats` runtime dependency and `package-lock.json`; transport-only `src/bridge/**` surfaces; bridge-local BridgeEnvelope, GovernanceEvaluationRequest, and GovernancePublication contracts | Wave 3 bounded NATS bridge substrate and canon sync | Approved Wave 3 direct ship lane | No persistent entity contract widening; no entity mutation, KV mutation, or live broker proof shipped. |
| 2026-04-14 | bounded `src/governance/runtime/**` landing zone; `src/bridge/governanceTransportAdapter.js` now delegates `command_request` evaluation and may return `ALLOW`, `HOLD`, or `BLOCK` in Block A | Wave 4A Block A adapter activation and contract freeze | Approved Wave 4A Block A structural prompt | No `GovernanceEvaluationRequest`, `GovernancePublication`, or `signal_tree` shape widening; `event_observation` remains blocked and deferred; publisher behavior is intentionally not widened for `ALLOW` or fail-closed `BLOCK`. |
| 2026-04-14 | bounded runtime subset integration under `src/governance/runtime/**`; Block C activates `SUPERVISE` and routes synthetic `command_request` evaluation through control-rod posture, constraints, interlocks, hold shaping, omission evaluation, continuity, standing risk, and internal open-items projection | Wave 4A Block C runtime subset integration | Approved Wave 4A Block C structural prompt | Prior Block A-B runtime emission was `ALLOW` / `HOLD` / `BLOCK`; Block C now emits `SUPERVISE` without widening `GovernanceEvaluationRequest`, `GovernancePublication`, `BridgeEnvelope`, or typed `signal_tree`, and without publisher widening or event-side routing. |

## Entry Rules

- Add entries only for real migration events.
- Do not backfill or invent history.
- Keep each entry tied to the approving session or change.
