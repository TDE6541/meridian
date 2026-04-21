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

## Packet 2 Shipped Surface

- `src/skins/civic/council.js`
- `src/skins/civic/operations.js`
- `src/skins/civic/dispatch.js`
- `tests/skins.council.test.js`
- `tests/skins.operations.test.js`
- `tests/skins.dispatch.test.js`
- `docs/specs/WAVE7_CIVIC_SKINS.md`

Packet 2 keeps `src/skins/CivicSkinFramework.js`, `src/skins/index.js`, and `src/skins/civic/permitting.js` unchanged.
Packet 2 imports descriptor modules directly in tests and does not add registry wiring.

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

## Packet 2 Additional Internal Skins

Packet 2 ships three additional internal skins:

- `civic.council`
- `civic.operations`
- `civic.dispatch`

Packet 2 remains rendering-only.
It does not compute new governance truth and does not widen runtime, bridge, pipeline, forensic, entity, or publication contracts.

### Council skin section families

- Resolution Summary
- Obligation Status
- Governance Rationale
- Public Hearing / Comment Context
- Voting Record Context
- Authority / Revocation Notice
- Absence Notices

Council rendering must not invent voting records, public comments, intent, or ordinance passage claims.
If source voting/comment context is absent, deterministic absences are rendered.

### Operations skin section families

- Work Order Summary
- Corridor Status
- Asset / Utility Context
- Maintenance Priority
- Responsible Office
- Authority Gap / HOLD Queue
- Revocation or Escalation Notice

Operations rendering must not integrate live work-order systems, crew scheduling, or field-service automation.
If crew/equipment/resource context is absent, deterministic absences are rendered.

### Dispatch skin section families

- Active Hold Queue
- Priority Posture
- Governance Override Status
- Responsible Office
- Dispatch-Style Routing Summary
- Resource / Unit Context
- Absence Notices

Dispatch rendering must not imply live 911/CAD/public-safety operation.
If resource/unit/incident context is absent, deterministic absences are rendered.

### Packet 2 truth parity and fallback

For the same input, all internal skins preserve the same `truthFingerprint` because fingerprint material stays tied to canonical truth fields only.
Presentation differences remain vocabulary/order/section framing only.
Unsupported internal combinations continue to return bounded `UNSUPPORTED_VIEW_INTERNAL` fallback through framework-level descriptor gating.

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

## Packet 3 Shipped Surface

- `src/skins/redaction.js`
- `src/skins/civic/public.js`
- `tests/skins.redaction.test.js`
- `tests/skins.public.test.js`
- `docs/specs/WAVE7_CIVIC_SKINS.md`

## Public Transparency Skin

Packet 3 ships `civic.public` as a direct public renderer.
It remains rendering-only and preserves Packet 1's frozen framework public guard by not changing `CivicSkinFramework.js` or `src/skins/index.js`.

Packet 3 public section families:

- Public Decision Summary
- Public Authority Context
- Public Confidence Tier
- Public Promise Status
- Public Revocation Notice
- Public Disclosure Boundary
- Public Disclosure Hold Notices

Approved Packet 3 posture phrases:

- TPIA-aware
- public disclosure boundary
- deterministic demo redaction
- not legal review
- not request adjudication

Packet 3 public output stays plain-language and structurally distinct from every internal skin.
Every public claim uses `allowedAudience: ["public"]`.
Packet 3 does not compute new governance truth and does not widen runtime, bridge, pipeline, forensic, entity, or publication contracts.

## Public Disclosure Boundary

Packet 3 uses a deterministic public disclosure boundary with these redaction categories:

- `entity-id-redacted`
- `org-id-redacted`
- `subject-address-redacted`
- `free-form-text-redacted`
- `unknown-field-redacted`

Every redaction emits:

- a stable `marker`
- a stable `noticeId`
- a stable `basis`
- a stable `path`

Packet 3 preserves truth fingerprint parity by reusing the existing civic input normalization and truth fingerprint helper.
Presentation labels, section ordering, and redaction notices do not alter the fingerprint.
If required canonical truth is missing, Packet 3 emits `PUBLIC_DISCLOSURE_HOLD` instead of falling through to internal text.

## Packet 3 Non-Shipped Surfaces

Packet 3 does not ship:

- compliance certification claims
- attorney-review claims
- records-request intake or workflow automation
- citizen identity verification
- live portal or dashboard behavior
- LLM-driven redaction
- meeting-capture-to-skin routing
- forensic-entry-to-skin routing
- governance-truth computation inside skins
- framework public-guard removal

## Packet 4 Structural Integration Proof

Packet 4 ships five-skin structural integration proof at `tests/skins.integration.test.js`.
The proof verifies that the same governance input renders through all five shipped skins (`civic.permitting`, `civic.council`, `civic.operations`, `civic.dispatch`, `civic.public`) with `truthFingerprint` parity.
The proof also verifies that public output preserves parity while applying deterministic public disclosure boundaries.

Packet 4 adds proof only.
Packet 4 does not widen the render contract and does not alter framework public-guard behavior.
Packet 4 does not alter runtime, bridge, forensic, pipeline, entity, config, or package surfaces.
