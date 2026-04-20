# Wave 6 Forensic Chain Civic

## Purpose

Wave 6 adds a bounded Meridian-native forensic chain substrate for top-level governance and authority evidence entries. Packet 1 establishes the local civic chain + writer + demo persistence seam. Packet 2 adds an additive post-evaluation synthetic publication seam on the existing evidence subject family. Wave 6 does not reopen governance decision logic, authority-topology logic, pipeline behavior, or bridge contract families.

## Packet 3 Historical Context + Current Repo State

- Packet 3 (historical) synced this spec to the then-local Wave 6 Packet 1 and Packet 2 truth.
- Packet 3 is truth-surface synchronization only and does not change runtime or test behavior.
- Current repo state: Wave 6 Packet 1 and Packet 2 are committed on `main` and aligned with `origin/main`.

## Shipped Packet 1 Truth

### Block A - bounded civic forensic chain vocabulary

`src/governance/forensic/civicForensicChain.js` now ships a bounded `CivicForensicChain` with:

- active civic entry types narrowed to:
  - `GOVERNANCE_DECISION`
  - `AUTHORITY_EVALUATION`
- deferred civic entry types explicitly rejected:
  - `MEETING_DECISION`
  - `PERMIT_ACTION`
  - `INSPECTION_RESULT`
  - `OBLIGATION_CREATED`
- plugin/base entry compatibility preserved only when base entry types are supplied explicitly by the caller
- deterministic entry integrity checks for duplicate IDs, dangling links, duplicate link refs, and self links
- clone/freeze semantics on stored entry values

### Block B - DI-only writer + demo JSON persistence seam

`src/governance/forensic/governanceChainWriter.js` and `src/governance/forensic/chainPersistence.js` now ship:

- DI-only `GovernanceChainWriter` with optional injected chain, persistence, and clock
- recorded governance entries for valid runtime decisions (`ALLOW`, `SUPERVISE`, `HOLD`, `BLOCK`) when stable governance entry IDs are provided
- additive linked authority entries only when authority resolution is active and stable authority evidence refs are present
- non-blocking persistence behavior: persistence failures are surfaced as warnings/status while recorded entries remain in-memory
- demo JSON persistence under `.meridian/forensic-chain/demo-forensic-chain.json` via `ChainPersistence`
- `.gitignore` guard for `.meridian/`

Packet 1 does not ship DB persistence, cryptographic hash linking, or meeting/permit/inspection/obligation forensic entry capture.

## Shipped Packet 2 Truth

### Block C - DI-only publisher + additive post-evaluation seam

`src/governance/forensic/chainPublisher.js` plus additive seam changes in `src/bridge/governanceTransportAdapter.js` now ship:

- DI-only `ChainPublisher` with optional injected chain, transport, and warning sink
- publication limited to forensic entries of:
  - `GOVERNANCE_DECISION`
  - `AUTHORITY_EVALUATION`
- publication over the existing evidence family only:
  - stream: `CONSTELLATION_EVIDENCE`
  - subject family: `constellation.evidence.*`
  - evidence status segment: `.linked`
- additive adapter seam after evaluation: forensic publication runs only after successful chain append with non-empty `entryRefs`
- publication failures remain visible and non-blocking
- top-level adapter result remains bounded to existing posture (`decision`, `reason`, `evaluated_at`, `publications`), with forensic receipts appended only through `publications`

Packet 2 does not ship a new subject family, a new stream, top-level bridge contract widening, or runtime helper rewrites.

## Contract Posture

- `src/config/constellation.js` remains read-only publisher truth and stays unchanged in Wave 6.
- Wave 6 forensic outputs are additive local substrate behavior and not a legal immutability claim.
- Wave 6 publication proof remains synthetic/local fixture-backed behavior and not live broker proof.

## Explicit Non-Shipped Surfaces

Wave 6 Packet 1 and Packet 2 do not ship:

- governance decision logic changes
- authority-topology logic changes
- per-helper chain spam or full authority trace fan-out
- meeting-capture pipeline modification
- permit/inspection/obligation/meeting-decision forensic chain types
- database-backed persistence
- cryptographic tamper-proof linking
- UI/dashboard/skin surfaces
- live broker proof
- production/legal immutability guarantees
