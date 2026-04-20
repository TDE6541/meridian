# Wave 7 Civic Skins

## Purpose

Wave 7 Packet 1 is a rendering wave only.
Skins consume existing governance runtime and sweep truth and translate it into a civic-facing internal structure.
Packet 1 does not compute new governance truth.

## Packet 1 Shipped Surface

- `src/skins/CivicSkinFramework.js`
- `src/skins/index.js`
- `src/skins/civic/permitting.js`
- `tests/skins.civicFramework.test.js`
- `tests/skins.permitting.test.js`
- `tests/skins.sweep.test.js`
- `docs/specs/WAVE7_CIVIC_SKINS.md`

## Skins-Local Contract

Packet 1 introduces a skins-local render contract.
This contract is local to `src/skins/**` and does not widen runtime, bridge, pipeline, forensic, entity, or publisher contracts.

### CivicSkinInput

- `viewType`: `governance-decision` | `authority-evaluation` | `revocation-status` | `promise-status` | `sweep-result`
- `sourceKind`: `runtime-evaluation` | `governance-sweep` | `fixture`
- `sourceId`: `string`
- `civic`: `object`
- `raw`: `object`
- `audience`: `internal` | `public`
- `metadata.generatedAt`
- `metadata.fixtureName`
- `metadata.schemaVersion = wave7.civicSkinInput.v1`

### CivicSkinRenderResult

- `skinId`
- `viewType`
- `audience`
- `truthFingerprint`
- `sections`
- `claims`
- `absences`
- `redactions`
- `fallback`
- `sourceRefs`

### CivicSkinSection

- `id`
- `title`
- `body`
- `sourceRefs`
- `claimIds`
- `absenceIds`
- `disclosureNoticeIds`

### CivicSkinClaim

- `id`
- `text`
- `claimKind = presented-source-truth | label-translation | derived-runtime-truth | absence-notice`
- `sourceRefs`
- `allowedAudience`
- `confidenceTier`

### CivicSkinAbsence

- `id`
- `path`
- `reason = SOURCE_FIELD_ABSENT | UNSUPPORTED_VIEW | NOT_IN_CURRENT_INPUT | PUBLIC_DISCLOSURE_HOLD`
- `displayText`
- `sourceRefs`

### SourceRef

- `path`
- `sourceKind = runtimeSubset.civic | governanceSweep | authorityContext | revocationProjection | fixture | rawInput`
- `required`

## Permitting Skin Grounding

Packet 1 ships one skin descriptor: `civic.permitting`.

Approved section families:

- Permit Status
- Inspection Findings
- Authority Chain
- Governance Decision
- Confidence Assessment
- Promise / Obligation Status
- Revocation or Hold Notice

Required source classes represented in Packet 1 output:

- governance decision result (`decision`, `reason`, rationale projection)
- `runtimeSubset.civic.promise_status` (or sweep equivalent)
- `runtimeSubset.civic.confidence` (or sweep equivalent)
- `runtimeSubset.civic.authority_resolution` when present in current input
- `runtimeSubset.civic.revocation` when present in current input
- governance sweep scenario summary for `sweep-result` view type

Missing source fields render deterministic absences instead of invented prose.

## Truth Fingerprint Stable Field Set

Packet 1 `truthFingerprint` is derived only from canonical truth fields, never from presentation details such as label text, section ordering, or section framing.

Canonical fields:

- decision
- reason
- rationale
- confidence tier
- promise status triplet
- omission summary
- standing risk summary
- authority resolution summary
- revocation summary

Fingerprint output includes:

- schema version
- canonical truth object
- deterministic digest

## Fallback and Audience Boundaries

- Internal unsupported combinations return explicit bounded fallback (`UNSUPPORTED_VIEW_INTERNAL`) with `UNSUPPORTED_VIEW` absence notices.
- Public rendering behavior is intentionally reserved in Packet 1 and returns explicit bounded fallback (`PUBLIC_RENDERING_RESERVED`) with `PUBLIC_DISCLOSURE_HOLD` absence notices.

## Non-Shipped Surfaces

Packet 1 does not ship:

- runtime decision logic changes
- runtime subset widening outside skins-local projection
- bridge/publisher widening
- forensic-chain widening
- entity or schema widening
- pipeline widening
- new NATS subjects, streams, or publication lanes
- meeting-capture-to-skin routing
- forensic-entry-to-skin routing
- public portal output behavior
- UI/dashboard runtime claims

## Helper-File Split Posture

Packet 1 intentionally keeps skin framework logic centralized in `CivicSkinFramework.js` plus one descriptor file (`civic/permitting.js`) for minimal diff posture.
Optional helper split (`inputAdapter.js`, `truthFingerprint.js`, `sourceRefs.js`) is deferred to a future packet that adds another skin and has explicit approval to widen internal file factoring.

## Migration Posture

No migration row is required for Packet 1 because this packet is rendering-only and local to new `src/skins/**` surfaces.
Wave-level canon/index/closeout synchronization remains deferred to the approved finish-sync packet.
