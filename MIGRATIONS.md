# Migrations

Status: Active.

## Purpose

Track real migration events when a later approved change requires them.

## Migration Log

| Date | Change | Reason | Approval | Notes |
| ---- | ------ | ------ | -------- | ----- |
| 2026-04-14 | typed signal_tree widening; lifecycle-bound status validation; stateless null-only status enforcement; utility_asset promotion; evidence_artifact addition | Wave 2 bounded entity ontology extension | Approved Wave 2 integrated CC truth cut | Out-of-repo callers relying on arbitrary free-text status will now fail validation. |
| 2026-04-14 | first `nats` runtime dependency and `package-lock.json`; transport-only `src/bridge/**` surfaces; bridge-local BridgeEnvelope, GovernanceEvaluationRequest, and GovernancePublication contracts | Wave 3 bounded NATS bridge substrate and canon sync | Approved Wave 3 direct ship lane | No persistent entity contract widening; no entity mutation, KV mutation, or live broker proof shipped. |

## Entry Rules

- Add entries only for real migration events.
- Do not backfill or invent history.
- Keep each entry tied to the approving session or change.
